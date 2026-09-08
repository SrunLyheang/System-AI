import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { generateObject } from "ai";
import { z } from "zod";

import { getLiveblocks } from "@/lib/liveblocks";
import {
  AI_STORAGE_KEY,
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  finiteNumber,
  NODE_COLORS,
  NODE_SHAPES,
  SHAPE_DEFAULT_SIZE,
  type AiActivity,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas";

/** One canvas mutation the model can emit. Flat (not a discriminated union) so
 *  Gemini structured output stays reliable; required fields are checked per type
 *  when applied. */
const actionSchema = z.object({
  type: z.enum([
    "addNode",
    "moveNode",
    "resizeNode",
    "updateNode",
    "deleteNode",
    "addEdge",
    "deleteEdge",
  ]),
  /** Node id (add/move/resize/update/delete) or edge id (addEdge/deleteEdge). */
  id: z.string(),
  shape: z.enum(NODE_SHAPES).optional(),
  label: z.string().optional(),
  /** Index into the fixed palette (0 = neutral default). */
  colorIndex: z
    .number()
    .int()
    .min(0)
    .max(NODE_COLORS.length - 1)
    .optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
});

const planSchema = z.object({
  summary: z.string(),
  actions: z.array(actionSchema),
});

type Action = z.infer<typeof actionSchema>;

/** Replace the shared `ai` Storage object so every participant sees the agent's
 *  current state. Each call writes a complete object — no partial merge. */
async function setActivity(
  roomId: string,
  patch: Partial<Omit<AiActivity, "updatedAt">>,
) {
  const client = getLiveblocks();
  const next: AiActivity = {
    status: "idle",
    message: "",
    cursor: null,
    ...patch,
    updatedAt: Date.now(),
  };
  await client.mutateStorage(roomId, ({ root }) => {
    root.set(AI_STORAGE_KEY, next);
  });
}

function systemPrompt(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
) {
  const palette = NODE_COLORS.map(
    (c, i) => `${i}: fill ${c.fill} / text ${c.text}`,
  ).join("\n");
  return `You edit a collaborative diagram canvas by emitting a list of actions.

Allowed node shapes: ${NODE_SHAPES.join(", ")}.
Color palette (use colorIndex, never raw hex):
${palette}

Layout rules:
- Canvas coordinates are pixels, origin top-left, x grows right, y grows down.
- Lay nodes out on a readable grid: at least 240px horizontal and 160px vertical
  gap between node centers. Never overlap nodes.
- Flow left-to-right or top-to-bottom following the logical dependency order.

Action rules:
- addNode: requires id, shape, label, colorIndex, x, y. width/height optional
  (sensible per-shape defaults are used).
- moveNode: requires id, x, y. resizeNode: requires id, width, height.
- updateNode: id plus any of label, colorIndex, shape.
- deleteNode: id. addEdge: id, source, target, optional label. deleteEdge: id.
- Only reference ids that already exist (listed below) or ids you create earlier
  in the same action list. Use short ids like n1, n2, e1 for new elements and
  avoid colliding with existing ids.
- Prefer adding to / refining the existing diagram over deleting it unless the
  user clearly asks to start over.

Current nodes:
${JSON.stringify(
  nodes.map((n) => ({
    id: n.id,
    label: n.data.label,
    shape: n.data.shape,
    x: n.position.x,
    y: n.position.y,
  })),
)}
Current edges:
${JSON.stringify(
  edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
)}`;
}

type MutableFlow = Parameters<
  Parameters<typeof mutateFlow<CanvasNode, CanvasEdge>>[1]
>[0];

/** Apply one model action to the mutable flow. Silently skips actions missing
 *  their required fields — a partial plan should still produce a valid canvas. */
function applyAction(flow: MutableFlow, a: Action) {
  switch (a.type) {
    case "addNode": {
      const shape = a.shape ?? "rectangle";
      const color = NODE_COLORS[a.colorIndex ?? 0] ?? NODE_COLORS[0];
      const size = SHAPE_DEFAULT_SIZE[shape];
      flow.addNode({
        id: a.id,
        type: CANVAS_NODE_TYPE,
        position: { x: finiteNumber(a.x) ?? 0, y: finiteNumber(a.y) ?? 0 },
        width: finiteNumber(a.width) ?? size.width,
        height: finiteNumber(a.height) ?? size.height,
        data: {
          label: a.label ?? "",
          color: color.fill,
          textColor: color.text,
          shape,
        },
      });
      return;
    }
    case "moveNode": {
      const x = finiteNumber(a.x);
      const y = finiteNumber(a.y);
      if (x != null && y != null) {
        flow.updateNode(a.id, { position: { x, y } });
      }
      return;
    }
    case "resizeNode": {
      const width = finiteNumber(a.width);
      const height = finiteNumber(a.height);
      if (width != null && height != null) {
        flow.updateNode(a.id, { width, height });
      }
      return;
    }
    case "updateNode": {
      const patch: Partial<CanvasNode["data"]> = {};
      if (a.label != null) patch.label = a.label;
      if (a.shape != null) patch.shape = a.shape;
      if (a.colorIndex != null) {
        const c = NODE_COLORS[a.colorIndex];
        if (c) {
          patch.color = c.fill;
          patch.textColor = c.text;
        }
      }
      if (Object.keys(patch).length > 0) flow.updateNodeData(a.id, patch);
      return;
    }
    case "deleteNode":
      flow.removeNode(a.id);
      return;
    case "addEdge":
      if (a.source && a.target) {
        flow.addEdge({
          id: a.id,
          source: a.source,
          target: a.target,
          type: CANVAS_EDGE_TYPE,
          data: a.label ? { label: a.label } : {},
        });
      }
      return;
    case "deleteEdge":
      flow.removeEdge(a.id);
      return;
  }
}

/** Rough canvas point for the agent's presence cursor — the first placed node. */
function firstPoint(actions: Action[]): { x: number; y: number } | null {
  for (const a of actions) {
    const x = finiteNumber(a.x);
    const y = finiteNumber(a.y);
    if (x != null && y != null) return { x, y };
  }
  return null;
}

/**
 * Design generation agent. Interprets a natural-language prompt with Gemini and
 * writes the resulting node/edge changes into the shared Liveblocks room, while
 * publishing its presence and progress to the same room so every participant
 * sees the agent working.
 */
export const designAgent = schemaTask({
  id: "design-agent",
  maxDuration: 300,
  schema: z.object({
    prompt: z.string(),
    roomId: z.string(),
  }),
  run: async ({ prompt, roomId }) => {
    try {
      // Inside the try so a misconfigured Liveblocks client still surfaces as an
      // "error" status the room can see, rather than a silent run failure.
      const client = getLiveblocks();

      await setActivity(roomId, {
        status: "thinking",
        message: "Reading the canvas…",
      });

      // Snapshot the current graph for model context.
      let nodes: readonly CanvasNode[] = [];
      let edges: readonly CanvasEdge[] = [];
      await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
        nodes = flow.nodes;
        edges = flow.edges;
      });

      await setActivity(roomId, {
        status: "thinking",
        message: "Designing a layout…",
      });

      const google = createGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
      const { object: plan } = await generateObject({
        model: google("gemini-3.6-flash"),
        schema: planSchema,
        system: systemPrompt(nodes, edges),
        prompt,
      });

      logger.info("design-agent plan", {
        summary: plan.summary,
        actionCount: plan.actions.length,
      });

      if (plan.actions.length === 0) {
        await setActivity(roomId, {
          status: "done",
          message: plan.summary || "No changes needed.",
        });
        return { summary: plan.summary, applied: 0 };
      }

      await setActivity(roomId, {
        status: "generating",
        message: `Applying ${plan.actions.length} change${
          plan.actions.length === 1 ? "" : "s"
        }…`,
        cursor: firstPoint(plan.actions),
      });

      await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
        for (const action of plan.actions) applyAction(flow, action);
      });

      await setActivity(roomId, {
        status: "done",
        message: plan.summary || "Design updated.",
        cursor: null,
      });

      return { summary: plan.summary, applied: plan.actions.length };
    } catch (error) {
      logger.error("design-agent failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      await setActivity(roomId, {
        status: "error",
        message: "The design agent hit an error. Try again.",
        cursor: null,
      }).catch(() => {});
      // Structured-output / provider failures won't succeed on blind retry.
      throw new AbortTaskRunError(
        error instanceof Error ? error.message : "design-agent failed",
      );
    }
  },
});
