import Link from "next/link";

import { FoodIcon } from "@/components/food-icon";
import { RecallClassification } from "@/components/recall-classification";
import { StatusBadge } from "@/components/status-badge";
import {
  displayProductName,
  foodCategory,
  formatRecallDate,
  recallSeverity,
  reportedDateLabel,
} from "@/lib/format";
import type { Recall } from "@/lib/types";

type RecallSpotlightProps = {
  recall: Recall | undefined;
};

/** Prefers the newest Class I recall among the recalls already fetched. */
export function pickSpotlightRecall(recalls: Recall[]): Recall | undefined {
  return (
    recalls.find((recall) => recallSeverity(recall).key === "serious") ??
    recalls[0]
  );
}

export function RecallSpotlight({ recall }: RecallSpotlightProps) {
  if (!recall) {
    return null;
  }

  const severity = recallSeverity(recall);
  const isPublicHealthAlert = recall.record_type === "public_health_alert";
  const displayDate = recall.reported_at || recall.recall_date;

  return (
    <article
      className={`spotlight-card tone-${severity.key}`}
      aria-label="Featured recall"
    >
      <span className="sticker spotlight-sticker">
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path d="M12 3l10 18H2L12 3zM12 10v4M12 17.5v.01" />
        </svg>
        {severity.key === "serious" ? "Newest serious recall" : "Newest recall"}
      </span>
      <span className="food-tile food-tile-large">
        <FoodIcon category={foodCategory(recall)} />
      </span>
      <h2>{displayProductName(recall.product_name)}</h2>
      <p className="spotlight-company">
        {recall.recalling_firm || recall.brand || "Company not reported"}
      </p>
      <p className="spotlight-reason">{recall.recall_reason}</p>
      <div className="spotlight-signals">
        {isPublicHealthAlert ? (
          <span className="chip">Public Health Alert</span>
        ) : (
          <span className="chip">{severity.label}</span>
        )}
        <RecallClassification
          classification={recall.classification}
          source={recall.source}
        />
        {!isPublicHealthAlert || recall.status !== "Public Health Alert" ? (
          <StatusBadge status={recall.status} />
        ) : null}
      </div>
      {displayDate ? (
        <p className="spotlight-date">
          {recall.reported_at
            ? reportedDateLabel(recall.source)
            : "Recall started"}{" "}
          {formatRecallDate(displayDate)}
        </p>
      ) : null}
      <Link className="spotlight-link" href={`/recalls/${recall.id}`}>
        View recall details <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
