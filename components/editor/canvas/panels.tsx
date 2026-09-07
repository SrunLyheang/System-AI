import type { DragEvent, ReactNode } from "react";

import { Panel, useReactFlow } from "@xyflow/react";
import {
  BoxSelect,
  Maximize2,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import {
  SHAPE_DEFAULT_SIZE,
  SHAPE_DRAG_TYPE,
  type CanvasNodeShape,
  type ShapeDragPayload,
} from "@/types/canvas";

import { createShapeGhost, SHAPE_ICONS } from "./shapes";

/** Bottom-center pill toolbar of draggable shapes. */
export function ShapePanel({
  onCreate,
}: {
  onCreate: (shape: CanvasNodeShape) => void;
}) {
  const onDragStart = (event: DragEvent, shape: CanvasNodeShape) => {
    const payload: ShapeDragPayload = { shape, ...SHAPE_DEFAULT_SIZE[shape] };
    event.dataTransfer.setData(SHAPE_DRAG_TYPE, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "move";

    // Ghost preview attached to the cursor; the browser drops it when the drag ends.
    const ghost = createShapeGhost(shape);
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(
      ghost,
      ghost.offsetWidth / 2,
      ghost.offsetHeight / 2,
    );
    window.setTimeout(() => ghost.remove(), 0);
  };

  return (
    <Panel position="bottom-center">
      <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface px-2 py-1.5 shadow-lg">
        {(Object.keys(SHAPE_ICONS) as CanvasNodeShape[]).map((shape) => {
          const Icon = SHAPE_ICONS[shape];
          return (
            <button
              key={shape}
              type="button"
              draggable
              onDragStart={(event) => onDragStart(event, shape)}
              onClick={() => onCreate(shape)}
              aria-label={`Add ${shape} to the canvas`}
              className="group relative flex h-8 w-8 cursor-grab items-center justify-center rounded-full text-copy-muted transition-colors hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
            >
              <Icon className="h-4 w-4" />
              <HoverLabel className="capitalize">{shape}</HoverLabel>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

/** One icon button in the floating control bar. */
function ControlButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="group relative flex h-8 w-8 items-center justify-center rounded-full text-copy-muted transition-colors hover:bg-elevated hover:text-copy-primary disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
      <HoverLabel>{label}</HoverLabel>
    </button>
  );
}

/** Tooltip that fades in above its parent button on hover. Parent needs
 *  `group relative`. */
function HoverLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-surface-border bg-surface px-2 py-1 text-xs font-medium text-copy-primary opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

/** Bottom-left pill bar: zoom controls and Liveblocks undo/redo. */
export function CanvasControls({
  onUndo,
  onRedo,
  onSelectAll,
  canUndo,
  canRedo,
  canSelectAll,
}: {
  onUndo: () => void;
  onRedo: () => void;
  onSelectAll: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canSelectAll: boolean;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Panel position="bottom-left">
      <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface px-2 py-1.5 shadow-lg">
        <ControlButton
          label="Zoom out"
          onClick={() => zoomOut({ duration: 200 })}
        >
          <ZoomOut className="h-4 w-4" />
        </ControlButton>
        <ControlButton
          label="Fit view"
          onClick={() => fitView({ duration: 200 })}
        >
          <Maximize2 className="h-4 w-4" />
        </ControlButton>
        <ControlButton
          label="Zoom in"
          onClick={() => zoomIn({ duration: 200 })}
        >
          <ZoomIn className="h-4 w-4" />
        </ControlButton>
        <span className="mx-1 h-5 w-px bg-surface-border" />
        <ControlButton
          label="Select all"
          onClick={onSelectAll}
          disabled={!canSelectAll}
        >
          <BoxSelect className="h-4 w-4" />
        </ControlButton>
        <span className="mx-1 h-5 w-px bg-surface-border" />
        <ControlButton label="Undo" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Redo" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </ControlButton>
      </div>
    </Panel>
  );
}
