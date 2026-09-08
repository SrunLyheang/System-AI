import { auth } from "@trigger.dev/sdk";

import { getAuthenticatedUserId } from "@/lib/auth";
import { readJsonObject } from "@/lib/http";
import { findTaskRun } from "@/lib/task-runs";

/**
 * POST /api/ai/spec/token — mint a realtime token scoped to one spec run.
 *
 * Verifies the caller started the run (via the `TaskRun` record), then returns a
 * Trigger.dev public access token that can only read that run and expires after
 * one hour.
 */
export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const { runId } = body;
  if (typeof runId !== "string" || runId.length === 0) {
    return Response.json({ error: "Body must be { runId }" }, { status: 400 });
  }

  const run = await findTaskRun(runId);
  if (!run || run.userId !== userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const token = await auth.createPublicToken({
    scopes: { read: { runs: [runId] } },
    expirationTime: "1h",
  });

  return Response.json({ token });
}
