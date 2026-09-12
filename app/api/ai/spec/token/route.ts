import { mintRunToken } from "@/lib/ai-run";

/**
 * POST /api/ai/spec/token — mint a realtime token scoped to one spec run,
 * expiring after one hour. Verifies the caller started the run.
 */
export function POST(request: Request) {
  return mintRunToken(request, { expirationTime: "1h" });
}
