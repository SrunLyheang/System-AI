/**
 * Parse a JSON request body into a plain object. Returns an empty object when
 * the body is absent/empty, so callers can default missing fields. Returns a
 * ready-to-return `400` response for malformed JSON, `null`, arrays, or any
 * other non-object JSON value. Route handlers do
 * `const body = await readJsonObject(request); if (body instanceof Response) return body;`.
 */
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | Response> {
  const text = await request.text();
  if (text.trim().length === 0) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return Response.json(
      { error: "Request body is not valid JSON" },
      { status: 400 },
    );
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return Response.json(
      { error: "Request body must be a JSON object" },
      { status: 400 },
    );
  }
  return parsed as Record<string, unknown>;
}
