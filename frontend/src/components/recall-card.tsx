import Link from "next/link";

import { RecallClassification } from "@/components/recall-classification";
import { StatusBadge } from "@/components/status-badge";
import {
  classificationTone,
  formatRecallDate,
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
  const tone = classificationTone(recall.classification);
  const distribution = isPreview ? null : distributionSummary(recall);
  const codes = isPreview ? null : codeSummary(recall);
  const displayDate = recall.reported_at || recall.recall_date;

  return (
    <article
      className={`recall-card recall-card-${tone}${isPreview ? " recall-card-preview" : ""}`}
    >
      <div className="card-signals" aria-label="Recall classification and status">
        {recall.record_type === "public_health_alert" ? (
          <span className="record-type-badge">Public Health Alert</span>
        ) : null}
        <RecallClassification
          classification={recall.classification}
          source={recall.source}
        />
        {recall.record_type !== "public_health_alert" ||
        recall.status !== "Public Health Alert" ? (
          <StatusBadge status={recall.status} />
        ) : null}
      </div>
      <div className="card-heading">
        <p className="card-source">{sourceShortName(recall.source)}</p>
        <p className="card-company">
          {recall.recalling_firm || recall.brand || "Company not reported"}
        </p>
        <h3>{recall.product_name}</h3>
      </div>
      <div className="card-reason">
        <span>Why it was recalled</span>
        <p>{recall.recall_reason}</p>
      </div>
      {displayDate || distribution || codes ? (
        <dl className="card-quick-facts" aria-label="Recall quick facts">
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
            <div className="fact-distribution">
              <dt>Sold/distributed in</dt>
              <dd title={distribution}>{distribution}</dd>
            </div>
          ) : null}
          {codes ? (
            <div className="fact-codes">
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
      <div className="card-actions">
        <Link className="card-detail-link" href={`/recalls/${recall.id}`}>
          {isPreview ? "View recall" : "View recall details"}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
