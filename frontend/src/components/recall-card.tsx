import Link from "next/link";

import { ClassificationBadge } from "@/components/classification-badge";
import { StatusBadge } from "@/components/status-badge";
import {
  classificationTone,
  formatRecallDate,
  formatShortDate,
} from "@/lib/format";
import type { Recall } from "@/lib/types";

type RecallCardProps = {
  recall: Recall;
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
  const total = recall.upc_codes.length + recall.lot_numbers.length;

  if (total === 0) {
    return null;
  }
  return `${total} FDA-reported code${total === 1 ? "" : "s"}`;
}

export function RecallCard({ recall }: RecallCardProps) {
  const tone = classificationTone(recall.classification);
  const distribution = distributionSummary(recall);
  const codes = codeSummary(recall);

  return (
    <article className={`recall-row recall-row-${tone}`}>
      <Link
        className="recall-row-link"
        href={`/recalls/${recall.id}`}
        aria-label={`View recall details for ${recall.product_name}`}
      >
        <div className="recall-row-code">
          {recall.recall_date ? (
            <dl>
              <div>
                <dt className="sr-only">Recall initiated</dt>
                <dd>
                  <time
                    dateTime={recall.recall_date}
                    title={formatRecallDate(recall.recall_date)}
                  >
                    {formatShortDate(recall.recall_date)}
                  </time>
                </dd>
              </div>
            </dl>
          ) : null}
          <ClassificationBadge classification={recall.classification} />
        </div>

        <div className="recall-row-copy">
          <div className="recall-product-line">
            <h3>{recall.product_name}</h3>
            <p>{recall.brand || "Company not reported"}</p>
          </div>
          <p className="recall-row-reason">{recall.recall_reason}</p>
          {distribution || codes ? (
            <dl className="recall-row-facts">
              {distribution ? (
                <div>
                  <dt>Distribution</dt>
                  <dd title={distribution}>{distribution}</dd>
                </div>
              ) : null}
              {codes ? (
                <div>
                  <dt>Product codes</dt>
                  <dd>{codes}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>

        <div className="recall-row-state">
          <StatusBadge status={recall.status} />
          <span className="recall-row-action">
            View details <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
