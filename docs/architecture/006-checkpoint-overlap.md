# ADR 006: Use checkpointed ingestion with an overlap window

- Status: Accepted
- Date: 2026-08-30

## Context

A fixed lookback repeatedly retrieves unnecessary history, while a strict last-seen timestamp can miss delayed or corrected FDA records.

## Decision

Persist the last successful ingestion timestamp and ID per source. Discover FDA records by `report_date`, querying from that timestamp minus a configurable overlap through the current run timestamp. `recall_initiation_date` remains part of the normalized recall but is not the discovery cursor. On first run, use a configurable initial lookback. Advance the checkpoint only after every page and record is archived, every record reference is queued, and the manifest is written.

## Consequences

Failures do not create gaps because the checkpoint stays unchanged. The overlap deliberately creates duplicates, which deterministic recall IDs and idempotent upserts safely absorb. This is a checkpoint, not a general workflow engine.

## Known limitation and future reconciliation

openFDA states that later dataset updates can modify historical records. A `report_date` cursor plus overlap is a sound incremental-discovery strategy, but it cannot guarantee reconciliation of every historical change. A future milestone should periodically compare a broader or complete FDA enforcement dataset and replay changed records. That reconciliation job is intentionally outside Milestone 2.
