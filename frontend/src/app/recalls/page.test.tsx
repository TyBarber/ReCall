import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { recallFixture } from "@/test/fixtures";

const { getRecallPage } = vi.hoisted(() => ({ getRecallPage: vi.fn() }));

vi.mock("@/lib/api/recalls", () => ({ getRecallPage }));
vi.mock("@/components/search-form", () => ({
  SearchForm: ({ search, status, source, recordType }: { search?: string; status?: string; source?: string; recordType?: string }) => (
    <div data-testid="search-form">{`${search ?? ""}|${status ?? ""}|${source ?? ""}|${recordType ?? ""}`}</div>
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
          source: "usda_fsis",
          record_type: "public_health_alert",
          page: "2",
        }),
      }),
    );

    expect(getRecallPage).toHaveBeenCalledWith({
      search: "Salmonella",
      status: "Ongoing",
      source: "usda_fsis",
      recordType: "public_health_alert",
      limit: 12,
      offset: 12,
    });
    expect(screen.getByTestId("search-form")).toHaveTextContent(
      "Salmonella|Ongoing|usda_fsis|public_health_alert",
    );
    expect(screen.getByTestId("recall-feed")).toHaveTextContent("2|12|25");
  });
});
