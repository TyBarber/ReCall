import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { HomeSearchForm } from "@/components/home-search-form";
import { RecallCard } from "@/components/recall-card";
import { RecallSpotlight } from "@/components/recall-spotlight";
import { LightLines } from "@/components/ui/light-lines";
import { getRecalls } from "@/lib/api/recalls";

const HOME_RECALL_LIMIT = 4;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Food safety, made clear",
  description:
    "Search current U.S. FDA and USDA FSIS food safety information by product, company, reason, or identifier.",
};

export default async function Home() {
  const recalls = await getRecalls({
    limit: HOME_RECALL_LIMIT,
    sort: "newest",
  });

  return (
    <div className="home-page">
      <section className="signal-hero">
        <LightLines
          className="signal-light-lines pointer-events-none"
          gradientFrom="#14382B"
          gradientTo="#1A4635"
          lightColor="#C7E897"
          lineColor="#739B83"
          linesOpacity={0.045}
          lightsOpacity={0.34}
          speedMultiplier={0.82}
        />
        <div className="shell signal-hero-inner">
          <div className="hero-primary">
            <div className="hero-copy-block">
              <h1>
                <span>Know what’s been recalled.</span>
                <span className="signal-headline-accent">
                  Before it hits your plate.
                </span>
              </h1>
              <p className="signal-hero-copy">
                Search current U.S. food recalls by product, brand, company,
                reason, or UPC.
              </p>
            </div>
            <HomeSearchForm />
            <p className="signal-trust-note">
              <span className="signal-trust-mark" aria-hidden="true" />
              Recall information is sourced from U.S. FDA and USDA FSIS data and
              may be updated as investigations develop.
            </p>
          </div>
          <RecallSpotlight recalls={recalls} />
        </div>
      </section>

      <main className="recall-feed-section home-preview-section">
        <div className="shell recall-feed-inner">
          <div className="feed-heading">
            <div>
              <h2>Latest recalls &amp; alerts</h2>
              <p className="feed-copy">
                Recently listed by FDA and USDA FSIS.
              </p>
            </div>
            <Link className="view-all-link" href="/recalls">
              View all recalls <span aria-hidden="true">→</span>
            </Link>
          </div>

          {recalls.length > 0 ? (
            <div className="recall-grid home-preview-grid">
              {recalls.map((recall) => (
                <RecallCard key={recall.id} recall={recall} variant="preview" />
              ))}
            </div>
          ) : (
            <EmptyState filtered={false} />
          )}
        </div>
      </main>

      <section
        className="home-about"
        id="how-it-works"
        aria-labelledby="about-title"
      >
        <LightLines
          className="home-about-light-lines pointer-events-none"
          gradientFrom="#14382B"
          gradientTo="#1A4635"
          lightColor="#C7E897"
          lineColor="#739B83"
          linesOpacity={0.045}
          lightsOpacity={0.34}
          speedMultiplier={0.82}
        />
        <div className="shell home-about-inner">
          <div className="home-about-copy">
            <p className="home-section-label">How it works</p>
            <h2 id="about-title">The facts you need, without the noise.</h2>
            <p>
              ReCall makes public FDA and USDA FSIS food safety data easier to
              search and understand, so you can quickly check food in your home.
            </p>
            <Link href="/recalls">Browse the recall directory →</Link>
          </div>
          <ol className="home-steps">
            <li>
              <span>01</span>
              <div>
                <h3>Search</h3>
                <p>Find a food, brand, company, or UPC.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Check</h3>
                <p>See exactly what’s affected and why.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Act</h3>
                <p>Understand what the recall means and what to do next.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
