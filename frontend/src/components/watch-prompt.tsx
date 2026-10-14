"use client";

import Link from "next/link";

import { WatchButton } from "@/components/watch-button";
import { useWatchlist } from "@/lib/watchlist";

/** Full-width invitation to watch the current search on the results page. */
export function WatchStrip({ term }: { term: string }) {
  const watchlist = useWatchlist();
  const watching = watchlist.isWatching(term);

  return (
    <div className={`watch-strip${watching ? " watch-strip-active" : ""}`}>
      <p>
        {watching ? (
          <>
            <strong>You’re watching “{term}”.</strong> New recalls that match
            show up in{" "}
            <Link href="/#watchlist">your watchlist on the home page</Link>.
          </>
        ) : (
          <>
            <strong>Keep an eye on “{term}”.</strong> Watch it and any new
            recall that matches will show up on your home page. No sign-up
            needed.
          </>
        )}
      </p>
      <WatchButton placement="results" term={term} />
    </div>
  );
}
