import { createHash } from "node:crypto";

import { runs, tasks } from "@trigger.dev/sdk";

import { readJsonObject } from "@/lib/http";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { createTaskRun } from "@/lib/task-runs";
import type { designAgent } from "@/src/trigger/design-agent";

const CANCEL_ATTEMPTS = 3;

function idempotencyKeyForRequest(
  request: Request,
  userId: string,
  projectId: string,
  roomId: string,
  prompt: string,
) {
  const clientKey = request.headers.get("Idempotency-Key")?.trim();
  if (clientKey) return clientKey;

  return createHash("sha256")
    .update(JSON.stringify({ userId, projectId, roomId, prompt }))
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
 * POST /api/ai/design — kick off a design generation run.
 *
 * Triggers the Trigger.dev `design-agent` task, records the run against the
 * caller and project (so the token route can verify ownership later), and
 * returns the run id for the client to subscribe to.
 */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const { prompt, roomId, projectId } = body;
  if (
    typeof prompt !== "string" ||
    prompt.trim().length === 0 ||
    typeof roomId !== "string" ||
    roomId.length === 0 ||
    typeof projectId !== "string" ||
    projectId.length === 0
  ) {
    return Response.json(
      { error: "Body must be { prompt, roomId, projectId }" },
      { status: 400 },
    );
  }

  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const handle = await tasks.trigger<typeof designAgent>(
    "design-agent",
    {
      prompt,
      roomId,
    },
    {
      idempotencyKey: idempotencyKeyForRequest(
        request,
        identity.userId,
        projectId,
        roomId,
        prompt.trim(),
      ),
      idempotencyKeyTTL: "24h",
    },
  );

  try {
    await createTaskRun(handle.id, projectId, identity.userId);
  } catch (error) {
    try {
      await cancelRunWithRetry(handle.id);
    } catch (cancelError) {
      console.error("Failed to cancel an untracked design run", {
        runId: handle.id,
        error,
        cancelError,
      });
    }

    return Response.json(
      { error: "Unable to record design run" },
      { status: 500 },
    );
  }

  return Response.json({ runId: handle.id });
}
