"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { displayProductName, formatRecallDate, recallSeverity } from "@/lib/format";
import type { WatchlistMatch, WatchlistResult } from "@/lib/types";
import { useWatchlist, type WatchItem } from "@/lib/watchlist";

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

export function Watchlist() {
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

  if (watchlist.items.length === 0) {
    return null;
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
    <section className="shell watchlist" aria-labelledby="watchlist-title">
      <div className="section-heading">
        <div className="section-title">
          <h2 id="watchlist-title">Your watchlist</h2>
          {newCount > 0 ? (
            <span className="sticker watchlist-new-count">{newCount} new</span>
          ) : null}
        </div>
        {newCount > 0 ? (
          <button
            className="chunky-button"
            onClick={watchlist.markAllSeen}
            type="button"
          >
            Mark all as seen
          </button>
        ) : null}
      </div>
      <p className="watchlist-note">
        Saved on this device only. ReCall can’t send alerts yet, so check back
        here.
      </p>
      {lookup.kind === "error" ? (
        <p className="watchlist-note" role="status">
          Your watchlist couldn’t be checked right now. Try again later.
        </p>
      ) : null}
      <ul className="watchlist-grid">
        {watchlist.items.map((item) => {
          const result = resultFor(item);
          return (
            <li className="watchlist-card" key={item.term}>
              <div className="watchlist-card-header">
                <h3>
                  <Link href={searchHref(item.term)}>{item.term}</Link>
                </h3>
                <button
                  aria-label={`Stop watching ${item.term}`}
                  className="watchlist-remove"
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
                <ul className="watchlist-matches">
                  {result.recalls.map((recall) => {
                    const severity = recallSeverity(recall);
                    return (
                      <li className={`tone-${severity.key}`} key={recall.id}>
                        <Link href={`/recalls/${recall.id}`}>
                          <span className="watchlist-swatch" aria-hidden="true" />
                          <span>
                            <strong>{displayProductName(recall.product_name)}</strong>
                            <small>
                              {severity.label}
                              {matchDate(recall)
                                ? ` · ${formatRecallDate(matchDate(recall))}`
                                : ""}
                            </small>
                          </span>
                          {isNewSince(recall, item.lastSeenAt) ? (
                            <span className="chip watchlist-new">New</span>
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
