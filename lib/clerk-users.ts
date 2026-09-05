import { clerkClient } from "@clerk/nextjs/server";

/** Public-facing identity for a collaborator email, enriched from Clerk when possible. */
export interface CollaboratorProfile {
  email: string;
  /** Display name from Clerk, or `null` when no Clerk user matches the email. */
  name: string | null;
  /** Avatar URL from Clerk, or `null` when unavailable. */
  imageUrl: string | null;
}

/**
 * Look up Clerk users for the given emails and return one profile per email.
 * Emails with no matching Clerk user (or when the lookup fails) fall back to
 * `{ email, name: null, imageUrl: null }` so the caller always gets a full list.
 */
export async function enrichEmailsWithClerk(
  emails: string[],
): Promise<CollaboratorProfile[]> {
  if (emails.length === 0) {
    return [];
  }

  const byEmail = new Map<string, { name: string | null; imageUrl: string }>();
  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({
      emailAddress: emails,
      limit: Math.min(emails.length, 100),
    });
    for (const user of data) {
      const name = user.fullName ?? user.username ?? null;
      for (const address of user.emailAddresses) {
        byEmail.set(address.emailAddress.toLowerCase(), {
          name,
          imageUrl: user.imageUrl,
        });
      }
    }
  } catch {
    // Clerk unavailable — every email falls back to email-only below.
  }

  return emails.map((email) => {
    const match = byEmail.get(email.toLowerCase());
    return {
      email,
      name: match?.name ?? null,
      imageUrl: match?.imageUrl ?? null,
    };
  });
}
