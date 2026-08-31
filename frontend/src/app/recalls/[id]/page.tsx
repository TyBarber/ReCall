import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassificationBadge } from "@/components/classification-badge";
import { StatusBadge } from "@/components/status-badge";
import { getRecall, RecallApiError } from "@/lib/api/recalls";
import {
  formatRecallDate,
  formatTickerDate,
  hasUsefulSourceUrl,
} from "@/lib/format";

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
      description: `${recall.recall_reason} Recall initiated ${formatRecallDate(recall.recall_date)}.`,
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
      <Link className="back-link" href="/#current-recalls">
        <span aria-hidden="true">←</span> Recall feed
      </Link>

      <header className="detail-record-header">
        <div className="detail-code-line">
          {recall.recall_date ? (
            <time dateTime={recall.recall_date}>
              {formatTickerDate(recall.recall_date)}
            </time>
          ) : null}
          <ClassificationBadge classification={recall.classification} />
          <StatusBadge status={recall.status} />
        </div>
        <h1>{recall.product_name}</h1>
        <p className="detail-company">
          {recall.brand || "Company not reported"}
        </p>
        <p className="detail-guidance">
          Recalled — match the product details below against the packaging.
        </p>
      </header>

      <section className="detail-record" aria-label="Recall record">
        <h2 className="sr-only">Recall facts</h2>
        <dl className="record-fields">
          <div className="record-field record-field-critical">
            <dt>Reason</dt>
            <dd>{recall.recall_reason}</dd>
          </div>
          <div className="record-field">
            <dt>Company</dt>
            <dd>{recall.brand || "Not reported"}</dd>
          </div>
          {recall.description ? (
            <div className="record-field">
              <dt>Affected product</dt>
              <dd>{recall.description}</dd>
            </div>
          ) : null}
          {recall.distribution_pattern ? (
            <div className="record-field">
              <dt>Distribution</dt>
              <dd>{recall.distribution_pattern}</dd>
            </div>
          ) : null}
          {recall.states.length > 0 ? (
            <div className="record-field">
              <dt>States reported</dt>
              <dd className="machine-value">{recall.states.join(", ")}</dd>
            </div>
          ) : null}
          {hasCodes ? (
            <div className="record-field">
              <dt>Product codes reported by FDA</dt>
              <dd>
                {recall.upc_codes.length > 0 ? (
                  <div className="code-group">
                    <span>UPC field values</span>
                    <ul className="code-list">
                      {recall.upc_codes.map((code, index) => (
                        <li key={`${code}-${index}`}>{code}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {recall.lot_numbers.length > 0 ? (
                  <div className="code-group">
                    <span>Lot or code field values</span>
                    <ul className="code-list">
                      {recall.lot_numbers.map((code, index) => (
                        <li key={`${code}-${index}`}>{code}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </dd>
            </div>
          ) : null}
          <div className="record-field">
            <dt>Recall initiated</dt>
            <dd className="machine-value">
              {formatRecallDate(recall.recall_date)}
            </dd>
          </div>
          <div className="record-field">
            <dt>Status</dt>
            <dd className="machine-value">{recall.status}</dd>
          </div>
          {recall.classification ? (
            <div className="record-field">
              <dt>Classification</dt>
              <dd>
                <ClassificationBadge classification={recall.classification} />
              </dd>
            </div>
          ) : null}
          <div className="record-field">
            <dt>FDA recall number</dt>
            <dd className="machine-value">
              {recall.source_recall_id || "Not reported"}
            </dd>
          </div>
          <div className="record-field">
            <dt>Source</dt>
            <dd>
              <span>U.S. FDA enforcement data</span>
              {sourceUrl ? (
                <a
                  className="source-link"
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View FDA source data <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
