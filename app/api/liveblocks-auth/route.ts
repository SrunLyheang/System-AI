import { currentUser } from "@clerk/nextjs/server";

import { readJsonObject } from "@/lib/http";
import { colorForUserId, getLiveblocks } from "@/lib/liveblocks";
import { getAccessibleProject } from "@/lib/project-access";

/**
 * POST /api/liveblocks-auth — issue a Liveblocks session token for a project room.
 *
 * The Liveblocks room ID is the project ID. Requires Clerk auth, verifies the
 * caller can open the project via `getAccessibleProject`, ensures the room
 * exists, and returns a token carrying the user's name, avatar, and cursor color.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const roomId = typeof body.room === "string" ? body.room : "";
  if (!roomId) {
    return Response.json({ error: "Missing room" }, { status: 400 });
  }

  const identity = {
    userId: user.id,
    email: user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "",
  };
  const project = await getAccessibleProject(roomId, identity);
  if (!project) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const liveblocks = getLiveblocks();

  // Create the room on first access; no-op if it already exists.
  await liveblocks.getOrCreateRoom(roomId, { defaultAccesses: [] });

  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.fullName ?? user.username ?? (identity.email || "Anonymous"),
      avatar: user.imageUrl,
      color: colorForUserId(user.id),
    },
  });
  session.allow(roomId, session.FULL_ACCESS);

  const { status, body: token } = await session.authorize();
  return new Response(token, { status });
}
