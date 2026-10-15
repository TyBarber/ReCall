"use client";

import Link from "next/link";

import { AlertSignupForm } from "@/components/alert-signup-form";

/** Home-page invitation to join the email alerts interest list. */
export function AlertsCallout() {
  return (
    <section
      aria-labelledby="alerts-callout-title"
      className="shell alerts-callout"
      id="alerts"
    >
      <div className="alerts-callout-card">
        <div className="alerts-callout-copy">
          <span className="sticker">Coming soon</span>
          <h2 id="alerts-callout-title">
            Get an email when food you watch is recalled
          </h2>
          <p>
            Alerts aren’t ready yet. Leave your email and we’ll tell you when
            they are. Searching stays free, with no sign-up.{" "}
            <Link href="/how-it-works#privacy">How we handle your email</Link>
          </p>
        </div>
        <AlertSignupForm source="home" />
      </div>
    </section>
  );
}
