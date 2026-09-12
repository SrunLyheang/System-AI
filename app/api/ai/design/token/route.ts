import { mintRunToken } from "@/lib/ai-run";

/**
 * POST /api/ai/design/token — mint a realtime token scoped to one design run.
 * Verifies the caller started the run (via the `TaskRun` record).
 */
export function POST(request: Request) {
  return mintRunToken(request);
}
