"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { BookmarkIcon } from "@/components/watch-button";
import { recordWatch } from "@/lib/feedback";
import { displayProductName, formatRecallDate, recallSeverity } from "@/lib/format";
import type { WatchlistMatch, WatchlistResult } from "@/lib/types";
import { MAX_TERM_LENGTH, useWatchlist, type WatchItem } from "@/lib/watchlist";

type Lookup =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; results: WatchlistResult[] };

function matchDate(recall: WatchlistMatch): string | null {
  return recall.reported_at ?? recall.recall_date;
}

/** A recall is new when the agency listed it after the user last looked. */
export function isNewSince(recall: WatchlistMatch, lastSeenAt: string): boolean {
  const date = matchDate(recall);
  return Boolean(date && date > lastSeenAt.slice(0, 10));
}

function searchHref(term: string): string {
  return `/recalls?search=${encodeURIComponent(term)}&page=1`;
}

const noopSubscribe = () => () => undefined;

/** False during server rendering and hydration, true once running in the browser. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Shown on the home page until something is watched, so people find the feature. */
export function WatchlistTeaser() {
  const watchlist = useWatchlist();
  const [term, setTerm] = useState("");

  return (
    <section
      className="watchlist watchlist-teaser"
      aria-labelledby="watchlist-teaser-title"
      id="watchlist"
    >
      <h2 className="r-label" id="watchlist-teaser-title">
        Keep an eye on the foods you buy
      </h2>
      <p>Nothing watched yet.</p>
      <p className="watchlist-note">
        Watch a food, brand, or barcode. Any recall that matches prints here,
        and new ones get marked when you come back. No account needed. Your
        watchlist stays on this device.
      </p>
      <form
        className="watch-add"
        onSubmit={(event) => {
          event.preventDefault();
          if (!term.trim()) {
            return;
          }
          watchlist.add(term);
          recordWatch("home_teaser");
          setTerm("");
        }}
      >
        <label htmlFor="watch-term">What do you want to watch?</label>
        <div className="lookup">
          <input
            id="watch-term"
            maxLength={MAX_TERM_LENGTH}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Jif, cheddar, or a barcode"
            type="text"
            value={term}
          />
          <button className="r-btn" type="submit">
            <BookmarkIcon filled={false} />
            Watch it
          </button>
        </div>
      </form>
    </section>
  );
}

export function Watchlist() {
  const hydrated = useHydrated();
  const watchlist = useWatchlist();
  const [lookup, setLookup] = useState<Lookup>({ kind: "loading" });
  const termsKey = watchlist.items.map((item) => item.term).join("\n");

  useEffect(() => {
    if (!termsKey) {
      return;
    }
    const controller = new AbortController();
    fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terms: termsKey.split("\n") }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { results: WatchlistResult[] }) =>
        setLookup({ kind: "ready", results: data.results }),
      )
      .catch(() => {
        if (!controller.signal.aborted) {
          setLookup({ kind: "error" });
        }
      });
    return () => controller.abort();
  }, [termsKey]);

  if (!hydrated) {
    return null;
  }
  if (watchlist.items.length === 0) {
    return <WatchlistTeaser />;
  }

  const resultFor = (item: WatchItem) =>
    lookup.kind === "ready"
      ? lookup.results.find((result) => result.term === item.term)
      : undefined;
  const newCount = watchlist.items.reduce(
    (total, item) =>
      total +
      (resultFor(item)?.recalls ?? []).filter((recall) =>
        isNewSince(recall, item.lastSeenAt),
      ).length,
    0,
  );

  return (
    <section className="watchlist" aria-labelledby="watchlist-title" id="watchlist">
      <div className="watchlist-head">
        <h2 className="r-label" id="watchlist-title">
          Your watchlist
        </h2>
        {newCount > 0 ? (
          <>
            <span className="new-mark">{newCount} new</span>
            <button onClick={watchlist.markAllSeen} type="button">
              Mark all as seen
            </button>
          </>
        ) : null}
      </div>
      <p className="watchlist-note">
        Saved on this device only. ReCall can’t send alerts yet, so check back
        here, or <Link href="#alerts">get notified when alerts launch</Link>.
      </p>
      {lookup.kind === "error" ? (
        <p className="watchlist-note" role="status">
          Your watchlist couldn’t be checked right now. Try again later.
        </p>
      ) : null}
      <ul className="watch-terms">
        {watchlist.items.map((item) => {
          const result = resultFor(item);
          return (
            <li className="watch-term" key={item.term}>
              <div className="watch-term-head">
                <h3>
                  <Link href={searchHref(item.term)}>{item.term}</Link>
                </h3>
                <span className="line-fill" aria-hidden="true" />
                <button
                  aria-label={`Stop watching ${item.term}`}
                  onClick={() => watchlist.remove(item.term)}
                  type="button"
                >
                  Remove
                </button>
              </div>
              {lookup.kind === "loading" ? (
                <p className="watchlist-note">Checking…</p>
              ) : result?.recalls === null ? (
                <p className="watchlist-note">Couldn’t check this one.</p>
              ) : result && result.recalls.length > 0 ? (
                <ul className="watch-matches">
                  {result.recalls.map((recall) => {
                    const severity = recallSeverity(recall);
                    return (
                      <li className={`tone-${severity.key}`} key={recall.id}>
                        <Link href={`/recalls/${recall.id}`}>
                          <span>
                            <strong>{displayProductName(recall.product_name)}</strong>
                            <br />
                            <small>
                              <span className="tag">{severity.label}</span>
                              {matchDate(recall)
                                ? `, ${formatRecallDate(matchDate(recall))}`
                                : ""}
                            </small>
                          </span>
                          {isNewSince(recall, item.lastSeenAt) ? (
                            <span className="new-mark">New</span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="watchlist-note">No recalls match this yet.</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
