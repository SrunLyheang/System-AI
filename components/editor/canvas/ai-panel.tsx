"use client";

import { useEffect, useRef, useState } from "react";

import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
  useRoom,
  useSelf,
} from "@liveblocks/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  aiChatMessageSchema,
  isAiStatusMessage,
  type AiChatMessage,
  type AiStatusMessage,
} from "@/types/tasks";
import type { designAgent } from "@/src/trigger/design-agent";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Right-hand AI sidebar. The composer submits a design prompt: it posts the
 *  user message to the `ai-chat` Liveblocks feed (so every participant sees it),
 *  kicks off the `design-agent` run via `POST /api/ai/design`, then tracks that
 *  run in real time with `useRealtimeRun`. Canvas node/edge/presence changes
 *  land through Liveblocks (`useLiveblocksFlow`) on their own — this component
 *  never touches them. `ai-status-feed` drives the status strip only. */
export function AiChatPanel() {
  const room = useRoom();
  const { messages: statusMessages } = useFeedMessages(AI_STATUS_FEED_ID);
  const { messages: chatMessages } = useFeedMessages(AI_CHAT_FEED_ID);
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const self = useSelf();

  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [run, setRun] = useState<{ id: string; token: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A run is "active" from the moment we submit until `useRealtimeRun` reports
  // completion. Gates the composer and shows the status strip.
  const runActive = submitting || run !== null;

  // Feeds are created lazily; make sure `ai-chat` exists before anyone posts.
  // Swallows the "already exists" rejection on every mount after the first.
  useEffect(() => {
    void createFeed(AI_CHAT_FEED_ID).catch(() => {});
  }, [createFeed]);

  // Only the most recent valid status message drives the status strip.
  const latestStatus = [...(statusMessages ?? [])]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((m) => m.data)
    .find(isAiStatusMessage) as AiStatusMessage | undefined;

  // Validate every feed payload before trusting it, oldest first.
  const chat = [...(chatMessages ?? [])]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((m) => {
      const parsed = aiChatMessageSchema.safeParse(m.data);
      return parsed.success ? { id: m.id, ...parsed.data } : null;
    })
    .filter((m): m is AiChatMessage & { id: string } => m !== null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  useRealtimeRun<typeof designAgent>(run?.id, {
    accessToken: run?.token,
    enabled: run !== null,
    onComplete: (finished, error) => {
      const content = error
        ? "The design agent hit an error. Try again."
        : (finished.output?.summary ?? "Design updated.");
      void createFeedMessage(AI_CHAT_FEED_ID, {
        sender: "Design agent",
        role: "assistant",
        content,
        timestamp: Date.now(),
      } satisfies AiChatMessage).catch(() => {});
      setRun(null);
    },
  });

  async function postChat(message: AiChatMessage) {
    await createFeedMessage(AI_CHAT_FEED_ID, message).catch(() => {});
  }

  async function submit() {
    const prompt = draft.trim();
    if (prompt === "" || runActive) return;
    setSubmitting(true);
    try {
      await postChat({
        sender: self?.info.name ?? "Anonymous",
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      });
      setDraft("");

      const res = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          roomId: room.id,
          projectId: room.id,
        }),
      });
      if (!res.ok) throw new Error(`design request failed: ${res.status}`);
      const { runId } = (await res.json()) as { runId: string };

      const tokenRes = await fetch("/api/ai/design/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      if (!tokenRes.ok) {
        throw new Error(`token request failed: ${tokenRes.status}`);
      }
      const { token } = (await tokenRes.json()) as { token: string };

      setRun({ id: runId, token });
    } catch {
      await postChat({
        sender: "Design agent",
        role: "assistant",
        content: "Couldn’t start the design agent. Try again.",
        timestamp: Date.now(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-surface-border bg-surface">
      <div className="flex items-center gap-2 border-b border-surface-border-subtle px-4 py-3">
        <Sparkles className="h-4 w-4 text-ai-text" />
        <h2 className="text-sm font-medium text-copy-primary">AI chat</h2>
      </div>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 text-sm"
      >
        {chat.length === 0 ? (
          <p className="my-auto text-center text-copy-muted">
            Describe a change and the design agent will update the canvas.
          </p>
        ) : (
          chat.map((m) => (
            <div key={m.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-copy-primary">
                  {m.sender}
                </span>
                <span className="text-[11px] text-copy-muted">
                  {formatTime(m.timestamp)}
                </span>
              </div>
              <p
                className={
                  m.role === "user"
                    ? "rounded-lg bg-chat-user px-3 py-2 whitespace-pre-wrap wrap-break-word text-black/85"
                    : "rounded-lg bg-elevated px-3 py-2 whitespace-pre-wrap wrap-break-word text-copy-secondary"
                }
              >
                {m.content}
              </p>
            </div>
          ))
        )}
      </div>

      {runActive ? (
        <div className="flex items-center gap-2 border-t border-surface-border-subtle bg-elevated px-3 py-1.5 text-xs text-copy-secondary">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chat-user opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-chat-user" />
          </span>
          {latestStatus?.text ?? "Working…"}
        </div>
      ) : null}

      <form
        className="flex items-end gap-2 border-t border-surface-border-subtle p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          rows={1}
          disabled={runActive}
          placeholder="Describe a design change…"
          className="min-h-9 flex-1 resize-none rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-copy-primary outline-none placeholder:text-copy-muted focus-visible:border-copy-muted disabled:opacity-50"
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={runActive || draft.trim() === ""}
          className="bg-chat-user text-black hover:bg-chat-user/90"
          aria-label="Send design prompt"
        >
          {runActive ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </form>
    </aside>
  );
}
