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

/** Max AI task runs (design + spec combined) allowed per user per calendar day
 *  (UTC). Guards paid-provider spend and stops one account starving everyone
 *  else — DeepSeek sits first in the fallback chain. */
export const DAILY_AI_RUN_LIMIT = 50;

/** Count of AI runs `userId` triggered since 00:00 UTC today.
 *  ponytail: not transactional — two racing requests from the same user can
 *  both pass the check. Fine for a spend guard (burst is bounded by the user's
 *  own concurrency); add a row lock or counter table if it ever needs to be
 *  exact. */
export function countTaskRunsToday(userId: string) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  return prisma.taskRun.count({
    where: { userId, createdAt: { gte: since } },
  });
}
