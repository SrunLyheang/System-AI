"use client"

import { useState } from "react"

import { UserButton } from "@clerk/nextjs"
import {
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
} from "lucide-react"

import { CanvasRoom } from "@/components/editor/canvas"
import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { ShareDialog } from "@/components/editor/share-dialog"
import { dispatchTemplateImport } from "@/components/editor/starter-templates"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { Button } from "@/components/ui/button"
import {
  useProjectActions,
  type EditorProject,
} from "@/hooks/use-project-actions"

interface WorkspaceShellProps {
  project: EditorProject
  ownedProjects: EditorProject[]
  sharedProjects: EditorProject[]
  /** Pending (unaccepted) invites for the current user. */
  pendingInvites?: EditorProject[]
  /** True when the current user owns this project (may invite/remove collaborators). */
  canManageShare: boolean
}

function WorkspaceShell({
  project,
  ownedProjects,
  sharedProjects,
  pendingInvites = [],
  canManageShare,
}: WorkspaceShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const actions = useProjectActions()

  function handleOpenChange(open: boolean) {
    if (!open) actions.close()
  }

  return (
    <div className="flex h-screen flex-col">
      <nav className="flex h-14 w-full shrink-0 items-center gap-3 border-b border-surface-border-subtle bg-surface px-3">
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
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
          <span className="truncate text-sm font-medium text-copy-primary">
            {project.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTemplatesOpen(true)}
          >
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShareOpen(true)}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            variant={isAiSidebarOpen ? "secondary" : "outline"}
            size="icon-sm"
            onClick={() => setIsAiSidebarOpen((open) => !open)}
            aria-label={isAiSidebarOpen ? "Hide AI panel" : "Show AI panel"}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <UserButton />
        </div>
      </nav>

      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        pendingInvites={pendingInvites}
        activeProjectId={project.id}
        onCreateProject={actions.openCreate}
        onRenameProject={actions.openRename}
        onDeleteProject={actions.openDelete}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex-1 bg-background">
          <CanvasRoom roomId={project.id} />
        </main>

        {isAiSidebarOpen ? (
          <aside className="flex w-80 shrink-0 flex-col border-l border-surface-border bg-surface">
            <div className="flex items-center gap-2 border-b border-surface-border-subtle px-4 py-3">
              <Sparkles className="h-4 w-4 text-ai-text" />
              <h2 className="text-sm font-medium text-copy-primary">AI chat</h2>
            </div>
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-copy-muted">
              AI chat is coming soon.
            </div>
          </aside>
        ) : null}
      </div>

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
      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        projectId={project.id}
        canManage={canManageShare}
      />
      <StarterTemplatesModal
        open={isTemplatesOpen}
        onOpenChange={setIsTemplatesOpen}
        onImport={dispatchTemplateImport}
      />
    </div>
  )
}

export { WorkspaceShell }
