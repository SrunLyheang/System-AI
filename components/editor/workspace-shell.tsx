"use client";

import { useEffect, useState } from "react";

import {
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
} from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";

import { CanvasRoom, EditorRoom } from "@/components/editor/canvas";
import { AiChatPanel } from "@/components/editor/canvas/ai-panel";
import {
  CanvasSaveProvider,
  useCanvasSave,
} from "@/components/editor/canvas/save-context";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Button } from "@/components/ui/button";
import {
  useProjectActions,
  type EditorProject,
} from "@/hooks/use-project-actions";

interface WorkspaceShellProps {
  project: EditorProject;
  ownedProjects: EditorProject[];
  sharedProjects: EditorProject[];
  /** Pending (unaccepted) invites for the current user. */
  pendingInvites?: EditorProject[];
  /** True when the current user owns this project (may invite/remove collaborators). */
  canManageShare: boolean;
}

function WorkspaceShell({
  project,
  ownedProjects,
  sharedProjects,
  pendingInvites = [],
  canManageShare,
}: WorkspaceShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  // Canvas readiness is per-project: store the id the canvas reported ready for
  // and gate Templates on it matching the active project. A late onReady from a
  // previous CanvasRoom carries the old id, so it can never mark the new one
  // ready. `renderedProjectId` drives a synchronous reset when the room changes.
  const [readyProjectId, setReadyProjectId] = useState<string | null>(null);
  const [renderedProjectId, setRenderedProjectId] = useState(project.id);
  const actions = useProjectActions();

  if (renderedProjectId !== project.id) {
    setRenderedProjectId(project.id);
    setReadyProjectId(null);
    setIsTemplatesOpen(false);
  }

  return (
    <CanvasSaveProvider>
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
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-ai shadow-[0_0_8px_var(--accent-ai)]"
          />
          <span className="truncate text-sm font-medium text-copy-primary">
            {project.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (readyProjectId === project.id) setIsTemplatesOpen(true);
            }}
            disabled={readyProjectId !== project.id}
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
          <span aria-hidden className="mx-0.5 h-5 w-px bg-surface-border-subtle" />
          <SaveButton />
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setIsAiSidebarOpen((open) => !open)}
            aria-label={isAiSidebarOpen ? "Hide AI panel" : "Show AI panel"}
            className={
              isAiSidebarOpen
                ? "border-ai/40 bg-ai/15 text-ai-text hover:bg-ai/20 hover:text-ai-text"
                : "text-ai-text hover:text-ai-text"
            }
          >
            <Sparkles className="h-4 w-4" />
          </Button>
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

      <EditorRoom roomId={project.id}>
        {/* One provider around canvas + sidebar so the AI panel's
            `useReactFlow` shares the canvas store. */}
        <ReactFlowProvider>
          <div className="flex flex-1 overflow-hidden">
            <main className="relative flex-1 bg-background">
              <CanvasRoom
                roomId={project.id}
                templatesOpen={isTemplatesOpen}
                onTemplatesOpenChange={setIsTemplatesOpen}
                onReady={() => setReadyProjectId(project.id)}
              />
            </main>

            {isAiSidebarOpen ? <AiChatPanel /> : null}
          </div>
        </ReactFlowProvider>
      </EditorRoom>

      <ProjectDialogs actions={actions} />
      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        projectId={project.id}
        canManage={canManageShare}
      />
      </div>
    </CanvasSaveProvider>
  );
}

/** Workspace-only Save button. The canvas autosaves on a debounce; this also
 *  lets the user save on demand. Reflects the shared save status: "Saving..."
 *  while in flight, then a brief "Saved" / "Error" flash before returning to
 *  "Save". Rendered only here, so it never appears on the editor-home navbar. */
function SaveButton() {
  const { status, save } = useCanvasSave();
  // Show "Saved"/"Error" for a moment after a save settles, then fall back.
  const [flash, setFlash] = useState<"saved" | "error" | null>(null);
  const [prevStatus, setPrevStatus] = useState(status);
  if (prevStatus !== status) {
    setPrevStatus(status);
    setFlash(status === "saved" || status === "error" ? status : null);
  }
  useEffect(() => {
    if (flash === null) return;
    const timer = setTimeout(() => setFlash(null), 2000);
    return () => clearTimeout(timer);
  }, [flash]);

  const label =
    status === "saving"
      ? "Saving..."
      : flash === "saved"
        ? "Saved"
        : flash === "error"
          ? "Error"
          : "Save";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => save()}
      disabled={status === "saving"}
      className="w-19 justify-center"
    >
      <span
        className={
          flash === "saved"
            ? "text-success"
            : flash === "error"
              ? "text-error"
              : undefined
        }
      >
        {label}
      </span>
    </Button>
  );
}

export { WorkspaceShell };
