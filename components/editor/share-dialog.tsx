"use client"

import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"

import { Check, Link2, X } from "lucide-react"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Button } from "@/components/ui/button"
import { DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface Collaborator {
  email: string
  name: string | null
  imageUrl: string | null
  pending: boolean
}

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  /** True when the current user owns the project and may invite/remove. */
  canManage: boolean
}

function CollaboratorAvatar({ collaborator }: { collaborator: Collaborator }) {
  const initial = (collaborator.name ?? collaborator.email)
    .charAt(0)
    .toUpperCase()
  if (collaborator.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={collaborator.imageUrl}
        alt=""
        className="size-7 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-medium text-copy-secondary">
      {initial}
    </span>
  )
}

function ShareDialog({
  open,
  onOpenChange,
  projectId,
  canManage,
}: ShareDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/collaborators`)
    if (!response.ok) return
    const data = (await response.json()) as { collaborators: Collaborator[] }
    setCollaborators(data.collaborators)
  }, [projectId])

  // Reset the form each time the dialog transitions to open (React's documented
  // "adjust state on prop change" pattern — runs during render, not in an effect).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setError(null)
      setEmail("")
    }
  }

  useEffect(() => {
    // Fetch the collaborator list from the server whenever the dialog opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, state set in a later tick
    if (open) void load()
  }, [open, load])

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = email.trim()
    if (isInviting || next.length === 0) return
    setIsInviting(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: next }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null
        setError(data?.error ?? "Could not invite that person.")
        return
      }
      setEmail("")
      await load()
    } finally {
      setIsInviting(false)
    }
  }

  async function handleRemove(target: string) {
    const response = await fetch(
      `/api/projects/${projectId}/collaborators?email=${encodeURIComponent(target)}`,
      { method: "DELETE" },
    )
    if (response.ok) await load()
  }

  function handleCopyLink() {
    const link = `${window.location.origin}/editor/${projectId}`
    void navigator.clipboard.writeText(link)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Share project"
      description={
        canManage
          ? "Invite people by email to collaborate on this project."
          : "People with access to this project."
      }
      footer={
        <>
          {canManage ? (
            <Button type="button" variant="outline" onClick={handleCopyLink}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy link"}
            </Button>
          ) : null}
          <DialogClose render={<Button type="button" />}>Done</DialogClose>
        </>
      }
    >
      <div className="grid gap-3">
        {canManage ? (
          <form className="flex gap-2" onSubmit={handleInvite}>
            <Input
              type="email"
              value={email}
              placeholder="teammate@example.com"
              autoFocus
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button
              type="submit"
              disabled={isInviting || email.trim().length === 0}
            >
              {isInviting ? "Inviting…" : "Invite"}
            </Button>
          </form>
        ) : null}

        {error ? <p className="text-xs text-error">{error}</p> : null}

        <ul className="grid gap-1">
          {collaborators.length === 0 ? (
            <li className="py-2 text-sm text-copy-muted">
              No collaborators yet.
            </li>
          ) : (
            collaborators.map((collaborator) => (
              <li
                key={collaborator.email}
                className="flex items-center gap-2.5 rounded-xl px-1 py-1.5"
              >
                <CollaboratorAvatar collaborator={collaborator} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm text-copy-primary">
                      {collaborator.name ?? collaborator.email}
                    </span>
                    {collaborator.pending ? (
                      <span className="shrink-0 rounded-full bg-subtle px-1.5 py-0.5 text-[0.65rem] font-medium text-copy-muted">
                        Pending
                      </span>
                    ) : null}
                  </span>
                  {collaborator.name ? (
                    <span className="block truncate text-xs text-copy-muted">
                      {collaborator.email}
                    </span>
                  ) : null}
                </span>
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${collaborator.email}`}
                    onClick={() => handleRemove(collaborator.email)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </EditorDialog>
  )
}

export { ShareDialog }
