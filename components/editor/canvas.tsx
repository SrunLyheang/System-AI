"use client"

import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react"

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
} from "@liveblocks/react/suspense"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  ConnectionMode,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  MarkerType,
  NodeResizer,
  NodeToolbar,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type DefaultEdgeOptions,
  type EdgeProps,
  type EdgeTypes,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react"
import {
  BoxSelect,
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Maximize2,
  Pill,
  RectangleHorizontal,
  Redo2,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react"

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import {
  IMPORT_TEMPLATE_EVENT,
  type CanvasTemplate,
} from "@/components/editor/starter-templates"

import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_TEXT_COLOR,
  NODE_COLORS,
  SHAPE_DEFAULT_SIZE,
  SHAPE_DRAG_TYPE,
  type CanvasEdge,
  type CanvasEdgeData,
  type CanvasNode,
  type CanvasNodeShape,
  type NodeColor,
  type ShapeDragPayload,
} from "@/types/canvas"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-flow/styles.css"

interface CanvasRoomProps {
  /** Liveblocks room ID — equal to the project ID. */
  roomId: string
}

/** Sets up the Liveblocks room for a project and renders the collaborative canvas. */
function CanvasRoom({ roomId }: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, isThinking: false }}
      >
        <CanvasErrorBoundary>
          <ClientSideSuspense
            fallback={<CanvasMessage>Loading canvas…</CanvasMessage>}
          >
            <ReactFlowProvider>
              <Canvas />
            </ReactFlowProvider>
          </ClientSideSuspense>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

/** Shapes drawn with a plain bordered box; the rest use scaled SVG. */
const CSS_SHAPES = new Set<CanvasNodeShape>(["rectangle", "pill", "circle"])

/** Inner SVG markup for the shapes that can't be a bordered box.
 *  Shared by the node renderer and the drag-preview ghost. */
const SHAPE_SVG_PATHS: Partial<Record<CanvasNodeShape, string>> = {
  diamond: '<polygon points="50,1 99,50 50,99 1,50" />',
  hexagon: '<polygon points="25,1 75,1 99,50 75,99 25,99 1,50" />',
  cylinder:
    '<path d="M1,13 A49,12 0 0 1 99,13 L99,87 A49,12 0 0 1 1,87 Z" />' +
    '<path d="M1,13 A49,12 0 0 0 99,13" fill="none" />',
}

/** SVG outline stretched to the node box (`preserveAspectRatio="none"`), stroke
 *  kept crisp with `vector-effect="non-scaling-stroke"` so it scales with size. */
function SvgShape({
  shape,
  fill,
  stroke,
  selected,
}: {
  shape: CanvasNodeShape
  fill: string
  stroke: string
  selected: boolean
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
  )
}

const LABEL_PLACEHOLDER = "Add label"
const MIN_NODE_SIZE = 48

/** Renders a dropped node as its shape variant with a centered, editable label.
 *  Borders are dim at rest and full-strength when the node is selected.
 *  Selected nodes also show subtle resize handles (React Flow `NodeResizer`). */
function CanvasNodeView({ id, data, selected = false }: NodeProps<CanvasNode>) {
  const { shape, color, textColor, label } = data
  const { updateNodeData, deleteElements } = useReactFlow()
  const [editing, setEditing] = useState(false)

  const stopEditing = useCallback(() => setEditing(false), [])
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }, [])

  // Grow the textarea to fit its text so the flex parent can keep it centered.
  const fitHeight = (el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }
  const initTextarea = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return
    fitHeight(el)
    el.select()
  }, [])

  return (
    <div
      className="group relative flex h-full w-full items-center justify-center px-3 py-2 text-center text-sm font-medium text-copy-primary"
      onDoubleClick={() => setEditing(true)}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_SIZE}
        minHeight={MIN_NODE_SIZE}
        lineStyle={{ borderColor: `${color}55` }}
        handleStyle={{
          width: 7,
          height: 7,
          borderRadius: 2,
          border: `1px solid ${color}`,
          background: "var(--bg-surface)",
        }}
      />
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
            onClick={() => deleteElements({ nodes: [{ id }] })}
            aria-label="Delete node"
            title="Delete node"
            className="flex h-5 w-5 items-center justify-center rounded-full text-copy-muted transition-colors hover:bg-elevated hover:text-copy-primary"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </NodeToolbar>
      {CSS_SHAPES.has(shape) ? (
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
      <NodeHandles />
      {editing ? (
        <textarea
          ref={initTextarea}
          rows={1}
          defaultValue={label}
          placeholder={LABEL_PLACEHOLDER}
          onChange={(event) => {
            fitHeight(event.currentTarget)
            updateNodeData(id, { label: event.target.value })
          }}
          onBlur={stopEditing}
          onKeyDown={onKeyDown}
          style={{ color: textColor }}
          className="nodrag nopan relative z-10 w-full resize-none overflow-hidden border-0 bg-transparent text-center text-sm outline-none placeholder:text-copy-muted"
        />
      ) : (
        <span
          className={`relative z-10 whitespace-pre-wrap wrap-break-word ${label ? "" : "text-copy-muted"}`}
          style={label ? { color: textColor } : undefined}
        >
          {label || LABEL_PLACEHOLDER}
        </span>
      )}
    </div>
  )
}

/** Sides where a node exposes a connection handle. */
const HANDLE_POSITIONS: Array<[string, Position]> = [
  ["top", Position.Top],
  ["right", Position.Right],
  ["bottom", Position.Bottom],
  ["left", Position.Left],
]

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
          className="opacity-0! transition-opacity! group-hover:opacity-100!"
          style={{
            width: 9,
            height: 9,
            background: "#f5f5f7",
            border: "1.5px solid var(--bg-base)",
          }}
        />
      ))}
    </>
  )
}

/** One color-pair swatch in a node's floating toolbar. Active swatch gets a
 *  ring; hover shows a tight glow in the pair's text color. */
function ColorSwatch({
  pair,
  active,
  onSelect,
}: {
  pair: NodeColor
  active: boolean
  onSelect: () => void
}) {
  const [hover, setHover] = useState(false)
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
  )
}

/** Off-screen element used as the native drag image — same shape and default
 *  size the node will have on drop. Caller appends it, then removes it. */
function createShapeGhost(shape: CanvasNodeShape): HTMLElement {
  const { width, height } = SHAPE_DEFAULT_SIZE[shape]
  const el = document.createElement("div")
  el.style.cssText = `position:fixed;top:-1000px;left:-1000px;width:${width}px;height:${height}px;pointer-events:none;`
  const svg = SHAPE_SVG_PATHS[shape]
  if (svg) {
    el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" fill="${DEFAULT_NODE_COLOR}" stroke="${DEFAULT_NODE_TEXT_COLOR}" stroke-width="2">${svg}</svg>`
  } else {
    el.style.border = `2px solid ${DEFAULT_NODE_TEXT_COLOR}`
    el.style.borderRadius = shape === "rectangle" ? "8px" : "9999px"
    el.style.background = DEFAULT_NODE_COLOR
  }
  return el
}

const nodeTypes: NodeTypes = { [CANVAS_NODE_TYPE]: CanvasNodeView }

/** Lets a custom edge push a label change through the Liveblocks-synced
 *  `onEdgesChange` (React Flow has no `updateEdgeData` in this version). */
const EdgeDataContext = createContext<
  (id: string, data: Partial<CanvasEdgeData>) => void
>(() => {})

const EDGE_STROKE_REST = "var(--text-muted)"
const EDGE_STROKE_ACTIVE = "var(--text-primary)"

/** New connections adopt the custom canvas edge with a rounded light stroke
 *  and an arrowhead. React Flow merges this into every edge that lacks the
 *  fields, both on connect and on render. */
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: CANVAS_EDGE_TYPE,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 14,
    height: 14,
    color: EDGE_STROKE_REST,
  },
  style: { strokeLinecap: "round" },
}

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
  const updateEdgeData = useContext(EdgeDataContext)
  const { deleteElements } = useReactFlow()
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 0,
  })

  const active = hovered || selected || editing
  const label = data?.label ?? ""

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
          event.stopPropagation()
          setEditing(true)
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
              event.stopPropagation()
              setEditing(true)
            }}
          >
            {editing ? (
              <EdgeLabelInput
                initial={label}
                onCommit={(value) => {
                  if (value !== label) updateEdgeData(id, { label: value })
                  setEditing(false)
                }}
              />
            ) : label ? (
              <span className="rounded-full border border-surface-border bg-surface px-2 py-0.5 text-[10px] leading-none text-copy-secondary shadow-sm">
                {label}
              </span>
            ) : (
              <span className="rounded-full px-2 py-0.5 text-[10px] leading-none text-copy-faint">
                Double-click to label
              </span>
            )}
            {!editing && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  deleteElements({ edges: [{ id }] })
                }}
                aria-label="Delete connection"
                title="Delete connection"
                className="flex h-5 w-5 items-center justify-center rounded-full border border-surface-border bg-surface text-copy-muted shadow-sm transition-colors hover:bg-elevated hover:text-copy-primary"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

/** Inline edge-label field that grows with its text; commits the trimmed
 *  value on blur, Enter, or Escape. */
function EdgeLabelInput({
  initial,
  onCommit,
}: {
  initial: string
  onCommit: (value: string) => void
}) {
  const [value, setValue] = useState(initial)
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
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
      style={{ width: `${Math.max(value.length, 5)}ch` }}
      className="nodrag nopan rounded-full border border-surface-border bg-surface px-2 py-0.5 text-[10px] leading-none text-copy-primary outline-none"
    />
  )
}

const edgeTypes: EdgeTypes = { [CANVAS_EDGE_TYPE]: CanvasEdgeView }

const SHAPE_ICONS: Record<CanvasNodeShape, LucideIcon> = {
  rectangle: RectangleHorizontal,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
}

/** Bottom-center pill toolbar of draggable shapes. */
function ShapePanel({
  onCreate,
}: {
  onCreate: (shape: CanvasNodeShape) => void
}) {
  const onDragStart = (event: DragEvent, shape: CanvasNodeShape) => {
    const payload: ShapeDragPayload = { shape, ...SHAPE_DEFAULT_SIZE[shape] }
    event.dataTransfer.setData(SHAPE_DRAG_TYPE, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "move"

    // Ghost preview attached to the cursor; the browser drops it when the drag ends.
    const ghost = createShapeGhost(shape)
    document.body.appendChild(ghost)
    event.dataTransfer.setDragImage(
      ghost,
      ghost.offsetWidth / 2,
      ghost.offsetHeight / 2,
    )
    window.setTimeout(() => ghost.remove(), 0)
  }

  return (
    <Panel position="bottom-center">
      <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface px-2 py-1.5 shadow-lg">
        {(Object.keys(SHAPE_ICONS) as CanvasNodeShape[]).map((shape) => {
          const Icon = SHAPE_ICONS[shape]
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
          )
        })}
      </div>
    </Panel>
  )
}

/** One icon button in the floating control bar. */
function ControlButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
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
  )
}

/** Tooltip that fades in above its parent button on hover. Parent needs
 *  `group relative`. */
function HoverLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-surface-border bg-surface px-2 py-1 text-xs font-medium text-copy-primary opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${className ?? ""}`}
    >
      {children}
    </span>
  )
}

/** Bottom-left pill bar: zoom controls and Liveblocks undo/redo. */
function CanvasControls({
  onUndo,
  onRedo,
  onSelectAll,
  canUndo,
  canRedo,
  canSelectAll,
}: {
  onUndo: () => void
  onRedo: () => void
  onSelectAll: () => void
  canUndo: boolean
  canRedo: boolean
  canSelectAll: boolean
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  return (
    <Panel position="bottom-left">
      <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface px-2 py-1.5 shadow-lg">
        <ControlButton label="Zoom out" onClick={() => zoomOut({ duration: 200 })}>
          <ZoomOut className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Fit view" onClick={() => fitView({ duration: 200 })}>
          <Maximize2 className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Zoom in" onClick={() => zoomIn({ duration: 200 })}>
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
  )
}

/** React Flow surface wired to Liveblocks-synced nodes and edges. */
function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>()
  const { screenToFlowPosition } = reactFlow
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  const wrapperRef = useRef<HTMLDivElement>(null)
  const dropCounter = useRef(0)

  // Replace the whole canvas with a starter template (fired from the navbar).
  useEffect(() => {
    function onImport(event: Event) {
      const { nodes: tplNodes, edges: tplEdges } = (
        event as CustomEvent<CanvasTemplate>
      ).detail
      onNodesChange([
        ...nodes.map((n) => ({ type: "remove" as const, id: n.id })),
        ...tplNodes.map((item) => ({ type: "add" as const, item })),
      ])
      onEdgesChange([
        ...edges.map((e) => ({ type: "remove" as const, id: e.id })),
        ...tplEdges.map((item) => ({ type: "add" as const, item })),
      ])
      // ponytail: fixed delay to let the synced state settle before fitting.
      window.setTimeout(() => reactFlow.fitView({ duration: 200 }), 80)
    }
    window.addEventListener(IMPORT_TEMPLATE_EVENT, onImport)
    return () => window.removeEventListener(IMPORT_TEMPLATE_EVENT, onImport)
  }, [nodes, edges, onNodesChange, onEdgesChange, reactFlow])

  // Route an edge-label edit through the same synced change stream as everything else.
  const updateEdgeData = useCallback(
    (edgeId: string, patch: Partial<CanvasEdgeData>) => {
      const edge = edges.find((e) => e.id === edgeId)
      if (!edge) return
      onEdgesChange([
        {
          type: "replace",
          id: edgeId,
          item: { ...edge, data: { ...edge.data, ...patch } },
        },
      ])
    },
    [edges, onEdgesChange],
  )

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  // Mark every node selected. `replace` (not `select`) so React Flow's
  // single-selection reconciler doesn't immediately clear all but one.
  const selectAll = useCallback(() => {
    if (nodes.length === 0) return
    onNodesChange(
      nodes.map((n) => ({
        type: "replace" as const,
        id: n.id,
        item: { ...n, selected: true },
      })),
    )
  }, [nodes, onNodesChange])

  useKeyboardShortcuts({
    reactFlow,
    onUndo: undo,
    onRedo: redo,
    onSelectAll: selectAll,
  })

  const addShape = useCallback(
    (payload: ShapeDragPayload, position: { x: number; y: number }) => {
      const id = `${payload.shape}-${Date.now()}-${dropCounter.current++}`
      const node: CanvasNode = {
        id,
        type: CANVAS_NODE_TYPE,
        position,
        width: payload.width,
        height: payload.height,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR,
          textColor: DEFAULT_NODE_TEXT_COLOR,
          shape: payload.shape,
        },
      }
      onNodesChange([{ type: "add", item: node }])
    },
    [onNodesChange],
  )

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData(SHAPE_DRAG_TYPE)
      if (!raw) return

      let payload: ShapeDragPayload
      try {
        payload = JSON.parse(raw) as ShapeDragPayload
      } catch {
        return
      }

      addShape(
        payload,
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      )
    },
    [screenToFlowPosition, addShape],
  )

  /** Drops the shape at the center of the canvas viewport (keyboard / click path). */
  const createShapeAtCenter = useCallback(
    (shape: CanvasNodeShape) => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      addShape(
        { shape, ...SHAPE_DEFAULT_SIZE[shape] },
        screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }),
      )
    },
    [screenToFlowPosition, addShape],
  )

  return (
    <div
      ref={wrapperRef}
      className="h-full w-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <EdgeDataContext.Provider value={updateEdgeData}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDelete={onDelete}
          connectionMode={ConnectionMode.Loose}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <CanvasControls
            onUndo={undo}
            onRedo={redo}
            onSelectAll={selectAll}
            canUndo={canUndo}
            canRedo={canRedo}
            canSelectAll={nodes.length > 0}
          />
          <ShapePanel onCreate={createShapeAtCenter} />
        </ReactFlow>
      </EdgeDataContext.Provider>
    </div>
  )
}

function CanvasMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background px-6 text-center text-sm text-copy-muted">
      {children}
    </div>
  )
}

/** Fallback for Liveblocks connection / room errors. */
class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <CanvasMessage>
          Couldn’t connect to the collaborative canvas. Refresh to try again.
        </CanvasMessage>
      )
    }
    return this.props.children
  }
}

export { CanvasRoom }
