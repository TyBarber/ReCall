# ADR 008: Integrate USDA FSIS recalls and Public Health Alerts

## Status

Accepted for implementation. Deployment requires a separately reviewed Terraform apply.

## Context

FDA food enforcement data does not cover all meat, poultry, and egg-product
hazards relevant to ReCall users. USDA's Food Safety and Inspection Service
(FSIS) publishes both recalls and Public Health Alerts through its official,
GET-only Recall API:

`https://www.fsis.usda.gov/fsis/api/recall/v/1`

Live contract discovery and the June 2026 FSIS API guide established that the
endpoint returns a bare JSON array. It supports attribute filters for issue
year, state, archive state, closed date/year, health risk, processing category,
product text, recall classification/number/reason/type, outbreak relation,
summary text, and translation language. It does not document pagination or a
last-modified query parameter. English and Spanish translations share FSIS case
numbers.

FSIS `field_recall_date` is the issue/publication date. It is not equivalent to
FDA's firm initiation date. `field_last_modified_date` is a date-only update
marker and is absent from some older rows.

## Decision

### Source and record semantics

Use `source=usda_fsis` and `category=food`. Add a generic `record_type` with
`recall` and `public_health_alert`. A Public Health Alert remains searchable and
eligible for newest results, but it is not represented as a formal recall and
receives no invented Class I/II/III classification or severity.

### Identity

Use `field_recall_number_export`, falling back to `field_recall_number`, as the
stable source case ID:

`uuid5(NAMESPACE_URL, "usda_fsis:<source-case-id>")`

If both identifiers are blank or `N/A`, derive a SHA-256 fingerprint from
canonicalized `field_recall_url`, `field_title`, and `field_recall_date`, then
derive:

`uuid5(NAMESPACE_URL, "usda_fsis:fallback:<fingerprint>")`

Canonicalization applies Unicode NFKC, HTML entity decoding, whitespace
collapse, and case folding. Mutable lifecycle values—including active/closed
status, classification, risk, and last-modified date—are excluded.

### Dates and checkpointing

Map `field_recall_date` to `reported_at`; leave `recall_date` empty because FSIS
does not expose an equivalent firm-initiation date. Preserve
`field_last_modified_date` as `source_updated_at`.

Fetch the English API snapshot. If no successful `usda_fsis` checkpoint exists,
select the complete valid English history without a date cutoff. This bootstrap
explicitly includes historical rows whose `field_last_modified_date` is absent.

After a successful checkpoint exists, select a record only when it has a valid
`field_last_modified_date` and that date falls inclusively from the prior
successful checkpoint date minus one calendar day through the current run date.
The overlap matches the source field's day—not timestamp—precision. Missing
last-modified rows are not selected on subsequent daily runs, so historical
records are not continually republished. Store the successful checkpoint under
`source=usda_fsis` only after snapshot archival, record archival, SQS
publication, and manifest archival complete.

The API cannot filter by last-modified date, so each run downloads the English
snapshot. A later periodic full reconciliation remains necessary for changes to
historical rows that lack update dates and for any source corrections that do
not advance the exposed modification field. That reconciliation job is not part
of this milestone.

### Pipeline and normalization

Use a dedicated USDA FSIS ingestion Lambda and schedule to minimize risk to the
stable FDA ingestion path. Reuse the encrypted/versioned raw S3 bucket, shared
normalization queue and DLQ, shared normalization Lambda, recalls table, and
source-keyed checkpoint table. The normalization Lambda has one source dispatch
boundary; each source retains its own external schema and normalizer.

Raw objects use the existing archive convention:

`source=usda_fsis/date=<YYYY-MM-DD>/ingestion_id=<UUID>/...`

The page object contains the complete English snapshot. Selected individual
records and a completion manifest support replay, audit, and renormalization.

### Product and agency details

Preserve structured FSIS product text, common establishment marks extracted
from the source summary, and official PDF links found in summary anchors.
Unstructured lot, sell-by, and package details remain in the product strings;
the normalizer does not guess UPCs or split ambiguous source wording.

Classification explanations are source-aware. FDA wording remains unchanged;
USDA FSIS Class I/II/III wording follows the agency's definitions. Public Health
Alerts render their record type rather than a fabricated class.

FSIS lifecycle values are not translated into FDA's
Ongoing/Completed/Terminated vocabulary. `field_recall_type` is preserved
verbatim as normalized `status`, while `field_active_notice` and
`field_archive_recall` are preserved separately as source lifecycle flags.

### Newest results across food sources

Do not add a category GSI yet. For unfiltered `sort=newest` across all sources,
issue one bounded descending `source-reported-date-index` query per supported
food source, merge those small candidate sets in memory, and apply the requested
offset/limit. This avoids a full-table scan and requires no FDA data migration.

A `category-reported-date-index` becomes reasonable when the platform has many
sources/categories or needs cursor pagination across a large unified corpus.
Adding it now would require an unnecessary index deployment and FDA backfill.

## Consequences and known limitations

- The English filter prevents duplicate translated consumer records while raw
  English source data remains replayable.
- The endpoint's lack of pagination makes each snapshot larger than a typical
  page-based API response.
- The USDA FSIS EventBridge schedule is initially disabled. The complete-history
  Lambda run and resulting records must be validated manually before a separate
  reviewed Terraform change enables daily scheduling.
- Modification dates are date-only and missing on some historical records.
- Establishment and lot/date identifiers can be embedded only in HTML or product
  prose. Extraction is deliberately conservative; raw records remain canonical.
- FSIS source fields can be internally surprising (for example, active-notice
  flags and recall-type labels do not always convey the same lifecycle signal),
  so normalized status preserves `field_recall_type` rather than inferring one.
- Cross-source newest pagination is bounded but offset-based. A future cursor
  design should replace it as volume and source count grow.
