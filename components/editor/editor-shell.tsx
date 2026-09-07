"use client"

import { UserButton } from "@clerk/nextjs"
import { PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react"
import { useState } from "react"

import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { Button } from "@/components/ui/button"
import {
  useProjectActions,
  type EditorProject,
} from "@/hooks/use-project-actions"

interface EditorShellProps {
  ownedProjects: EditorProject[]
  sharedProjects: EditorProject[]
  pendingInvites: EditorProject[]
}

function EditorShell({
  ownedProjects,
  sharedProjects,
  pendingInvites,
}: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const actions = useProjectActions()

  return (
    <div className="flex h-screen flex-col">
      <nav className="flex h-14 w-full shrink-0 items-center border-b border-surface-border-subtle bg-surface px-3">
        <div className="flex flex-1 items-center justify-start">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setIsSidebarOpen((open) => !open)}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center" />
        <div className="flex flex-1 items-center justify-end">
          <UserButton />
        </div>
      </nav>

      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        pendingInvites={pendingInvites}
        onCreateProject={actions.openCreate}
        onRenameProject={actions.openRename}
        onDeleteProject={actions.openDelete}
      />

      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-medium text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="max-w-md text-sm text-copy-muted">
          Start a new architecture workspace, or choose a project from the
          sidebar.
        </p>
        <Button className="mt-1" onClick={actions.openCreate}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </main>

      <ProjectDialogs actions={actions} />
    </div>
  )
}

export { EditorShell }
