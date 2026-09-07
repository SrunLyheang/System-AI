import { useState } from "react";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  MarkerType,
  useReactFlow,
  type DefaultEdgeOptions,
  type EdgeProps,
  type EdgeTypes,
} from "@xyflow/react";
import { Trash2 } from "lucide-react";

import { CANVAS_EDGE_TYPE, type CanvasEdge } from "@/types/canvas";

const EDGE_STROKE_REST = "var(--text-muted)";
const EDGE_STROKE_ACTIVE = "var(--text-primary)";

/** New connections adopt the custom canvas edge with a rounded light stroke
 *  and an arrowhead. React Flow merges this into every edge that lacks the
 *  fields, both on connect and on render. */
export const defaultEdgeOptions: DefaultEdgeOptions = {
  type: CANVAS_EDGE_TYPE,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 14,
    height: 14,
    color: EDGE_STROKE_REST,
  },
  style: { strokeLinecap: "round" },
};

/** Right-angle routed edge: dim at rest, bright on hover / selection, with a
 *  wide invisible hit path and a double-click-to-edit inline label. */
function CanvasEdgeView({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected = false,
  markerEnd,
}: EdgeProps<CanvasEdge>) {
  const { updateEdgeData, deleteElements } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 0,
  });

  const active = hovered || selected || editing;
  const label = data?.label ?? "";

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={0}
        style={{
          stroke: active ? EDGE_STROKE_ACTIVE : EDGE_STROKE_REST,
          strokeWidth: 1.5,
          strokeLinecap: "round",
          opacity: active ? 1 : 0.65,
          transition: "stroke 120ms ease, opacity 120ms ease",
        }}
      />
      {/* Fat transparent path: easy to hover / click without a thicker line. */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ pointerEvents: "stroke", cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={(event) => {
          event.stopPropagation();
          setEditing(true);
        }}
      />
      {(active || label) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan flex items-center gap-1"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => {
              event.stopPropagation();
              setEditing(true);
            }}
          >
            {editing ? (
              <EdgeLabelInput
                initial={label}
                onCommit={(value) => {
                  if (value !== label) updateEdgeData(id, { label: value });
                  setEditing(false);
                }}
              />
            ) : label ? (
              <span className="rounded-full border border-surface-border bg-surface px-2.5 py-1 text-[11px] font-medium leading-none text-copy-primary shadow-sm">
                {label}
              </span>
            ) : (
              <span className="rounded-full border border-dashed border-surface-border bg-surface/95 px-2.5 py-1 text-[11px] leading-none text-copy-secondary shadow-sm">
                Double-click to label
              </span>
            )}
            {!editing && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteElements({ edges: [{ id }] });
                }}
                aria-label="Delete connection"
                title="Delete connection"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-surface-border bg-surface text-copy-muted shadow-sm transition-colors hover:bg-elevated hover:text-copy-primary"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

/** Inline edge-label field that grows with its text; commits the trimmed
 *  value on blur, Enter, or Escape. */
function EdgeLabelInput({
  initial,
  onCommit,
}: {
  initial: string;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <input
      autoFocus
      value={value}
      placeholder="Label"
      size={1}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onCommit(value.trim())}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      // `ch` is the width of "0"; real text (esp. wide glyphs like m/w) runs
      // wider, and the pill adds px-2 padding — a small pad keeps text from
      // clipping while typing, and centering splits any slack evenly.
      style={{ width: `calc(${Math.max(value.length, 4)}ch + 1.5rem)` }}
      className="nodrag nopan rounded-full border border-surface-border bg-surface px-2 py-0.5 text-center text-[10px] leading-none text-copy-primary outline-none"
    />
  );
}

export const edgeTypes: EdgeTypes = { [CANVAS_EDGE_TYPE]: CanvasEdgeView };
