import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react";

import {
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_TEXT_COLOR,
  SHAPE_DEFAULT_SIZE,
  type CanvasNodeShape,
} from "@/types/canvas";

/** Shapes drawn with a plain bordered box; the rest use scaled SVG. */
export const CSS_SHAPES = new Set<CanvasNodeShape>([
  "rectangle",
  "pill",
  "circle",
]);

/** Inner SVG markup for the shapes that can't be a bordered box.
 *  Shared by the node renderer and the drag-preview ghost. */
export const SHAPE_SVG_PATHS: Partial<Record<CanvasNodeShape, string>> = {
  diamond: '<polygon points="50,1 99,50 50,99 1,50" />',
  hexagon: '<polygon points="25,1 75,1 99,50 75,99 25,99 1,50" />',
  cylinder:
    '<path d="M1,13 A49,12 0 0 1 99,13 L99,87 A49,12 0 0 1 1,87 Z" />' +
    '<path d="M1,13 A49,12 0 0 0 99,13" fill="none" />',
};

/** Lucide icon per shape, for the bottom shape-panel buttons. */
export const SHAPE_ICONS: Record<CanvasNodeShape, LucideIcon> = {
  rectangle: RectangleHorizontal,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
};

/** Off-screen element used as the native drag image — same shape and default
 *  size the node will have on drop. Caller appends it, then removes it. */
export function createShapeGhost(shape: CanvasNodeShape): HTMLElement {
  const { width, height } = SHAPE_DEFAULT_SIZE[shape];
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;top:-1000px;left:-1000px;width:${width}px;height:${height}px;pointer-events:none;`;
  const svg = SHAPE_SVG_PATHS[shape];
  if (svg) {
    el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" fill="${DEFAULT_NODE_COLOR}" stroke="${DEFAULT_NODE_TEXT_COLOR}" stroke-width="2">${svg}</svg>`;
  } else {
    el.style.border = `2px solid ${DEFAULT_NODE_TEXT_COLOR}`;
    el.style.borderRadius = shape === "rectangle" ? "8px" : "9999px";
    el.style.background = DEFAULT_NODE_COLOR;
  }
  return el;
}
