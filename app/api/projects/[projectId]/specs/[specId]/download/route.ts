import { get } from "@vercel/blob";

import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { findProjectSpec } from "@/lib/project-specs";

interface Context {
  params: Promise<{ projectId: string; specId: string }>;
}

/**
 * GET /api/projects/[projectId]/specs/[specId]/download — stream a generated
 * spec back as a downloadable Markdown file.
 *
 * Authenticates the caller, checks project access (owner or accepted
 * collaborator), verifies the spec belongs to that project, then fetches the
 * Markdown from Vercel Blob using `ProjectSpec.filePath`. The blob store is
 * private, so its URL is never exposed to the client directly.
 */
export async function GET(_request: Request, { params }: Context) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, specId } = await params;
  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const spec = await findProjectSpec(specId);
  if (!spec || spec.projectId !== project.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(spec.filePath, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) {
    return Response.json({ error: "Spec file not found" }, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="spec-${specId}.md"`,
    },
  });
}
