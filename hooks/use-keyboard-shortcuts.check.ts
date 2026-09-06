/**
 * Self-check for the pure keyboard-shortcut mapping.
 * Run: npx tsx hooks/use-keyboard-shortcuts.check.ts
 */
import assert from "node:assert/strict"

import { matchShortcut } from "@/hooks/use-keyboard-shortcuts"

const ev = (o: Partial<Parameters<typeof matchShortcut>[0]>) => ({
  key: "",
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  ...o,
})

// Zoom
assert.equal(matchShortcut(ev({ key: "+" })), "zoomIn")
assert.equal(matchShortcut(ev({ key: "=" })), "zoomIn")
assert.equal(matchShortcut(ev({ key: "-" })), "zoomOut")

// Undo / redo, both modifiers, both cases
assert.equal(matchShortcut(ev({ key: "z", metaKey: true })), "undo")
assert.equal(matchShortcut(ev({ key: "z", ctrlKey: true })), "undo")
assert.equal(matchShortcut(ev({ key: "Z", metaKey: true, shiftKey: true })), "redo")
assert.equal(matchShortcut(ev({ key: "z", ctrlKey: true, shiftKey: true })), "redo")
assert.equal(matchShortcut(ev({ key: "y", metaKey: true })), "redo")

// Select all
assert.equal(matchShortcut(ev({ key: "a", ctrlKey: true })), "selectAll")

// Left alone: unmapped keys, modifier-only, and modified zoom keys
assert.equal(matchShortcut(ev({ key: "c", metaKey: true })), null)
assert.equal(matchShortcut(ev({ key: "Meta", metaKey: true })), null)
assert.equal(matchShortcut(ev({ key: "+", metaKey: true })), null)
assert.equal(matchShortcut(ev({ key: "x" })), null)

console.log("use-keyboard-shortcuts.check: OK")
