"use client";

import { animate, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
}

export interface SpotlightNavbarProps {
  items: NavItem[];
  className?: string;
  ariaLabel?: string;
}

type AnimationControls = {
  stop: () => void;
};

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

function itemCenter(nav: HTMLElement, index: number): number | null {
  const item = nav.querySelector<HTMLElement>(`[data-index="${index}"]`);
  if (!item) {
    return null;
  }

  const navRect = nav.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  return itemRect.left - navRect.left + itemRect.width / 2;
}

export function SpotlightNavbar({
  items,
  className,
  ariaLabel = "Primary navigation",
}: SpotlightNavbarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const spotlightX = useRef(0);
  const ambienceX = useRef(0);
  const pointerInside = useRef(false);
  const spotlightAnimation = useRef<AnimationControls | null>(null);
  const ambienceAnimation = useRef<AnimationControls | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;
  const activeIndex = items.findIndex((item) =>
    isNavItemActive(item, pathname),
  );

  const setPosition = useCallback(
    (
      property: "--spotlight-x" | "--ambience-x",
      positionRef: { current: number },
      animationRef: { current: AnimationControls | null },
      target: number,
      immediate: boolean,
    ) => {
      const nav = navRef.current;
      if (!nav) {
        return;
      }

      animationRef.current?.stop();

      if (immediate || reducedMotion) {
        positionRef.current = target;
        nav.style.setProperty(property, `${target}px`);
        return;
      }

      animationRef.current = animate(positionRef.current, target, {
        type: "spring",
        stiffness: 200,
        damping: 20,
        onUpdate: (value) => {
          positionRef.current = value;
          nav.style.setProperty(property, `${value}px`);
        },
      });
    },
    [reducedMotion],
  );

  const stopAnimations = useCallback(() => {
    spotlightAnimation.current?.stop();
    ambienceAnimation.current?.stop();
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || activeIndex < 0) {
      return;
    }

    const positionActiveLights = () => {
      const target = itemCenter(nav, activeIndex);
      if (target === null) {
        return;
      }

      setPosition(
        "--ambience-x",
        ambienceX,
        ambienceAnimation,
        target,
        false,
      );

      if (!pointerInside.current) {
        setPosition(
          "--spotlight-x",
          spotlightX,
          spotlightAnimation,
          target,
          false,
        );
      }
    };

    positionActiveLights();
    window.addEventListener("resize", positionActiveLights);

    return () => {
      window.removeEventListener("resize", positionActiveLights);
      stopAnimations();
    };
  }, [activeIndex, setPosition, stopAnimations]);

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const nav = navRef.current;
    if (!nav) {
      return;
    }

    pointerInside.current = true;
    setIsHovering(true);
    const rect = nav.getBoundingClientRect();
    setPosition(
      "--spotlight-x",
      spotlightX,
      spotlightAnimation,
      event.clientX - rect.left,
      true,
    );
  }

  function handlePointerLeave() {
    const nav = navRef.current;
    pointerInside.current = false;
    setIsHovering(false);

    if (!nav || activeIndex < 0) {
      return;
    }

    const target = itemCenter(nav, activeIndex);
    if (target !== null) {
      setPosition(
        "--spotlight-x",
        spotlightX,
        spotlightAnimation,
        target,
        false,
      );
    }
  }

  return (
    <div className={cn("spotlight-navbar", className)}>
      <nav
        ref={navRef}
        className="spotlight-nav"
        aria-label={ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={
          {
            "--spotlight-color": "rgba(255, 255, 255, 0.14)",
            "--ambience-color": "rgba(255, 255, 255, 0.82)",
          } as CSSProperties
        }
      >
        <ul className="spotlight-nav-list">
          {items.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <li key={item.href} className="spotlight-nav-item">
                <Link
                  href={item.href}
                  data-index={index}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "spotlight-nav-link",
                    isActive && "spotlight-nav-link-active",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <span
          className="spotlight-nav-hover"
          data-visible={isHovering ? "true" : "false"}
          aria-hidden="true"
        />
        <span className="spotlight-nav-ambience" aria-hidden="true" />
      </nav>
    </div>
  );
}
