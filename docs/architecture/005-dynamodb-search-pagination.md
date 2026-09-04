# ADR 005: Preserve search and offset pagination with a bounded DynamoDB scan

- Status: Accepted with known limitation
- Date: 2026-08-30

## Context

Milestone 1 exposes case-insensitive substring search and numeric offsets. DynamoDB does not provide substring indexes or native offset pagination.

## Decision

For the small Milestone 2 dataset, preserve the existing API contract by scanning normalized recalls, filtering in the repository, sorting, and applying offset/limit. The API also calculates a filtered total for truthful numbered pagination and returns it in `X-Total-Count` while preserving the array response body. Keep API throttling and maximum page sizes conservative. Do not add OpenSearch in this milestone.

## Consequences

Behavior remains compatible locally and in AWS, but read cost and latency grow with table size. A list request currently reads the matching dataset once for the page and once for its total count, so total counting amplifies this known limitation. This bounded/full count is acceptable for the current small dataset, not for significant production scale. Before that point, replace offsets with opaque continuation tokens and evaluate a dedicated search index or purpose-built count strategy. The provisioned GSIs support future optimized source/status listings but do not solve substring search.
