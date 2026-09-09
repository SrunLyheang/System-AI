import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { z } from "zod";

import { generateChatText } from "@/lib/ai";
import { setActivity } from "@/lib/ai-activity";
import { getLiveblocks } from "@/lib/liveblocks";
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  finiteNumber,
  NODE_COLORS,
  NODE_SHAPES,
  SHAPE_DEFAULT_SIZE,
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
  // `.nullish()` everywhere below: Gemini's structured output emits `null` for
  // fields it chooses to omit, and plain `.optional()` rejects `null` — that
  // mismatch is what surfaces as "No object generated: response did not match
  // schema". `applyAction` already treats null and undefined the same.
  shape: z.enum(NODE_SHAPES).nullish(),
  label: z.string().nullish(),
  /** Index into the fixed palette (0 = neutral default). Range is clamped in
   *  `applyAction`, so keep the schema itself permissive. */
  colorIndex: z.number().nullish(),
  x: z.number().nullish(),
  y: z.number().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  source: z.string().nullish(),
  target: z.string().nullish(),
});

const planSchema = z.object({
  summary: z.string(),
  actions: z.array(actionSchema),
});

type Action = z.infer<typeof actionSchema>;

/** Appended to the system prompt. `generateText` + manual parse instead of
 *  `generateObject`: Gemini's native structured output rejects this schema's
 *  optional/union fields and returns "response did not match schema". */
const JSON_FORMAT_INSTRUCTIONS = `

Respond with ONLY a raw JSON object — no markdown fences, no commentary:
{"summary": string, "actions": Action[]}
Each Action is {"type": "addNode"|"moveNode"|"resizeNode"|"updateNode"|"deleteNode"|"addEdge"|"deleteEdge", "id": string, plus only the fields that action needs (shape, label, colorIndex, x, y, width, height, source, target). Omit unused fields entirely.`;

/** Extract the first JSON object from a model reply (tolerating stray prose or
 *  ``` fences) and validate it against `planSchema`. */
function parsePlan(text: string): z.infer<typeof planSchema> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(
      `model reply had no JSON object (reply length ${text.length})`,
    );
  }
  const parsed = planSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
  if (!parsed.success) {
    throw new Error(`model JSON did not match schema: ${parsed.error.message}`);
  }
  return parsed.data;
}

function normalizeColorIndex(
  value: number | null | undefined,
): number | null | undefined {
  if (value == null || !Number.isFinite(value))
    return value == null ? value : null;
  return Math.min(NODE_COLORS.length - 1, Math.max(0, Math.trunc(value)));
}

function redactedDiagnostic(value: unknown) {
  if (value == null) return { present: false };
  if (typeof value === "string") {
    return {
      present: true,
      kind: "text",
      length: Math.min(value.length, 1000),
      truncated: value.length > 1000,
    };
  }
  return { present: true, kind: typeof value };
}

function systemPrompt(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
) {
  const palette = NODE_COLORS.map(
    (c, i) => `${i}: fill ${c.fill} / text ${c.text}`,
  ).join("\n");
  return `You edit a collaborative diagram canvas by emitting a list of actions.

The \`actions\` array is the ONLY thing that changes the canvas — \`summary\` is
just a caption and modifies nothing. For any request that describes, asks for,
or refines a system, you MUST return a non-empty \`actions\` array: one addNode
per component/service/store the request implies, and one addEdge per connection
between them. Never return an empty \`actions\` array unless the user explicitly
asks a question that needs no canvas change. Do not describe work in \`summary\`
that you did not emit as actions.

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
      const colorIndex = normalizeColorIndex(a.colorIndex);
      const color = NODE_COLORS[colorIndex ?? 0] ?? NODE_COLORS[0];
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
      const colorIndex = normalizeColorIndex(a.colorIndex);
      if (a.label != null) patch.label = a.label;
      if (a.shape != null) patch.shape = a.shape;
      if (colorIndex != null) {
        const c = NODE_COLORS[colorIndex];
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
        message: "Reading your canvas…",
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
        message:
          nodes.length === 0
            ? "Planning the diagram from scratch…"
            : `Planning changes to ${nodes.length} node${
                nodes.length === 1 ? "" : "s"
              }…`,
      });

      const text = await generateChatText({
        system: systemPrompt(nodes, edges) + JSON_FORMAT_INSTRUCTIONS,
        prompt,
      });

      await setActivity(roomId, {
        status: "thinking",
        message: "Working out the layout…",
      });
      const plan = parsePlan(text);

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
        message: `Drawing ${plan.actions.length} change${
          plan.actions.length === 1 ? "" : "s"
        } onto the canvas…`,
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
        modelText: redactedDiagnostic((error as { text?: unknown })?.text),
        cause: redactedDiagnostic((error as { cause?: unknown })?.cause),
      });
      await setActivity(roomId, {
        status: "error",
        message: "The design agent hit an error. Try again.",
        cursor: null,
      }).catch(() => {});
      // Structured-output / provider failures won't succeed on blind retry.
      // Raw provider errors reach the subscribed client via the run surface, so
      // the message is generic — the detail is in the log above.
      throw new AbortTaskRunError("Design generation failed. Please try again.");
    }
  },
});
