import { prisma } from "@/lib/prisma";

/** Record a triggered Trigger.dev run against the project and user that started it. */
export function createTaskRun(runId: string, projectId: string, userId: string) {
  return prisma.taskRun.create({ data: { runId, projectId, userId } });
}

/** Look up a tracked run by its Trigger.dev run id, or `null` when unknown. */
export function findTaskRun(runId: string) {
  return prisma.taskRun.findUnique({ where: { runId } });
}
