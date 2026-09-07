import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
} from "@xyflow/react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error";

/** Wait this long after the last node/edge change before writing to the server. */
const DEBOUNCE_MS = 2500;

/** Stable JSON for a canvas graph — the save-diff baseline and the PUT body. */
export function canvasPayload(nodes: CanvasNode[], edges: CanvasEdge[]): string {
  return JSON.stringify({ nodes, edges });
}

/**
 * True when `payload` is a real edit relative to the armed `baseline`. A `null`
 * baseline means the load-on-open check hasn't settled yet, so nothing is a save.
 */
export function shouldSave(payload: string, baseline: string | null): boolean {
  return baseline !== null && payload !== baseline;
}

/** Capped-linear backoff for the load retry loop: 1s, 2s, 3s … 10s. */
export function backoffMs(attempt: number): number {
  return Math.min(1000 * (attempt + 1), 10_000);
}

/**
 * Decide what to apply from a loaded canvas blob. Returns the nodes/edges to add
 * only when the room is still empty *and* the blob has content; `null` (skip) in
 * every other case — an already-populated room (a collaborator got there first)
 * or an empty/unsaved blob is never merged over live state.
 */
export function mergeLoadedCanvas(
  current: { nodes: unknown[]; edges: unknown[] },
  loaded: { nodes?: CanvasNode[]; edges?: CanvasEdge[] } | null,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } | null {
  if (current.nodes.length > 0 || current.edges.length > 0) return null;
  const nodes = loaded?.nodes ?? [];
  const edges = loaded?.edges ?? [];
  if (nodes.length === 0 && edges.length === 0) return null;
  return { nodes, edges };
}

interface CanvasPersistenceArgs {
  /** Liveblocks room ID — equal to the project ID. */
  roomId: string;
  /** Live synced graph, watched for edits to autosave. */
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  /** React Flow instance — snapshot reads for the load-emptiness check. */
  reactFlow: Pick<
    ReactFlowInstance<CanvasNode, CanvasEdge>,
    "getNodes" | "getEdges"
  >;
  /** Synced change appliers from `useLiveblocksFlow` — used to populate on load. */
  onNodesChange: OnNodesChange<CanvasNode>;
  onEdgesChange: OnEdgesChange<CanvasEdge>;
}

/**
 * Load-on-open + debounced autosave for the collaborative canvas, behind one
 * interface. On mount (and on room change) it pulls the saved canvas blob into
 * an empty room, retrying a transient blob outage indefinitely with capped
 * backoff; autosave is armed only after that read settles, so neither the
 * debounce nor the manual `save` can ever PUT over data it failed to read. The
 * graph observed at the moment it arms becomes the saved baseline, so opening a
 * project never writes on its own — only real edits do.
 *
 * Returns the current `status` plus `save`, an imperative trigger for the same
 * write the debounce performs (a no-op until the load has settled).
 */
export function useCanvasPersistence({
  roomId,
  nodes,
  edges,
  reactFlow,
  onNodesChange,
  onEdgesChange,
}: CanvasPersistenceArgs): {
  status: CanvasSaveStatus;
  save: () => Promise<void>;
} {
  const payload = useMemo(() => canvasPayload(nodes, edges), [nodes, edges]);

  const [status, setStatus] = useState<CanvasSaveStatus>("idle");
  const [baseline, setBaseline] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const activeRoomId = useRef(roomId);

  useEffect(() => {
    activeRoomId.current = roomId;
  }, [roomId]);

  // Room switch: forget the old baseline / readiness until the new room's load
  // settles. Adjusting state during render is the sanctioned "reset on prop
  // change" pattern and keeps the reset ahead of the save effect below.
  const [prevRoomId, setPrevRoomId] = useState(roomId);
  if (prevRoomId !== roomId) {
    setPrevRoomId(roomId);
    setBaseline(null);
    setStatus("idle");
    setLoaded(false);
  }

  // Arm on the first render where the room is loaded: snapshot the current graph
  // so the load-on-open populate is never echoed straight back as a save.
  if (loaded && baseline === null && prevRoomId === roomId) {
    setBaseline(payload);
  }

  // Load-on-open. Retry indefinitely with capped backoff; `setLoaded(true)` only
  // after a successful read (a saved canvas, an explicit empty blob, or a room a
  // collaborator already populated). After a few failures the status flips to
  // "error" so the stall isn't silent; a later success clears it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let attempt = 0; !cancelled; attempt++) {
        try {
          if (
            reactFlow.getNodes().length === 0 &&
            reactFlow.getEdges().length === 0
          ) {
            const res = await fetch(`/api/projects/${roomId}/canvas`);
            if (!res.ok) throw new Error(`canvas load failed: ${res.status}`);
            const { canvas } = (await res.json()) as {
              canvas: { nodes?: CanvasNode[]; edges?: CanvasEdge[] } | null;
            };
            if (cancelled) return;
            const merge = mergeLoadedCanvas(
              { nodes: reactFlow.getNodes(), edges: reactFlow.getEdges() },
              canvas,
            );
            if (merge) {
              onNodesChange(
                merge.nodes.map((item) => ({ type: "add" as const, item })),
              );
              onEdgesChange(
                merge.edges.map((item) => ({ type: "add" as const, item })),
              );
            }
          }
          if (!cancelled) {
            // Clear any "error" a failed attempt left; the save flow drives
            // status from here on.
            if (attempt > 0) setStatus("idle");
            // Arm on the next task, not synchronously: @liveblocks/react-flow
            // flushes the loaded `add` changes into `nodes`/`edges` on a later
            // tick, and the arm above captures its no-write baseline from the
            // first render where `loaded` is true. Arming now would snapshot an
            // empty graph and then PUT the freshly loaded content straight back.
            setTimeout(() => {
              if (!cancelled) setLoaded(true);
            }, 0);
          }
          return;
        } catch {
          if (!cancelled && attempt >= 2) setStatus("error");
          await new Promise((r) => setTimeout(r, backoffMs(attempt)));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, reactFlow, onNodesChange, onEdgesChange]);

  // Serialize writes per room: each save waits for the previous one, so a slow
  // older PUT can't land after — and overwrite — a newer snapshot.
  const chains = useRef(new Map<string, Promise<unknown>>());

  const save = useCallback(() => {
    // The manual Save button is wired the moment this hook returns, but a save
    // before the load settles would PUT the still-empty canvas over saved state.
    if (!loaded) return Promise.resolve();

    const requestRoomId = roomId;
    const previous = chains.current.get(requestRoomId) ?? Promise.resolve();
    setStatus("saving");
    const run = previous.then(() =>
      fetch(`/api/projects/${requestRoomId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).then((res) => {
        if (!res.ok) throw new Error(`save failed: ${res.status}`);
        if (activeRoomId.current === requestRoomId) {
          setBaseline(payload);
          setStatus("saved");
        }
      }),
    );
    chains.current.set(
      requestRoomId,
      run.catch(() => {}),
    );
    return run.catch(() => {
      if (activeRoomId.current === requestRoomId) {
        setStatus("error");
      }
    });
  }, [loaded, roomId, payload]);

  useEffect(() => {
    if (!loaded || !shouldSave(payload, baseline)) return;
    const timer = setTimeout(() => void save(), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [loaded, baseline, payload, save]);

  return { status, save };
}
