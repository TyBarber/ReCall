"use client";

import { useFormStatus } from "react-dom";

export function SearchButton() {
  const { pending } = useFormStatus();

  return (
    <button className="command-submit" type="submit" disabled={pending}>
      <span>{pending ? "Searching…" : "Search"}</span>
      <span className="command-submit-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}
