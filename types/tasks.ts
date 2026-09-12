/** Room chat feed for human messages typed into the AI sidebar. AI generation
 *  progress does not go here — it lives on the shared `ai` Storage object
 *  (`types/canvas.ts`), written by the trigger tasks via `lib/ai-activity.ts`. */

import { z } from "zod"

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
