import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { recallFixture } from "@/test/fixtures";

const { getRecallPage } = vi.hoisted(() => ({ getRecallPage: vi.fn() }));

vi.mock("@/lib/api/recalls", () => ({ getRecallPage }));
vi.mock("@/components/search-form", () => ({
  SearchForm: ({ search, status }: { search?: string; status?: string }) => (
    <div data-testid="search-form">{`${search ?? ""}|${status ?? ""}`}</div>
  ),
}));
vi.mock("@/components/recall-feed", () => ({
  RecallFeed: ({
    currentPage,
    limit,
    totalCount,
  }: {
    currentPage: number;
    limit: number;
    totalCount: number;
  }) => (
    <div data-testid="recall-feed">
      {`${currentPage}|${limit}|${totalCount}`}
    </div>
  ),
}));

import RecallDirectory from "@/app/recalls/page";

describe("RecallDirectory", () => {
  it("requests 12 records with an offset calculated from the URL page", async () => {
    getRecallPage.mockResolvedValue({
      recalls: [recallFixture],
      totalCount: 25,
    });

    render(
      await RecallDirectory({
        searchParams: Promise.resolve({
          search: "Salmonella",
          status: "Ongoing",
          page: "2",
        }),
      }),
    );

    expect(getRecallPage).toHaveBeenCalledWith({
      search: "Salmonella",
      status: "Ongoing",
      limit: 12,
      offset: 12,
    });
    expect(screen.getByTestId("search-form")).toHaveTextContent(
      "Salmonella|Ongoing",
    );
    expect(screen.getByTestId("recall-feed")).toHaveTextContent("2|12|25");
  });
});
