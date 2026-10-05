"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { classificationTone, formatClassification } from "@/lib/format";
import type { Recall } from "@/lib/types";

type RecallClassificationProps = {
  classification: string | null;
  source?: Recall["source"];
  variant?: "default" | "spotlight";
};

type Explanation = {
  heading: string;
  primary: string;
  description: string;
  helper?: string;
};

type PopoverPosition = {
  left: number;
  top: number;
  ready: boolean;
};

type OpenMode = "click" | "focus" | "hover";

const CLOSE_DELAY_MS = 120;
const VIEWPORT_MARGIN_PX = 16;
const POPOVER_GAP_PX = 10;

const FDA_EXPLANATIONS: Record<string, Explanation> = {
  "class-one": {
    heading: "Class I",
    primary: "Most serious classification.",
    description:
      "There is a reasonable probability that using or being exposed to the recalled product could cause serious health consequences or death.",
    helper: "Take this recall seriously and check whether your product is affected.",
  },
  "class-two": {
    heading: "Class II",
    primary: "Moderate health risk.",
    description:
      "The product may cause temporary or medically reversible health effects, while the chance of serious health consequences is considered remote.",
  },
  "class-three": {
    heading: "Class III",
    primary: "Lower health risk.",
    description:
      "The recalled product is not likely to cause adverse health consequences, but it still does not meet FDA requirements.",
  },
};

const USDA_FSIS_EXPLANATIONS: Record<string, Explanation> = {
  "class-one": {
    heading: "Class I",
    primary: "Most serious classification.",
    description:
      "FSIS determines there is a reasonable probability that eating the food will cause health problems or death.",
  },
  "class-two": {
    heading: "Class II",
    primary: "Remote health risk.",
    description:
      "FSIS determines there is a remote probability of adverse health consequences from eating the food.",
  },
  "class-three": {
    heading: "Class III",
    primary: "No expected health consequences.",
    description:
      "FSIS determines that eating the food will not cause adverse health consequences.",
  },
};

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="classification-info-icon"
      fill="none"
      focusable="false"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 8.7v4.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <circle cx="10" cy="6.1" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function RecallClassification({
  classification,
  source = "fda",
  variant = "default",
}: RecallClassificationProps) {
  const label = formatClassification(classification, source);
  const tone = classificationTone(classification);
  const explanation =
    (source === "usda_fsis" ? USDA_FSIS_EXPLANATIONS : FDA_EXPLANATIONS)[tone];
  const popoverId = useId();
  const triggerRootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const closeOnActivationRef = useRef<boolean | null>(null);
  const isOpenRef = useRef(false);
  const openModeRef = useRef<OpenMode | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({
    left: 0,
    top: 0,
    ready: false,
  });
  const reducedMotion = useReducedMotion() ?? false;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openPopover = useCallback(
    (mode: OpenMode) => {
      clearCloseTimer();
      openModeRef.current = mode;
      if (!isOpenRef.current) {
        isOpenRef.current = true;
        setPosition((current) => ({ ...current, ready: false }));
      }
      setIsOpen(true);
    },
    [clearCloseTimer],
  );

  const closePopover = useCallback(() => {
    clearCloseTimer();
    closeOnActivationRef.current = null;
    isOpenRef.current = false;
    openModeRef.current = null;
    setIsOpen(false);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      const focusedElement = document.activeElement;
      if (
        focusedElement &&
        triggerRootRef.current?.contains(focusedElement)
      ) {
        return;
      }
      openModeRef.current = null;
      isOpenRef.current = false;
      setIsOpen(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) {
      return;
    }

    const triggerBounds = trigger.getBoundingClientRect();
    const popoverWidth = popover.offsetWidth;
    const popoverHeight = popover.offsetHeight;
    const maximumLeft = window.innerWidth - VIEWPORT_MARGIN_PX - popoverWidth;
    const left = Math.max(
      VIEWPORT_MARGIN_PX,
      Math.min(triggerBounds.left, maximumLeft),
    );
    const belowTop = triggerBounds.bottom + POPOVER_GAP_PX;
    const aboveTop = triggerBounds.top - POPOVER_GAP_PX - popoverHeight;
    const fitsBelow =
      belowTop + popoverHeight <= window.innerHeight - VIEWPORT_MARGIN_PX;
    const top = fitsBelow || aboveTop < VIEWPORT_MARGIN_PX ? belowTop : aboveTop;

    setPosition({ left, top, ready: true });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !triggerRootRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        closePopover();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        triggerRef.current?.focus();
        closePopover();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePopover, isOpen]);

  useEffect(
    () => () => {
      clearCloseTimer();
    },
    [clearCloseTimer],
  );

  if (!label) {
    return null;
  }

  const badgeClassName =
    variant === "spotlight"
      ? `spotlight-classification spotlight-classification-${tone}`
      : `badge badge-${tone}`;

  if (!explanation) {
    return <span className={badgeClassName}>{label}</span>;
  }

  const popover = isOpen ? (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      aria-live="polite"
      className={`classification-popover classification-popover-${tone}`}
      exit={reducedMotion ? undefined : { opacity: 0, scale: 0.98, y: 2 }}
      id={popoverId}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.98, y: 4 }}
      onPointerEnter={clearCloseTimer}
      onPointerLeave={scheduleClose}
      ref={popoverRef}
      role="tooltip"
      style={{
        left: position.left,
        top: position.top,
        visibility: position.ready ? "visible" : "hidden",
      }}
      transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeOut" }}
    >
      <p className="classification-popover-heading">{explanation.heading}</p>
      <p className="classification-popover-primary">{explanation.primary}</p>
      <p>{explanation.description}</p>
      {explanation.helper ? (
        <p className="classification-popover-helper">{explanation.helper}</p>
      ) : null}
      <p className="classification-popover-source">
        {source === "usda_fsis" ? "USDA FSIS classification" : "FDA classification"}
      </p>
    </motion.div>
  ) : null;

  return (
    <>
      <span
        className={`recall-classification recall-classification-${tone}`}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            closePopover();
          }
        }}
        ref={triggerRootRef}
      >
        <span className={badgeClassName}>{label}</span>
        <button
          aria-controls={popoverId}
          aria-describedby={isOpen ? popoverId : undefined}
          aria-expanded={isOpen}
          aria-label={`Learn what ${explanation.heading} means`}
          className="recall-classification-trigger"
          onFocus={() => {
            if (openModeRef.current !== "click") {
              openPopover("focus");
            }
          }}
          onClick={() => {
            const shouldClose =
              closeOnActivationRef.current ??
              (isOpenRef.current && openModeRef.current === "click");
            closeOnActivationRef.current = null;

            if (shouldClose) {
              closePopover();
            } else {
              openPopover("click");
            }
          }}
          onPointerCancel={() => {
            closeOnActivationRef.current = null;
          }}
          onPointerDown={() => {
            closeOnActivationRef.current =
              isOpenRef.current && openModeRef.current === "click";
          }}
          onPointerEnter={(event) => {
            if (
              event.pointerType !== "touch" &&
              openModeRef.current !== "click"
            ) {
              openPopover("hover");
            }
          }}
          onPointerLeave={(event) => {
            if (event.pointerType !== "touch") {
              scheduleClose();
            }
          }}
          ref={triggerRef}
          type="button"
        >
          <InfoIcon />
        </button>
      </span>
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence initial={false}>{popover}</AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
