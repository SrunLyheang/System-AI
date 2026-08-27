"use client"

import type { FormEvent } from "react"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Button } from "@/components/ui/button"
import { DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface RenameProjectDialogProps {
  open: boolean
  name: string
  currentName: string
  isLoading: boolean
  onOpenChange: (open: boolean) => void
  onNameChange: (value: string) => void
  onSubmit: () => void
}

function RenameProjectDialog({
  open,
  name,
  currentName,
  isLoading,
  onOpenChange,
  onNameChange,
  onSubmit,
}: RenameProjectDialogProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  const canSubmit = !isLoading && name.trim().length > 0

  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rename project"
      description={`Currently named “${currentName}”.`}
      footer={
        <>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="button" disabled={!canSubmit} onClick={onSubmit}>
            {isLoading ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form className="grid gap-1.5" onSubmit={handleSubmit}>
        <label
          htmlFor="rename-project-name"
          className="text-sm text-copy-secondary"
        >
          Project name
        </label>
        <Input
          id="rename-project-name"
          value={name}
          autoFocus
          onChange={(event) => onNameChange(event.target.value)}
        />
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>
          Save changes
        </button>
      </form>
    </EditorDialog>
  )
}

export { RenameProjectDialog }
