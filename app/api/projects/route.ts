import { getAuthenticatedUserId } from "@/lib/auth";
import { readJsonBody } from "@/lib/http";
import {
  createProject,
  DEFAULT_PROJECT_NAME,
  listProjectsForOwner,
} from "@/lib/projects";

/** GET /api/projects — list the authenticated user's projects. */
export async function GET() {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await listProjectsForOwner(ownerId);
  return Response.json(projects);
}

/** POST /api/projects — create a project owned by the authenticated user. */
export async function POST(request: Request) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  const name = rawName.length > 0 ? rawName : DEFAULT_PROJECT_NAME;
  const rawId = typeof body.id === "string" ? body.id.trim() : "";
  const id = rawId.length > 0 ? rawId : undefined;

  const project = await createProject(ownerId, name, id);
  return Response.json(project, { status: 201 });
}
