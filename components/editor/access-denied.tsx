import Link from "next/link"
import { Lock } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

function AccessDenied() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-elevated">
        <Lock className="h-8 w-8 text-copy-muted" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-medium text-copy-primary">
          You don&apos;t have access to this project
        </h1>
        <p className="max-w-sm text-sm text-copy-muted">
          It may have been deleted, or you were never given access. If you were
          invited, accept the invite from the Invites tab first.
        </p>
      </div>
      <Link href="/editor" className={buttonVariants({ variant: "outline" })}>
        Back to projects
      </Link>
    </div>
  )
}

export { AccessDenied }
