import { getCurrentIdentity } from "@/lib/project-access";
import { listPendingInvites } from "@/lib/projects";

/** GET /api/invites — list the current user's pending (unaccepted) project invites. */
export async function GET() {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!identity.email) {
    return Response.json({ invites: [] });
  }

  const projects = await listPendingInvites(identity.email);
  return Response.json({
    invites: projects.map((project) => ({ id: project.id, name: project.name })),
  });
}
