import { tasks } from "@trigger.dev/sdk";

import { readJsonObject } from "@/lib/http";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { createTaskRun } from "@/lib/task-runs";
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

  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const handle = await tasks.trigger<typeof designAgent>("design-agent", {
    prompt,
    roomId,
  });
  await createTaskRun(handle.id, projectId, identity.userId);

  return Response.json({ runId: handle.id });
}
