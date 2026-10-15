import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { AlertSignupForm } from "@/components/alert-signup-form";
import { FreshnessDetails, FreshnessSticker } from "@/components/freshness";
import { SeverityGuide } from "@/components/severity-guide";
import { SurveyForm } from "@/components/survey-form";
import { getFreshness } from "@/lib/api/recalls";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Where ReCall's food recall information comes from, what we change, what we don't, and how your watchlist and data are handled.",
};

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

export default async function HowItWorks() {
  // Render per request so "checked … ago" stays accurate; API data stays cached.
  await connection();
  const freshness = await getFreshness();

  return (
    <main className="home-page hiw-page">
      <section className="directory-intro">
        <div className="shell directory-intro-inner">
          <FreshnessSticker sources={freshness} />
          <h1>How ReCall works</h1>
          <p>
            ReCall takes the food recalls the U.S. government publishes and
            makes them easy to search and understand. Here’s exactly where the
            information comes from and what we do with it.
          </p>
          <nav aria-label="On this page" className="hiw-jump">
            <a className="chip" href="#sources">Where it comes from</a>
            <a className="chip" href="#watchlist-info">Your watchlist</a>
            <a className="chip" href="#alerts">Email alerts</a>
            <a className="chip" href="#questions">Quick questions</a>
            <a className="chip" href="#privacy">Privacy</a>
          </nav>
        </div>
      </section>

      <div className="shell hiw-sections">
        <section className="hiw-card" id="sources" aria-labelledby="sources-title">
          <h2 id="sources-title">Where the information comes from</h2>
          <p>
            Every recall on ReCall comes from one of two U.S. government food
            safety agencies:
          </p>
          <ul className="hiw-list">
            <li>
              <strong>FDA (U.S. Food and Drug Administration)</strong> covers
              most packaged foods, produce, seafood, snacks, drinks, and
              supplements. ReCall checks the FDA’s public recall reports
              automatically every day.
            </li>
            <li>
              <strong>USDA FSIS (Food Safety and Inspection Service)</strong>{" "}
              covers meat, poultry, and egg products. It publishes recalls and
              public health alerts. For now, USDA updates are added by hand, so
              they can be a few days behind the USDA website.
            </li>
          </ul>
          <FreshnessDetails sources={freshness} />
          <p className="hiw-note">
            ReCall is an independent project. It is not run by or affiliated
            with the FDA or USDA.
          </p>
        </section>

        <section className="hiw-card" aria-labelledby="changes-title">
          <h2 id="changes-title">What we change, and what we don’t</h2>
          <div className="hiw-columns">
            <div>
              <h3>We make it readable</h3>
              <ul className="hiw-list">
                <li>Shorten long agency product text into a clear name</li>
                <li>Fix ALL-CAPS company names and garbled characters</li>
                <li>Explain how serious each recall is in plain words</li>
                <li>Put dates, places, and package codes in one place</li>
              </ul>
            </div>
            <div>
              <h3>We never make things up</h3>
              <ul className="hiw-list">
                <li>No health or safety advice of our own</li>
                <li>Package codes and lot numbers are shown exactly as published</li>
                <li>Every recall links back to the agency’s own record</li>
                <li>If an agency leaves something out, we say so</li>
              </ul>
            </div>
          </div>
          <p className="hiw-note">
            If you have a recalled product, follow the official recall notice
            from the FDA, USDA, or the company.
          </p>
        </section>
      </div>

      <SeverityGuide />

      <div className="shell hiw-sections">
        <section
          className="hiw-card"
          id="watchlist-info"
          aria-labelledby="watchlist-info-title"
        >
          <h2 id="watchlist-info-title">Your watchlist</h2>
          <ol className="home-steps hiw-steps">
            <li>
              <span aria-hidden="true">1</span>
              <div>
                <h3>Search or open a recall</h3>
                <p>Look up a food, brand, company, or barcode.</p>
              </div>
            </li>
            <li>
              <span aria-hidden="true">2</span>
              <div>
                <h3>Tap Watch</h3>
                <p>Watch the search, or the company behind a recall.</p>
              </div>
            </li>
            <li>
              <span aria-hidden="true">3</span>
              <div>
                <h3>Check back</h3>
                <p>Matching recalls show on the home page, and new ones are flagged.</p>
              </div>
            </li>
          </ol>
          <p>
            No account needed. Your watchlist is saved in this browser only, so
            it won’t follow you to another phone or computer.{" "}
            <Link href="/#watchlist">Go to your watchlist</Link>.
          </p>
        </section>

        <section
          className="hiw-card hiw-card-feature"
          id="alerts"
          aria-labelledby="alerts-title"
        >
          <span className="sticker">Coming soon</span>
          <h2 id="alerts-title">Get an email when something you watch is recalled</h2>
          <p>
            ReCall can’t send alerts yet. Leave your email and we’ll let you know
            when it can. Searching and watching will always work without
            signing up.
          </p>
          <AlertSignupForm source="how_it_works" />
        </section>

        <section className="hiw-card" id="questions" aria-labelledby="questions-title">
          <h2 id="questions-title">Help shape ReCall</h2>
          <p>
            Three quick questions, all optional and anonymous. Your answers
            decide what gets built next.
          </p>
          <SurveyForm />
        </section>

        <section className="hiw-card" id="privacy" aria-labelledby="privacy-title">
          <h2 id="privacy-title">Privacy, in plain words</h2>
          <ul className="hiw-list">
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
            <p>
              To remove your email or ask a question, write to{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
