import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error";

/** Wait this long after the last node/edge change before writing to the server. */
const DEBOUNCE_MS = 1500;

/**
 * Debounced autosave for the collaborative canvas. Watches `nodes`/`edges` and,
 * once `enabled` (the editor has finished its load-on-open check), PUTs the
 * canvas JSON to `/api/projects/[projectId]/canvas` whenever it changes.
 *
 * The canvas state observed at the moment `enabled` first flips true becomes the
 * saved baseline, so opening a project — whether it had saved state or not —
 * never triggers a write on its own; only real edits do.
 *
 * Returns the current `status` plus `save`, an imperative trigger for the same
 * write the debounce performs (used by the navbar Save button).
 */
export function useCanvasAutosave(
  projectId: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  enabled: boolean,
): { status: CanvasSaveStatus; save: () => void } {
  const payload = useMemo(
    () => JSON.stringify({ nodes, edges }),
    [nodes, edges],
  );

  const [status, setStatus] = useState<CanvasSaveStatus>("idle");
  const [baseline, setBaseline] = useState<string | null>(null);

  // Switching projects: forget the old baseline until the new project's load
  // settles. Adjusting state during render is the sanctioned pattern for
  // "reset when a prop changes" and keeps the reset ahead of the save effect.
  const [prevProjectId, setPrevProjectId] = useState(projectId);
  if (prevProjectId !== projectId) {
    setPrevProjectId(projectId);
    setBaseline(null);
    setStatus("idle");
  }

  // Arm on the first render where the canvas is loaded: capture the current
  // state as the baseline so the load itself is never saved back.
  if (enabled && baseline === null && prevProjectId === projectId) {
    setBaseline(payload);
  }

  // Serialize writes: each save waits for the previous one to finish, so a slow
  // older PUT can never land after — and overwrite — a newer snapshot.
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  const save = useCallback(() => {
    setStatus("saving");
    const run = chain.current.then(() =>
      fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).then((res) => {
        if (!res.ok) throw new Error(`save failed: ${res.status}`);
        setBaseline(payload);
        setStatus("saved");
      }),
    );
    chain.current = run.catch(() => {});
    return run.catch(() => setStatus("error"));
  }, [projectId, payload]);

  useEffect(() => {
    if (!enabled || baseline === null || payload === baseline) return;
    const timer = setTimeout(() => void save(), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [enabled, baseline, payload, save]);

  return { status, save };
}
