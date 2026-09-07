import { useCallback } from "react";

import { useHistory } from "@liveblocks/react/suspense";
import {
  useReactFlow,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";

import type { CanvasTemplate } from "@/components/editor/starter-templates";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface UseTemplateImportArgs {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onDelete: (elements: { nodes: CanvasNode[]; edges: CanvasEdge[] }) => void;
  onNodesChange: OnNodesChange<CanvasNode>;
  onEdgesChange: OnEdgesChange<CanvasEdge>;
}

/**
 * Replace the whole canvas with a starter template. `onDelete` is the only path
 * that actually removes synced nodes/edges (`remove` changes are a no-op in
 * @liveblocks/react-flow); the adds run right after, so the template's nodes
 * land regardless of overlap with the cleared ids. `pause`/`resume` collapse the
 * clear + re-add into one undo step so a single ⌘Z restores the previous canvas
 * (as the modal promises).
 */
export function useTemplateImport({
  nodes,
  edges,
  onDelete,
  onNodesChange,
  onEdgesChange,
}: UseTemplateImportArgs): (template: CanvasTemplate) => void {
  const history = useHistory();
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>();

  return useCallback(
    (template: CanvasTemplate) => {
      history.pause();
      onDelete({ nodes, edges });
      onNodesChange(
        template.nodes.map((item) => ({ type: "add" as const, item })),
      );
      onEdgesChange(
        template.edges.map((item) => ({ type: "add" as const, item })),
      );
      history.resume();
      // ponytail: fixed delay to let the synced state settle before fitting.
      window.setTimeout(() => reactFlow.fitView({ duration: 200 }), 80);
    },
    [history, nodes, edges, onDelete, onNodesChange, onEdgesChange, reactFlow],
  );
}
