import Form from "next/form";
import Link from "next/link";

import { SearchButton } from "@/components/search-button";
import { SearchIcon } from "@/components/ui/search-icon";
import type { Recall } from "@/lib/types";

type SearchFormProps = {
  search?: string;
  status?: string;
  source?: Recall["source"] | "";
  recordType?: Recall["record_type"] | "";
};

const STATUSES = [
  "",
  "Ongoing",
  "Completed",
  "Terminated",
  "Active Recall",
  "Closed Recall",
  "Public Health Alert",
] as const;

const SOURCES = [
  ["", "All sources"],
  ["fda", "FDA"],
  ["usda_fsis", "USDA FSIS"],
] as const;

const RECORD_TYPES = [
  ["", "All records"],
  ["recall", "Recalls"],
  ["public_health_alert", "Public Health Alerts"],
] as const;

function searchHref(
  search: string,
  status: string,
  source: string,
  recordType: string,
): string {
  const params = new URLSearchParams();
  if (search) {
    params.set("search", search);
  }
  if (status) {
    params.set("status", status);
  }
  if (source) {
    params.set("source", source);
  }
  if (recordType) {
    params.set("record_type", recordType);
  }
  params.set("page", "1");
  return `/recalls?${params.toString()}#current-recalls`;
}

export function SearchForm({
  search = "",
  status = "",
  source = "",
  recordType = "",
}: SearchFormProps) {
  return (
    <div className="command-search">
      <Form
        className="command-form"
        action="/recalls"
        role="search"
        aria-label="Search food recalls"
      >
        <input name="page" type="hidden" value="1" />
        {status ? <input name="status" type="hidden" value={status} /> : null}
        {source ? <input name="source" type="hidden" value={source} /> : null}
        {recordType ? (
          <input name="record_type" type="hidden" value={recordType} />
        ) : null}
        <label className="command-label" htmlFor="search">
          Search current recalls
        </label>
        <div className="command-bar">
          <SearchIcon className="command-icon" />
          <input
            id="search"
            name="search"
            type="search"
            defaultValue={search}
            placeholder="Search food, brands, UPCs"
            autoComplete="off"
          />
          <SearchButton />
        </div>
      </Form>
      <div className="search-support">
        <div className="status-chips" aria-label="Filter recalls by status">
          <span className="support-label">Status</span>
          {STATUSES.map((value) => {
            const active = status === value;
            return (
              <Link
                className={`status-chip${active ? " status-chip-active" : ""}`}
                href={searchHref(search, value, source, recordType)}
                aria-current={active ? "page" : undefined}
                key={value || "all"}
              >
                {active ? (
                  <span className="chip-check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
                {value || "All"}
              </Link>
            );
          })}
        </div>
        <div className="status-chips" aria-label="Filter recalls by source">
          <span className="support-label">Source</span>
          {SOURCES.map(([value, label]) => {
            const active = source === value;
            return (
              <Link
                className={`status-chip${active ? " status-chip-active" : ""}`}
                href={searchHref(search, status, value, recordType)}
                aria-current={active ? "page" : undefined}
                key={value || "all-sources"}
              >
                {active ? (
                  <span className="chip-check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
                {label}
              </Link>
            );
          })}
        </div>
        <div className="status-chips" aria-label="Filter recalls by record type">
          <span className="support-label">Type</span>
          {RECORD_TYPES.map(([value, label]) => {
            const active = recordType === value;
            return (
              <Link
                className={`status-chip${active ? " status-chip-active" : ""}`}
                href={searchHref(search, status, source, value)}
                aria-current={active ? "page" : undefined}
                key={value || "all-record-types"}
              >
                {active ? (
                  <span className="chip-check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
                {label}
              </Link>
            );
          })}
        </div>
        <div className="quick-searches" aria-label="Suggested searches">
          <span className="support-label">Try</span>
          {[
            ["Salmonella", "Salmonella"],
            ["Allergens", "allergen"],
            ["Cheese", "cheese"],
          ].map(([label, query]) => (
            <Link href={searchHref(query, status, source, recordType)} key={query}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
