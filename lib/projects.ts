import { prisma } from "@/lib/prisma";

/** Name applied to a new project when the request omits one. */
export const DEFAULT_PROJECT_NAME = "Untitled Project";

/** List the projects owned by `ownerId`, newest first. */
export function listProjectsForOwner(ownerId: string) {
  return prisma.project.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

/** Create a project owned by `ownerId`. The schema's `cuid()` default supplies the ID. */
export function createProject(ownerId: string, name: string) {
  return prisma.project.create({ data: { ownerId, name } });
}

/** Look up a single project by ID, or `null` when it does not exist. */
export function findProjectById(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

/** Rename an existing project. */
export function renameProject(id: string, name: string) {
  return prisma.project.update({ where: { id }, data: { name } });
}

/** Delete an existing project. */
export function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } });
}
