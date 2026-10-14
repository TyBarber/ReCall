import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EmptyState } from "@/components/empty-state";

describe("EmptyState", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("offers to watch a search that found nothing", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<EmptyState filtered search="Jif" />);

    expect(
      screen.getByRole("heading", { name: "No recalls found for “Jif”" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Watch “Jif”" }));

    expect(screen.getByRole("button", { name: "Watching “Jif”" })).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      placement: "empty_results",
    });
  });

  it("keeps the broader-search advice when other filters are applied", () => {
    render(<EmptyState filtered otherFilters search="Jif" />);

    expect(
      screen.getByRole("heading", { name: "No matching recalls found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Watch “Jif”" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Clear search and filters" }),
    ).toBeInTheDocument();
  });

  it("does not offer watching without a search", () => {
    render(<EmptyState filtered={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
