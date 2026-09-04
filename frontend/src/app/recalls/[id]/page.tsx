import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RecallClassification } from "@/components/recall-classification";
import { StatusBadge } from "@/components/status-badge";
import { getRecall, RecallApiError } from "@/lib/api/recalls";
import { formatRecallDate, hasUsefulSourceUrl } from "@/lib/format";

type RecallDetailProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: RecallDetailProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const recall = await getRecall(id);
    return {
      title: recall.product_name,
      description: `${recall.recall_reason} Recall started ${formatRecallDate(recall.recall_date)}.`,
    };
  } catch {
    return { title: "Recall details" };
  }
}

export default async function RecallDetail({ params }: RecallDetailProps) {
  const { id } = await params;
  let recall;
  try {
    recall = await getRecall(id);
  } catch (error) {
    if (error instanceof RecallApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const hasCodes = recall.upc_codes.length > 0 || recall.lot_numbers.length > 0;
  const sourceUrl = hasUsefulSourceUrl(recall.source_url)
    ? recall.source_url
    : null;

  return (
    <main className="shell detail-page">
      <Link className="back-link" href="/recalls">
        <span aria-hidden="true">←</span> Back to current recalls
      </Link>

      <header className="detail-header">
        <div className="card-badges">
          <RecallClassification classification={recall.classification} />
          <StatusBadge status={recall.status} />
        </div>
        <p className="eyebrow">FDA food enforcement recall</p>
        <h1>{recall.product_name}</h1>
        {recall.brand ? <p className="detail-brand">{recall.brand}</p> : null}
      </header>

      <div className="detail-layout">
        <article className="detail-main">
          <section className="detail-section reason-detail">
            <h2>Why this product was recalled</h2>
            <p>{recall.recall_reason}</p>
          </section>

          {recall.description ? (
            <section className="detail-section">
              <h2>Affected product information</h2>
              <p>{recall.description}</p>
            </section>
          ) : null}

          {hasCodes ? (
            <section className="detail-section" aria-labelledby="product-codes">
              <h2 id="product-codes">Product codes reported by FDA</h2>
              <p className="section-note">
                Values below are shown as provided in the source data.
              </p>
              {recall.upc_codes.length > 0 ? (
                <div className="code-group">
                  <h3>Reported UPC field values</h3>
                  <ul className="code-list">
                    {recall.upc_codes.map((code, index) => (
                      <li key={`${code}-${index}`}>{code}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {recall.lot_numbers.length > 0 ? (
                <div className="code-group">
                  <h3>Reported lot or code field values</h3>
                  <ul className="code-list">
                    {recall.lot_numbers.map((code, index) => (
                      <li key={`${code}-${index}`}>{code}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {recall.distribution_pattern || recall.states.length > 0 ? (
            <section className="detail-section">
              <h2>Distribution</h2>
              {recall.distribution_pattern ? (
                <p>{recall.distribution_pattern}</p>
              ) : null}
              {recall.states.length > 0 ? (
                <dl className="inline-facts">
                  <div>
                    <dt>States reported</dt>
                    <dd>{recall.states.join(", ")}</dd>
                  </div>
                </dl>
              ) : null}
            </section>
          ) : null}

          {sourceUrl ? (
            <section className="detail-section source-section">
              <h2>FDA source information</h2>
              <p>
                Refer to the FDA source data for the most current recall
                information.
              </p>
              <a
                className="primary-button"
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                View FDA source data <span aria-hidden="true">↗</span>
              </a>
            </section>
          ) : null}
        </article>

        <aside className="detail-sidebar" aria-label="Recall summary">
          <p className="summary-kicker">At a glance</p>
          <h2>Recall summary</h2>
          <dl className="summary-list">
            {recall.reported_at ? (
              <div>
                <dt>Listed by FDA</dt>
                <dd>{formatRecallDate(recall.reported_at)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Recall started</dt>
              <dd>{formatRecallDate(recall.recall_date)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{recall.status}</dd>
            </div>
            {recall.classification ? (
              <div>
                <dt>Classification</dt>
                <dd>
                  <RecallClassification
                    classification={recall.classification}
                  />
                </dd>
              </div>
            ) : null}
            <div>
              <dt>FDA recall number</dt>
              <dd>{recall.source_recall_id || "Not reported"}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>U.S. FDA enforcement data</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}
