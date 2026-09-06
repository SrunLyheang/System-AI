import { get, put } from "@vercel/blob";

import { InvalidJsonBodyError, readJsonBody } from "@/lib/http";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { setProjectCanvasPath } from "@/lib/projects";

interface Context {
  params: Promise<{ projectId: string }>;
}

/**
 * PUT /api/projects/[projectId]/canvas — persist the latest canvas JSON.
 *
 * The canvas state (`{ nodes, edges }`) is uploaded to Vercel Blob at a stable
 * per-project path; the returned blob URL is stored on the Prisma project
 * record. Prisma keeps only the pointer — the JSON itself lives in Blob.
 */
export async function PUT(request: Request, { params }: Context) {
  const identity = await getCurrentIdentity();
  if (!identity) {
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
  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return Response.json(
      { error: "Body must be { nodes: [], edges: [] }" },
      { status: 400 },
    );
  }

  const { projectId } = await params;
  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const blob = await put(
    `canvas/${projectId}.json`,
    JSON.stringify({ nodes: body.nodes, edges: body.edges }),
    {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  );
  await setProjectCanvasPath(projectId, blob.url);

  return Response.json({ url: blob.url });
}

/**
 * GET /api/projects/[projectId]/canvas — return the saved canvas JSON.
 *
 * Reads the blob URL from Prisma and fetches the canvas state from Vercel Blob.
 * Returns `{ canvas: null }` when the project has never been saved.
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
  if (!project.canvasJsonPath) {
    return Response.json({ canvas: null });
  }

  const result = await get(project.canvasJsonPath, {
    access: "private",
    useCache: false,
  });
  if (!result || result.statusCode !== 200) {
    return Response.json({ canvas: null });
  }
  const canvas = await new Response(result.stream).json();
  return Response.json({ canvas });
}
