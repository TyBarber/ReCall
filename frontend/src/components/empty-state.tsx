import Link from "next/link";

type EmptyStateProps = {
  filtered: boolean;
};

export function EmptyState({ filtered }: EmptyStateProps) {
  return (
    <div className="state-card empty-state">
      <span className="state-symbol" aria-hidden="true">
        ○
      </span>
      <h2>{filtered ? "No matching recalls found" : "No recalls to show"}</h2>
      <p>
        {filtered
          ? "Try a broader product name, company, reason, or UPC, or clear the status filter."
          : "The recall feed is currently empty. Please check again later."}
      </p>
      {filtered ? (
        <Link className="secondary-button" href="/recalls">
          Clear search and filters
        </Link>
      ) : null}
    </div>
  );
}
