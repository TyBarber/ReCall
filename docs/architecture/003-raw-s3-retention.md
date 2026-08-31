# ADR 003: Retain raw source data in versioned S3

- Status: Accepted
- Date: 2026-08-30

## Context

Normalization rules can change, source payloads can be malformed, and failures may require replay without calling FDA again.

## Decision

Store complete FDA pages, individual raw records, and a completed-run manifest under unique ingestion keys in an encrypted, versioned S3 bucket. Use lifecycle retention. Do not enable Object Lock in Milestone 2. Ingestion and normalization roles receive no `s3:DeleteObject` permission.

## Consequences

Raw inputs remain replayable and auditable while development environments remain practical to tear down. Administrators with broader account permissions can still delete data, so this is operational immutability rather than compliance-grade WORM retention.
