"use client"

import { useEffect } from "react"

import type { ReactFlowInstance } from "@xyflow/react"

const ZOOM_DURATION = 200

/** True when the event target is a field the user is typing into — shortcuts
 *  must not fire while editing a node/edge label or any other input. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
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

      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (mod && key === "z") {
        event.preventDefault()
        if (event.shiftKey) onRedo()
        else onUndo()
        return
      }
      if (mod && key === "y") {
        event.preventDefault()
        onRedo()
        return
      }
      if (mod && key === "a") {
        event.preventDefault()
        onSelectAll()
        return
      }
      if (mod) return

      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        reactFlow.zoomIn({ duration: ZOOM_DURATION })
      } else if (event.key === "-") {
        event.preventDefault()
        reactFlow.zoomOut({ duration: ZOOM_DURATION })
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [reactFlow, onUndo, onRedo, onSelectAll])
}
