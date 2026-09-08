"use client";

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
} from "@liveblocks/react/suspense";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useCanvasKeyboard } from "@/hooks/use-canvas-keyboard";
import { useCanvasPersistence } from "@/hooks/use-canvas-persistence";
import { useMarqueeSelection } from "@/hooks/use-marquee-selection";
import { useShapeDrop } from "@/hooks/use-shape-drop";
import { useTemplateImport } from "@/hooks/use-template-import";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import {
  sanitizeNodeGeometry,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas";

import { useRegisterCanvasSave } from "./save-context";
import { nodeTypes } from "./nodes";
import { defaultEdgeOptions, edgeTypes } from "./edges";
import { CanvasControls, ShapePanel } from "./panels";
import { AiActivityPanel, CanvasCursor, PresencePanel } from "./presence";

import "@xyflow/react/dist/style.css";
import "@liveblocks/react-flow/styles.css";

interface CanvasRoomProps {
  /** Liveblocks room ID — equal to the project ID. */
  roomId: string;
  /** Starter-templates modal open state, owned by the navbar trigger. */
  templatesOpen: boolean;
  onTemplatesOpenChange: (open: boolean) => void;
  onReady: () => void;
}

/** Sets up the Liveblocks room for a project. Wraps both the canvas and the AI
 *  sidebar so they share one room connection, presence, and feeds. */
function EditorRoom({
  roomId,
  children,
}: {
  roomId: string;
  children: ReactNode;
}) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, thinking: false }}
      >
        <CanvasErrorBoundary>{children}</CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

/** Renders the collaborative canvas. Must be nested inside {@link EditorRoom}. */
function CanvasRoom({
  roomId,
  templatesOpen,
  onTemplatesOpenChange,
  onReady,
}: CanvasRoomProps) {
  return (
    <ClientSideSuspense
      fallback={<CanvasMessage>Loading canvas…</CanvasMessage>}
    >
      {/* ReactFlowProvider lives one level up in WorkspaceShell so the AI
          sidebar can share this store. */}
      <Canvas
        roomId={roomId}
        templatesOpen={templatesOpen}
        onTemplatesOpenChange={onTemplatesOpenChange}
        onReady={onReady}
      />
    </ClientSideSuspense>
  );
}

/** React Flow surface wired to Liveblocks-synced nodes and edges. */
function Canvas({
  roomId,
  templatesOpen,
  onTemplatesOpenChange,
  onReady,
}: {
  roomId: string;
  templatesOpen: boolean;
  onTemplatesOpenChange: (open: boolean) => void;
  onReady: () => void;
}) {
  const {
    nodes: rawNodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDelete,
  } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    suspense: true,
    nodes: { initial: [] },
    edges: { initial: [] },
  });
  // Never let non-finite geometry reach React Flow — see sanitizeNodeGeometry.
  const nodes = useMemo(() => rawNodes.map(sanitizeNodeGeometry), [rawNodes]);
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  useEffect(() => {
    onReady();
  }, [onReady]);

  // Load-on-open + debounced autosave, both behind one interface. The hook pulls
  // the saved blob into an empty room (retrying a transient outage), arms save
  // only after that read settles, and exposes a `save` that no-ops until then.
  const { status: saveStatus, save } = useCanvasPersistence({
    roomId,
    nodes,
    edges,
    reactFlow,
    onNodesChange,
    onEdgesChange,
  });

  // Publish status + save to the workspace navbar's Save button (rendered
  // outside the Liveblocks room) via context, not a prop relay.
  const registerCanvasSave = useRegisterCanvasSave();
  useEffect(() => {
    registerCanvasSave({ status: saveStatus, save: () => void save() });
  }, [registerCanvasSave, saveStatus, save]);
  // Reset the shared save state when the canvas leaves (room switch / navigate
  // away) so the navbar button never holds a stale closure. Unmount-only —
  // `registerCanvasSave` is stable, so this never churns on an edit.
  useEffect(() => {
    return () => registerCanvasSave({ status: "idle", save: () => {} });
  }, [registerCanvasSave]);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const importTemplate = useTemplateImport({
    nodes,
    edges,
    onDelete,
    onNodesChange,
    onEdgesChange,
  });

  // Mark every node selected. `replace` (not `select`) so React Flow's
  // single-selection reconciler doesn't immediately clear all but one.
  const selectAll = useCallback(() => {
    if (nodes.length === 0) return;
    onNodesChange(
      nodes.map((n) => ({
        type: "replace" as const,
        id: n.id,
        item: { ...n, selected: true },
      })),
    );
  }, [nodes, onNodesChange]);

  useKeyboardShortcuts({
    reactFlow,
    onUndo: undo,
    onRedo: redo,
    onSelectAll: selectAll,
  });
  useCanvasKeyboard({ nodes, edges, onDelete });

  const { onDragOver, onDrop, createShapeAtCenter } = useShapeDrop({
    wrapperRef,
    onNodesChange,
  });
  const { marquee } = useMarqueeSelection({ wrapperRef, onNodesChange });

  return (
    <div
      ref={wrapperRef}
      className={`relative h-full w-full ${marquee ? "select-none" : ""}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {marquee && (
        <div
          className="pointer-events-none absolute z-50 rounded-[2px] border border-copy-primary bg-copy-primary/10"
          style={{
            left: marquee.x,
            top: marquee.y,
            width: marquee.w,
            height: marquee.h,
          }}
        />
      )}
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
        // All keyboard deletion goes through our own wrapper listener above, so
        // it can filter out edits in text fields and route through `onDelete`.
        deleteKeyCode={null}
        connectionMode={ConnectionMode.Loose}
        // Connections require an actual drag between two dots. Without this,
        // React Flow's click-to-connect (on by default) turns a click that
        // lands on a node's enlarged handle zone into a pending connection,
        // and the next node click completes it — a stray arrow appears.
        connectOnClick={false}
        // Hide the "React Flow" attribution badge.
        proOptions={{ hideAttribution: true }}
        // Two-finger trackpad scroll pans the canvas; pinch (ctrl+wheel) still
        // zooms via React Flow's zoomOnPinch default.
        panOnScroll
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Cursors components={{ Cursor: CanvasCursor }} />
        <PresencePanel />
        <AiActivityPanel />
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
      <StarterTemplatesModal
        open={templatesOpen}
        onOpenChange={onTemplatesOpenChange}
        onImport={importTemplate}
      />
    </div>
  );
}

function CanvasMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background px-6 text-center text-sm text-copy-muted">
      {children}
    </div>
  );
}

/** Fallback for Liveblocks connection / room errors. */
class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <CanvasMessage>
          Couldn’t connect to the collaborative canvas. Refresh to try again.
        </CanvasMessage>
      );
    }
    return this.props.children;
  }
}

export { CanvasRoom, EditorRoom };
