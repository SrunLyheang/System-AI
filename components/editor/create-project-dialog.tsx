"use client"

import type { FormEvent } from "react"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Button } from "@/components/ui/button"
import { DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface CreateProjectDialogProps {
  open: boolean
  name: string
  roomIdPreview: string
  isLoading: boolean
  onOpenChange: (open: boolean) => void
  onNameChange: (value: string) => void
  onSubmit: () => void
}

function CreateProjectDialog({
  open,
  name,
  roomIdPreview,
  isLoading,
  onOpenChange,
  onNameChange,
  onSubmit,
}: CreateProjectDialogProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  const hasEmptySlug = name.trim().length > 0 && roomIdPreview.length === 0
  const canSubmit = !isLoading && roomIdPreview.length > 0

  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create project"
      description="Name your project. Its room ID is generated from the name."
      footer={
        <>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="button" disabled={!canSubmit} onClick={onSubmit}>
            {isLoading ? "Creating…" : "Create project"}
          </Button>
        </>
      }
    >
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div className="grid gap-1.5">
          <label
            htmlFor="create-project-name"
            className="text-sm text-copy-secondary"
          >
            Project name
          </label>
          <Input
            id="create-project-name"
            value={name}
            placeholder="Payments Platform"
            autoFocus
            onChange={(event) => onNameChange(event.target.value)}
          />
        </div>
        <p className="text-xs text-copy-muted">
          Room ID:{" "}
          <span className="font-mono text-copy-secondary">
            {roomIdPreview || "—"}
          </span>
        </p>
        {hasEmptySlug ? (
          <p className="text-xs text-error">
            Add at least one letter or number so the project has a valid room ID.
          </p>
        ) : null}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>
          Create project
        </button>
      </form>
    </EditorDialog>
  )
}

export { CreateProjectDialog }
