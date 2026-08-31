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
        offset={0}
        limit={12}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "No recalls match that search" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Clear search and filters" }),
    ).toHaveAttribute("href", "/");
  });

  it("renders recall results and pagination without inventing totals", () => {
    render(
      <RecallFeed
        recalls={Array.from({ length: 12 }, (_, index) => ({
          ...recallFixture,
          id: `${recallFixture.id}-${index}`,
        }))}
        offset={0}
        limit={12}
      />,
    );

    expect(screen.getAllByRole("article")).toHaveLength(12);
    expect(screen.getByRole("link", { name: /next/i })).toBeInTheDocument();
    expect(screen.queryByText(/of \d+/i)).not.toBeInTheDocument();
  });
});
