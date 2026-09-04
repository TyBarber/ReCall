import Link from "next/link";

type PaginationProps = {
  currentPage: number;
  limit: number;
  search?: string;
  status?: string;
  totalCount: number;
};

type PageItem = number | "ellipsis";

export function paginationItems(
  currentPage: number,
  totalPages: number,
): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

function pageHref(
  page: number,
  search: string | undefined,
  status: string | undefined,
): string {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (status) query.set("status", status);
  query.set("page", String(page));
  return `/recalls?${query.toString()}#current-recalls`;
}

function DirectionControl({
  direction,
  disabled,
  href,
}: {
  direction: "Previous" | "Next";
  disabled: boolean;
  href: string;
}) {
  const arrow = direction === "Previous" ? "←" : "→";

  if (disabled) {
    return (
      <span className="page-direction page-direction-disabled" aria-disabled="true">
        {direction === "Previous" ? <span aria-hidden="true">{arrow}</span> : null}
        {direction}
        {direction === "Next" ? <span aria-hidden="true">{arrow}</span> : null}
      </span>
    );
  }

  return (
    <Link className="page-direction" href={href}>
      {direction === "Previous" ? <span aria-hidden="true">{arrow}</span> : null}
      {direction}
      {direction === "Next" ? <span aria-hidden="true">{arrow}</span> : null}
    </Link>
  );
}

export function Pagination({
  currentPage,
  limit,
  search,
  status,
  totalCount,
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / limit);
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Recall results pages">
      <p className="pagination-summary" aria-live="polite">
        Page {currentPage} of {totalPages}
      </p>
      <div className="pagination-controls">
        <DirectionControl
          direction="Previous"
          disabled={currentPage === 1}
          href={pageHref(currentPage - 1, search, status)}
        />

        <div className="pagination-pages" aria-label="Choose a recall results page">
          {paginationItems(currentPage, totalPages).map((item, index) =>
            item === "ellipsis" ? (
              <span className="page-ellipsis" aria-hidden="true" key={`ellipsis-${index}`}>
                …
              </span>
            ) : item === currentPage ? (
              <span className="page-number-link page-number-current" aria-current="page" key={item}>
                <span className="sr-only">Page </span>
                {item}
              </span>
            ) : (
              <Link
                className="page-number-link"
                href={pageHref(item, search, status)}
                aria-label={`Page ${item}`}
                key={item}
              >
                {item}
              </Link>
            ),
          )}
        </div>

        <DirectionControl
          direction="Next"
          disabled={currentPage === totalPages}
          href={pageHref(currentPage + 1, search, status)}
        />
      </div>
    </nav>
  );
}
