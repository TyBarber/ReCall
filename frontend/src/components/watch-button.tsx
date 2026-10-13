"use client";

import { MAX_WATCH_ITEMS, useWatchlist } from "@/lib/watchlist";

/** Saves the current search to this device's watchlist. */
export function WatchButton({ term }: { term: string }) {
  const watchlist = useWatchlist();
  const watching = watchlist.isWatching(term);
  const full = !watching && watchlist.items.length >= MAX_WATCH_ITEMS;

  return (
    <button
      aria-pressed={watching}
      className={`chunky-button watch-button${watching ? " watch-button-active" : ""}`}
      disabled={full}
      onClick={() => (watching ? watchlist.remove(term) : watchlist.add(term))}
      type="button"
    >
      <svg
        aria-hidden="true"
        fill={watching ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M6 3h12v18l-6-4-6 4z" />
      </svg>
      {watching
        ? `Watching “${term}”`
        : full
          ? "Watchlist is full"
          : `Watch “${term}”`}
    </button>
  );
}
