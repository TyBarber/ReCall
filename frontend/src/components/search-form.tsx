import Form from "next/form";
import Link from "next/link";

import { SearchButton } from "@/components/search-button";
import { SearchIcon } from "@/components/ui/search-icon";

type SearchFormProps = {
  search?: string;
  status?: string;
};

const STATUSES = ["", "Ongoing", "Completed", "Terminated"] as const;

function searchHref(search: string, status: string): string {
  const params = new URLSearchParams();
  if (search) {
    params.set("search", search);
  }
  if (status) {
    params.set("status", status);
  }
  params.set("page", "1");
  return `/recalls?${params.toString()}#current-recalls`;
}

export function SearchForm({ search = "", status = "" }: SearchFormProps) {
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
                href={searchHref(search, value)}
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
        <div className="quick-searches" aria-label="Suggested searches">
          <span className="support-label">Try</span>
          {[
            ["Salmonella", "Salmonella"],
            ["Allergens", "allergen"],
            ["Cheese", "cheese"],
          ].map(([label, query]) => (
            <Link href={searchHref(query, status)} key={query}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
