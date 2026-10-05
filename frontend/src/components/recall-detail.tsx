import Link from "next/link";

import { RecallClassification } from "@/components/recall-classification";
import { StatusBadge } from "@/components/status-badge";
import {
  formatRecallDate,
  hasUsefulSourceUrl,
  reportedDateLabel,
  sourceFullName,
  sourceShortName,
} from "@/lib/format";
import type { Recall } from "@/lib/types";

type RecallDetailViewProps = {
  recall: Recall;
};

const OMITTED_VALUES = new Set([
  "",
  "-",
  "--",
  "n/a",
  "na",
  "none",
  "not applicable",
  "not available",
  "not provided",
  "null",
  "unknown",
]);

const IDENTIFIER_ARTIFACTS = new Set([
  "code",
  "codes",
  "lot",
  "lots",
  "number",
  "numbers",
  "lot number",
  "lot numbers",
]);

function normalizedValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function isUsefulText(value: string | null | undefined): value is string {
  return Boolean(value && !OMITTED_VALUES.has(normalizedValue(value)));
}

function usefulIdentifiers(values: string[]): string[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = normalizedValue(value);
    if (
      OMITTED_VALUES.has(normalized) ||
      IDENTIFIER_ARTIFACTS.has(normalized) ||
      seen.has(normalized)
    ) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

export function RecallDetailView({ recall }: RecallDetailViewProps) {
  const upcCodes = usefulIdentifiers(recall.upc_codes);
  const lotNumbers = usefulIdentifiers(recall.lot_numbers);
  const productItems = usefulIdentifiers(recall.product_items ?? []);
  const establishmentNumbers = usefulIdentifiers(
    recall.establishment_numbers ?? [],
  );
  const sourceDocuments = (recall.source_documents ?? []).filter(
    hasUsefulSourceUrl,
  );
  const productCodeInfo = isUsefulText(recall.product_code_info)
    ? recall.product_code_info.trim()
    : null;
  const states = usefulIdentifiers(recall.states);
  const distributionPattern = isUsefulText(recall.distribution_pattern)
    ? recall.distribution_pattern.trim()
    : null;
  const sourceRecallId = isUsefulText(recall.source_recall_id)
    ? recall.source_recall_id.trim()
    : null;
  const sourceUrl =
    sourceRecallId && hasUsefulSourceUrl(recall.source_url)
      ? recall.source_url
      : null;
  const recallingFirm = isUsefulText(recall.recalling_firm)
    ? recall.recalling_firm.trim()
    : null;
  const brand = isUsefulText(recall.brand) ? recall.brand.trim() : null;
  const showSeparateBrand = Boolean(
    recallingFirm &&
      brand &&
      normalizedValue(recallingFirm) !== normalizedValue(brand),
  );
  const hasPackageIdentifiers = Boolean(
    productCodeInfo ||
      upcCodes.length > 0 ||
      lotNumbers.length > 0 ||
      establishmentNumbers.length > 0,
  );
  const agency = sourceShortName(recall.source);
  const fullAgencyName = sourceFullName(recall.source);
  const isPublicHealthAlert = recall.record_type === "public_health_alert";

  return (
    <main className="shell detail-page">
      <Link className="back-link" href="/recalls">
        <span aria-hidden="true">←</span> Back to recalls
      </Link>

      <header className="detail-header">
        <div className="card-badges">
          {isPublicHealthAlert ? (
            <span className="record-type-badge">Public Health Alert</span>
          ) : null}
          <RecallClassification
            classification={recall.classification}
            source={recall.source}
          />
          {!isPublicHealthAlert || recall.status !== "Public Health Alert" ? (
            <StatusBadge status={recall.status} />
          ) : null}
        </div>
        <p className="eyebrow">
          {isPublicHealthAlert ? "USDA FSIS Public Health Alert" : `${agency} food recall`}
        </p>
        <h1>{recall.product_name}</h1>
        {recallingFirm || brand ? (
          <div className="detail-company">
            <span>
              {recallingFirm ? "Recalling firm" : "Brand or recalling firm"}
            </span>
            <p>{recallingFirm ?? brand}</p>
            {showSeparateBrand ? (
              <p className="detail-company-brand">
                <strong>Brand</strong> {brand}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="detail-missing detail-missing-company">
            Brand or recalling firm not provided in the {agency} record.
          </p>
        )}

        <section className="detail-reason-summary" aria-labelledby="recall-reason">
          <h2 id="recall-reason">Why it was recalled</h2>
          <p>
            {isUsefulText(recall.recall_reason)
              ? recall.recall_reason.trim()
              : `A reason was not provided in the ${agency} record.`}
          </p>
        </section>
      </header>

      <div className="detail-layout">
        <article className="detail-main" aria-label="Recall details">
          <section className="detail-section">
            <h2>Key dates</h2>
            {recall.reported_at || recall.recall_date ? (
              <dl className="detail-date-grid">
                {recall.reported_at ? (
                  <div>
                    <dt>{reportedDateLabel(recall.source)}</dt>
                    <dd>{formatRecallDate(recall.reported_at)}</dd>
                  </div>
                ) : null}
                {recall.recall_date ? (
                  <div>
                    <dt>Recall started</dt>
                    <dd>{formatRecallDate(recall.recall_date)}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="detail-missing">
                Dates were not provided in the {agency} record.
              </p>
            )}
          </section>

          {productItems.length > 0 ? (
            <section className="detail-section">
              <h2>Affected products</h2>
              <ul className="detail-product-list">
                {productItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : isUsefulText(recall.description) ? (
            <section className="detail-section">
              <h2>Affected product</h2>
              <p>{recall.description.trim()}</p>
            </section>
          ) : null}

          <section className="detail-section">
            <h2>Where it was distributed</h2>
            {states.length > 0 ? (
              <dl className="distribution-facts">
                <div>
                  <dt>States reported</dt>
                  <dd>{states.join(", ")}</dd>
                </div>
              </dl>
            ) : distributionPattern ? (
              <p>{distributionPattern}</p>
            ) : (
              <p className="detail-missing">
                Distribution details were not provided in the {agency} record.
              </p>
            )}
          </section>

          <section className="detail-section" aria-labelledby="package-checks">
            <h2 id="package-checks">What to check on your package</h2>
            {hasPackageIdentifiers ? (
              <>
                <p className="section-note">
                  These values are preserved from {agency} data. Check the wording
                  and numbers against your package.
                </p>
                {productCodeInfo ? (
                  <div className="code-group">
                    <h3>{agency}-reported product/code information</h3>
                    <p className="reported-code-info">{productCodeInfo}</p>
                  </div>
                ) : null}
                {upcCodes.length > 0 ? (
                  <div className="code-group">
                    <h3>UPC</h3>
                    <ul className="code-list">
                      {upcCodes.map((code) => (
                        <li key={code}>{code}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {lotNumbers.length > 0 ? (
                  <div className="code-group">
                    <h3>Lot / batch information</h3>
                    <ul className="code-list">
                      {lotNumbers.map((code) => (
                        <li key={code}>{code}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {establishmentNumbers.length > 0 ? (
                  <div className="code-group">
                    <h3>USDA establishment number</h3>
                    <ul className="code-list">
                      {establishmentNumbers.map((code) => (
                        <li key={code}>{code}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="detail-missing">
                {recall.source === "fda"
                  ? "Product codes were not provided in the FDA record."
                  : "Product identifiers were not provided in the USDA FSIS record."}
              </p>
            )}
          </section>
        </article>

        <aside className="detail-sidebar" aria-label="Source and additional details">
          <section className="detail-sidebar-section source-section">
            <h2>Source</h2>
            <p className="source-name">{fullAgencyName}</p>
            <p className="source-note">
              Recall information may be updated as investigations develop.
            </p>
            {sourceUrl ? (
              <a
                className="source-link"
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${agency} source data (opens in a new tab)`}
              >
                View {agency} source data <span aria-hidden="true">↗</span>
              </a>
            ) : null}
            {sourceDocuments.length > 0 ? (
              <div className="source-documents">
                <h3>Product labels and documents</h3>
                <ul>
                  {sourceDocuments.map((url, index) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        Source document {index + 1} <span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {sourceRecallId ? (
            <section className="detail-sidebar-section">
              <h2>Additional recall details</h2>
              <dl className="summary-list">
                <div>
                  <dt>
                    {recall.source === "fda"
                      ? "FDA recall number"
                      : "USDA FSIS record number"}
                  </dt>
                  <dd>{sourceRecallId}</dd>
                </div>
              </dl>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
