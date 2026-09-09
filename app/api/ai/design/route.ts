import { tasks } from "@trigger.dev/sdk";

import { aiRunIdempotencyKey, recordRunOrCancel } from "@/lib/ai-run";
import { readJsonObject } from "@/lib/http";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { countTaskRunsToday, DAILY_AI_RUN_LIMIT } from "@/lib/task-runs";
import type { designAgent } from "@/src/trigger/design-agent";

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

  // Bound the prompt so one request can't run up an outsized token bill.
  if (prompt.length > 20_000) {
    return Response.json(
      { error: "prompt too long (max 20000 characters)" },
      { status: 413 },
    );
  }

  const project = await getAccessibleProject(projectId, identity);
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

  const handle = await tasks.trigger<typeof designAgent>(
    "design-agent",
    { prompt, roomId },
    {
      idempotencyKey: aiRunIdempotencyKey(request, {
        userId: identity.userId,
        projectId,
        roomId,
        prompt: prompt.trim(),
      }),
      idempotencyKeyTTL: "24h",
    },
  );

  const recordError = await recordRunOrCancel(
    handle.id,
    projectId,
    identity.userId,
  );
  if (recordError) return recordError;

  return Response.json({ runId: handle.id });
}
