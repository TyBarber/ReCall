import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { recallFixture } from "@/test/fixtures";

const { getRecalls } = vi.hoisted(() => ({ getRecalls: vi.fn() }));

vi.mock("@/lib/api/recalls", () => ({ getRecalls }));
vi.mock("@/components/home-search-form", () => ({
  HomeSearchForm: () => <div>Home search</div>,
}));

import Home from "@/app/page";

describe("Home", () => {
  it("features the newest serious recall and previews the rest from one fetch", async () => {
    const serious = {
      ...recallFixture,
      id: "serious-recall",
      product_name: "Frozen spinach",
      classification: "Class I",
    };
    getRecalls.mockResolvedValue([recallFixture, serious]);
    render(await Home());

    expect(getRecalls).toHaveBeenCalledTimes(1);
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
});
