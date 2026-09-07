import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { EditorShell } from "@/components/editor/editor-shell";
import { loadSidebarProjects } from "@/lib/projects";

async function EditorPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const { owned, shared, pendingInvites } = await loadSidebarProjects(
    user.id,
    email,
  );

  return (
    <EditorShell
      ownedProjects={owned}
      sharedProjects={shared}
      pendingInvites={pendingInvites}
    />
  );
}

export default EditorPage;
