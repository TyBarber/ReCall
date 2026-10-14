import { apiBaseUrl } from "@/lib/api/recalls";

const MAX_BODY_BYTES = 4_000;

type ForwardOptions = {
  /** Backend path, e.g. "/alerts/signups". */
  path: string;
  /** Message shown when the backend rejects the input. */
  invalidMessage: string;
};

async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Relays a feedback submission to the recall API from the server, because the
 * API does not accept cross-origin requests. The backend validates the fields;
 * this layer only bounds the size, drops bot submissions, and maps errors to
 * messages people can act on.
 */
export async function forwardFeedback(
  request: Request,
  { path, invalidMessage }: ForwardOptions,
): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body) {
    return Response.json({ error: invalidMessage }, { status: 400 });
  }

  // Hidden "website" field: people never see it, form-filling bots do.
  if (typeof body.website === "string" && body.website.trim()) {
    return Response.json({ status: "accepted" }, { status: 202 });
  }
  delete body.website;

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: "ReCall couldn’t save that right now. Please try again later." },
      { status: 502 },
    );
  }

  if (response.ok) {
    return Response.json({ status: "accepted" }, { status: 202 });
  }
  if (response.status === 422) {
    return Response.json({ error: invalidMessage }, { status: 400 });
  }
  return Response.json(
    { error: "ReCall couldn’t save that right now. Please try again later." },
    { status: 502 },
  );
}
