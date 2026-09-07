import { useEffect, useState, type RefObject } from "react";

import { useReactFlow, type OnNodesChange } from "@xyflow/react";

import {
  SHAPE_DEFAULT_SIZE,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas";

interface Marquee {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseMarqueeSelectionArgs {
  wrapperRef: RefObject<HTMLDivElement | null>;
  onNodesChange: OnNodesChange<CanvasNode>;
}

/**
 * Right-drag marquee: React Flow's built-in selection box is left-button only
 * (it hardcodes `event.button !== 0`), so we draw our own rectangle on
 * right-drag and mark the nodes inside it selected through the synced
 * `onNodesChange` `replace` path (same one `selectAll` uses). Returns the live
 * rectangle to render, or `null` when no drag is in progress.
 */
export function useMarqueeSelection({
  wrapperRef,
  onNodesChange,
}: UseMarqueeSelectionArgs): { marquee: Marquee | null } {
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>();
  const [marquee, setMarquee] = useState<Marquee | null>(null);

  // React Flow's pane swallows mousedown before it can bubble to React's
  // delegated handlers, so we listen in the capture phase on the wrapper node.
  useEffect(() => {
    const wrap = wrapperRef.current;
    if (!wrap) return;

    // Window listeners for the active drag; hoisted so the effect cleanup can
    // also detach them if the canvas unmounts mid-drag.
    let onMove: ((e: MouseEvent) => void) | null = null;
    let onUp: ((e: MouseEvent) => void) | null = null;
    const detach = () => {
      if (onMove) window.removeEventListener("mousemove", onMove, true);
      if (onUp) window.removeEventListener("mouseup", onUp, true);
      onMove = onUp = null;
    };

    // Only the empty pane starts a marquee — never a node, an edge label, or
    // an input, so those keep their native right-click behavior.
    const onPane = (target: EventTarget | null) =>
      target instanceof HTMLElement && !!target.closest(".react-flow__pane");

    const onDown = (event: MouseEvent) => {
      if (event.button !== 2 || !onPane(event.target)) return;
      const bounds = wrap.getBoundingClientRect();
      event.preventDefault();
      event.stopPropagation();

      const start = { x: event.clientX, y: event.clientY };
      setMarquee({
        x: start.x - bounds.left,
        y: start.y - bounds.top,
        w: 0,
        h: 0,
      });

      onMove = (e: MouseEvent) => {
        setMarquee({
          x: Math.min(start.x, e.clientX) - bounds.left,
          y: Math.min(start.y, e.clientY) - bounds.top,
          w: Math.abs(e.clientX - start.x),
          h: Math.abs(e.clientY - start.y),
        });
      };
      onUp = (e: MouseEvent) => {
        detach();
        setMarquee(null);

        const box = {
          minX: Math.min(start.x, e.clientX),
          minY: Math.min(start.y, e.clientY),
          maxX: Math.max(start.x, e.clientX),
          maxY: Math.max(start.y, e.clientY),
        };
        // A near-still right-click isn't a marquee — leave selection alone.
        if (box.maxX - box.minX < 4 && box.maxY - box.minY < 4) return;

        const hit = new Set(
          reactFlow
            .getNodes()
            .filter((n) => {
              const w =
                n.measured?.width ??
                n.width ??
                SHAPE_DEFAULT_SIZE[n.data.shape].width;
              const h =
                n.measured?.height ??
                n.height ??
                SHAPE_DEFAULT_SIZE[n.data.shape].height;
              const tl = reactFlow.flowToScreenPosition(n.position);
              const br = reactFlow.flowToScreenPosition({
                x: n.position.x + w,
                y: n.position.y + h,
              });
              return (
                tl.x < box.maxX &&
                br.x > box.minX &&
                tl.y < box.maxY &&
                br.y > box.minY
              );
            })
            .map((n) => n.id),
        );

        onNodesChange(
          reactFlow.getNodes().map((n) => ({
            type: "replace" as const,
            id: n.id,
            item: { ...n, selected: hit.has(n.id) },
          })),
        );
      };
      window.addEventListener("mousemove", onMove, true);
      window.addEventListener("mouseup", onUp, true);
    };

    // Suppress the browser menu only over the pane (where the marquee lives) —
    // nodes, edge labels, and text inputs keep their native context menu.
    const blockMenu = (e: MouseEvent) => {
      if (onPane(e.target)) e.preventDefault();
    };
    wrap.addEventListener("mousedown", onDown, true);
    wrap.addEventListener("contextmenu", blockMenu);
    return () => {
      wrap.removeEventListener("mousedown", onDown, true);
      wrap.removeEventListener("contextmenu", blockMenu);
      detach();
    };
  }, [reactFlow, onNodesChange, wrapperRef]);

  return { marquee };
}
