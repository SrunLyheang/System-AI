import { useCallback, useRef, type DragEvent, type RefObject } from "react";

import { useReactFlow, type OnNodesChange } from "@xyflow/react";

import {
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_TEXT_COLOR,
  SHAPE_DEFAULT_SIZE,
  SHAPE_DRAG_TYPE,
  type CanvasNode,
  type CanvasNodeShape,
  type ShapeDragPayload,
} from "@/types/canvas";

interface UseShapeDropArgs {
  /** The canvas wrapper element, for the click/keyboard "drop at center" path. */
  wrapperRef: RefObject<HTMLDivElement | null>;
  onNodesChange: OnNodesChange<CanvasNode>;
}

interface UseShapeDrop {
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  /** Drop the shape at the center of the canvas viewport (keyboard / click path). */
  createShapeAtCenter: (shape: CanvasNodeShape) => void;
}

/** Shape creation from the bottom panel — native drag-and-drop onto the pane,
 *  and a click / keyboard path that drops at the viewport center. */
export function useShapeDrop({
  wrapperRef,
  onNodesChange,
}: UseShapeDropArgs): UseShapeDrop {
  const { screenToFlowPosition } = useReactFlow();
  const dropCounter = useRef(0);

  const addShape = useCallback(
    // `center` is where the shape's center should land, in flow coords; React Flow
    // node positions are the top-left corner, so shift by half the shape size.
    (payload: ShapeDragPayload, center: { x: number; y: number }) => {
      const id = `${payload.shape}-${Date.now()}-${dropCounter.current++}`;
      const node: CanvasNode = {
        id,
        type: CANVAS_NODE_TYPE,
        position: {
          x: center.x - payload.width / 2,
          y: center.y - payload.height / 2,
        },
        width: payload.width,
        height: payload.height,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR,
          textColor: DEFAULT_NODE_TEXT_COLOR,
          shape: payload.shape,
        },
      };
      onNodesChange([{ type: "add", item: node }]);
    },
    [onNodesChange],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData(SHAPE_DRAG_TYPE);
      if (!raw) return;

      let payload: ShapeDragPayload;
      try {
        payload = JSON.parse(raw) as ShapeDragPayload;
      } catch {
        return;
      }

      addShape(
        payload,
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      );
    },
    [screenToFlowPosition, addShape],
  );

  const createShapeAtCenter = useCallback(
    (shape: CanvasNodeShape) => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      addShape(
        { shape, ...SHAPE_DEFAULT_SIZE[shape] },
        screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }),
      );
    },
    [wrapperRef, screenToFlowPosition, addShape],
  );

  return { onDragOver, onDrop, createShapeAtCenter };
}
