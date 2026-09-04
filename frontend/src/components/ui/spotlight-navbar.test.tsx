import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SpotlightNavbar,
  type NavItem,
} from "@/components/ui/spotlight-navbar";

const { motionState, navigationState } = vi.hoisted(() => ({
  motionState: {
    reduced: false,
    animate: vi.fn(),
  },
  navigationState: { pathname: "/" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => motionState.reduced,
  animate: (...args: unknown[]) => motionState.animate(...args),
}));

const items: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Recalls", href: "/recalls" },
  { label: "How it works", href: "/#how-it-works" },
];

describe("SpotlightNavbar", () => {
  beforeEach(() => {
    navigationState.pathname = "/";
    motionState.reduced = false;
    motionState.animate.mockReset();
    motionState.animate.mockImplementation(
      (
        _from: unknown,
        to: unknown,
        options?: { onUpdate?: (value: number) => void },
      ) => {
        options?.onUpdate?.(Number(to));
        return { stop: vi.fn() };
      },
    );
  });

  it("renders real links and keeps Home active for the homepage anchor", () => {
    render(<SpotlightNavbar items={items} />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Recalls" })).toHaveAttribute(
      "href",
      "/recalls",
    );
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "/#how-it-works",
    );
    expect(
      screen.getByRole("link", { name: "How it works" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("tracks both the recall directory and recall detail routes", () => {
    navigationState.pathname = "/recalls";
    const { rerender } = render(<SpotlightNavbar items={items} />);

    expect(screen.getByRole("link", { name: "Recalls" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    navigationState.pathname = "/recalls/a-recall-id";
    rerender(<SpotlightNavbar items={items} />);

    expect(screen.getByRole("link", { name: "Recalls" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("follows the pointer and springs back to the active route", () => {
    render(<SpotlightNavbar items={items} />);
    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    const hoverLight = nav.querySelector(".spotlight-nav-hover");
    motionState.animate.mockClear();

    fireEvent.pointerMove(nav, { clientX: 160 });
    expect(hoverLight).toHaveAttribute("data-visible", "true");
    expect(motionState.animate).not.toHaveBeenCalled();

    fireEvent.pointerLeave(nav);
    expect(hoverLight).toHaveAttribute("data-visible", "false");
    expect(motionState.animate).toHaveBeenCalledTimes(1);
  });

  it("updates light positions without animation when reduced motion is enabled", () => {
    motionState.reduced = true;
    render(<SpotlightNavbar items={items} />);

    expect(motionState.animate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Home" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
