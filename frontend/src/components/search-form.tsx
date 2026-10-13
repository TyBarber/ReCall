import Form from "next/form";
import Link from "next/link";

import { SearchButton } from "@/components/search-button";
import { SearchIcon } from "@/components/ui/search-icon";
import {
  SEVERITY_FILTERS,
  severityByKey,
  type SeverityFilterKey,
} from "@/lib/format";
import type { Recall } from "@/lib/types";

type SearchFormProps = {
  search?: string;
  status?: string;
  source?: Recall["source"] | "";
  recordType?: Recall["record_type"] | "";
  level?: SeverityFilterKey | "";
  severityFilterAvailable?: boolean;
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

const LEVELS: [SeverityFilterKey | "", string][] = [
  ["", "All"],
  ...SEVERITY_FILTERS.map(
    ([key]) => [key, severityByKey(key).label] as [SeverityFilterKey, string],
  ),
];

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
  level: string,
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
  if (level) {
    params.set("level", level);
  }
  params.set("page", "1");
  return `/recalls?${params.toString()}#current-recalls`;
}

export function SearchForm({
  search = "",
  status = "",
  source = "",
  recordType = "",
  level = "",
  severityFilterAvailable = false,
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
        {level ? <input name="level" type="hidden" value={level} /> : null}
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
            placeholder="Food, brand, or barcode"
            autoComplete="off"
          />
          <SearchButton />
        </div>
      </Form>
      <div className="search-support">
        {severityFilterAvailable ? (
          <div
            className="status-chips"
            aria-label="Filter recalls by how serious they are"
          >
            <span className="support-label">How serious</span>
            {LEVELS.map(([value, label]) => {
              const active = level === value;
              return (
                <Link
                  className={`status-chip severity-chip${value ? ` tone-${value}` : ""}${active ? " status-chip-active" : ""}`}
                  href={searchHref(search, status, source, recordType, value)}
                  aria-current={active ? "page" : undefined}
                  key={value || "all-levels"}
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
        ) : null}
        <div className="quick-searches" aria-label="Suggested searches">
          <span className="support-label">Try</span>
          {[
            ["Salmonella", "Salmonella"],
            ["Listeria", "Listeria"],
            ["Allergens", "allergen"],
            ["Cheese", "cheese"],
          ].map(([label, query]) => (
            <Link href={searchHref(query, status, source, recordType, level)} key={query}>
              {label}
            </Link>
          ))}
        </div>
        <div className="status-chips" aria-label="Filter recalls by source">
          <span className="support-label">Source</span>
          {SOURCES.map(([value, label]) => {
            const active = source === value;
            return (
              <Link
                className={`status-chip${active ? " status-chip-active" : ""}`}
                href={searchHref(search, status, value, recordType, level)}
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
        <details className="more-filters" open={Boolean(status || recordType)}>
          <summary>More filters</summary>
          <div className="status-chips" aria-label="Filter recalls by status">
            <span className="support-label">Status</span>
            {STATUSES.map((value) => {
              const active = status === value;
              return (
                <Link
                  className={`status-chip${active ? " status-chip-active" : ""}`}
                  href={searchHref(search, value, source, recordType, level)}
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
          <div className="status-chips" aria-label="Filter recalls by record type">
            <span className="support-label">Type</span>
            {RECORD_TYPES.map(([value, label]) => {
              const active = recordType === value;
              return (
                <Link
                  className={`status-chip${active ? " status-chip-active" : ""}`}
                  href={searchHref(search, status, source, value, level)}
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
        </details>
      </div>
    </div>
  );
}
