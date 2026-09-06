import type { Edge, Node } from "@xyflow/react"

/** Node body shape rendered on the canvas. */
export type CanvasNodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon"

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
  // React Flow requires edge data to be an index-signature record.
  [key: string]: unknown
}

/** Custom node/edge type keys used across the canvas. */
export const CANVAS_NODE_TYPE = "canvasNode"
export const CANVAS_EDGE_TYPE = "canvasEdge"

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>
export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>
