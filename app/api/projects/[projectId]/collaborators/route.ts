import { enrichEmailsWithClerk } from "@/lib/clerk-users";
import {
  addCollaborator,
  listCollaborators,
  removeCollaborator,
} from "@/lib/collaborators";
import { readJsonObject } from "@/lib/http";
import {
  getAccessibleProject,
  getCurrentIdentity,
  requireOwnedProject,
} from "@/lib/project-access";

interface Context {
  params: Promise<{ projectId: string }>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** GET — list collaborators, enriched with Clerk name/avatar. Owner or collaborator only. */
export async function GET(_request: Request, { params }: Context) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await listCollaborators(projectId);
  const profiles = await enrichEmailsWithClerk(rows.map((row) => row.email));
  const collaborators = profiles.map((profile, index) => ({
    ...profile,
    pending: rows[index].acceptedAt === null,
  }));
  return Response.json({ collaborators });
}

/** POST — invite a collaborator by email. Owner only. */
export async function POST(request: Request, { params }: Context) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "A valid email is required" }, { status: 400 });
  }

  const { projectId } = await params;
  const project = await requireOwnedProject(projectId, identity.userId);
  if (project instanceof Response) return project;

  await addCollaborator(projectId, email);
  return Response.json({ email }, { status: 201 });
}

/** DELETE — remove a collaborator by `?email=`. Owner only. */
export async function DELETE(request: Request, { params }: Context) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = new URL(request.url).searchParams
    .get("email")
    ?.trim()
    .toLowerCase();
  if (!email) {
    return Response.json({ error: "email is required" }, { status: 400 });
  }

  const { projectId } = await params;
  const project = await requireOwnedProject(projectId, identity.userId);
  if (project instanceof Response) return project;

  await removeCollaborator(projectId, email);
  return new Response(null, { status: 204 });
}
