import type { Metadata } from "next";

import { RecallFeed } from "@/components/recall-feed";
import { SearchForm } from "@/components/search-form";
import { getRecalls } from "@/lib/api/recalls";

const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "Current food recalls",
  description:
    "Search current U.S. FDA food enforcement recall information by product, company, reason, or UPC.",
};

type HomeSearchParams = {
  search?: string | string[];
  status?: string | string[];
  offset?: string | string[];
};

function firstValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : value?.[0] ?? "";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const search = firstValue(params.search).trim();
  const status = firstValue(params.status).trim();
  const requestedOffset = Number.parseInt(firstValue(params.offset), 10);
  const offset =
    Number.isFinite(requestedOffset) && requestedOffset > 0
      ? requestedOffset
      : 0;
  const recalls = await getRecalls({
    search: search || undefined,
    status: status || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <div className="alert-page">
      <section className="hero">
        <div className="shell hero-inner">
          <p className="source-line">
            <span aria-hidden="true" /> U.S. FDA enforcement data
          </p>
          <h1>
            Current food <em>recalls</em>
          </h1>
          <p className="hero-copy">
            Check what has been pulled from shelves. Search by product,
            company, recall reason, or UPC.
          </p>
          <SearchForm search={search} status={status} />
          <p className="source-note">
            Recall information is sourced from U.S. FDA enforcement data and
            may be updated as investigations develop.
          </p>
        </div>
      </section>

      <main className="feed-section" id="current-recalls">
        <div className="shell feed-inner">
          <div className="feed-heading">
            <div>
              <h2>Recall feed</h2>
              <p>{recalls.length} records shown on this page</p>
            </div>
            {search || status ? (
              <p className="feed-results-summary" aria-live="polite">
                {search
                  ? `Showing matches for “${search}”`
                  : `Showing ${status.toLowerCase()} recalls`}
              </p>
            ) : (
              <p className="feed-status">
                Current FDA enforcement records
              </p>
            )}
          </div>
          <RecallFeed
            recalls={recalls}
            search={search || undefined}
            status={status || undefined}
            offset={offset}
            limit={PAGE_SIZE}
          />
        </div>
      </main>
    </div>
  );
}
