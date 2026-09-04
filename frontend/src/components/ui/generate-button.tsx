"use client";

import {
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export interface GenerateButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  hue?: number;
  isGenerating?: boolean;
  idleLabel?: string;
  generatingLabel?: string;
  icon?: ReactNode;
  wrapperClassName?: string;
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function AnimatedLabel({ label, prefix }: { label: string; prefix: string }) {
  return (
    <span aria-hidden="true">
      {Array.from(label).map((letter, index) => (
        <span
          className="gen-btn-letter"
          key={`${prefix}-${index}`}
          style={{ "--letter-index": index } as CSSProperties}
        >
          {letter === " " ? "\u00a0" : letter}
        </span>
      ))}
    </span>
  );
}

export function GenerateButton({
  hue = 210,
  isGenerating: controlledIsGenerating,
  idleLabel = "Generate",
  generatingLabel = "Generating",
  icon,
  wrapperClassName,
  className,
  onBlur,
  onClick,
  onFocus,
  ...props
}: GenerateButtonProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isGenerating = controlledIsGenerating ?? isFocused;
  const accessibleLabel = controlledIsGenerating
    ? generatingLabel
    : idleLabel;

  return (
    <div
      className={cn("gen-btn-wrapper", wrapperClassName)}
      style={{ "--highlight-color-hue": `${hue}deg` } as CSSProperties}
    >
      <button
        {...props}
        aria-label={props["aria-label"] ?? accessibleLabel}
        className={cn("gen-btn", className)}
        data-generating={isGenerating}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onClick={(event) => {
          setIsFocused(true);
          onClick?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
      >
        <span className="gen-btn-icon" aria-hidden="true">
          {icon ?? <SparklesIcon />}
        </span>
        <span className="gen-txt-wrapper">
          <span className="gen-txt-1">
            <AnimatedLabel label={idleLabel} prefix="idle" />
          </span>
          <span className="gen-txt-2">
            <AnimatedLabel label={generatingLabel} prefix="generating" />
          </span>
        </span>
      </button>

      <style>{`
        .gen-btn-wrapper {
          --gen-radius: 8px;
          --gen-padding: 3px;
          --gen-transition: 400ms;
          position: relative;
          isolation: isolate;
          display: inline-block;
        }

        .gen-btn {
          position: relative;
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0.5em 1em;
          overflow: visible;
          border: 1px solid rgba(216, 255, 62, 0.25);
          border-radius: var(--gen-radius);
          background-color: #071713;
          box-shadow:
            inset 0 1px 1px rgba(255, 255, 255, 0.2),
            inset 0 2px 2px rgba(255, 255, 255, 0.12),
            inset 0 8px 8px rgba(255, 255, 255, 0.04),
            0 -1px 1px rgba(0, 0, 0, 0.02),
            0 -4px 4px rgba(0, 0, 0, 0.05),
            0 -10px 12px rgba(0, 0, 0, 0.08);
          color: #f3efdf;
          cursor: pointer;
          font: inherit;
          user-select: none;
          transition:
            box-shadow var(--gen-transition),
            border-color var(--gen-transition),
            background-color var(--gen-transition);
        }

        .gen-btn::before {
          position: absolute;
          z-index: -1;
          top: calc(0px - var(--gen-padding));
          left: calc(0px - var(--gen-padding));
          width: calc(100% + var(--gen-padding) * 2);
          height: calc(100% + var(--gen-padding) * 2);
          border-radius: calc(var(--gen-radius) + var(--gen-padding));
          background-image: linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.27),
            rgba(0, 0, 0, 0.67)
          );
          box-shadow:
            0 -8px 8px -6px transparent inset,
            0 -16px 16px -8px transparent inset,
            1px 1px 1px rgba(255, 255, 255, 0.13),
            -1px -1px 1px rgba(0, 0, 0, 0.13);
          content: "";
          pointer-events: none;
          transition:
            box-shadow var(--gen-transition),
            filter var(--gen-transition);
        }

        .gen-btn::after {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-image: linear-gradient(
            0deg,
            #fff,
            hsl(var(--highlight-color-hue), 100%, 70%),
            hsla(var(--highlight-color-hue), 100%, 70%, 0.5) 8%,
            transparent
          );
          content: "";
          opacity: 0;
          pointer-events: none;
          transition:
            opacity var(--gen-transition),
            filter var(--gen-transition);
        }

        .gen-btn-icon {
          position: relative;
          z-index: 1;
          display: inline-flex;
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          color: #e8e8e8;
          animation: gen-flicker 2s linear infinite 500ms;
          filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.6));
          transition:
            color var(--gen-transition),
            filter var(--gen-transition),
            opacity var(--gen-transition);
        }

        .gen-btn-icon svg {
          width: 100%;
          height: 100%;
          fill: currentColor;
        }

        .gen-txt-wrapper {
          position: relative;
          z-index: 1;
          display: grid;
          min-width: 6.8em;
          align-items: center;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          line-height: 1;
          text-transform: uppercase;
        }

        .gen-txt-1,
        .gen-txt-2 {
          grid-area: 1 / 1;
          white-space: nowrap;
        }

        .gen-txt-2 {
          opacity: 0;
        }

        .gen-btn-letter {
          position: relative;
          display: inline-block;
          color: rgba(243, 239, 223, 0.48);
          animation: gen-letter-anim 2s ease-in-out infinite;
          animation-delay: calc(var(--letter-index) * 80ms);
          transition:
            color var(--gen-transition),
            text-shadow var(--gen-transition),
            opacity var(--gen-transition);
        }

        .gen-btn[data-generating="true"] .gen-txt-1 {
          animation: gen-fade-out 300ms ease-in-out 1s forwards;
        }

        .gen-btn[data-generating="true"] .gen-txt-2 {
          animation: gen-fade-in 300ms ease-in-out 1s forwards;
        }

        .gen-btn[data-generating="true"] .gen-btn-letter {
          animation:
            gen-focused-letter 1s ease-in-out forwards,
            gen-letter-anim 1.2s ease-in-out 1s infinite;
          animation-delay:
            calc(var(--letter-index) * 80ms),
            calc(1s + var(--letter-index) * 80ms);
        }

        .gen-btn:hover,
        .gen-btn[data-generating="true"] {
          border-color: hsla(var(--highlight-color-hue), 100%, 80%, 0.42);
        }

        .gen-btn:hover::before,
        .gen-btn[data-generating="true"]::before {
          box-shadow:
            0 -8px 9px -6px rgba(255, 255, 255, 0.5) inset,
            0 -16px 16px -8px hsla(var(--highlight-color-hue), 100%, 70%, 0.3) inset,
            1px 1px 1px rgba(255, 255, 255, 0.13),
            -1px -1px 1px rgba(0, 0, 0, 0.13);
        }

        .gen-btn:hover::after,
        .gen-btn[data-generating="true"]::after {
          opacity: 0.78;
          mask-image: linear-gradient(0deg, #fff, transparent);
        }

        .gen-btn:hover .gen-btn-icon {
          color: #fff;
          animation: none;
          filter:
            drop-shadow(0 0 3px hsl(var(--highlight-color-hue), 100%, 70%))
            drop-shadow(0 -4px 6px rgba(0, 0, 0, 0.6));
        }

        .gen-btn:active {
          border-color: hsla(var(--highlight-color-hue), 100%, 80%, 0.72);
          background-color: hsla(var(--highlight-color-hue), 50%, 20%, 0.5);
        }

        .gen-btn:active::after {
          opacity: 1;
          filter: brightness(1.6);
          mask-image: linear-gradient(0deg, #fff, transparent);
        }

        .gen-btn:disabled {
          cursor: wait;
          opacity: 0.68;
        }

        @keyframes gen-letter-anim {
          50% {
            color: #fff;
            text-shadow: 0 0 3px rgba(255, 255, 255, 0.54);
          }
        }

        @keyframes gen-flicker {
          50% { opacity: 0.3; }
        }

        @keyframes gen-fade-out {
          to { opacity: 0; }
        }

        @keyframes gen-fade-in {
          to { opacity: 1; }
        }

        @keyframes gen-focused-letter {
          0%, 100% { filter: blur(0); }
          50% {
            filter:
              blur(8px)
              brightness(1.5)
              drop-shadow(-24px 8px 10px hsl(var(--highlight-color-hue), 100%, 70%));
            transform: scale(1.8);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gen-btn,
          .gen-btn::before,
          .gen-btn::after,
          .gen-btn-icon,
          .gen-btn-letter,
          .gen-txt-1,
          .gen-txt-2 {
            animation: none !important;
            transition: none !important;
          }

          .gen-btn[data-generating="true"] .gen-txt-1 {
            opacity: 0;
          }

          .gen-btn[data-generating="true"] .gen-txt-2 {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default GenerateButton;
