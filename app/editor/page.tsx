import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { EditorShell } from "@/components/editor/editor-shell"
import { listProjectsForOwner, listSharedProjects } from "@/lib/projects"

async function EditorPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/sign-in")
  }

  const email = user.primaryEmailAddress?.emailAddress ?? ""
  const [owned, shared] = await Promise.all([
    listProjectsForOwner(user.id),
    email ? listSharedProjects(email) : Promise.resolve([]),
  ])

  const ownedProjects = owned.map((project) => ({
    id: project.id,
    name: project.name,
  }))
  const sharedProjects = shared.map((project) => ({
    id: project.id,
    name: project.name,
  }))

  return (
    <EditorShell
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  )
}

export default EditorPage
