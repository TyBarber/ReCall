# Frontend/backend contract TODOs

This document records API gaps exposed while building the Milestone 3A
consumer interface. They are intentionally not addressed with client-side
workarounds.

## Search behavior verified on 2026-08-31

The deployed development API successfully returned matches for:

- product name: `Mac & Cheese`
- recalling company / brand: `Kerry`
- recall reason: `Salmonella`
- UPC value from a live record: `20609055`

The interface advertises only those categories. Search remains a DynamoDB scan
and is suitable for the current small development dataset, not large-scale
production traffic.

## Contract improvements to evaluate later

- Deploy the implemented `reported_at`/`sort=newest` contract and run the
  reviewed raw-S3 backfill before depending on newest ordering in production.
- Evaluate cursor-based pagination beyond the current truthful
  `X-Total-Count` plus numeric-offset contract as the dataset grows.
- ~~Add server-side classification filtering before offering a classification
  control.~~ Implemented as `GET /recalls?classification=class_i|class_ii|class_iii`.
  The frontend shows its “How serious” filter only when `GET /freshness`
  exists, and rejects results that do not match the requested class, because an
  older API silently ignores the parameter.
- ~~Add freshness metadata that tells consumers when source data was last
  ingested.~~ Implemented as `GET /freshness`, which reports each source's last
  successful ingestion checkpoint (null locally, where no checkpoints exist).
  Both changes require redeploying the API Lambda before they reach the
  deployed frontend.
- Improve source URLs when a consumer-facing FDA recall notice is available.
  Current links are labeled “View FDA source data.”
- Preserve and improve source parsing for noisy UPC, lot/code, and state fields.
  The frontend displays provided values without cleaning or reinterpretation.
- Add a structured consumer-instructions field only when it comes from an
  authoritative source. The frontend does not generate disposal, return, or
  medical guidance.
