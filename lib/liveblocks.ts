import { Liveblocks } from "@liveblocks/node";

/**
 * Cached Liveblocks node client. Constructed on first use (the constructor
 * validates `LIVEBLOCKS_SECRET_KEY`, so we can't build it at import time) and
 * reused across hot reloads. Mirrors the caching in `lib/prisma.ts`.
 */
const globalForLiveblocks = globalThis as unknown as {
  liveblocks?: Liveblocks;
};

export function getLiveblocks(): Liveblocks {
  if (!globalForLiveblocks.liveblocks) {
    const secret = process.env.LIVEBLOCKS_SECRET_KEY;
    if (!secret) {
      throw new Error("LIVEBLOCKS_SECRET_KEY is not set");
    }
    globalForLiveblocks.liveblocks = new Liveblocks({ secret });
  }
  return globalForLiveblocks.liveblocks;
}

/** Fixed cursor-color palette. Index chosen deterministically per user. */
const CURSOR_COLORS = [
  "#E57373",
  "#F06292",
  "#BA68C8",
  "#7986CB",
  "#4FC3F7",
  "#4DB6AC",
  "#81C784",
  "#FFB74D",
  "#A1887F",
  "#90A4AE",
] as const;

/**
 * Map a user ID to a stable color from {@link CURSOR_COLORS}. The same ID always
 * yields the same color; different IDs spread across the palette.
 */
export function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}
