import { createHash } from "node:crypto";

import { auth, runs } from "@trigger.dev/sdk";

import { getAuthenticatedUserId } from "@/lib/auth";
import { readJsonObject } from "@/lib/http";
import { createTaskRun, findTaskRun } from "@/lib/task-runs";

/**
 * Idempotency key for an AI run: an explicit client `Idempotency-Key` header
 * wins as-is; otherwise a stable SHA-256 of the request identity + payload.
 */
export function aiRunIdempotencyKey(
  request: Request,
  parts: Record<string, unknown>,
): string {
  const clientKey = request.headers.get("Idempotency-Key")?.trim();
  if (clientKey) return clientKey;
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

/**
 * Record a just-triggered run against its owner. On failure, best-effort cancel
 * the orphaned run and return a ready-to-return `500`; on success return `null`.
 */
export async function recordRunOrCancel(
  runId: string,
  projectId: string,
  userId: string,
): Promise<Response | null> {
  try {
    await createTaskRun(runId, projectId, userId);
    return null;
  } catch (error) {
    try {
      await runs.cancel(runId);
    } catch (cancelError) {
      console.error("Failed to cancel an untracked AI run", {
        runId,
        error,
        cancelError,
      });
    }
    return Response.json({ error: "Unable to record run" }, { status: 500 });
  }
}

/**
 * Shared handler for the two `.../token` routes: authenticates the caller, verifies
 * they started `runId` (via the `TaskRun` record), and returns a Trigger.dev
 * public token scoped to reading just that run.
 */
export async function mintRunToken(
  request: Request,
  scopes?: { expirationTime?: string },
): Promise<Response> {
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
    ...scopes,
  });
  return Response.json({ token });
}
