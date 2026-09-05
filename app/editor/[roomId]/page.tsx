import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShell } from "@/components/editor/workspace-shell"
import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access"
import {
  listPendingInvites,
  listProjectsForOwner,
  listSharedProjects,
} from "@/lib/projects"

interface WorkspacePageProps {
  params: Promise<{ roomId: string }>
}

async function WorkspacePage({ params }: WorkspacePageProps) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    redirect("/sign-in")
  }

  const { roomId } = await params
  const project = await getAccessibleProject(roomId, identity)
  if (!project) {
    return <AccessDenied />
  }

  const [owned, shared, invited] = await Promise.all([
    listProjectsForOwner(identity.userId),
    identity.email ? listSharedProjects(identity.email) : Promise.resolve([]),
    identity.email ? listPendingInvites(identity.email) : Promise.resolve([]),
  ])

  return (
    <WorkspaceShell
      project={{ id: project.id, name: project.name }}
      ownedProjects={owned.map((p) => ({ id: p.id, name: p.name }))}
      sharedProjects={shared.map((p) => ({ id: p.id, name: p.name }))}
      pendingInvites={invited.map((p) => ({ id: p.id, name: p.name }))}
      canManageShare={project.ownerId === identity.userId}
    />
  )
}

export default WorkspacePage
