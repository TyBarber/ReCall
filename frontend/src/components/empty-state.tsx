import Link from "next/link";

import { WatchButton } from "@/components/watch-button";

type EmptyStateProps = {
  filtered: boolean;
  /** The search that found nothing; offers to watch it. */
  search?: string;
  /** Whether filters besides the search narrowed the results. */
  otherFilters?: boolean;
};

export function EmptyState({ filtered, search, otherFilters = false }: EmptyStateProps) {
  if (search && !otherFilters) {
    return (
      <div className="state-receipt empty-state empty-state-watch">
        <p className="r-label">0 items</p>
        <h2>No recalls found for “{search}”</h2>
        <p>
          Nothing in the FDA and USDA FSIS records ReCall checks matches this
          search. Check the spelling, or try the brand or the barcode number.
        </p>
        <div className="coupon">
          <p>
            <strong>Want to keep an eye on it?</strong> Watch “{search}” and if
            a matching recall is listed later, it will show up on your home page.
          </p>
          <WatchButton placement="empty_results" term={search} />
        </div>
      </div>
    );
  }

  return (
    <div className="state-receipt empty-state">
      <p className="r-label">0 items</p>
      <h2>{filtered ? "No matching recalls found" : "No recalls to show"}</h2>
      <p>
        {filtered
          ? "Try a broader product name, company, reason, or UPC, or clear the filters."
          : "The recall feed is currently empty. Please check again later."}
      </p>
      <div className="state-actions">
        {search ? <WatchButton placement="empty_results" term={search} /> : null}
        {filtered ? (
          <Link className="r-btn r-btn-ghost" href="/recalls">
            Clear search and filters
          </Link>
        ) : null}
      </div>
    </div>
  );
}
