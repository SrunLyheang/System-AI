"use client";

import { useEffect, useRef, useState } from "react";

import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
  useRoom,
  useSelf,
} from "@liveblocks/react";
import { useReactFlow } from "@xyflow/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpecsPanel } from "@/components/editor/canvas/specs-panel";
import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  aiChatMessageSchema,
  isAiStatusMessage,
  type AiChatMessage,
  type AiStatusMessage,
} from "@/types/tasks";
import type { designAgent } from "@/src/trigger/design-agent";
import type { CanvasNode, CanvasEdge } from "@/types/canvas";

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
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>();

  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [run, setRun] = useState<{ id: string; token: string } | null>(null);
  // Set true when a run's realtime completion hasn't arrived within the timeout
  // below — a dropped subscription or a `trigger dev` restart can strand `run`.
  // The subscription stays live so a late `onComplete` still posts; this only
  // stops the composer from being locked forever.
  const [runTimedOut, setRunTimedOut] = useState(false);
  const [specRun, setSpecRun] = useState<{ id: string; token: string } | null>(null);
  const [specSubmitting, setSpecSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A run is "active" from the moment we submit until `useRealtimeRun` reports
  // completion — unless it timed out, at which point we let the user carry on.
  const runActive = (submitting || run !== null) && !runTimedOut;

  // Stop blocking the composer if a completion event never lands.
  useEffect(() => {
    if (run === null) return;
    const timer = setTimeout(() => setRunTimedOut(true), 120_000);
    return () => clearTimeout(timer);
  }, [run]);

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
      const out = finished.output;
      const content = error
        ? "The design agent hit an error. Try again."
        : out && out.applied === 0
          ? "The design agent didn’t make any canvas changes. Try naming the components you want on the diagram."
          : (out?.summary ?? "Design updated.");
      void createFeedMessage(AI_CHAT_FEED_ID, {
        sender: "Design agent",
        role: "assistant",
        content,
        timestamp: Date.now(),
      } satisfies AiChatMessage).catch(() => {});
      setRun(null);
      setRunTimedOut(false);
    },
  });

  // Track spec generation run separately from design run
  useRealtimeRun<typeof designAgent>(specRun?.id, {
    accessToken: specRun?.token,
    enabled: specRun !== null,
    onComplete: (finished, error) => {
      const content = error
        ? "The spec agent hit an error. Try again."
        : "Spec generated successfully.";
      void createFeedMessage(AI_CHAT_FEED_ID, {
        sender: "Spec agent",
        role: "assistant",
        content,
        timestamp: Date.now(),
      } satisfies AiChatMessage).catch(() => {});
      setSpecRun(null);
      setSpecSubmitting(false);
    },
  });

  async function postChat(message: AiChatMessage) {
    await createFeedMessage(AI_CHAT_FEED_ID, message).catch(() => {});
  }

  async function generateSpec() {
    if (specSubmitting || specRun) return;
    setSpecSubmitting(true);
    try {
      // eslint-disable-next-line react-hooks/purity
      const timestamp = Date.now();
      const nodes = reactFlow.getNodes();
      const edges = reactFlow.getEdges();

      // Build chat history from the feed, oldest first
      const chatHistory = chat.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      await postChat({
        sender: "You",
        role: "user",
        content: "Generate a technical specification",
        timestamp,
      });

      const res = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          projectId: room.id,
          nodes,
          edges,
          chatHistory,
        }),
      });
      if (!res.ok) throw new Error(`spec request failed: ${res.status}`);
      const { runId } = (await res.json()) as { runId: string };

      const tokenRes = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      if (!tokenRes.ok) {
        throw new Error(`token request failed: ${tokenRes.status}`);
      }
      const { token } = (await tokenRes.json()) as { token: string };

      setSpecRun({ id: runId, token });
    } catch {
      // eslint-disable-next-line react-hooks/purity
      const errorTimestamp = Date.now();
      await postChat({
        sender: "Spec agent",
        role: "assistant",
        content: "Couldn't start the spec generator. Try again.",
        timestamp: errorTimestamp,
      } satisfies AiChatMessage);
      setSpecSubmitting(false);
    }
  }

  async function submit() {
    const prompt = draft.trim();
    if (prompt === "" || runActive) return;
    setSubmitting(true);
    setRunTimedOut(false);
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
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `design request failed: ${res.status}`);
      }
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
    } catch (error) {
      await postChat({
        sender: "Design agent",
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Couldn’t start the design agent. Try again.",
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

      <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList className="mx-4 mt-3 grid grid-cols-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="specs">Specs</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 text-sm"
          >
            {chat.length === 0 ? (
              <div className="my-auto flex flex-col items-center gap-3 px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ai/10 text-ai-text">
                  <Sparkles className="h-6 w-6" />
                </span>
                <p className="text-sm text-copy-muted">
                  Describe a change and the design agent will update the canvas.
                </p>
              </div>
            ) : (
              chat.map((m) => (
                <div key={m.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={
                        m.role === "user"
                          ? "text-xs font-medium text-copy-primary"
                          : "text-xs font-medium text-ai-text"
                      }
                    >
                      {m.sender}
                    </span>
                    <span className="text-[11px] text-copy-muted">
                      {formatTime(m.timestamp)}
                    </span>
                  </div>
                  <p
                    className={
                      m.role === "user"
                        ? "rounded-xl bg-chat-user px-3 py-2 whitespace-pre-wrap wrap-break-word text-black/85"
                        : "rounded-xl border border-surface-border-subtle bg-elevated px-3 py-2 whitespace-pre-wrap wrap-break-word text-copy-secondary"
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
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ai opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ai" />
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
              className="max-h-32 min-h-9 flex-1 resize-none rounded-xl border border-surface-border bg-background px-3 py-2 text-sm text-copy-primary outline-none field-sizing-content placeholder:text-copy-muted focus-visible:border-ai/50 focus-visible:ring-2 focus-visible:ring-ai/20 disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon-sm"
              disabled={runActive || draft.trim() === ""}
              className="bg-ai text-copy-primary hover:bg-ai/90"
              aria-label="Send design prompt"
            >
              {runActive ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="specs" className="flex min-h-0 flex-1 flex-col">
          <SpecsPanel
            projectId={room.id}
            onGenerateSpec={generateSpec}
            isGenerating={specSubmitting}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
