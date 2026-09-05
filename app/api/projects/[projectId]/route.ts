import { getAuthenticatedUserId } from "@/lib/auth";
import { InvalidJsonBodyError, readJsonBody } from "@/lib/http";
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

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
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
