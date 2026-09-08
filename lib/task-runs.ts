import { prisma } from "@/lib/prisma";

/** Record a triggered Trigger.dev run against the project and user that started it.
 *  Idempotent: a repeated prompt reuses its Trigger.dev idempotency key and so
 *  returns the same `runId`, which must not blow up re-recording. */
export function createTaskRun(runId: string, projectId: string, userId: string) {
  return prisma.taskRun.upsert({
    where: { runId },
    create: { runId, projectId, userId },
    update: {},
  });
}

/** Look up a tracked run by its Trigger.dev run id, or `null` when unknown. */
export function findTaskRun(runId: string) {
  return prisma.taskRun.findUnique({ where: { runId } });
}
