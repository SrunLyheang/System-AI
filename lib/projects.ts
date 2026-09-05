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

/** List the projects `email` has an *accepted* collaborator record on, newest first. */
export function listSharedProjects(email: string) {
  return prisma.project.findMany({
    where: { collaborators: { some: { email, acceptedAt: { not: null } } } },
    orderBy: { createdAt: "desc" },
  });
}

/** List the projects `email` has been invited to but has not accepted yet, newest first. */
export function listPendingInvites(email: string) {
  return prisma.project.findMany({
    where: { collaborators: { some: { email, acceptedAt: null } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create a project owned by `ownerId`. When `id` is supplied it is used as the
 * project ID so it stays aligned with the Liveblocks room ID the client derives
 * from the project name; otherwise the schema's `cuid()` default supplies one.
 */
export function createProject(ownerId: string, name: string, id?: string) {
  return prisma.project.create({
    data: id ? { id, ownerId, name } : { ownerId, name },
  });
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
