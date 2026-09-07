import { Panel } from "@xyflow/react";
import { useOther, useOthers } from "@liveblocks/react/suspense";
import { UserButton, useAuth } from "@clerk/nextjs";

type PresenceUserInfo = Liveblocks["UserMeta"]["info"];

/** Two-letter initials fallback for a collaborator with no avatar image. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase() || "?";
}

/** Display-only collaborator avatar — photo when available, initials otherwise.
 *  The ring keeps it legible on the dark canvas. Same 28px box as UserButton. */
function PresenceAvatar({ info }: { info: PresenceUserInfo }) {
  const ring = "h-7 w-7 rounded-full ring-2 ring-surface";
  if (info.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={info.avatar}
        alt={info.name}
        title={info.name}
        className={`${ring} object-cover`}
      />
    );
  }
  return (
    <span
      title={info.name}
      className={`${ring} flex items-center justify-center text-[11px] font-semibold text-white`}
      style={{ background: info.color }}
    >
      {initialsOf(info.name)}
    </span>
  );
}

/** Top-right participant group: collaborator avatars (current user filtered out
 *  by Clerk ID), then the current user's own Clerk UserButton. Divider only
 *  when at least one collaborator is present. */
export function PresencePanel() {
  const { userId } = useAuth();
  const others = useOthers();

  // One entry per distinct collaborator user ID, excluding the current user
  // (who may also be connected from another tab).
  const byId = new Map<string, PresenceUserInfo>();
  for (const other of others) {
    if (other.id && other.id !== userId && !byId.has(other.id)) {
      byId.set(other.id, other.info);
    }
  }
  const collaborators = [...byId.values()];
  const shown = collaborators.slice(0, 5);
  const overflow = collaborators.length - shown.length;

  return (
    <Panel position="top-right">
      <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface/90 px-2 py-1.5 shadow-lg backdrop-blur">
        {shown.length > 0 && (
          <div className="flex items-center -space-x-2">
            {shown.map((info, i) => (
              <PresenceAvatar key={`${info.name}-${i}`} info={info} />
            ))}
            {overflow > 0 && (
              <span className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-[11px] font-medium text-copy-secondary ring-2 ring-surface">
                +{overflow}
              </span>
            )}
          </div>
        )}
        {shown.length > 0 && (
          <span className="mx-1 h-5 w-px bg-surface-border" />
        )}
        <UserButton />
      </div>
    </Panel>
  );
}

/** One live cursor for another participant, colored by their presence color. */
export function CanvasCursor({ connectionId }: { connectionId: number }) {
  const info = useOther(connectionId, (user) => user.info);
  if (!info) return null;
  return (
    <div className="pointer-events-none flex items-start">
      <svg width="18" height="18" viewBox="0 0 24 24" fill={info.color}>
        <path
          d="M4 2 L20 12 L12.5 13 L9 21 Z"
          stroke="var(--bg-base)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="ml-0.5 -mt-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none text-white shadow-sm"
        style={{ background: info.color }}
      >
        {info.name}
      </span>
    </div>
  );
}
