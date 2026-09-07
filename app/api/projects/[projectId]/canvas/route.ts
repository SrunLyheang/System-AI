import { get, put } from "@vercel/blob";

import { readJsonObject } from "@/lib/http";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { setProjectCanvasPath } from "@/lib/projects";

import { isCanvasEdge, isCanvasNode } from "./validate";

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

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  if (
    !Array.isArray(body.nodes) ||
    !Array.isArray(body.edges) ||
    !body.nodes.every(isCanvasNode) ||
    !body.edges.every(isCanvasEdge)
  ) {
    return Response.json(
      {
        error:
          "Body must be { nodes: Node[], edges: Edge[] } — nodes need id + position, edges need id, source, target",
      },
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
  // `get` returns null only when the blob is genuinely missing (never saved, or
  // a stale pointer) — that is the one case that means "unsaved canvas". Read /
  // auth failures throw and propagate as a 500; a non-200 result (e.g. an
  // unexpected 304) is surfaced as an error too, never flattened into an empty
  // canvas the client would then overwrite real state with.
  if (!result) {
    return Response.json({ canvas: null });
  }
  if (result.statusCode !== 200) {
    return Response.json(
      { error: "Failed to read saved canvas" },
      { status: 502 },
    );
  }
  const canvas = await new Response(result.stream).json();
  return Response.json({ canvas });
}
