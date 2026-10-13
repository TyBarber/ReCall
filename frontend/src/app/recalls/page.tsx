import type { Metadata } from "next";

import { FreshnessSticker } from "@/components/freshness";
import { RecallFeed } from "@/components/recall-feed";
import { SearchForm } from "@/components/search-form";
import { WatchButton } from "@/components/watch-button";
import { getFreshness, getRecallPage } from "@/lib/api/recalls";
import {
  severityByKey,
  severityFilterClass,
  type SeverityFilterKey,
} from "@/lib/format";

const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "Current food recalls",
  description:
    "Browse and search current U.S. FDA and USDA FSIS food safety information.",
};

type DirectorySearchParams = {
  search?: string | string[];
  status?: string | string[];
  page?: string | string[];
  source?: string | string[];
  record_type?: string | string[];
  level?: string | string[];
};

function firstValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : value?.[0] ?? "";
}

export default async function RecallDirectory({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}) {
  const params = await searchParams;
  const search = firstValue(params.search).trim();
  const status = firstValue(params.status).trim();
  const requestedSource = firstValue(params.source).trim();
  const source =
    requestedSource === "fda" || requestedSource === "usda_fsis"
      ? requestedSource
      : "";
  const requestedRecordType = firstValue(params.record_type).trim();
  const recordType =
    requestedRecordType === "recall" ||
    requestedRecordType === "public_health_alert"
      ? requestedRecordType
      : "";
  const freshness = await getFreshness();
  // The API ignores unknown filters, so only offer severity once it exists.
  const severityFilterAvailable = freshness !== null;
  const requestedLevel = firstValue(params.level).trim();
  const classification = severityFilterAvailable
    ? severityFilterClass(requestedLevel)
    : undefined;
  const level = classification ? (requestedLevel as SeverityFilterKey) : "";
  const requestedPage = Number.parseInt(firstValue(params.page), 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;
  const { recalls, totalCount } = await getRecallPage({
    search: search || undefined,
    status: status || undefined,
    source: source || undefined,
    recordType: recordType || undefined,
    classification,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <main className="home-page directory-page">
      <section className="directory-intro">
        <div className="shell directory-intro-inner">
          <FreshnessSticker sources={freshness} />
          <h1>Current food recalls</h1>
          <p>
            Search every FDA and USDA FSIS food recall by product, brand, or
            barcode. Use the filters to narrow things down.
          </p>
          <SearchForm
            search={search}
            status={status}
            source={source}
            recordType={recordType}
            level={level}
            severityFilterAvailable={severityFilterAvailable}
          />
        </div>
      </section>

      <section className="recall-feed-section" id="current-recalls">
        <div className="shell recall-feed-inner">
          <div className="feed-heading directory-feed-heading">
            <div>
              <h2>
                {level
                  ? `${severityByKey(level).label} recalls`
                  : search || status || source || recordType
                    ? "Matching recalls"
                    : "All recalls"}
              </h2>
              <p className="feed-copy">
                {search
                  ? `Results for “${search}”${status ? ` with status ${status}` : ""}${source ? ` from ${source === "fda" ? "FDA" : "USDA FSIS"}` : ""}.`
                  : status
                    ? `${status} food safety records${source ? ` from ${source === "fda" ? "FDA" : "USDA FSIS"}` : ""}.`
                    : source
                      ? `${source === "fda" ? "FDA" : "USDA FSIS"} food safety records currently available in ReCall.`
                      : "FDA and USDA FSIS food safety records currently available in ReCall."}
              </p>
            </div>
            <div className="feed-actions">
              {search ? <WatchButton term={search} /> : null}
              <p className="feed-results-summary" aria-live="polite">
                {totalCount} {totalCount === 1 ? "recall" : "recalls"}
              </p>
            </div>
          </div>
          <RecallFeed
            recalls={recalls}
            search={search || undefined}
            status={status || undefined}
            source={source || undefined}
            recordType={recordType || undefined}
            level={level || undefined}
            currentPage={currentPage}
            limit={PAGE_SIZE}
            totalCount={totalCount}
          />
        </div>
      </section>
    </main>
  );
}
