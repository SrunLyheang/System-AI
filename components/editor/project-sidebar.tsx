"use client"

import { Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { EditorProject } from "@/hooks/use-project-actions"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  ownedProjects: EditorProject[]
  sharedProjects: EditorProject[]
  onCreateProject: () => void
  onRenameProject: (project: EditorProject) => void
  onDeleteProject: (project: EditorProject) => void
}

interface ProjectListProps {
  projects: EditorProject[]
  emptyLabel: string
  showActions: boolean
  onRenameProject: (project: EditorProject) => void
  onDeleteProject: (project: EditorProject) => void
}

function ProjectList({
  projects,
  emptyLabel,
  showActions,
  onRenameProject,
  onDeleteProject,
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-copy-muted">
        {emptyLabel}
      </div>
    )
  }

  return (
    <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto py-1">
      {projects.map((project) => (
        <li
          key={project.id}
          className="group flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm text-copy-secondary hover:bg-elevated"
        >
          <span className="truncate">{project.name}</span>
          {showActions ? (
            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Rename ${project.name}`}
                onClick={() => onRenameProject(project)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Delete ${project.name}`}
                onClick={() => onDeleteProject(project)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function ProjectSidebar({
  isOpen,
  onClose,
  ownedProjects,
  sharedProjects,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden
          onClick={onClose}
        />
      ) : null}

      <aside
        aria-hidden={!isOpen}
        className={cn(
          "fixed top-0 left-0 z-50 flex h-full w-72 flex-col border-r border-surface-border bg-elevated/95 backdrop-blur-sm transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-surface-border-subtle px-4 py-3">
          <h2 className="text-sm font-medium text-copy-primary">Projects</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs
          defaultValue="my-projects"
          className="flex flex-1 flex-col overflow-hidden px-4 pt-3"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-projects">My projects</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
          </TabsList>
          <TabsContent
            value="my-projects"
            className="flex flex-1 flex-col overflow-hidden"
          >
            <ProjectList
              projects={ownedProjects}
              emptyLabel="No projects yet"
              showActions
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </TabsContent>
          <TabsContent
            value="shared"
            className="flex flex-1 flex-col overflow-hidden"
          >
            <ProjectList
              projects={sharedProjects}
              emptyLabel="No shared projects yet"
              showActions={false}
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </TabsContent>
        </Tabs>

        <div className="border-t border-surface-border-subtle p-4">
          <Button className="w-full" onClick={onCreateProject}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>
      </aside>
    </>
  )
}

export { ProjectSidebar }
