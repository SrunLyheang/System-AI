"use client"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Button } from "@/components/ui/button"
import { DialogClose } from "@/components/ui/dialog"

interface DeleteProjectDialogProps {
  open: boolean
  projectName: string
  isLoading: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

function DeleteProjectDialog({
  open,
  projectName,
  isLoading,
  onOpenChange,
  onConfirm,
}: DeleteProjectDialogProps) {
  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete project"
      description={`This permanently deletes “${projectName}” and its canvas. This action cannot be undone.`}
      footer={
        <>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? "Deleting…" : "Delete project"}
          </Button>
        </>
      }
    />
  )
}

export { DeleteProjectDialog }
