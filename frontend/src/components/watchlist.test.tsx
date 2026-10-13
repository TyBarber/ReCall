import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WatchButton } from "@/components/watch-button";
import { isNewSince, Watchlist } from "@/components/watchlist";
import { MAX_WATCH_ITEMS, useWatchlist } from "@/lib/watchlist";

const match = {
  id: "recall-1",
  product_name: "Creamy Peanut Butter. NET WT 16 OZ",
  classification: "Class I",
  record_type: "recall" as const,
  reported_at: "2026-10-12",
  recall_date: "2026-10-01",
};

describe("watchlist", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("saves, de-duplicates, caps, and removes terms on this device", () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => result.current.add("  Peanut   butter "));
    act(() => result.current.add("peanut butter"));
    expect(result.current.items.map((item) => item.term)).toEqual(["Peanut butter"]);
    expect(result.current.isWatching("PEANUT BUTTER")).toBe(true);

    for (let index = 0; index < MAX_WATCH_ITEMS + 2; index += 1) {
      act(() => result.current.add(`term ${index}`));
    }
    expect(result.current.items).toHaveLength(MAX_WATCH_ITEMS);

    act(() => result.current.remove("peanut butter"));
    expect(result.current.isWatching("Peanut butter")).toBe(false);
  });

  it("toggles watching from the results page", () => {
    render(<WatchButton term="Kerry" />);

    fireEvent.click(screen.getByRole("button", { name: "Watch “Kerry”" }));
    expect(
      screen.getByRole("button", { name: "Watching “Kerry”" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("treats recalls listed after the last visit as new", () => {
    expect(isNewSince(match, "2026-10-11T09:00:00.000Z")).toBe(true);
    expect(isNewSince(match, "2026-10-12T09:00:00.000Z")).toBe(false);
    expect(
      isNewSince({ ...match, reported_at: null, recall_date: null }, "2020-01-01T00:00:00Z"),
    ).toBe(false);
  });

  it("shows matches for saved searches and flags new ones", async () => {
    window.localStorage.setItem(
      "recall-watchlist",
      JSON.stringify([
        {
          term: "peanut butter",
          addedAt: "2026-10-01T00:00:00.000Z",
          lastSeenAt: "2026-10-05T00:00:00.000Z",
        },
      ]),
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ results: [{ term: "peanut butter", recalls: [match] }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<Watchlist />);

    expect(await screen.findByText("Creamy Peanut Butter")).toBeInTheDocument();
    expect(screen.getByText("1 new")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      terms: ["peanut butter"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Mark all as seen" }));
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("renders nothing until something is watched", () => {
    const { container } = render(<Watchlist />);
    expect(container).toBeEmptyDOMElement();
  });
});
