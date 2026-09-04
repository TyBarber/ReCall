"use client";

import { useFormStatus } from "react-dom";

import { CornerButton } from "@/components/ui/corner-button";

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="corner-btn-action-icon"
      fill="none"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.5 10h12.75m-4.5-4.5 4.5 4.5-4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function SearchButton({ pending: pendingOverride }: { pending?: boolean }) {
  const { pending: formPending } = useFormStatus();
  const pending = pendingOverride ?? formPending;

  return (
    <CornerButton
      accentColor="#D8FF3E"
      className="command-submit"
      disabled={pending}
      hoverSurfaceColor="#F2F0E4"
      icon={<ArrowRightIcon />}
      surfaceColor="#FFFDF4"
      textColor="#14382B"
      type="submit"
      wrapperClassName="command-submit-wrap"
    >
      {pending ? "Searching…" : "Search"}
    </CornerButton>
  );
}
