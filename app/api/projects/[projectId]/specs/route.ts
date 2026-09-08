import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { listProjectSpecs } from "@/lib/project-specs";

interface Context {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/specs — list the generated specs for a project.
 *
 * Authenticates the caller, checks project access (owner or accepted
 * collaborator), then returns metadata only: `id`, `createdAt`, and a derived
 * `filename` (matching the download route's `Content-Disposition`). The Markdown
 * itself is fetched separately through the download route.
 */
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

  const specs = await listProjectSpecs(project.id);
  return Response.json({
    specs: specs.map((spec) => ({
      id: spec.id,
      createdAt: spec.createdAt.toISOString(),
      filename: `spec-${spec.id}.md`,
    })),
  });
}
