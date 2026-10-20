import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { AlertsCallout } from "@/components/alerts-callout";
import { EmptyState } from "@/components/empty-state";
import { FreshnessSticker } from "@/components/freshness";
import { HomeSearchForm } from "@/components/home-search-form";
import { Barcode, Cut, Line, receiptDate } from "@/components/receipt";
import { RecallCard } from "@/components/recall-card";
import {
  pickSpotlightRecall,
  RecallSpotlight,
} from "@/components/recall-spotlight";
import { SeverityGuide } from "@/components/severity-guide";
import { Watchlist } from "@/components/watchlist";
import { getFreshness, getRecalls } from "@/lib/api/recalls";
import { recallSeverity, type SeverityKey } from "@/lib/format";

const HOME_RECALL_LIMIT = 8;
const HOME_PREVIEW_COUNT = 7;

const BROWSE_FOODS = ["Chicken", "Cheese", "Salad", "Bread", "Peanuts"];

// A valid UPC-A whose digits spell the launch month, printed as the receipt's barcode.
const RECEIPT_BARCODE = "010162026114";

const TOTALS: [SeverityKey, string][] = [
  ["serious", "Serious"],
  ["moderate", "Moderate"],
  ["low", "Low risk"],
  ["alert", "Health alerts"],
];

export const metadata: Metadata = {
  title: "Food safety, made clear",
  description:
    "Search current U.S. FDA and USDA FSIS food safety information by product, company, reason, or identifier.",
};

export default async function Home() {
  // Render per request for relative "checked" times; API data stays cached.
  await connection();
  const [recalls, freshness] = await Promise.all([
    getRecalls({ limit: HOME_RECALL_LIMIT, sort: "newest" }),
    getFreshness(),
  ]);
  // With server-side classification filtering, feature the newest Class I
  // recall overall rather than only among the newest few.
  const newestSerious =
    freshness !== null
      ? (
          await getRecalls({ limit: 1, sort: "newest", classification: "class_i" })
        )[0]
      : undefined;
  const spotlight = newestSerious ?? pickSpotlightRecall(recalls);
  const preview = recalls
    .filter((recall) => recall.id !== spotlight?.id)
    .slice(0, HOME_PREVIEW_COUNT);
  const counts = preview.reduce<Partial<Record<SeverityKey, number>>>(
    (total, recall) => {
      const key = recallSeverity(recall).key;
      total[key] = (total[key] ?? 0) + 1;
      return total;
    },
    {},
  );

  return (
    <div className="stage">
      <div className="side">
        <h1>Every U.S. food recall, itemized.</h1>
        <p>
          Look up anything in your cart. ReCall reads the FDA and USDA recall
          lists every day and prints the ones that matter in plain English.
        </p>
        <div className="side-desktop-only">
          <hr className="side-rule" />
          <h2 className="side-label">Watch what you buy</h2>
          <p className="side-soft">
            Tap Watch on any search. New recalls that match show up on this
            page when you come back. No account needed.
          </p>
        </div>
        <div className="side-after">
          <hr className="side-rule" />
          <AlertsCallout />
        </div>
      </div>

      <main className="receipt" id="current-recalls" aria-label="Recall check">
        <header className="receipt-head">
          <p className="store">RECALL</p>
          <p>Food recall check</p>
          <p className="receipt-meta">
            <span>FDA + USDA FSIS</span>
            <span>{receiptDate()}</span>
            <FreshnessSticker sources={freshness} />
          </p>
        </header>
        <Cut />
        <HomeSearchForm suggestions={BROWSE_FOODS} />
        <Cut />
        <RecallSpotlight recall={spotlight} />

        <section aria-labelledby="latest-title" style={{ marginTop: 24 }}>
          <h2 className="r-label" id="latest-title">
            Recent recalls
          </h2>
          {preview.length > 0 ? (
            <>
              <ul className="r-items">
                {preview.map((recall) => (
                  <li key={recall.id}>
                    <RecallCard recall={recall} variant="preview" />
                  </li>
                ))}
              </ul>
              <Cut dots />
              <div className="totals">
                {TOTALS.filter(([key]) => counts[key]).map(([key, label]) => (
                  <Line
                    className={`tone-${key}`}
                    key={key}
                    name={label}
                    value={<span className={key === "serious" ? "tag" : undefined}>{counts[key]}</span>}
                  />
                ))}
                <Line name="Total" strong value={preview.length} />
              </div>
            </>
          ) : spotlight ? null : (
            <EmptyState filtered={false} />
          )}
          <Link className="r-btn r-btn-ghost r-btn-block" href="/recalls" style={{ marginTop: 18 }}>
            See all recalls
          </Link>
        </section>

        <Cut />
        <Watchlist />
        <Cut />
        <div className="fine">
          <SeverityGuide />
          <p style={{ marginTop: 10 }}>
            ReCall is an independent project, not affiliated with the FDA or
            USDA. Always follow the official recall notice.
          </p>
        </div>
        <Cut dots />
        <p className="center">
          <strong>Tell us how we did</strong>
        </p>
        <p className="center faded" style={{ fontSize: 14 }}>
          Three quick questions at{" "}
          <Link href="/how-it-works#questions">How it works</Link>
        </p>
        <Barcode code={RECEIPT_BARCODE} />
        <p className="thanks">THANK YOU FOR CHECKING</p>
      </main>
    </div>
  );
}
