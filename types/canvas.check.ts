/**
 * Self-check for the non-finite geometry guards.
 * Run: npx tsx types/canvas.check.ts
 */
import assert from "node:assert/strict"

import {
  finiteNumber,
  sanitizeNodeGeometry,
  type CanvasNode,
} from "@/types/canvas"

const node = (over: Partial<CanvasNode>): CanvasNode =>
  ({
    id: "n1",
    type: "canvasNode",
    position: { x: 0, y: 0 },
    data: { label: "", color: "#000", textColor: "#fff", shape: "rectangle" },
    ...over,
  }) as CanvasNode

// finiteNumber — only real, finite numbers pass
assert.equal(finiteNumber(42), 42)
assert.equal(finiteNumber(0), 0)
assert.equal(finiteNumber(-1.5), -1.5)
assert.equal(finiteNumber(NaN), undefined)
assert.equal(finiteNumber(Infinity), undefined)
assert.equal(finiteNumber(-Infinity), undefined)
assert.equal(finiteNumber(undefined), undefined)
assert.equal(finiteNumber("3"), undefined)
assert.equal(finiteNumber(null), undefined)

// sanitizeNodeGeometry — clean node is returned by reference (no churn)
const clean = node({ position: { x: 10, y: 20 }, width: 100, height: 50 })
assert.equal(sanitizeNodeGeometry(clean), clean, "unchanged node keeps its ref")

// undefined width/height are left as-is (React Flow measures them)
const unsized = node({ position: { x: 1, y: 2 } })
assert.equal(sanitizeNodeGeometry(unsized), unsized)

// NaN position -> 0, and a new object
const badPos = node({ position: { x: NaN, y: 5 } })
const fixedPos = sanitizeNodeGeometry(badPos)
assert.notEqual(fixedPos, badPos)
assert.deepEqual(fixedPos.position, { x: 0, y: 5 })

// Infinity size -> undefined so fitView can't produce a NaN viewport
const badSize = node({ position: { x: 0, y: 0 }, width: Infinity, height: 30 })
const fixedSize = sanitizeNodeGeometry(badSize)
assert.equal(fixedSize.width, undefined)
assert.equal(fixedSize.height, 30)

console.log("ok")
