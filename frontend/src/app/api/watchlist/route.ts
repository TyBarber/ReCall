import { getRecalls } from "@/lib/api/recalls";
import type { WatchlistResult } from "@/lib/types";

const MAX_TERMS = 10;
const MAX_TERM_LENGTH = 80;
const MATCHES_PER_TERM = 3;

function parseTerms(body: unknown): string[] | null {
  const terms = (body as { terms?: unknown } | null)?.terms;
  if (
    !Array.isArray(terms) ||
    terms.length > MAX_TERMS ||
    !terms.every(
      (term) =>
        typeof term === "string" &&
        term.trim().length > 0 &&
        term.length <= MAX_TERM_LENGTH,
    )
  ) {
    return null;
  }
  return terms.map((term) => term.trim());
}

/** Looks up the newest recalls for each saved search on the watchlist. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const terms = parseTerms(body);
  if (!terms) {
    return Response.json(
      { error: `Send up to ${MAX_TERMS} search terms.` },
      { status: 400 },
    );
  }

  const results: WatchlistResult[] = await Promise.all(
    terms.map(async (term) => {
      try {
        const recalls = await getRecalls({
          search: term,
          sort: "newest",
          limit: MATCHES_PER_TERM,
        });
        return {
          term,
          recalls: recalls.map(
            ({ id, product_name, classification, record_type, reported_at, recall_date }) => ({
              id,
              product_name,
              classification,
              record_type,
              reported_at,
              recall_date,
            }),
          ),
        };
      } catch {
        return { term, recalls: null };
      }
    }),
  );

  return Response.json({ results });
}
