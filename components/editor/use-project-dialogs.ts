"use client"

import { useCallback, useMemo, useState } from "react"

import type { MockProject } from "@/components/editor/mock-projects"
import { slugify } from "@/lib/slug"

type ActiveDialog = "create" | "rename" | "delete" | null

interface UseProjectDialogs {
  /** Which project dialog is currently open, if any. */
  activeDialog: ActiveDialog
  /** The project a rename/delete action targets. `null` for create. */
  targetProject: MockProject | null
  /** Controlled value of the name input (create + rename). */
  name: string
  /** Live slug derived from `name`, shown as a preview in the create dialog. */
  slugPreview: string
  /** True while a submit is in flight. */
  isLoading: boolean
  setName: (value: string) => void
  openCreate: () => void
  openRename: (project: MockProject) => void
  openDelete: (project: MockProject) => void
  close: () => void
  submitCreate: () => void
  submitRename: () => void
  confirmDelete: () => void
}

// No persistence yet (see feature spec 04); this stands in for the round-trip a
// real mutation would take so the dialogs can exercise their loading state.
const SIMULATED_LATENCY_MS = 400

export function useProjectDialogs(): UseProjectDialogs {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const [targetProject, setTargetProject] = useState<MockProject | null>(null)
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const close = useCallback(() => {
    setActiveDialog(null)
    setTargetProject(null)
    setName("")
    setIsLoading(false)
  }, [])

  const openCreate = useCallback(() => {
    setTargetProject(null)
    setName("")
    setIsLoading(false)
    setActiveDialog("create")
  }, [])

  const openRename = useCallback((project: MockProject) => {
    setTargetProject(project)
    setName(project.name)
    setIsLoading(false)
    setActiveDialog("rename")
  }, [])

  const openDelete = useCallback((project: MockProject) => {
    setTargetProject(project)
    setName("")
    setIsLoading(false)
    setActiveDialog("delete")
  }, [])

  const runPending = useCallback(() => {
    setIsLoading(true)
    setTimeout(close, SIMULATED_LATENCY_MS)
  }, [close])

  const slugPreview = useMemo(() => slugify(name), [name])

  const submitCreate = useCallback(() => {
    // A name of only punctuation/whitespace (e.g. "!!") slugifies to "", which
    // is not a valid project slug — reject it rather than create an empty one.
    if (isLoading || slugPreview.length === 0) return
    runPending()
  }, [isLoading, slugPreview, runPending])

  const submitRename = useCallback(() => {
    if (isLoading || name.trim().length === 0) return
    runPending()
  }, [isLoading, name, runPending])

  const confirmDelete = useCallback(() => {
    if (isLoading) return
    runPending()
  }, [isLoading, runPending])

  return {
    activeDialog,
    targetProject,
    name,
    slugPreview,
    isLoading,
    setName,
    openCreate,
    openRename,
    openDelete,
    close,
    submitCreate,
    submitRename,
    confirmDelete,
  }
}
