import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { recallFixture } from "@/test/fixtures";

const { getFreshness, getRecallPage } = vi.hoisted(() => ({
  getFreshness: vi.fn(),
  getRecallPage: vi.fn(),
}));

vi.mock("@/lib/api/recalls", () => ({ getFreshness, getRecallPage }));
vi.mock("@/components/search-form", () => ({
  SearchForm: ({
    search,
    status,
    source,
    recordType,
    level,
    severityFilterAvailable,
  }: {
    search?: string;
    status?: string;
    source?: string;
    recordType?: string;
    level?: string;
    severityFilterAvailable?: boolean;
  }) => (
    <div data-testid="search-form">{`${search ?? ""}|${status ?? ""}|${source ?? ""}|${recordType ?? ""}|${level ?? ""}|${severityFilterAvailable}`}</div>
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
    getFreshness.mockResolvedValue(null);
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
          level: "serious",
          page: "2",
        }),
      }),
    );

    expect(getRecallPage).toHaveBeenCalledWith({
      search: "Salmonella",
      status: "Ongoing",
      source: "usda_fsis",
      recordType: "public_health_alert",
      classification: undefined,
      limit: 12,
      offset: 12,
    });
    expect(screen.getByTestId("search-form")).toHaveTextContent(
      "Salmonella|Ongoing|usda_fsis|public_health_alert||false",
    );
    expect(screen.getByTestId("recall-feed")).toHaveTextContent("2|12|25");
  });

  it("filters by severity only when the API supports it", async () => {
    getFreshness.mockResolvedValue([
      { source: "fda", last_checked_at: "2026-10-13T06:00:00Z" },
    ]);
    getRecallPage.mockResolvedValue({ recalls: [recallFixture], totalCount: 1 });

    render(
      await RecallDirectory({
        searchParams: Promise.resolve({ level: "serious" }),
      }),
    );

    expect(getRecallPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ classification: "class_i" }),
    );
    expect(
      screen.getByRole("heading", { name: "Serious recalls" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("search-form")).toHaveTextContent("|serious|true");
  });
});
