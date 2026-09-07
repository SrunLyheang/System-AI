/**
 * Self-check for the pure decisions behind canvas persistence.
 * Run: npx tsx hooks/use-canvas-persistence.check.ts
 */
import assert from "node:assert/strict";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import {
  backoffMs,
  canvasPayload,
  mergeLoadedCanvas,
  shouldSave,
} from "@/hooks/use-canvas-persistence";

const node = (id: string): CanvasNode =>
  ({ id, position: { x: 0, y: 0 }, data: {} }) as unknown as CanvasNode;
const edge = (id: string): CanvasEdge =>
  ({ id, source: "a", target: "b" }) as unknown as CanvasEdge;

// canvasPayload — stable, order-sensitive JSON
assert.equal(canvasPayload([], []), '{"nodes":[],"edges":[]}');
assert.equal(
  canvasPayload([node("n1")], []),
  canvasPayload([node("n1")], []),
  "same graph → same string",
);
assert.notEqual(
  canvasPayload([node("n1")], []),
  canvasPayload([node("n2")], []),
);

// shouldSave — null baseline is never a save; equal payload is never a save
assert.equal(shouldSave("x", null), false, "not armed yet");
assert.equal(shouldSave("x", "x"), false, "no change");
assert.equal(shouldSave("y", "x"), true, "real edit");
assert.equal(shouldSave("", ""), false);

// backoffMs — 1s per attempt, capped at 10s
assert.equal(backoffMs(0), 1000);
assert.equal(backoffMs(1), 2000);
assert.equal(backoffMs(8), 9000);
assert.equal(backoffMs(9), 10_000);
assert.equal(backoffMs(50), 10_000, "capped");

// mergeLoadedCanvas — merge only into an empty room, only real content
assert.deepEqual(
  mergeLoadedCanvas({ nodes: [], edges: [] }, { nodes: [node("n1")], edges: [] }),
  { nodes: [node("n1")], edges: [] },
  "empty room + saved nodes → apply",
);
assert.equal(
  mergeLoadedCanvas(
    { nodes: [node("live")], edges: [] },
    { nodes: [node("n1")], edges: [] },
  ),
  null,
  "room already populated → skip (collaborator got there first)",
);
assert.equal(
  mergeLoadedCanvas(
    { nodes: [], edges: [edge("live")] },
    { nodes: [node("n1")], edges: [] },
  ),
  null,
  "room has edges only → still skip",
);
assert.equal(
  mergeLoadedCanvas({ nodes: [], edges: [] }, null),
  null,
  "no saved blob → skip",
);
assert.equal(
  mergeLoadedCanvas({ nodes: [], edges: [] }, { nodes: [], edges: [] }),
  null,
  "empty saved blob → skip",
);
assert.deepEqual(
  mergeLoadedCanvas({ nodes: [], edges: [] }, { edges: [edge("e1")] }),
  { nodes: [], edges: [edge("e1")] },
  "saved edges, missing nodes key → apply with nodes defaulted",
);

console.log("use-canvas-persistence.check: OK");
