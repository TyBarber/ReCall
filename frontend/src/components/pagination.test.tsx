import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Pagination,
  paginationItems,
} from "@/components/pagination";

describe("Pagination", () => {
  it("calculates useful page windows near the beginning, middle, and end", () => {
    expect(paginationItems(2, 13)).toEqual([1, 2, 3, 4, 5, "ellipsis", 13]);
    expect(paginationItems(6, 13)).toEqual([
      1,
      "ellipsis",
      5,
      6,
      7,
      "ellipsis",
      13,
    ]);
    expect(paginationItems(12, 13)).toEqual([
      1,
      "ellipsis",
      9,
      10,
      11,
      12,
      13,
    ]);
  });

  it("shows page totals and preserves search and status parameters", () => {
    render(
      <Pagination
        currentPage={6}
        limit={12}
        search="Salmonella"
        status="Ongoing"
        source="usda_fsis"
        recordType="public_health_alert"
        totalCount={156}
      />,
    );

    expect(screen.getByText("Page 6 of 13")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/recalls?search=Salmonella&status=Ongoing&source=usda_fsis&record_type=public_health_alert&page=5#current-recalls",
    );
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/recalls?search=Salmonella&status=Ongoing&source=usda_fsis&record_type=public_health_alert&page=7#current-recalls",
    );
    expect(screen.getByRole("link", { name: "Page 13" })).toHaveAttribute(
      "href",
      "/recalls?search=Salmonella&status=Ongoing&source=usda_fsis&record_type=public_health_alert&page=13#current-recalls",
    );
    expect(
      document.querySelector('[aria-current="page"]'),
    ).toHaveTextContent("6");
  });

  it("uses explicit disabled states and omits single-page pagination", () => {
    const { rerender } = render(
      <Pagination currentPage={1} limit={12} totalCount={24} />,
    );

    expect(screen.getByText("Previous").closest("span")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/recalls?page=2#current-recalls",
    );

    rerender(<Pagination currentPage={1} limit={12} totalCount={0} />);
    expect(
      screen.queryByRole("navigation", { name: "Recall results pages" }),
    ).not.toBeInTheDocument();
  });
});
