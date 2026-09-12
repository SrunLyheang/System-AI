import { getLiveblocks } from "@/lib/liveblocks";
import { AI_STORAGE_KEY, type AiActivity } from "@/types/canvas";

/** Replace the shared `ai` Storage object so every room participant — the canvas
 *  indicator and the sidebar "thinking" strip — sees the agent's current step.
 *  Each call writes a complete object; there is no partial merge.
 *
 *  Both the design and spec tasks write here. They don't run concurrently for a
 *  single user (the sidebar blocks it), so last-writer-wins is fine.
 *  ponytail: one shared slot per room — add a `kind` field if the two agents
 *  ever need to report progress at the same time. */
export async function setActivity(
  roomId: string,
  patch: Partial<Omit<AiActivity, "updatedAt">>,
) {
  const client = getLiveblocks();
  const next: AiActivity = {
    status: "idle",
    message: "",
    cursor: null,
    ...patch,
    updatedAt: Date.now(),
  };
  await client.mutateStorage(roomId, ({ root }) => {
    root.set(AI_STORAGE_KEY, next);
  });
}
