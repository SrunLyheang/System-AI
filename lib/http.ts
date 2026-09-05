/** Thrown by {@link readJsonBody} when the body is present but not a valid JSON object. */
export class InvalidJsonBodyError extends Error {}

/**
 * Parse a JSON request body into a plain object. Returns an empty object only
 * when the body is absent/empty, so callers can default missing fields.
 * Throws {@link InvalidJsonBodyError} for malformed JSON, `null`, arrays, or
 * any other non-object JSON value.
 */
export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.trim().length === 0) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new InvalidJsonBodyError("Request body is not valid JSON");
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new InvalidJsonBodyError("Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}
