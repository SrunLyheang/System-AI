import { getAuthenticatedUserId } from "@/lib/auth";
import { readJsonBody } from "@/lib/http";
import {
  deleteProject,
  findProjectById,
  renameProject,
} from "@/lib/projects";

interface Context {
  params: Promise<{ projectId: string }>;
}

/** PATCH /api/projects/[projectId] — rename a project the caller owns. */
export async function PATCH(request: Request, { params }: Context) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length === 0) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const { projectId } = await params;
  const project = await findProjectById(projectId);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (project.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

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
  const project = await findProjectById(projectId);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (project.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteProject(projectId);
  return new Response(null, { status: 204 });
}
