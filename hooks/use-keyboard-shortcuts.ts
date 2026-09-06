"use client"

import { useEffect } from "react"

import type { ReactFlowInstance } from "@xyflow/react"

const ZOOM_DURATION = 200

/** True when the event target is a field the user is typing into — shortcuts
 *  must not fire while editing a node/edge label or any other input. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
}

export type ShortcutAction =
  | "zoomIn"
  | "zoomOut"
  | "undo"
  | "redo"
  | "selectAll"

/** Pure key → action mapping (no DOM). `+`/`=` zoom in, `-` zoom out,
 *  Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y redo, Cmd/Ctrl+A select
 *  all. Any other combo — including a bare modifier press — returns null so
 *  the caller leaves the event alone. */
export function matchShortcut(event: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
}): ShortcutAction | null {
  const mod = event.metaKey || event.ctrlKey
  const key = event.key.toLowerCase()

  if (mod && key === "z") return event.shiftKey ? "redo" : "undo"
  if (mod && key === "y") return "redo"
  if (mod && key === "a") return "selectAll"
  if (mod) return null

  if (event.key === "+" || event.key === "=") return "zoomIn"
  if (event.key === "-") return "zoomOut"
  return null
}

interface KeyboardShortcutsOptions {
  reactFlow: Pick<ReactFlowInstance, "zoomIn" | "zoomOut">
  onUndo: () => void
  onRedo: () => void
  onSelectAll: () => void
}

/** Window-level canvas shortcuts: `+`/`=` zoom in, `-` zoom out,
 *  Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y redo,
 *  Cmd/Ctrl+A select all nodes. */
export function useKeyboardShortcuts({
  reactFlow,
  onUndo,
  onRedo,
  onSelectAll,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      const action = matchShortcut(event)
      if (!action) return
      event.preventDefault()

      switch (action) {
        case "zoomIn":
          reactFlow.zoomIn({ duration: ZOOM_DURATION })
          break
        case "zoomOut":
          reactFlow.zoomOut({ duration: ZOOM_DURATION })
          break
        case "undo":
          onUndo()
          break
        case "redo":
          onRedo()
          break
        case "selectAll":
          onSelectAll()
          break
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [reactFlow, onUndo, onRedo, onSelectAll])
}
