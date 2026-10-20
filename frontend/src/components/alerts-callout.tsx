"use client";

import Link from "next/link";

import { AlertSignupForm } from "@/components/alert-signup-form";

/** Home-page invitation to join the email alerts interest list, beside the receipt. */
export function AlertsCallout() {
  return (
    <section aria-labelledby="alerts-callout-title" className="side-alerts" id="alerts">
      <h2 className="side-label" id="alerts-callout-title">
        Coming soon: email alerts
      </h2>
      <p className="side-soft">
        Get one email when something you watch is recalled. Leave your address
        and we’ll tell you when alerts are ready.{" "}
        <Link href="/how-it-works#privacy">How we handle your email</Link>
      </p>
      <AlertSignupForm source="home" />
    </section>
  );
}
