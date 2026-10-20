import Link from "next/link";

import { RecallClassification } from "@/components/recall-classification";
import { StatusBadge } from "@/components/status-badge";
import {
  displayCompany,
  displayProductName,
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

/** One recall, printed as a line item on a receipt. */
export function RecallCard({ recall, variant = "directory" }: RecallCardProps) {
  const isPreview = variant === "preview";
  const severity = recallSeverity(recall);
  const distribution = isPreview ? null : distributionSummary(recall);
  const codes = isPreview ? null : codeSummary(recall);
  const displayDate = recall.reported_at || recall.recall_date;
  const isPublicHealthAlert = recall.record_type === "public_health_alert";
  const href = `/recalls/${recall.id}`;

  return (
    <article className={`recall-item tone-${severity.key}`}>
      <div className="line">
        <h3>
          <Link href={href}>{displayProductName(recall.product_name)}</Link>
        </h3>
        <span className="line-fill" aria-hidden="true" />
        <span className="tag line-value">
          {isPublicHealthAlert ? "Public Health Alert" : severity.label}
        </span>
      </div>
      <div className="item-detail">
        <p>{displayCompany(recall) ?? "Company not named"}</p>
        <p>
          <span className="sr-only">Why it was recalled: </span>
          {recall.recall_reason}
        </p>
        {displayDate || distribution || codes ? (
          <dl aria-label="Recall quick facts">
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
        {isPreview ? null : (
          <div className="item-signals" aria-label="Recall classification and status">
            {formatClassification(recall.classification, recall.source) ? null : (
              <span>{sourceShortName(recall.source)}</span>
            )}
            <RecallClassification
              classification={recall.classification}
              source={recall.source}
            />
            {!isPublicHealthAlert || recall.status !== "Public Health Alert" ? (
              <StatusBadge status={recall.status} />
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
