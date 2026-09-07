/**
 * Self-check for the canvas PUT body validators.
 * Run: npx tsx "app/api/projects/[projectId]/canvas/route.check.ts"
 */
import assert from "node:assert/strict"

import { isCanvasEdge, isCanvasNode } from "@/app/api/projects/[projectId]/canvas/validate"

// Valid shapes pass.
assert.equal(isCanvasNode({ id: "n1", position: { x: 0, y: 0 }, data: {} }), true)
assert.equal(isCanvasEdge({ id: "e1", source: "n1", target: "n2" }), true)

// The exact payloads flagged in review must be rejected.
assert.equal(isCanvasNode({}), false)
assert.equal(isCanvasNode(1), false)
assert.equal(isCanvasNode(null), false)
assert.equal(isCanvasNode({ id: "n1" }), false) // no position
assert.equal(isCanvasNode({ position: { x: 0, y: 0 } }), false) // no id

assert.equal(isCanvasEdge({}), false)
assert.equal(isCanvasEdge({ id: "e1", source: "n1" }), false) // no target
assert.equal(isCanvasEdge({ id: "e1", source: 1, target: 2 }), false) // non-string ends

console.log("route.check: OK")
