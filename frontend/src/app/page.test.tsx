import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { recallFixture } from "@/test/fixtures";

const { getFreshness, getRecalls } = vi.hoisted(() => ({
  getFreshness: vi.fn(),
  getRecalls: vi.fn(),
}));

vi.mock("@/lib/api/recalls", () => ({ getFreshness, getRecalls }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/components/home-search-form", () => ({
  HomeSearchForm: () => <div>Home search</div>,
}));

import Home from "@/app/page";

describe("Home", () => {
  it("features a serious recall from the newest list on an older API", async () => {
    getFreshness.mockResolvedValue(null);
    const serious = {
      ...recallFixture,
      id: "serious-recall",
      product_name: "Frozen spinach",
      classification: "Class I",
    };
    getRecalls.mockResolvedValue([recallFixture, serious]);
    render(await Home());

    expect(getRecalls).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Updated daily")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Get an email when food you watch is recalled",
      }),
    ).toBeInTheDocument();
    expect(getRecalls).toHaveBeenCalledWith({ limit: 7, sort: "newest" });

    const featured = screen.getByRole("article", { name: "Featured recall" });
    expect(
      within(featured).getByRole("heading", { name: "Frozen spinach" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: recallFixture.product_name }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "How serious is it?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Official name: Class I")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cheese" })).toHaveAttribute(
      "href",
      "/recalls?search=Cheese&page=1",
    );
    expect(
      screen.getByRole("heading", {
        name: "The facts you need, without the noise.",
      }).closest("section"),
    ).toHaveAttribute("id", "how-it-works");
    expect(
      screen.getByRole("heading", { name: "Latest recalls & alerts" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Check" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Act" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view all recalls/i }),
    ).toHaveAttribute("href", "/recalls");
  });

  it("asks the API for the newest Class I recall when filtering is supported", async () => {
    getRecalls.mockReset();
    const newestSerious = {
      ...recallFixture,
      id: "older-serious",
      product_name: "Raw cookie dough",
      classification: "Class I",
    };
    getFreshness.mockResolvedValue([
      { source: "fda", last_checked_at: new Date().toISOString() },
      { source: "usda_fsis", last_checked_at: null },
    ]);
    getRecalls
      .mockResolvedValueOnce([recallFixture])
      .mockResolvedValueOnce([newestSerious]);
    render(await Home());

    expect(getRecalls).toHaveBeenLastCalledWith({
      limit: 1,
      sort: "newest",
      classification: "class_i",
    });
    const featured = screen.getByRole("article", { name: "Featured recall" });
    expect(
      within(featured).getByRole("heading", { name: "Raw cookie dough" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Checked just now")).toBeInTheDocument();
  });
});
