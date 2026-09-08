import { prisma } from "@/lib/prisma";

/** Record a generated spec's blob pointer against its project. */
export function createProjectSpec(projectId: string, filePath: string) {
  return prisma.projectSpec.create({ data: { projectId, filePath } });
}

/** Look up a single generated spec by ID, or `null` when it does not exist. */
export function findProjectSpec(id: string) {
  return prisma.projectSpec.findUnique({ where: { id } });
}

/** Metadata for every generated spec on a project, newest first. */
export function listProjectSpecs(projectId: string) {
  return prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
}
