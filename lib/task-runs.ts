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

/** Max AI task runs (design + spec combined) allowed per calendar day (UTC).
 *  Guards paid-provider spend — DeepSeek sits first in the fallback chain. */
export const DAILY_AI_RUN_LIMIT = 50;

/** Count of AI runs triggered since 00:00 UTC today.
 *  ponytail: not transactional — two racing requests can both pass the check
 *  and push the count to 21. Fine for a personal spend guard; add a row lock or
 *  a dedicated counter table if it ever needs to be exact. */
export function countTaskRunsToday() {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  return prisma.taskRun.count({ where: { createdAt: { gte: since } } });
}
