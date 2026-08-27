"use client"

import { useState } from "react"

import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { EditorHome } from "@/components/editor/editor-home"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import {
  useProjectActions,
  type EditorProject,
} from "@/hooks/use-project-actions"

interface EditorShellProps {
  ownedProjects: EditorProject[]
  sharedProjects: EditorProject[]
}

function EditorShell({ ownedProjects, sharedProjects }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const actions = useProjectActions()

  function handleOpenChange(open: boolean) {
    if (!open) actions.close()
  }

  return (
    <div className="flex h-screen flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        onCreateProject={actions.openCreate}
        onRenameProject={actions.openRename}
        onDeleteProject={actions.openDelete}
      />
      <main className="flex flex-1 flex-col">
        <EditorHome onCreateProject={actions.openCreate} />
      </main>

      <CreateProjectDialog
        open={actions.activeDialog === "create"}
        name={actions.name}
        roomIdPreview={actions.roomIdPreview}
        isLoading={actions.isLoading}
        onOpenChange={handleOpenChange}
        onNameChange={actions.setName}
        onSubmit={actions.submitCreate}
      />
      <RenameProjectDialog
        open={actions.activeDialog === "rename"}
        name={actions.name}
        currentName={actions.targetProject?.name ?? ""}
        isLoading={actions.isLoading}
        onOpenChange={handleOpenChange}
        onNameChange={actions.setName}
        onSubmit={actions.submitRename}
      />
      <DeleteProjectDialog
        open={actions.activeDialog === "delete"}
        projectName={actions.targetProject?.name ?? ""}
        isLoading={actions.isLoading}
        onOpenChange={handleOpenChange}
        onConfirm={actions.confirmDelete}
      />
    </div>
  )
}

export { EditorShell }
