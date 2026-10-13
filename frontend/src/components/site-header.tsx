"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "All recalls", href: "/recalls" },
  { label: "How it works", href: "/#how-it-works" },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const [route, hash] = item.href.split("#");

  if (hash) {
    return false;
  }

  if (route === "/") {
    return pathname === "/";
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}

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
          <span className="brand-name">
            ReCall<span aria-hidden="true">.</span>
          </span>
        </Link>

        <nav className="desktop-site-nav" aria-label="Primary navigation">
          <ul>
            {NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(item, pathname);

              return (
                <li key={item.href}>
                  <Link
                    className={`nav-link${isActive ? " nav-link-active" : ""}`}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

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
                    className={`nav-link${isActive ? " nav-link-active" : ""}`}
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
