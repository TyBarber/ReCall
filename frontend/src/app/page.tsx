import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { FoodIcon } from "@/components/food-icon";
import { HomeSearchForm } from "@/components/home-search-form";
import { RecallCard } from "@/components/recall-card";
import {
  pickSpotlightRecall,
  RecallSpotlight,
} from "@/components/recall-spotlight";
import { SeverityGuide } from "@/components/severity-guide";
import { getRecalls } from "@/lib/api/recalls";
import type { FoodCategory } from "@/lib/format";

const HOME_RECALL_LIMIT = 7;
const HOME_PREVIEW_COUNT = 6;

const BROWSE_FOODS: [string, FoodCategory][] = [
  ["Chicken", "meat"],
  ["Cheese", "dairy"],
  ["Salad", "produce"],
  ["Bread", "bakery"],
  ["Fish", "seafood"],
  ["Peanut", "snacks"],
];

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
  const spotlight = pickSpotlightRecall(recalls);
  const preview = recalls
    .filter((recall) => recall !== spotlight)
    .slice(0, HOME_PREVIEW_COUNT);

  return (
    <div className="home-page">
      <section className="shell hero">
        <div className="hero-panel">
          <span className="sticker hero-sticker">Updated daily</span>
          <h1>
            Check before <br />
            you <mark>chomp.</mark>
          </h1>
          <p className="hero-copy">
            Type a food, brand, or the barcode on the package. We’ll tell you
            if it’s been recalled, in plain English.
          </p>
          <HomeSearchForm />
          <div className="browse-foods" aria-label="Browse by food">
            <span>Browse:</span>
            {BROWSE_FOODS.map(([label, category]) => (
              <Link
                className="browse-pill"
                href={`/recalls?search=${encodeURIComponent(label)}&page=1`}
                key={label}
              >
                <FoodIcon category={category} />
                {label}
              </Link>
            ))}
          </div>
        </div>
        <RecallSpotlight recall={spotlight} />
      </section>

      <SeverityGuide />

      <main className="shell home-latest" id="current-recalls">
        <div className="section-heading">
          <div className="section-title">
            <h2>Latest recalls &amp; alerts</h2>
            <span className="sticker">Newest first</span>
          </div>
          <Link className="chunky-button" href="/recalls">
            View all recalls <span aria-hidden="true">→</span>
          </Link>
        </div>

        {preview.length > 0 ? (
          <div className="recall-grid">
            {preview.map((recall) => (
              <RecallCard key={recall.id} recall={recall} variant="preview" />
            ))}
          </div>
        ) : spotlight ? null : (
          <EmptyState filtered={false} />
        )}
      </main>

      <section
        className="shell home-about"
        id="how-it-works"
        aria-labelledby="about-title"
      >
        <div className="home-about-copy">
          <h2 id="about-title">The facts you need, without the noise.</h2>
          <p>
            ReCall makes public FDA and USDA FSIS food safety data easier to
            search and understand, so you can quickly check food in your home.
          </p>
          <Link className="chunky-button" href="/recalls">
            Browse all recalls <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ol className="home-steps">
          <li>
            <span aria-hidden="true">1</span>
            <div>
              <h3>Search</h3>
              <p>Find a food, brand, company, or barcode.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">2</span>
            <div>
              <h3>Check</h3>
              <p>See exactly what’s affected and why.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">3</span>
            <div>
              <h3>Act</h3>
              <p>Learn how serious it is and what to do next.</p>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}
