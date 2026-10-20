import type { Metadata } from "next";

import { FreshnessSticker } from "@/components/freshness";
import { Cut } from "@/components/receipt";
import { RecallFeed } from "@/components/recall-feed";
import { SearchForm } from "@/components/search-form";
import { WatchStrip } from "@/components/watch-prompt";
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
    sort: "newest",
    limit: PAGE_SIZE,
    offset,
  });

  const heading = level
    ? `${severityByKey(level).label} recalls`
    : search || status || source || recordType
      ? "Matching recalls"
      : "All recalls";
  const summary = search
    ? `Results for “${search}”${status ? ` with status ${status}` : ""}${source ? ` from ${source === "fda" ? "FDA" : "USDA FSIS"}` : ""}.`
    : status
      ? `${status} food safety records${source ? ` from ${source === "fda" ? "FDA" : "USDA FSIS"}` : ""}.`
      : source
        ? `${source === "fda" ? "FDA" : "USDA FSIS"} food safety records currently available in ReCall.`
        : "FDA and USDA FSIS food safety records currently available in ReCall.";

  return (
    <div className="stage">
      <div className="side">
        <h1 className="side-title-mid">{heading}</h1>
        <p className="side-soft">{summary}</p>
        <SearchForm
          search={search}
          status={status}
          source={source}
          recordType={recordType}
          level={level}
          severityFilterAvailable={severityFilterAvailable}
        />
        {search && recalls.length > 0 ? <WatchStrip term={search} /> : null}
      </div>

      <main className="receipt" id="current-recalls" aria-label="Search results">
        <header className="receipt-head">
          <p className="store store-small">RECALL</p>
          <p>Search receipt</p>
          <p className="receipt-meta">
            {search ? <span>Query: “{search.toLowerCase()}”</span> : null}
            <span aria-live="polite">
              {totalCount} {totalCount === 1 ? "recall" : "recalls"} found
            </span>
            <span>Newest first</span>
            <FreshnessSticker sources={freshness} />
          </p>
        </header>
        <Cut />
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
      </main>
    </div>
  );
}
