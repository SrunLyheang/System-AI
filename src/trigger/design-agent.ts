import { logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

/**
 * Design generation task. Backend wiring only for now — it validates and echoes
 * the payload. AI logic (reading the canvas, generating nodes/edges, writing
 * them back) lands in a later unit.
 */
export const designAgent = schemaTask({
  id: "design-agent",
  maxDuration: 300,
  schema: z.object({
    prompt: z.string(),
    roomId: z.string(),
  }),
  run: async (payload) => {
    logger.log("design-agent received payload", { payload });
    return { received: payload };
  },
});
