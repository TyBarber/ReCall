"use client";

import { recordWatch, type WatchPlacement } from "@/lib/feedback";
import { MAX_WATCH_ITEMS, useWatchlist } from "@/lib/watchlist";

type WatchButtonProps = {
  term: string;
  /** Where the button sits, so Watch clicks can be counted per placement. */
  placement: WatchPlacement;
  /** Visible name for what is watched; defaults to the quoted term. */
  label?: string;
  className?: string;
};

export function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  );
}

/** Saves a search term to this device's watchlist. */
export function WatchButton({ term, placement, label, className = "" }: WatchButtonProps) {
  const watchlist = useWatchlist();
  const watching = watchlist.isWatching(term);
  const full = !watching && watchlist.items.length >= MAX_WATCH_ITEMS;
  const name = label ?? `“${term}”`;

  return (
    <button
      aria-pressed={watching}
      className={`chunky-button watch-button${watching ? " watch-button-active" : ""} ${className}`.trim()}
      disabled={full}
      onClick={() => {
        if (watching) {
          watchlist.remove(term);
          return;
        }
        watchlist.add(term);
        recordWatch(placement);
      }}
      type="button"
    >
      <BookmarkIcon filled={watching} />
      {watching ? `Watching ${name}` : full ? "Watchlist is full" : `Watch ${name}`}
    </button>
  );
}
