import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "@/components/site-header";

const { navigationState } = vi.hoisted(() => ({
  navigationState: { pathname: "/" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => true,
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    navigationState.pathname = "/";
  });

  it("keeps branding outside the desktop navigation", () => {
    render(<SiteHeader />);

    const brand = screen.getByRole("link", { name: "ReCall home" });
    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(nav).not.toContainElement(brand);
    expect(within(nav).getAllByRole("link")).toHaveLength(3);
  });

  it("opens an accessible mobile menu and closes it with Escape", () => {
    render(<SiteHeader />);
    const trigger = screen.getByRole("button", { name: "Menu" });

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const mobileNav = document.querySelector("#mobile-site-navigation");
    expect(mobileNav).toBeInTheDocument();
    expect(within(mobileNav as HTMLElement).getAllByRole("link")).toHaveLength(3);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByText("Close")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
