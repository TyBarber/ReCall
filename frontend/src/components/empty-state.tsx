import Link from "next/link";

type EmptyStateProps = {
  filtered: boolean;
};

export function EmptyState({ filtered }: EmptyStateProps) {
  return (
    <div className="state-panel empty-state">
      <p className="state-code" aria-hidden="true">00</p>
      <h2>
        {filtered
          ? "No recalls match that search"
          : "No current recalls are available"}
      </h2>
      <p>
        {filtered
          ? "Try a broader product name, company, reason, or UPC. You can also clear the status filter."
          : "Check again later for updated FDA recall information."}
      </p>
      {filtered ? (
        <Link className="secondary-button" href="/">
          Clear search and filters
        </Link>
      ) : null}
    </div>
  );
}
