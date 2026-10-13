"use client";

import { useSyncExternalStore } from "react";

export type WatchItem = {
  term: string;
  addedAt: string;
  lastSeenAt: string;
};

const STORAGE_KEY = "recall-watchlist";
const CHANGE_EVENT = "recall-watchlist-change";
export const MAX_WATCH_ITEMS = 10;
export const MAX_TERM_LENGTH = 80;

const EMPTY: WatchItem[] = [];
let cachedRaw: string | null = null;
let cachedItems: WatchItem[] = EMPTY;

function isWatchItem(value: unknown): value is WatchItem {
  const item = value as Partial<WatchItem> | null;
  return (
    typeof item?.term === "string" &&
    typeof item.addedAt === "string" &&
    typeof item.lastSeenAt === "string"
  );
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Returns a stable array per stored value so React can compare snapshots. */
function snapshot(): WatchItem[] {
  const raw = readRaw();
  if (raw === cachedRaw) {
    return cachedItems;
  }
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedItems = Array.isArray(parsed) ? parsed.filter(isWatchItem) : EMPTY;
  } catch {
    cachedItems = EMPTY;
  }
  return cachedItems;
}

function write(items: WatchItem[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private windows can block storage; the watchlist simply stays empty.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ").slice(0, MAX_TERM_LENGTH);
}

function sameTerm(a: string, b: string): boolean {
  return a.toLocaleLowerCase("en-US") === b.toLocaleLowerCase("en-US");
}

export function useWatchlist() {
  const items = useSyncExternalStore(subscribe, snapshot, () => EMPTY);

  return {
    items,
    isWatching: (term: string) =>
      items.some((item) => sameTerm(item.term, normalizeTerm(term))),
    add(term: string) {
      const normalized = normalizeTerm(term);
      const current = snapshot();
      if (
        !normalized ||
        current.length >= MAX_WATCH_ITEMS ||
        current.some((item) => sameTerm(item.term, normalized))
      ) {
        return;
      }
      const now = new Date().toISOString();
      write([...current, { term: normalized, addedAt: now, lastSeenAt: now }]);
    },
    remove(term: string) {
      write(snapshot().filter((item) => !sameTerm(item.term, term)));
    },
    markAllSeen() {
      const now = new Date().toISOString();
      write(snapshot().map((item) => ({ ...item, lastSeenAt: now })));
    },
  };
}
