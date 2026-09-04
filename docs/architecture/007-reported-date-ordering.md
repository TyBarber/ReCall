# ADR 007: Preserve recall initiation and FDA reporting dates

## Status

Accepted for implementation; deployment and data backfill require separate review.

## Context

FDA `recall_initiation_date` describes when recall activity began. FDA
`report_date` describes when the enforcement record was reported/listed in the
FDA dataset. A recall can be initiated earlier but reported later, so initiation
date cannot support an accurate newest-listing experience.

## Decision

Keep normalized `recall_date` mapped to `recall_initiation_date` and add the
generic optional date `reported_at`, mapped to FDA `report_date`. Preserve the
existing deterministic recall ID algorithms without adding `reported_at` as a
new identity input.

Persist `reported_sort` as `<reported_at>#<id>` and add the
`source-reported-date-index` GSI with `source` as its partition key. The API
keeps its existing default ordering and adds the explicit `sort=newest` mode.
When a source is supplied, newest retrieval uses the new GSI in descending
order.

Backfill existing items from retained immutable raw S3 records with a local,
dry-run-by-default administrative script. The script updates only
`reported_at`, `reported_sort`, and `updated_at`, verifies each write, and is
idempotent. Missing normalized items or source mismatches are reported and
left untouched so an operator can reconcile them before mutation.

## Consequences

The homepage can accurately describe its preview as newest FDA-listed recalls.
Existing item IDs and recall initiation semantics remain stable. The new GSI
adds a small amount of DynamoDB storage/write cost. Until the GSI is active and
the backfill is executed, historical items are absent from that index.
