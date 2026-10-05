import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { recallFixture } from "@/test/fixtures";

const { getRecalls } = vi.hoisted(() => ({ getRecalls: vi.fn() }));

vi.mock("@/lib/api/recalls", () => ({ getRecalls }));
vi.mock("@/components/home-search-form", () => ({
  HomeSearchForm: () => <div>Home search</div>,
}));
vi.mock("@/components/recall-spotlight", () => ({
  RecallSpotlight: () => <div>Featured recalls</div>,
}));
vi.mock("@/components/ui/light-lines", () => ({
  LightLines: ({ className }: { className?: string }) => (
    <div className={className} data-testid="light-lines" />
  ),
}));

import Home from "@/app/page";

describe("Home", () => {
  it("uses one small header-independent fetch for the spotlight and preview", async () => {
    getRecalls.mockResolvedValue([recallFixture]);
    render(await Home());

    expect(getRecalls).toHaveBeenCalledTimes(1);
    expect(getRecalls).toHaveBeenCalledWith({ limit: 4, sort: "newest" });
    const lightLines = screen.getAllByTestId("light-lines");
    expect(lightLines).toHaveLength(2);
    expect(lightLines[1]).toHaveClass("home-about-light-lines");
    expect(
      screen.getByRole("heading", {
        name: "The facts you need, without the noise.",
      }).closest("section"),
    ).toHaveAttribute("id", "how-it-works");
    expect(screen.getByText("Featured recalls")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Latest recalls & alerts" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Check" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Act" })).toBeInTheDocument();
    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view all recalls/i }),
    ).toHaveAttribute("href", "/recalls");
  });
});
