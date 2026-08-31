# ADR 004: Store normalized recalls in DynamoDB

- Status: Accepted
- Date: 2026-08-30

## Context

The production API and normalization pipeline need a managed, serverless store with predictable key access and idempotent writes.

## Decision

Use an on-demand DynamoDB table keyed by the existing deterministic recall ID. Store source/status/date projection attributes and add source/date and source-status/date indexes. Store ingestion checkpoints in a separate, small table keyed by source.

## Consequences

Repeated records overwrite the same logical recall and retain the original `created_at`. There is no database server to operate. DynamoDB access patterns must be designed explicitly, and arbitrary substring search is not efficient.
