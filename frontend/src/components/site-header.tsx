"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  isNavItemActive,
  SpotlightNavbar,
  type NavItem,
} from "@/components/ui/spotlight-navbar";

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Recalls", href: "/recalls" },
  { label: "How it works", href: "/#how-it-works" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuState, setMenuState] = useState({ open: false, pathname });
  const menuOpen = menuState.open && menuState.pathname === pathname;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuState({ open: false, pathname });
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen, pathname]);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="ReCall home">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>
            <strong>ReCall</strong>
            <small>Food safety, made clear</small>
          </span>
        </Link>

        <SpotlightNavbar className="desktop-site-nav" items={NAV_ITEMS} />

        <button
          ref={triggerRef}
          className="mobile-nav-trigger"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-site-navigation"
          onClick={() => setMenuState({ open: !menuOpen, pathname })}
        >
          <span className="mobile-nav-icon" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>{menuOpen ? "Close" : "Menu"}</span>
        </button>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-site-navigation"
          className="mobile-site-nav"
          aria-label="Primary navigation"
        >
          <ul>
            {NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(item, pathname);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "mobile-nav-link-active" : undefined}
                    onClick={() => setMenuState({ open: false, pathname })}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
