import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

/** The current Clerk user's ID plus their primary email address. */
export interface ClerkIdentity {
  userId: string;
  email: string;
}

/**
 * Resolve the signed-in Clerk user's ID and primary email, or `null` when the
 * request is unauthenticated. Page components use this to redirect to `/sign-in`.
 */
export async function getCurrentIdentity(): Promise<ClerkIdentity | null> {
  const user = await currentUser();
  if (!user) {
    return null;
  }
  return {
    userId: user.id,
    email: user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "",
  };
}

/**
 * Load a project the given identity is allowed to open — as the owner, or as a
 * collaborator matched by email. Returns `null` when the project does not exist
 * or the user has no access, so callers can render `AccessDenied` for both.
 */
export async function getAccessibleProject(
  projectId: string,
  identity: ClerkIdentity,
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { collaborators: { select: { email: true, acceptedAt: true } } },
  });
  if (!project) {
    return null;
  }

  const isOwner = project.ownerId === identity.userId;
  const isCollaborator =
    identity.email.length > 0 &&
    project.collaborators.some(
      (c) => c.email === identity.email && c.acceptedAt !== null,
    );

  return isOwner || isCollaborator ? project : null;
}
