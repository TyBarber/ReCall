import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecallFeed } from "@/components/recall-feed";
import { recallFixture } from "@/test/fixtures";

describe("RecallFeed", () => {
  it("shows a helpful filtered empty state", () => {
    render(
      <RecallFeed
        recalls={[]}
        search="not a product"
        currentPage={1}
        limit={12}
        totalCount={0}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "No matching recalls found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Clear search and filters" }),
    ).toHaveAttribute("href", "/recalls");
  });

  it("renders exactly 12 recall results with truthful pagination", () => {
    render(
      <RecallFeed
        recalls={Array.from({ length: 12 }, (_, index) => ({
          ...recallFixture,
          id: `${recallFixture.id}-${index}`,
        }))}
        currentPage={1}
        limit={12}
        totalCount={25}
      />,
    );

    expect(screen.getAllByRole("article")).toHaveLength(12);
    expect(screen.getByRole("link", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("handles a partial final page and disables Next", () => {
    render(
      <RecallFeed
        recalls={[recallFixture]}
        currentPage={3}
        limit={12}
        totalCount={25}
      />,
    );

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(screen.getByText("Next").closest("span")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
