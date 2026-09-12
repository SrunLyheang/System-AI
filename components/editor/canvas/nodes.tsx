import { useCallback, useState, type KeyboardEvent } from "react";

import {
  Handle,
  NodeResizeControl,
  NodeToolbar,
  Position,
  useReactFlow,
  useStore,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import { Minus, Plus, Trash2 } from "lucide-react";

import {
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_TEXT_COLOR,
  NODE_COLORS,
  type CanvasNode,
  type CanvasNodeShape,
  type NodeColor,
} from "@/types/canvas";

import { CSS_SHAPES, SHAPE_SVG_PATHS } from "./shapes";

/** SVG outline stretched to the node box (`preserveAspectRatio="none"`), stroke
 *  kept crisp with `vector-effect="non-scaling-stroke"` so it scales with size. */
function SvgShape({
  shape,
  fill,
  stroke,
  selected,
}: {
  shape: CanvasNodeShape;
  fill: string;
  stroke: string;
  selected: boolean;
}) {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      fill={fill}
      stroke={stroke}
      strokeOpacity={selected ? 1 : 0.4}
      strokeWidth={2}
      vectorEffect="non-scaling-stroke"
      dangerouslySetInnerHTML={{ __html: SHAPE_SVG_PATHS[shape] ?? "" }}
    />
  );
}

const LABEL_PLACEHOLDER = "Add label";
const TEXT_PLACEHOLDER = "Add text";
const MIN_NODE_SIZE = 48;
const MAX_NODE_SIZE = 800;
/** Multiplier applied to a node's width/height per toolbar +/- click. */
const RESIZE_STEP = 1.2;
/** Drag-to-resize only at the corners, so the four side connection dots stay
 *  unobstructed. React Flow's `NodeResizer` would also put a handle on each
 *  edge midpoint, right on top of the dots. */
const RESIZE_CORNERS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

/** Width in px of the widest line of a textarea's text (or its placeholder when
 *  empty), measured in a detached span that copies the textarea's font. Used to
 *  size the node box to its label — the textarea is `w-full`, so its own
 *  `scrollWidth` is clamped to the current box and can't report overflow. */
function measureLineWidth(el: HTMLTextAreaElement): number {
  const cs = getComputedStyle(el);
  const span = document.createElement("span");
  span.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;white-space:pre;visibility:hidden";
  span.style.fontFamily = cs.fontFamily;
  span.style.fontSize = cs.fontSize;
  span.style.fontWeight = cs.fontWeight;
  span.style.fontStyle = cs.fontStyle;
  span.style.letterSpacing = cs.letterSpacing;
  document.body.appendChild(span);
  let max = 0;
  for (const line of (el.value || el.placeholder || "").split("\n")) {
    span.textContent = line || " ";
    max = Math.max(max, span.offsetWidth);
  }
  span.remove();
  return max;
}

/** Renders a dropped node as its shape variant with a centered, editable label.
 *  Borders are dim at rest and full-strength when the node is selected.
 *  Selected nodes also show subtle resize handles (React Flow `NodeResizer`). */
function CanvasNodeView({ id, data, selected = false }: NodeProps<CanvasNode>) {
  const { shape, label } = data;
  // A free-standing text comment: bare editable text, no shape box, no
  // connection handles — reuses every other node behaviour (drag, resize,
  // select, delete, persistence).
  const isText = shape === "text";
  const placeholder = isText ? TEXT_PLACEHOLDER : LABEL_PLACEHOLDER;
  // Nodes created before the color feature have no `textColor` (and an old
  // default `color`); fall back so their border/stroke/label still render.
  const color = data.color ?? DEFAULT_NODE_COLOR;
  const textColor = data.textColor ?? DEFAULT_NODE_TEXT_COLOR;
  const { updateNodeData, deleteElements, getNode } = useReactFlow();
  // Nodes are controlled by Liveblocks storage, so `useReactFlow().updateNode`
  // (an imperative store write) gets reverted on the next storage-driven render.
  // Push width/height through `onNodesChange` as a `dimensions` change instead —
  // the same channel `NodeResizer` uses, which `@liveblocks/react-flow`
  // persists to the node LiveObject.
  const onNodesChange = useStore((s) => s.onNodesChange);
  const setNodeSize = useCallback(
    (width: number, height: number) => {
      onNodesChange?.([
        {
          id,
          type: "dimensions",
          dimensions: { width, height },
          setAttributes: true,
        },
      ]);
    },
    [id, onNodesChange],
  );
  const [editing, setEditing] = useState(false);

  // Step the node's box up/down by RESIZE_STEP, clamped, keeping its ratio.
  const resizeNode = useCallback(
    (factor: number) => {
      const node = getNode(id);
      if (!node) return;
      const w = node.width ?? node.measured?.width ?? MIN_NODE_SIZE;
      const h = node.height ?? node.measured?.height ?? MIN_NODE_SIZE;
      const clamp = (v: number) =>
        Math.max(MIN_NODE_SIZE, Math.min(MAX_NODE_SIZE, Math.round(v)));
      setNodeSize(clamp(w * factor), clamp(h * factor));
    },
    [getNode, id, setNodeSize],
  );

  const stopEditing = useCallback(() => setEditing(false), []);
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }, []);

  // Grow the node box to fit its label (on double-click and on every keystroke)
  // so the text stays visible inside the shape. The textarea is `w-full`, so its
  // own `scrollWidth` is clamped to the box — measure the text in a detached
  // span that copies the textarea's font instead. Grow-only, matching the
  // sticky behaviour of manual resize.
  const fitSize = useCallback(
    (el: HTMLTextAreaElement) => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      const node = getNode(id);
      const curW = node?.width ?? node?.measured?.width ?? MIN_NODE_SIZE;
      const curH = node?.height ?? node?.measured?.height ?? MIN_NODE_SIZE;
      // Wrapper padding: px-3 (12px each side), py-2 (8px each side); +2px so
      // the caret at the end of the widest line isn't clipped.
      const needW = Math.min(MAX_NODE_SIZE, Math.ceil(measureLineWidth(el) + 26));
      const needH = Math.min(MAX_NODE_SIZE, Math.ceil(el.scrollHeight + 16));
      if (needW > curW || needH > curH) {
        setNodeSize(Math.max(curW, needW), Math.max(curH, needH));
      }
    },
    [getNode, id, setNodeSize],
  );
  const initTextarea = useCallback(
    (el: HTMLTextAreaElement | null) => {
      if (!el) return;
      fitSize(el);
      el.select();
    },
    [fitSize],
  );

  return (
    <div
      className="group relative flex h-full w-full select-none items-center justify-center px-3 py-2 text-center text-sm font-medium text-copy-primary"
      onDoubleClick={() => setEditing(true)}
    >
      {selected &&
        RESIZE_CORNERS.map((position) => (
          <NodeResizeControl
            key={position}
            position={position}
            minWidth={MIN_NODE_SIZE}
            minHeight={MIN_NODE_SIZE}
            maxWidth={MAX_NODE_SIZE}
            maxHeight={MAX_NODE_SIZE}
            // Small, quiet square. No resize line — a rectangle around a
            // diamond / circle reads as a stray box; the shape's own outline
            // brightening on select is the selection cue.
            style={{
              width: 9,
              height: 11,
              borderRadius: 2,
              border: `1.5px solid ${textColor}`,
              background: "var(--bg-surface)",
            }}
          />
        ))}
      {selected && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-[12px]"
          style={{ inset: -6, border: `1.5px solid ${textColor}99` }}
        />
      )}
      <NodeToolbar isVisible={selected} position={Position.Top} offset={12}>
        <div className="nodrag nopan flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-2 py-1.5 shadow-lg">
          {NODE_COLORS.map((pair) => (
            <ColorSwatch
              key={pair.fill}
              pair={pair}
              active={pair.fill === color}
              onSelect={() =>
                updateNodeData(id, { color: pair.fill, textColor: pair.text })
              }
            />
          ))}
          <span className="mx-0.5 h-5 w-px bg-surface-border" />
          <button
            type="button"
            onClick={() => resizeNode(1 / RESIZE_STEP)}
            aria-label="Decrease node size"
            title="Decrease size"
            className="flex h-7 w-7 items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => resizeNode(RESIZE_STEP)}
            aria-label="Increase node size"
            title="Increase size"
            className="flex h-7 w-7 items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-surface-border" />
          <button
            type="button"
            onClick={() => deleteElements({ nodes: [{ id }] })}
            aria-label="Delete node"
            title="Delete node"
            className="flex h-7 w-7 items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </NodeToolbar>
      {isText ? null : CSS_SHAPES.has(shape) ? (
        <div
          className="absolute inset-0"
          style={{
            border: `2px solid ${selected ? textColor : `${textColor}66`}`,
            borderRadius: shape === "rectangle" ? 8 : 9999,
            background: color,
          }}
        />
      ) : (
        <SvgShape
          shape={shape}
          fill={color}
          stroke={textColor}
          selected={selected}
        />
      )}
      {isText ? null : <NodeHandles />}
      {editing ? (
        <textarea
          ref={initTextarea}
          rows={1}
          defaultValue={label}
          placeholder={placeholder}
          onChange={(event) => {
            fitSize(event.currentTarget);
            updateNodeData(id, { label: event.target.value });
          }}
          onBlur={stopEditing}
          onKeyDown={onKeyDown}
          style={{ color: textColor }}
          className="nodrag nopan relative z-10 w-full select-text resize-none overflow-hidden border-0 bg-transparent text-center text-sm outline-none placeholder:text-copy-muted"
        />
      ) : (
        <span
          className={`relative z-10 whitespace-pre-wrap wrap-break-word ${label ? "" : "text-copy-muted"}`}
          style={label ? { color: textColor } : undefined}
        >
          {label || placeholder}
        </span>
      )}
    </div>
  );
}

/** Sides where a node exposes a connection handle. */
const HANDLE_POSITIONS: Array<[string, Position]> = [
  ["top", Position.Top],
  ["right", Position.Right],
  ["bottom", Position.Bottom],
  ["left", Position.Left],
];

/** Small white connection dots on all four sides. Hidden until the node
 *  (its `.group` wrapper) is hovered. Loose connection mode lets any handle
 *  act as both source and target. */
function NodeHandles() {
  return (
    <>
      {HANDLE_POSITIONS.map(([id, position]) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={position}
          // 28px transparent hit area; the visible 11px dot is drawn with
          // ::before so the click/hover target grows without the dot changing.
          // Faintly shown at rest so the connect points are discoverable, full
          // strength on node hover.
          className="h-7! w-7! border-0! bg-transparent! opacity-40! transition-opacity! group-hover:opacity-100! before:absolute before:left-1/2 before:top-1/2 before:h-[11px] before:w-[11px] before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:border-[1.5px] before:border-(--bg-base) before:bg-[#f5f5f7] before:content-['']"
        />
      ))}
    </>
  );
}

/** One color-pair swatch in a node's floating toolbar. Active swatch gets a
 *  ring; hover shows a tight glow in the pair's text color. */
function ColorSwatch({
  pair,
  active,
  onSelect,
}: {
  pair: NodeColor;
  active: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-pressed={active}
      aria-label={`Set node color ${pair.text}`}
      className="h-5 w-5 rounded-full border transition-transform hover:scale-110"
      style={{
        background: pair.fill,
        borderColor: active ? pair.text : `${pair.text}66`,
        boxShadow: active
          ? `0 0 0 2px var(--bg-surface), 0 0 0 3px ${pair.text}`
          : hover
            ? `0 0 5px 1px ${pair.text}`
            : undefined,
      }}
    />
  );
}

export const nodeTypes: NodeTypes = { [CANVAS_NODE_TYPE]: CanvasNodeView };
