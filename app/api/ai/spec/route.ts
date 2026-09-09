import { createHash } from "node:crypto";

import { runs, tasks } from "@trigger.dev/sdk";

import { readJsonObject } from "@/lib/http";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import {
  countTaskRunsToday,
  createTaskRun,
  DAILY_AI_RUN_LIMIT,
} from "@/lib/task-runs";
import type { generateSpec } from "@/src/trigger/generate-spec";

const CANCEL_ATTEMPTS = 3;

function idempotencyKeyForRequest(
  request: Request,
  userId: string,
  projectId: string,
  payload: unknown,
) {
  const clientKey = request.headers.get("Idempotency-Key")?.trim();
  if (clientKey) {
    return createHash("sha256")
      .update(JSON.stringify({ userId, projectId, clientKey }))
      .digest("hex");
  }

  return createHash("sha256")
    .update(JSON.stringify({ userId, projectId, payload }))
    .digest("hex");
}

async function cancelRunWithRetry(runId: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < CANCEL_ATTEMPTS; attempt += 1) {
    try {
      await runs.cancel(runId);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < CANCEL_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      }
    }
  }

  throw lastError;
}

/**
 * POST /api/ai/spec — kick off a spec generation run.
 *
 * Triggers the Trigger.dev `generate-spec` task from the current canvas + chat
 * context, records the run against the caller and project (so the token route
 * can verify ownership later), and returns the run id for the client to
 * subscribe to. Project access is resolved from `roomId` and the authenticated
 * user — a client-supplied project id is never trusted.
 */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const { roomId, chatHistory, nodes, edges } = body;
  if (
    typeof roomId !== "string" ||
    roomId.length === 0 ||
    !Array.isArray(chatHistory) ||
    !Array.isArray(nodes) ||
    !Array.isArray(edges)
  ) {
    return Response.json(
      { error: "Body must be { roomId, chatHistory, nodes, edges }" },
      { status: 400 },
    );
  }

  // Bound the payload — the whole canvas + chat is stringified into the prompt,
  // and the per-user daily cap doesn't limit per-run token cost.
  if (
    nodes.length > 500 ||
    edges.length > 1000 ||
    chatHistory.length > 200 ||
    JSON.stringify({ chatHistory, nodes, edges }).length > 200_000
  ) {
    return Response.json(
      { error: "Canvas or chat history too large for spec generation" },
      { status: 413 },
    );
  }

  // Room id == project id, but resolve access through the authenticated user.
  const project = await getAccessibleProject(roomId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if ((await countTaskRunsToday(identity.userId)) >= DAILY_AI_RUN_LIMIT) {
    return Response.json(
      {
        error: `Daily AI limit reached (${DAILY_AI_RUN_LIMIT} runs/day). Try again tomorrow.`,
      },
      { status: 429 },
    );
  }

  const handle = await tasks.trigger<typeof generateSpec>(
    "generate-spec",
    { projectId: project.id, roomId, chatHistory, nodes, edges },
    {
      idempotencyKey: idempotencyKeyForRequest(
        request,
        identity.userId,
        project.id,
        { chatHistory, nodes, edges },
      ),
      idempotencyKeyTTL: "24h",
    },
  );

  try {
    await createTaskRun(handle.id, project.id, identity.userId);
  } catch (error) {
    try {
      await cancelRunWithRetry(handle.id);
    } catch (cancelError) {
      console.error("Failed to cancel an untracked spec run", {
        runId: handle.id,
        error,
        cancelError,
      });
    }

    return Response.json(
      { error: "Unable to record spec run" },
      { status: 500 },
    );
  }

  return Response.json({ runId: handle.id });
}
