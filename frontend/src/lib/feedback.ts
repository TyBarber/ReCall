/** Where a Watch click happened; counted per placement to see what works. */
export type WatchPlacement = "home_teaser" | "empty_results" | "results" | "detail";

/** Counts a Watch click. Fire-and-forget: counting never blocks watching. */
export function recordWatch(placement: WatchPlacement): void {
  try {
    void fetch("/api/events/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placement }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // fetch can be missing or throw synchronously in old browsers and tests.
  }
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

/** Posts a form to one of ReCall's own feedback routes. */
export async function submitFeedback(
  path: "/api/alerts" | "/api/survey",
  body: Record<string, unknown>,
): Promise<SubmitResult> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      return { ok: true };
    }
    const data = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    return {
      ok: false,
      error:
        typeof data?.error === "string"
          ? data.error
          : "Something went wrong. Please try again.",
    };
  } catch {
    return { ok: false, error: "Couldn’t reach ReCall. Check your connection and try again." };
  }
}
