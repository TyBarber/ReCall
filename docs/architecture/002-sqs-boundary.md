# ADR 002: Separate ingestion and normalization with SQS

- Status: Accepted
- Date: 2026-08-30

## Context

FDA retrieval and record normalization fail and scale independently. Processing an entire ingestion synchronously would couple their runtimes and retry behavior.

## Decision

The ingestion Lambda archives raw records and sends one S3 reference per record to a standard SQS queue. A separate Lambda consumes batches with `ReportBatchItemFailures`. A redrive policy moves repeatedly failing messages to a DLQ.

## Consequences

The pipeline tolerates bursts and retries individual transport failures. Delivery is at least once, so normalization and persistence must remain idempotent. Ordering is not guaranteed and is not required.
