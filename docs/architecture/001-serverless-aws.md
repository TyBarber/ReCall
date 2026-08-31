# ADR 001: Use a serverless AWS architecture

- Status: Accepted
- Date: 2026-08-30

## Context

Recall ingestion is scheduled and bursty, while the public read API begins at low and uncertain traffic. Operating persistent servers would add idle cost and operational work.

## Decision

Use EventBridge Scheduler, Lambda, SQS, S3, DynamoDB, and API Gateway. Define every AWS resource in Terraform. Do not place Lambdas in a VPC until a private-network dependency requires it.

## Consequences

The platform scales without server management and costs track usage. Lambda limits, cold starts, at-least-once delivery, and AWS service integration behavior must be handled explicitly. Local development continues to use FastAPI and SQLite.
