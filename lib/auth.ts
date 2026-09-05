import { auth } from "@clerk/nextjs/server";

/**
 * Resolve the authenticated Clerk user ID for the current request, or `null`
 * when the request is unauthenticated. Route handlers use this to enforce auth
 * and return a `401` themselves rather than relying on proxy-level protection.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
