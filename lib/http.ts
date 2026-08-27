/**
 * Parse a JSON request body into a plain object. Returns an empty object when
 * the body is absent, empty, invalid JSON, or not a JSON object, so callers can
 * validate individual fields without guarding against parse failures.
 */
export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json();
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to the empty-object default.
  }
  return {};
}
