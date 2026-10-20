import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { AlertSignupForm } from "@/components/alert-signup-form";
import { FreshnessDetails, FreshnessSticker } from "@/components/freshness";
import { Barcode, Cut } from "@/components/receipt";
import { SeverityGuide } from "@/components/severity-guide";
import { SurveyForm } from "@/components/survey-form";
import { getFreshness } from "@/lib/api/recalls";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Where ReCall's food recall information comes from, what we change, what we don't, and how your watchlist and data are handled.",
};

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

// A valid UPC-A, printed as the receipt's barcode.
const RECEIPT_BARCODE = "010162026114";

export default async function HowItWorks() {
  // Render per request so "checked … ago" stays accurate; API data stays cached.
  await connection();
  const freshness = await getFreshness();

  return (
    <div className="stage">
      <div className="side">
        <h1>How ReCall works</h1>
        <p>
          ReCall takes the food recalls the U.S. government publishes and makes
          them easy to search and understand. Here’s exactly where the
          information comes from and what we do with it. Think of it as the
          back of the receipt.
        </p>
        <div className="side-desktop-only">
          <hr className="side-rule" />
          <nav aria-label="On this page">
            <ul className="jump-links">
              <li><a href="#sources">Where it comes from</a></li>
              <li><a href="#changes">What we change, and what we don’t</a></li>
              <li><a href="#severity-title">How serious is it?</a></li>
              <li><a href="#watchlist-info">Your watchlist</a></li>
              <li><a href="#alerts">Email alerts</a></li>
              <li><a href="#questions">Quick questions</a></li>
              <li><a href="#privacy">Privacy</a></li>
            </ul>
          </nav>
        </div>
      </div>

      <main className="receipt" aria-label="How ReCall works">
        <header className="receipt-head">
          <p className="store store-small">THE FINE PRINT</p>
          <p className="receipt-meta">
            <span>How ReCall works</span>
            <FreshnessSticker sources={freshness} />
          </p>
        </header>
        <Cut />

        <section id="sources" aria-labelledby="sources-title">
          <h2 className="r-label" id="sources-title">
            Where the information comes from
          </h2>
          <p className="source-entry">
            <strong>FDA (U.S. Food and Drug Administration)</strong>
            Most packaged foods, produce, seafood, snacks, drinks, and
            supplements. ReCall checks the FDA’s public recall reports
            automatically every day.
          </p>
          <p className="source-entry">
            <strong>USDA FSIS (Food Safety and Inspection Service)</strong>
            Meat, poultry, and egg products, plus public health alerts. For
            now, USDA updates are added by hand, so they can be a few days
            behind the USDA website.
          </p>
          <div className="fine">
            <FreshnessDetails sources={freshness} />
            <p>
              ReCall is an independent project. It is not run by or affiliated
              with the FDA or USDA.
            </p>
          </div>
        </section>

        <Cut />
        <section id="changes" aria-labelledby="changes-title">
          <h2 className="r-label" id="changes-title">
            What we change, and what we don’t
          </h2>
          <h3 className="sr-only">We make it readable</h3>
          <ul className="plus-minus">
            <li>Shorten long agency product text into a clear name</li>
            <li>Fix ALL-CAPS company names and garbled characters</li>
            <li>Explain how serious each recall is in plain words</li>
            <li>Put dates, places, and package codes in one place</li>
          </ul>
          <h3 className="r-label" style={{ marginTop: 18 }}>
            We never make things up
          </h3>
          <ul className="plus-minus minus">
            <li>No health or safety advice of our own</li>
            <li>Package codes and lot numbers are shown exactly as published</li>
            <li>Every recall links back to the agency’s own record</li>
            <li>If an agency leaves something out, we say so</li>
          </ul>
          <p className="fine" style={{ marginTop: 12 }}>
            If you have a recalled product, follow the official recall notice
            from the FDA, USDA, or the company.
          </p>
        </section>

        <Cut />
        <SeverityGuide />

        <Cut />
        <section id="watchlist-info" aria-labelledby="watchlist-info-title">
          <h2 className="r-label" id="watchlist-info-title">
            Your watchlist
          </h2>
          <ol className="r-steps">
            <li>Search a food, brand, company, or barcode.</li>
            <li>Tap Watch on the search, or on the company behind a recall.</li>
            <li>Come back. Matching recalls show on the home page, and new ones are marked.</li>
          </ol>
          <p className="fine" style={{ marginTop: 10 }}>
            No account needed. Your watchlist is saved in this browser only, so
            it won’t follow you to another phone or computer.{" "}
            <Link href="/#watchlist">Go to your watchlist</Link>.
          </p>
        </section>

        <Cut />
        <section className="coupon" id="alerts" aria-labelledby="alerts-title">
          <h2 className="r-label" id="alerts-title">
            Coming soon: email alerts
          </h2>
          <p>
            ReCall can’t send alerts yet. Leave your email and we’ll let you know
            when it can. Searching and watching will always work without
            signing up.
          </p>
          <AlertSignupForm source="how_it_works" />
        </section>

        <Cut />
        <section id="questions" aria-labelledby="questions-title">
          <h2 className="r-label" id="questions-title">
            Tell us how we did
          </h2>
          <p className="faded" style={{ fontSize: 14, marginBottom: 16 }}>
            Three quick questions, all optional and anonymous. Your answers
            decide what gets built next.
          </p>
          <SurveyForm />
        </section>

        <Cut />
        <section className="fine" id="privacy" aria-labelledby="privacy-title">
          <h2 className="r-label" id="privacy-title" style={{ color: "var(--ink)" }}>
            Privacy, in plain words
          </h2>
          <ul>
            <li>
              <strong>Searching is anonymous.</strong> You never need an
              account.
            </li>
            <li>
              <strong>Your watchlist stays on your device.</strong> When the home
              page checks it, the searches are looked up but not saved.
            </li>
            <li>
              <strong>Alert emails</strong> are used for one thank-you email
              now, a note when alerts launch, and the alerts themselves. Your
              address is never sold or shared.
            </li>
            <li>
              <strong>Questionnaire answers</strong> aren’t linked to your name
              or email. They’re saved and sent to the ReCall team.
            </li>
            <li>
              <strong>We count visits and Watch clicks</strong> without
              identifying who made them, to learn which features are useful.
            </li>
          </ul>
          {contactEmail ? (
            <p style={{ marginTop: 10 }}>
              To remove your email or ask a question, write to{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
            </p>
          ) : null}
        </section>
        <Barcode code={RECEIPT_BARCODE} />
        <p className="thanks">THANK YOU</p>
      </main>
    </div>
  );
}
