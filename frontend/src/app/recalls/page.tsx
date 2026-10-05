import type { Metadata } from "next";

import { RecallFeed } from "@/components/recall-feed";
import { SearchForm } from "@/components/search-form";
import { getRecallPage } from "@/lib/api/recalls";

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
  const requestedPage = Number.parseInt(firstValue(params.page), 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;
  const { recalls, totalCount } = await getRecallPage({
    search: search || undefined,
    status: status || undefined,
    source: source || undefined,
    recordType: recordType || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <main className="home-page directory-page">
      <section className="directory-intro">
        <div className="shell directory-intro-inner">
          <p className="feed-kicker">Recall directory</p>
          <h1>Current food recalls</h1>
          <p>
            Search FDA and USDA FSIS food safety records, then narrow the
            directory by status or source.
          </p>
          <SearchForm
            search={search}
            status={status}
            source={source}
            recordType={recordType}
          />
        </div>
      </section>

      <section className="recall-feed-section" id="current-recalls">
        <div className="shell recall-feed-inner">
          <div className="feed-heading directory-feed-heading">
            <div>
              <p className="feed-kicker">Browse recalls</p>
              <h2>
                {search || status || source || recordType
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
            <p className="feed-results-summary" aria-live="polite">
              {totalCount} {totalCount === 1 ? "recall" : "recalls"}
            </p>
          </div>
          <RecallFeed
            recalls={recalls}
            search={search || undefined}
            status={status || undefined}
            source={source || undefined}
            recordType={recordType || undefined}
            currentPage={currentPage}
            limit={PAGE_SIZE}
            totalCount={totalCount}
          />
        </div>
      </section>
    </main>
  );
}
