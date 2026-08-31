import Link from "next/link";

type PaginationProps = {
  offset: number;
  limit: number;
  resultCount: number;
  search?: string;
  status?: string;
};

function pageHref(
  offset: number,
  search: string | undefined,
  status: string | undefined,
): string {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (status) query.set("status", status);
  if (offset > 0) query.set("offset", String(offset));
  const suffix = query.toString();
  return suffix ? `/?${suffix}#current-recalls` : "/#current-recalls";
}

export function Pagination({
  offset,
  limit,
  resultCount,
  search,
  status,
}: PaginationProps) {
  if (offset === 0 && resultCount < limit) {
    return null;
  }

  const currentPage = Math.floor(offset / limit) + 1;
  return (
    <nav className="pagination" aria-label="Recall results pages">
      {offset > 0 ? (
        <Link
          className="page-link"
          href={pageHref(Math.max(0, offset - limit), search, status)}
        >
          <span aria-hidden="true">←</span> Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="page-number">Page {currentPage}</span>
      {resultCount === limit ? (
        <Link
          className="page-link"
          href={pageHref(offset + limit, search, status)}
        >
          Next <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
