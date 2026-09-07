import { useEffect } from "react";

import { isEditableTarget } from "@/hooks/use-keyboard-shortcuts";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface UseCanvasKeyboardArgs {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onDelete: (elements: { nodes: CanvasNode[]; edges: CanvasEdge[] }) => void;
}

/**
 * Delete / Backspace removes the current selection through the synced `onDelete`
 * helper — the only path that mutates Liveblocks state, so the removal syncs to
 * every connected client. React Flow's built-in delete key is turned off
 * (`deleteKeyCode={null}` on `<ReactFlow>`) so this is the single route.
 * Selection (`node.selected` / `edge.selected`) is per-client local state.
 * Window-level, same as `useKeyboardShortcuts` — a wrapper listener only fires
 * when the canvas pane holds focus, so it missed Backspace after Cmd+A (which
 * can leave focus on the body or a toolbar button).
 */
export function useCanvasKeyboard({
  nodes,
  edges,
  onDelete,
}: UseCanvasKeyboardArgs): void {
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (isEditableTarget(event.target)) return;
      // A dialog, menu, or popover open over the canvas (Templates, Share, a
      // dropdown) traps focus and owns the keyboard — Backspace/Delete there
      // must not remove the selection sitting behind it.
      if (
        event.target instanceof Element &&
        event.target.closest('[role="dialog"], [role="menu"], [role="listbox"]')
      )
        return;
      const selectedNodes = nodes.filter((node) => node.selected);
      const selectedEdges = edges.filter((edge) => edge.selected);
      if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
      event.preventDefault();
      onDelete({ nodes: selectedNodes, edges: selectedEdges });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nodes, edges, onDelete]);
}
