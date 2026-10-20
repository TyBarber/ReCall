"use client";

import { useFormStatus } from "react-dom";

export function SearchButton({ pending: pendingOverride }: { pending?: boolean }) {
  const { pending: formPending } = useFormStatus();
  const pending = pendingOverride ?? formPending;

  return (
    <button className="r-btn search-submit" disabled={pending} type="submit">
      {pending ? "Checking…" : "Check"}
    </button>
  );
}
