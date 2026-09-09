import type { Edge, Node } from "@xyflow/react"

/** The 6 supported node body shapes (see ui-context.md). */
export const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
  "text",
] as const

/** Node body shape rendered on the canvas. */
export type CanvasNodeShape = (typeof NODE_SHAPES)[number]

/** A predefined node background / paired label color. */
export interface NodeColor {
  /** Node background fill. */
  fill: string
  /** Label color, tuned for contrast on `fill` (see ui-context.md). */
  text: string
}

/** 8 predefined node color pairs. First entry is the default. */
export const NODE_COLORS: NodeColor[] = [
  { fill: "#1F1F1F", text: "#EDEDED" },
  { fill: "#10233D", text: "#52A8FF" },
  { fill: "#2E1938", text: "#BF7AF0" },
  { fill: "#331B00", text: "#FF990A" },
  { fill: "#3C1618", text: "#FF6166" },
  { fill: "#3A1726", text: "#F75F8F" },
  { fill: "#0F2E18", text: "#62C073" },
  { fill: "#062822", text: "#0AC7B4" },
]

/** Default fill/text for a freshly dropped node. */
export const DEFAULT_NODE_COLOR = NODE_COLORS[0].fill
export const DEFAULT_NODE_TEXT_COLOR = NODE_COLORS[0].text

/** Default width/height per shape, used as the shape-panel drag payload size. */
export const SHAPE_DEFAULT_SIZE: Record<
  CanvasNodeShape,
  { width: number; height: number }
> = {
  rectangle: { width: 160, height: 80 },
  diamond: { width: 180, height: 140 },
  circle: { width: 120, height: 120 },
  pill: { width: 160, height: 64 },
  cylinder: { width: 120, height: 120 },
  hexagon: { width: 160, height: 100 },
  // Free-standing text comment: no shape box, grows to fit its content.
  text: { width: 200, height: 40 },
}

/** `dataTransfer` MIME type for a shape dragged from the bottom panel. */
export const SHAPE_DRAG_TYPE = "application/x-canvas-shape"

/** Payload serialized into `dataTransfer` while dragging a shape. */
export interface ShapeDragPayload {
  shape: CanvasNodeShape
  width: number
  height: number
}

/** Data carried by every canvas node. */
export interface CanvasNodeData {
  label: string
  color: string
  textColor: string
  shape: CanvasNodeShape
  // React Flow requires node data to be an index-signature record.
  [key: string]: unknown
}

/** Data carried by every canvas edge. */
export interface CanvasEdgeData {
  /** Inline edge label, edited by double-clicking the edge. */
  label?: string
  /** Position of the label along the edge as a 0..1 fraction of the path
   *  length, set by dragging the label. Absent means the path midpoint. */
  labelT?: number
  // React Flow requires edge data to be an index-signature record.
  [key: string]: unknown
}

/** Custom node/edge type keys used across the canvas. */
export const CANVAS_NODE_TYPE = "canvasNode"
export const CANVAS_EDGE_TYPE = "canvasEdge"

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>
export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>

/** A finite `number`, or `undefined` when the value is missing / `NaN` /
 *  `±Infinity`. `z.number()` accepts `NaN` and `x ?? 0` / `x != null` don't
 *  catch it, so model-supplied coordinates must pass through here. */
export function finiteNumber(n: unknown): number | undefined {
  return typeof n === "number" && Number.isFinite(n) ? n : undefined
}

/** Replace any non-finite coordinate/size on a node with a safe value. One node
 *  with `NaN`/`Infinity` in `position` or `width`/`height` makes React Flow's
 *  `fitView` compute a `NaN` viewport transform, which crashes `<Background>`
 *  ("Received NaN for the `y` attribute") and unmounts the whole canvas subtree
 *  — the AI status panel included. Bad geometry reaches the client from an AI
 *  plan or from an autosave blob written before the agent was hardened, so the
 *  canvas guards here too. Returns the same reference when nothing needs fixing
 *  so untouched nodes don't churn React Flow. */
export function sanitizeNodeGeometry(node: CanvasNode): CanvasNode {
  const x = finiteNumber(node.position?.x) ?? 0
  const y = finiteNumber(node.position?.y) ?? 0
  const width = node.width == null ? node.width : finiteNumber(node.width)
  const height = node.height == null ? node.height : finiteNumber(node.height)
  if (
    x === node.position?.x &&
    y === node.position?.y &&
    width === node.width &&
    height === node.height
  ) {
    return node
  }
  return { ...node, position: { ...node.position, x, y }, width, height }
}

/** Liveblocks Storage key holding the shared design-agent activity. */
export const AI_STORAGE_KEY = "ai"

/** Design-agent presence + progress, written by the Trigger.dev task
 *  (`src/trigger/design-agent.ts`) and read by every room participant. A plain
 *  JSON object (not a nested `LiveObject`) — the whole value is replaced on each
 *  update. `type`, not `interface`, so it satisfies Liveblocks' Lson check. */
export type AiActivity = {
  status: "idle" | "thinking" | "generating" | "done" | "error"
  message: string
  /** Canvas-space point the agent is working near, or null. */
  cursor: { x: number; y: number } | null
  /** Epoch ms of the last update. */
  updatedAt: number
}
