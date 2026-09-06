/**
 * Self-check for starter-template data + preview bounds math.
 * Run: npx tsx components/editor/starter-templates.check.ts
 */
import assert from "node:assert/strict"

import {
  CANVAS_TEMPLATES,
  templateBounds,
} from "@/components/editor/starter-templates"

assert.ok(CANVAS_TEMPLATES.length >= 3, "at least three templates")

for (const t of CANVAS_TEMPLATES) {
  const ids = new Set(t.nodes.map((n) => n.id))
  assert.equal(ids.size, t.nodes.length, `${t.id}: node ids unique`)

  for (const e of t.edges) {
    assert.ok(ids.has(e.source), `${t.id}: edge source ${e.source} exists`)
    assert.ok(ids.has(e.target), `${t.id}: edge target ${e.target} exists`)
  }

  const b = templateBounds(t)
  assert.ok(b.width > 0 && b.height > 0, `${t.id}: positive bounds`)
  // Every node box must sit inside the reported bounds.
  for (const n of t.nodes) {
    assert.ok(n.position.x - b.minX >= 0, `${t.id}: ${n.id} left in bounds`)
    assert.ok(n.position.y - b.minY >= 0, `${t.id}: ${n.id} top in bounds`)
    assert.ok(
      n.position.x - b.minX + (n.width ?? 160) <= b.width + 1e-6,
      `${t.id}: ${n.id} right in bounds`,
    )
    assert.ok(
      n.position.y - b.minY + (n.height ?? 80) <= b.height + 1e-6,
      `${t.id}: ${n.id} bottom in bounds`,
    )
  }
}

console.log("starter-templates.check: OK")
