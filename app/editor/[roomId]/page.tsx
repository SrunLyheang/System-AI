import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { WorkspaceShell } from "@/components/editor/workspace-shell";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { loadSidebarProjects } from "@/lib/projects";

interface WorkspacePageProps {
  params: Promise<{ roomId: string }>;
}

async function WorkspacePage({ params }: WorkspacePageProps) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    redirect("/sign-in");
  }

  const { roomId } = await params;
  const project = await getAccessibleProject(roomId, identity);
  if (!project) {
    return <AccessDenied />;
  }

  const { owned, shared, pendingInvites } = await loadSidebarProjects(
    identity.userId,
    identity.email,
  );

  return (
    <WorkspaceShell
      project={{ id: project.id, name: project.name }}
      ownedProjects={owned}
      sharedProjects={shared}
      pendingInvites={pendingInvites}
      canManageShare={project.ownerId === identity.userId}
    />
  );
}

export default WorkspacePage;
