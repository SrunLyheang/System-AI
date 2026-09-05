import { prisma } from "@/lib/prisma";

/** List a project's collaborator rows, oldest first. */
export function listCollaborators(projectId: string) {
  return prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Add a collaborator to a project by email. Idempotent — re-inviting an existing
 * collaborator is a no-op rather than a unique-constraint error.
 */
export function addCollaborator(projectId: string, email: string) {
  return prisma.projectCollaborator.upsert({
    where: { projectId_email: { projectId, email } },
    create: { projectId, email },
    update: {},
  });
}

/** Remove a collaborator from a project by email. Also used to decline a pending invite. */
export function removeCollaborator(projectId: string, email: string) {
  return prisma.projectCollaborator.deleteMany({
    where: { projectId, email },
  });
}

/**
 * Mark the pending invite for (`projectId`, `email`) as accepted. Returns the
 * update count so the caller can 404 when there was no pending invite.
 */
export function acceptInvite(projectId: string, email: string) {
  return prisma.projectCollaborator.updateMany({
    where: { projectId, email, acceptedAt: null },
    data: { acceptedAt: new Date() },
  });
}
