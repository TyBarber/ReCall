import Link from "next/link";

import { FoodIcon } from "@/components/food-icon";
import { RecallClassification } from "@/components/recall-classification";
import { StatusBadge } from "@/components/status-badge";
import {
  displayProductName,
  foodCategory,
  formatClassification,
  formatRecallDate,
  recallSeverity,
  reportedDateLabel,
  sourceShortName,
} from "@/lib/format";
import type { Recall } from "@/lib/types";

type RecallCardProps = {
  recall: Recall;
  variant?: "directory" | "preview";
};

function distributionSummary(recall: Recall): string | null {
  const states = recall.states.filter((state) => state.trim().length > 0);
  if (states.length > 0) {
    return states.length <= 4
      ? states.join(", ")
      : `${states.length} states reported`;
  }

  return recall.distribution_pattern?.trim() || null;
}

function codeSummary(recall: Recall): string | null {
  const total =
    recall.upc_codes.length +
    recall.lot_numbers.length +
    (recall.establishment_numbers?.length ?? 0);

  if (total === 0) {
    return null;
  }
  return `${total} code${total === 1 ? "" : "s"}`;
}

export function RecallCard({ recall, variant = "directory" }: RecallCardProps) {
  const isPreview = variant === "preview";
  const severity = recallSeverity(recall);
  const distribution = isPreview ? null : distributionSummary(recall);
  const codes = isPreview ? null : codeSummary(recall);
  const displayDate = recall.reported_at || recall.recall_date;
  const isPublicHealthAlert = recall.record_type === "public_health_alert";

  return (
    <article
      className={`recall-card tone-${severity.key}${isPreview ? " recall-card-preview" : ""}`}
    >
      <div className="card-top">
        <span className="food-tile">
          <FoodIcon category={foodCategory(recall)} />
        </span>
        <span className="severity-pill">
          {isPublicHealthAlert ? "Public Health Alert" : severity.label}
        </span>
      </div>
      <div className="card-heading">
        <p className="card-company">
          {recall.recalling_firm || recall.brand || "Company not reported"}
        </p>
        <h3>{displayProductName(recall.product_name)}</h3>
      </div>
      <p className="card-reason">
        <span className="sr-only">Why it was recalled: </span>
        {recall.recall_reason}
      </p>
      {displayDate || distribution || codes ? (
        <dl className="card-facts" aria-label="Recall quick facts">
          {displayDate ? (
            <div>
              <dt>
                {recall.reported_at
                  ? reportedDateLabel(recall.source)
                  : "Recall started"}
              </dt>
              <dd>{formatRecallDate(displayDate)}</dd>
            </div>
          ) : null}
          {distribution ? (
            <div>
              <dt>Sold/distributed in</dt>
              <dd title={distribution}>{distribution}</dd>
            </div>
          ) : null}
          {codes ? (
            <div>
              <dt>
                {recall.source === "fda"
                  ? "Product codes reported by FDA"
                  : "Product identifiers reported by USDA FSIS"}
              </dt>
              <dd>{codes}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <div className="card-footer">
        <div className="card-signals" aria-label="Recall classification and status">
          {formatClassification(recall.classification, recall.source) ? null : (
            <span className="card-source">{sourceShortName(recall.source)}</span>
          )}
          <RecallClassification
            classification={recall.classification}
            source={recall.source}
          />
          {!isPublicHealthAlert || recall.status !== "Public Health Alert" ? (
            <StatusBadge status={recall.status} />
          ) : null}
        </div>
        <Link className="card-detail-link" href={`/recalls/${recall.id}`}>
          {isPreview ? "View recall" : "View recall details"}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
