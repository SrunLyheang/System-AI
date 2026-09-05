import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { EditorShell } from "@/components/editor/editor-shell"
import {
  listPendingInvites,
  listProjectsForOwner,
  listSharedProjects,
} from "@/lib/projects"

async function EditorPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/sign-in")
  }

  const email = user.primaryEmailAddress?.emailAddress ?? ""
  const [owned, shared, invited] = await Promise.all([
    listProjectsForOwner(user.id),
    email ? listSharedProjects(email) : Promise.resolve([]),
    email ? listPendingInvites(email) : Promise.resolve([]),
  ])

  const toEditorProject = (project: { id: string; name: string }) => ({
    id: project.id,
    name: project.name,
  })

  return (
    <EditorShell
      ownedProjects={owned.map(toEditorProject)}
      sharedProjects={shared.map(toEditorProject)}
      pendingInvites={invited.map(toEditorProject)}
    />
  )
}

export default EditorPage
