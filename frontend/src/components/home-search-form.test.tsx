import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeSearchForm, homeSearchHref } from "@/components/home-search-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("HomeSearchForm", () => {
  beforeEach(() => push.mockReset());

  it("builds the approved landing search destinations", () => {
    expect(homeSearchHref("  peanut butter  ")).toBe(
      "/recalls?search=peanut%20butter&page=1",
    );
    expect(homeSearchHref("  ")).toBe("/recalls");
  });

  it("submits the hero search to the recall directory", () => {
    const { container } = render(<HomeSearchForm />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "milk & eggs" },
    });
    fireEvent.submit(screen.getByRole("search"));

    expect(push).toHaveBeenCalledWith(
      "/recalls?search=milk%20%26%20eggs&page=1",
    );
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute(
      "type",
      "submit",
    );
    expect(container.querySelector("svg.command-icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
