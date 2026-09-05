"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import type { EditorProject } from "@/hooks/use-project-actions"

interface InviteListProps {
  /** Pending invites for the current user. The caller renders this only when non-empty. */
  invites: EditorProject[]
}

/**
 * Pending project invitations awaiting a response. Rendered as a quiet zone just
 * above the sidebar's "New project" action — a hairline divider, a muted label,
 * and one row per invite. No container fill: it reads as part of the sidebar,
 * not a banner pasted onto it.
 */
function InviteList({ invites }: InviteListProps) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function act(projectId: string, method: "PATCH" | "DELETE") {
    if (busyId) return
    setBusyId(projectId)
    setError(null)
    try {
      const response = await fetch(`/api/invites/${projectId}`, { method })
      if (response.ok) {
        router.refresh()
      } else {
        setError("Could not update that invite. Try again.")
      }
    } catch {
      setError("Could not update that invite. Try again.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="border-t border-surface-border-subtle px-4 py-3">
      <p className="text-xs font-medium text-copy-muted">Pending invites</p>
      {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
      <ul className="mt-1 flex max-h-44 flex-col divide-y divide-surface-border-subtle overflow-y-auto">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="flex flex-col gap-2 py-3 first:pt-2 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-copy-primary">{invite.name}</p>
              <p className="text-xs text-copy-muted">
                invited you to collaborate
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="xs"
                disabled={busyId === invite.id}
                onClick={() => act(invite.id, "PATCH")}
              >
                Accept
              </Button>
              <button
                type="button"
                disabled={busyId === invite.id}
                onClick={() => act(invite.id, "DELETE")}
                className="text-xs text-copy-muted transition-colors hover:text-copy-secondary disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { InviteList }
