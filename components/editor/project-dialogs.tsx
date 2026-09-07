"use client"

import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import type { UseProjectActions } from "@/hooks/use-project-actions"

/**
 * The create / rename / delete project dialogs, wired to a `useProjectActions`
 * instance. Rendered by both the editor-home shell and the workspace shell —
 * only one is ever open at a time (`actions.activeDialog`).
 */
export function ProjectDialogs({ actions }: { actions: UseProjectActions }) {
  const onOpenChange = (open: boolean) => {
    if (!open) actions.close()
  }

  return (
    <>
      <CreateProjectDialog
        open={actions.activeDialog === "create"}
        name={actions.name}
        roomIdPreview={actions.roomIdPreview}
        isLoading={actions.isLoading}
        onOpenChange={onOpenChange}
        onNameChange={actions.setName}
        onSubmit={actions.submitCreate}
      />
      <RenameProjectDialog
        open={actions.activeDialog === "rename"}
        name={actions.name}
        currentName={actions.targetProject?.name ?? ""}
        isLoading={actions.isLoading}
        onOpenChange={onOpenChange}
        onNameChange={actions.setName}
        onSubmit={actions.submitRename}
      />
      <DeleteProjectDialog
        open={actions.activeDialog === "delete"}
        projectName={actions.targetProject?.name ?? ""}
        isLoading={actions.isLoading}
        onOpenChange={onOpenChange}
        onConfirm={actions.confirmDelete}
      />
    </>
  )
}
