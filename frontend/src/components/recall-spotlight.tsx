import Link from "next/link";

import { RecallClassification } from "@/components/recall-classification";
import {
  classificationTone,
  formatRecallDate,
  reportedDateLabel,
} from "@/lib/format";
import type { Recall } from "@/lib/types";

type RecallSpotlightProps = {
  recalls: Recall[];
};

function statusTone(status: string): string {
  switch (status.trim().toLowerCase()) {
    case "ongoing":
    case "active recall":
      return "ongoing";
    case "completed":
    case "closed recall":
      return "completed";
    case "terminated":
      return "terminated";
    default:
      return "neutral";
  }
}

export function RecallSpotlight({ recalls }: RecallSpotlightProps) {
  const featuredRecalls = recalls.slice(0, 3);
  const featuredRecall = featuredRecalls[0];

  if (!featuredRecall) {
    return null;
  }

  return (
    <aside className="recall-spotlight" aria-label="Featured recall">
      <div className="spotlight-stack">
        {featuredRecalls.map((recall, index) => {
          const positionName = ["front", "middle", "back"][index];
          const isFront = index === 0;

          return (
            <article
              className={`spotlight-card spotlight-card-${classificationTone(recall.classification)} spotlight-position-${positionName}`}
              aria-hidden={isFront ? undefined : true}
              key={recall.id}
            >
              {isFront ? (
                <>
                  <header className="spotlight-header">
                    <RecallClassification
                      classification={recall.classification}
                      source={recall.source}
                      variant="spotlight"
                    />
                    {recall.record_type === "public_health_alert" ? (
                      <span className="record-type-badge">Public Health Alert</span>
                    ) : null}
                    {recall.record_type !== "public_health_alert" ||
                    recall.status !== "Public Health Alert" ? (
                      <span
                        className={`spotlight-status spotlight-status-${statusTone(recall.status)}`}
                      >
                        <span
                          className="spotlight-status-mark"
                          aria-hidden="true"
                        >
                          <i />
                        </span>
                        {recall.status}
                      </span>
                    ) : null}
                  </header>

                  <div className="spotlight-product">
                    <h2>{recall.product_name}</h2>
                    <p>{recall.brand || "Company not reported"}</p>
                  </div>

                  <div className="spotlight-reason">
                    <span>Why it was recalled</span>
                    <p>{recall.recall_reason}</p>
                  </div>

                  <div className="spotlight-meta">
                    {recall.reported_at || recall.recall_date ? (
                      <span>
                        {recall.reported_at
                          ? reportedDateLabel(recall.source)
                          : "Recall started"}{" "}
                        {formatRecallDate(
                          recall.reported_at || recall.recall_date,
                        )}
                      </span>
                    ) : null}
                  </div>

                  <Link
                    className="spotlight-link"
                    href={`/recalls/${recall.id}`}
                  >
                    View recall <span aria-hidden="true">→</span>
                  </Link>
                </>
              ) : null}
            </article>
          );
        })}
      </div>
    </aside>
  );
}
