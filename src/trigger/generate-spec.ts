import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { put } from "@vercel/blob";
import { z } from "zod";

import { generateChatText } from "@/lib/ai";
import { setActivity } from "@/lib/ai-activity";
import { createProjectSpec } from "@/lib/project-specs";

/** Loose shapes — the canvas payload comes straight from the client's React Flow
 *  state, so we only pin the fields the prompt actually reads and pass the rest
 *  through untouched. */
const nodeSchema = z
  .object({
    id: z.string(),
    type: z.string().optional(),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const edgeSchema = z
  .object({
    id: z.string(),
    source: z.string().optional(),
    target: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const chatMessageSchema = z
  .object({
    role: z.string(),
    content: z.string(),
  })
  .passthrough();

function summariseNode(node: z.infer<typeof nodeSchema>) {
  const data = node.data ?? {};
  return {
    id: node.id,
    label: typeof data.label === "string" ? data.label : "",
    shape: typeof data.shape === "string" ? data.shape : undefined,
    x: node.position?.x,
    y: node.position?.y,
  };
}

function specPrompt(
  nodes: z.infer<typeof nodeSchema>[],
  edges: z.infer<typeof edgeSchema>[],
  chatHistory: z.infer<typeof chatMessageSchema>[],
) {
  const graph = {
    nodes: nodes.map(summariseNode),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label:
        e.data && typeof e.data.label === "string" ? e.data.label : undefined,
    })),
  };
  const conversation = chatHistory
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  return `You are a senior software architect. Write a technical specification in
GitHub-flavoured Markdown for the system described by the design canvas and the
conversation below.

Structure the document with these sections (omit one only if there is genuinely
nothing to say):
1. Overview
2. Architecture & Components (one subsection per canvas node, describing its
   responsibility and how it connects to the others)
3. Data Flow
4. APIs / Interfaces
5. Data Model
6. Non-functional Requirements (scaling, security, observability)
7. Open Questions

Ground every statement in the canvas and conversation. Do not invent components
that are not present. Output only the Markdown document — no preamble, no code
fence around the whole thing.

## Design canvas (JSON)
${JSON.stringify(graph, null, 2)}

## Conversation
${conversation || "(no conversation captured)"}`;
}

/**
 * Spec generation task. Turns a design canvas + chat context into a Markdown
 * technical spec via the configured model. Progress is published to the shared
 * `ai` Storage object (same as the design agent) so the sidebar "thinking" strip
 * and the canvas indicator track it; the finished Markdown is the task output.
 */
export const generateSpec = schemaTask({
  id: "generate-spec",
  maxDuration: 300,
  schema: z.object({
    projectId: z.string(),
    roomId: z.string(),
    chatHistory: z.array(chatMessageSchema).default([]),
    nodes: z.array(nodeSchema).default([]),
    edges: z.array(edgeSchema).default([]),
  }),
  run: async ({ projectId, roomId, chatHistory, nodes, edges }, { ctx }) => {
    try {
      await setActivity(roomId, {
        status: "thinking",
        message: `Reading ${nodes.length} node${
          nodes.length === 1 ? "" : "s"
        } and ${chatHistory.length} message${
          chatHistory.length === 1 ? "" : "s"
        }…`,
      });

      await setActivity(roomId, {
        status: "generating",
        message: "Drafting the technical specification…",
      });
      const text = await generateChatText({
        prompt: specPrompt(nodes, edges, chatHistory),
      });

      const spec = text.trim();

      await setActivity(roomId, {
        status: "generating",
        message: "Saving the spec…",
      });

      // Persist: Markdown content to Vercel Blob, pointer row to Prisma — same
      // split as canvas persistence (`app/api/projects/[projectId]/canvas`).
      const blob = await put(`specs/${projectId}/${ctx.run.id}.md`, spec, {
        access: "private",
        contentType: "text/markdown",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      const record = await createProjectSpec(projectId, blob.url);

      logger.info("generate-spec done", {
        nodes: nodes.length,
        edges: edges.length,
        specLength: spec.length,
        specId: record.id,
      });

      await setActivity(roomId, {
        status: "done",
        message: "Spec ready — open the Specs tab to view it.",
      });
      return { spec, specId: record.id };
    } catch (error) {
      logger.error("generate-spec failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      await setActivity(roomId, {
        status: "error",
        message: "Spec generation failed. Try again.",
      }).catch(() => {});
      // Model / provider failures won't recover on a blind retry. Raw provider
      // errors reach the subscribed client via the run surface, so the message
      // is generic — the detail is in the log above.
      throw new AbortTaskRunError("Spec generation failed. Please try again.");
    }
  },
});
