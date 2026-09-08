/** Shared AI activity signalled through Liveblocks feeds. This unit only carries
 *  status — the actual design/spec generation flow is not wired yet. */

import { z } from "zod"

/** Liveblocks feed id every room uses for AI generation status. Generic on
 *  purpose so design and spec generation can both post to it later. */
export const AI_STATUS_FEED_ID = "ai-status-feed"

/** Room chat feed. Kept separate from {@link AI_STATUS_FEED_ID} — this one only
 *  carries human messages typed into the sidebar, never AI progress/status. */
export const AI_CHAT_FEED_ID = "ai-chat"

/** One `ai-chat` feed message. Feed payloads arrive as untyped JSON, so every
 *  consumer must `safeParse` this before rendering. */
export const aiChatMessageSchema = z.object({
  /** Display name of the sender. */
  sender: z.string().min(1),
  /** Who sent it. Only "user" is produced today; "assistant" is reserved. */
  role: z.enum(["user", "assistant"]),
  /** Message body. */
  content: z.string().min(1).max(4000),
  /** Epoch millis the message was created. */
  timestamp: z.number(),
})

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>

/** Payload of one `ai-status-feed` message. Feed messages arrive as untyped
 *  JSON, so every consumer must run it through {@link isAiStatusMessage} first. */
export interface AiStatusMessage {
  /** True while a generation run is in progress. Gates the sidebar chat input. */
  active: boolean
  /** Optional human-readable status line shown in the sidebar. */
  text?: string
}

/** Runtime validation for an incoming feed message payload. */
export function isAiStatusMessage(data: unknown): data is AiStatusMessage {
  if (typeof data !== "object" || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.active !== "boolean") return false
  if (d.text !== undefined && typeof d.text !== "string") return false
  return true
}
