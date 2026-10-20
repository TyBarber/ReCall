import Link from "next/link";

import { RecallClassification } from "@/components/recall-classification";
import { StatusBadge } from "@/components/status-badge";
import {
  displayCompany,
  displayProductName,
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

/** The featured recall, printed as an inverse box the way receipts print "YOU SAVED". */
export function RecallSpotlight({ recall }: RecallSpotlightProps) {
  if (!recall) {
    return null;
  }

  const severity = recallSeverity(recall);
  const isPublicHealthAlert = recall.record_type === "public_health_alert";
  const displayDate = recall.reported_at || recall.recall_date;

  return (
    <article className="callout" aria-label="Featured recall">
      <p className="r-label">
        {severity.key === "serious" ? "Newest serious recall" : "Newest recall"}
      </p>
      <h2 className="callout-title">{displayProductName(recall.product_name)}</h2>
      <p>{displayCompany(recall) ?? "Company not named"}</p>
      <p>{recall.recall_reason}</p>
      {displayDate ? (
        <p>
          {recall.reported_at
            ? reportedDateLabel(recall.source)
            : "Recall started"}{" "}
          {formatRecallDate(displayDate)}
        </p>
      ) : null}
      <div className="callout-signals">
        <span className="tag">
          {isPublicHealthAlert ? "Public Health Alert" : severity.label}
        </span>
        <RecallClassification
          classification={recall.classification}
          source={recall.source}
        />
        {!isPublicHealthAlert || recall.status !== "Public Health Alert" ? (
          <StatusBadge status={recall.status} />
        ) : null}
      </div>
      <Link href={`/recalls/${recall.id}`}>View recall details</Link>
    </article>
  );
}
