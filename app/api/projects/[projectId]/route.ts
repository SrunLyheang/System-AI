import { getAuthenticatedUserId } from "@/lib/auth";
import { readJsonObject } from "@/lib/http";
import { requireOwnedProject } from "@/lib/project-access";
import { deleteProject, renameProject } from "@/lib/projects";

interface Context {
  params: Promise<{ projectId: string }>;
}

/** PATCH /api/projects/[projectId] — rename a project the caller owns. */
export async function PATCH(request: Request, { params }: Context) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length === 0) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const { projectId } = await params;
  const project = await requireOwnedProject(projectId, userId);
  if (project instanceof Response) return project;

  const updated = await renameProject(projectId, name);
  return Response.json(updated);
}

/** DELETE /api/projects/[projectId] — delete a project the caller owns. */
export async function DELETE(_request: Request, { params }: Context) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const project = await requireOwnedProject(projectId, userId);
  if (project instanceof Response) return project;

  await deleteProject(projectId);
  return new Response(null, { status: 204 });
}
