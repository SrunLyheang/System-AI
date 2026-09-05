import { acceptInvite, removeCollaborator } from "@/lib/collaborators";
import { getCurrentIdentity } from "@/lib/project-access";

interface Context {
  params: Promise<{ projectId: string }>;
}

/** PATCH /api/invites/[projectId] — accept the current user's pending invite. */
export async function PATCH(_request: Request, { params }: Context) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!identity.email) {
    return Response.json({ error: "No pending invite" }, { status: 404 });
  }

  const { projectId } = await params;
  const { count } = await acceptInvite(projectId, identity.email);
  if (count === 0) {
    return Response.json({ error: "No pending invite" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}

/** DELETE /api/invites/[projectId] — decline the invite (removes the collaborator row). */
export async function DELETE(_request: Request, { params }: Context) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!identity.email) {
    return Response.json({ error: "No invite" }, { status: 404 });
  }

  const { projectId } = await params;
  const { count } = await removeCollaborator(projectId, identity.email);
  if (count === 0) {
    return Response.json({ error: "No invite" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
