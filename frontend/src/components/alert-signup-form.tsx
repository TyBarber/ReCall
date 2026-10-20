"use client";

import { useState, useSyncExternalStore } from "react";

import { submitFeedback } from "@/lib/feedback";
import { useWatchlist } from "@/lib/watchlist";

type FormState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "error"; message: string };

const SIGNED_UP_KEY = "recall-alerts-signed-up";
const SIGNED_UP_EVENT = "recall-alerts-signed-up-change";

function readSignedUp(): boolean {
  try {
    return window.localStorage.getItem(SIGNED_UP_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeSignedUp(onChange: () => void): () => void {
  window.addEventListener(SIGNED_UP_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SIGNED_UP_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function rememberSignedUp(): void {
  try {
    window.localStorage.setItem(SIGNED_UP_KEY, "1");
  } catch {
    // Without storage the confirmation still shows for this visit.
  }
  window.dispatchEvent(new Event(SIGNED_UP_EVENT));
}

/** True once this device has joined the alerts list, so it isn't asked again. */
export function useAlertsSignedUp(): boolean {
  return useSyncExternalStore(subscribeSignedUp, readSignedUp, () => false);
}

type AlertSignupFormProps = {
  /** Where the form is shown, recorded with the signup. */
  source: "home" | "how_it_works";
};

/** Collects an email for the alerts interest list. Alerts are not live yet. */
export function AlertSignupForm({ source }: AlertSignupFormProps) {
  const signedUp = useAlertsSignedUp();
  const watchlist = useWatchlist();
  const [email, setEmail] = useState("");
  const [includeWatchlist, setIncludeWatchlist] = useState(true);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const watchedTerms = watchlist.items.map((item) => item.term);

  if (state.kind === "done" || signedUp) {
    return (
      <div className="feedback-success" role="status">
        <strong>You’re on the list.</strong>
        <p>
          We’ll email you when alerts are ready. That’s the only thing we’ll use
          your address for.
        </p>
      </div>
    );
  }

  return (
    <form
      className="feedback-form"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setState({ kind: "sending" });
        const result = await submitFeedback("/api/alerts", {
          email,
          watch_terms: includeWatchlist ? watchedTerms : [],
          source,
          website,
        });
        if (result.ok) {
          rememberSignedUp();
          setState({ kind: "done" });
        } else {
          setState({ kind: "error", message: result.error });
        }
      }}
    >
      <label htmlFor={`alert-email-${source}`}>Email address</label>
      <div className="feedback-inline">
        <input
          autoComplete="email"
          id={`alert-email-${source}`}
          inputMode="email"
          maxLength={254}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
        <button
          className="r-btn"
          disabled={state.kind === "sending"}
          type="submit"
        >
          {state.kind === "sending" ? "Saving…" : "Notify me"}
        </button>
      </div>
      {watchedTerms.length > 0 ? (
        <label className="feedback-check">
          <input
            checked={includeWatchlist}
            onChange={(event) => setIncludeWatchlist(event.target.checked)}
            type="checkbox"
          />
          Also save my {watchedTerms.length} watched{" "}
          {watchedTerms.length === 1 ? "search" : "searches"} (
          {watchedTerms.join(", ")}) so alerts can start with them
        </label>
      ) : null}
      <label aria-hidden="true" className="feedback-trap">
        Website
        <input
          autoComplete="off"
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          type="text"
          value={website}
        />
      </label>
      {state.kind === "error" ? (
        <p className="feedback-error" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
