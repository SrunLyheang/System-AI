"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface EditorHomeProps {
  onCreateProject: () => void
}

function EditorHome({ onCreateProject }: EditorHomeProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-medium text-copy-primary">
        Create a project or open an existing one
      </h1>
      <p className="max-w-md text-sm text-copy-muted">
        Start a new architecture workspace, or choose a project from the sidebar.
      </p>
      <Button className="mt-1" onClick={onCreateProject}>
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    </div>
  )
}

export { EditorHome }
