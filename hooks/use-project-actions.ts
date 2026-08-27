"use client"

import { useCallback, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { slugify } from "@/lib/slug"

/** Minimal project shape the sidebar and dialogs need. */
export interface EditorProject {
  id: string
  name: string
}

type ActiveDialog = "create" | "rename" | "delete" | null

interface UseProjectActions {
  /** Which project dialog is currently open, if any. */
  activeDialog: ActiveDialog
  /** The project a rename/delete action targets. `null` for create. */
  targetProject: EditorProject | null
  /** Controlled value of the name input (create + rename). */
  name: string
  /** Live room ID derived from `name` + a stable suffix, shown in the create dialog. */
  roomIdPreview: string
  /** True while a mutation is in flight. */
  isLoading: boolean
  setName: (value: string) => void
  openCreate: () => void
  openRename: (project: EditorProject) => void
  openDelete: (project: EditorProject) => void
  close: () => void
  submitCreate: () => void
  submitRename: () => void
  confirmDelete: () => void
}

/** Short, unique suffix appended to the slug so room IDs never collide. */
function generateSuffix(): string {
  return crypto.randomUUID().slice(0, 8)
}

/** Read the active workspace project ID from an `/editor/<id>` pathname. */
function activeProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/editor\/([^/]+)/)
  return match ? match[1] : null
}

export function useProjectActions(): UseProjectActions {
  const router = useRouter()
  const pathname = usePathname()

  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const [targetProject, setTargetProject] = useState<EditorProject | null>(null)
  const [name, setName] = useState("")
  const [suffix, setSuffix] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const close = useCallback(() => {
    setActiveDialog(null)
    setTargetProject(null)
    setName("")
    setSuffix("")
    setIsLoading(false)
  }, [])

  const openCreate = useCallback(() => {
    setTargetProject(null)
    setName("")
    setSuffix(generateSuffix())
    setIsLoading(false)
    setActiveDialog("create")
  }, [])

  const openRename = useCallback((project: EditorProject) => {
    setTargetProject(project)
    setName(project.name)
    setIsLoading(false)
    setActiveDialog("rename")
  }, [])

  const openDelete = useCallback((project: EditorProject) => {
    setTargetProject(project)
    setName("")
    setIsLoading(false)
    setActiveDialog("delete")
  }, [])

  const slug = useMemo(() => slugify(name), [name])
  const roomId = slug.length > 0 ? `${slug}-${suffix}` : ""
  const roomIdPreview = roomId

  const submitCreate = useCallback(async () => {
    // A name of only punctuation/whitespace (e.g. "!!") slugifies to "", which
    // is not a valid room ID — reject it rather than create an empty one.
    if (isLoading || roomId.length === 0) return
    setIsLoading(true)
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roomId, name: name.trim() }),
      })
      if (!response.ok) {
        setIsLoading(false)
        return
      }
      const project = (await response.json()) as EditorProject
      close()
      router.push(`/editor/${project.id}`)
    } catch {
      setIsLoading(false)
    }
  }, [isLoading, roomId, name, close, router])

  const submitRename = useCallback(async () => {
    const nextName = name.trim()
    if (isLoading || nextName.length === 0 || !targetProject) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${targetProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      })
      if (!response.ok) {
        setIsLoading(false)
        return
      }
      close()
      router.refresh()
    } catch {
      setIsLoading(false)
    }
  }, [isLoading, name, targetProject, close, router])

  const confirmDelete = useCallback(async () => {
    if (isLoading || !targetProject) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${targetProject.id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        setIsLoading(false)
        return
      }
      const deletingActiveWorkspace =
        activeProjectId(pathname) === targetProject.id
      close()
      if (deletingActiveWorkspace) {
        router.push("/editor")
      } else {
        router.refresh()
      }
    } catch {
      setIsLoading(false)
    }
  }, [isLoading, targetProject, pathname, close, router])

  return {
    activeDialog,
    targetProject,
    name,
    roomIdPreview,
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
