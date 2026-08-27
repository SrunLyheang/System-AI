"use client"

import { useState } from "react"

import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { EditorHome } from "@/components/editor/editor-home"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { useProjectDialogs } from "@/components/editor/use-project-dialogs"

function EditorPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const dialogs = useProjectDialogs()

  function handleOpenChange(open: boolean) {
    if (!open) dialogs.close()
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
        onCreateProject={dialogs.openCreate}
        onRenameProject={dialogs.openRename}
        onDeleteProject={dialogs.openDelete}
      />
      <main className="flex flex-1 flex-col">
        <EditorHome onCreateProject={dialogs.openCreate} />
      </main>

      <CreateProjectDialog
        open={dialogs.activeDialog === "create"}
        name={dialogs.name}
        slugPreview={dialogs.slugPreview}
        isLoading={dialogs.isLoading}
        onOpenChange={handleOpenChange}
        onNameChange={dialogs.setName}
        onSubmit={dialogs.submitCreate}
      />
      <RenameProjectDialog
        open={dialogs.activeDialog === "rename"}
        name={dialogs.name}
        currentName={dialogs.targetProject?.name ?? ""}
        isLoading={dialogs.isLoading}
        onOpenChange={handleOpenChange}
        onNameChange={dialogs.setName}
        onSubmit={dialogs.submitRename}
      />
      <DeleteProjectDialog
        open={dialogs.activeDialog === "delete"}
        projectName={dialogs.targetProject?.name ?? ""}
        isLoading={dialogs.isLoading}
        onOpenChange={handleOpenChange}
        onConfirm={dialogs.confirmDelete}
      />
    </div>
  )
}

export default EditorPage
