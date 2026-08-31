# ReCall

ReCall ingests official U.S. food enforcement recalls, preserves their raw source data, normalizes them, and exposes a FastAPI read API.

Milestone 2 adds an entirely Terraform-managed AWS serverless deployment while preserving the Milestone 1 SQLite workflow.

## Architecture

```text
EventBridge Scheduler -> FDA ingestion Lambda -> S3 raw archive
                                             -> SQS normalization queue
                                                -> normalization Lambda
                                                   -> DynamoDB recalls

API Gateway HTTP API -> FastAPI/Mangum Lambda -> DynamoDB recalls
```

The ingestion Lambda uses a separate DynamoDB checkpoint table. Each successful run queries FDA `report_date` from the previous successful timestamp minus a configurable overlap. The checkpoint advances only after archival, queue publication, and manifest creation all complete. Development uses a configurable 60-day first-run lookback and a 60-minute regular overlap.

Architecture decisions are documented in [`docs/architecture`](docs/architecture/README.md).

## What works

- Paginated and checkpointed openFDA food-enforcement ingestion
- Complete raw response pages, individual records, and manifests archived in S3
- SQS decoupling with a DLQ and record-level partial batch failure responses
- Separate FDA validation schemas and normalized internal Recall model
- Idempotent SQLite and DynamoDB repository adapters
- Environment-based local/AWS repository selection
- FastAPI routes exposed locally or through API Gateway using Mangum
- `GET /health`, `GET /recalls`, and `GET /recalls/{id}`
- Search, source/status filtering, limit, and offset pagination
- Structured JSON logging with ingestion, recall, source, message, and request identifiers
- Terraform-managed IAM, logs, alarms, throttling, queues, storage, compute, API, and schedule

## Local setup

Python 3.12 is required.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
```

Ingest FDA records into local SQLite:

```bash
python scripts/ingest_fda.py --max-records 1000
```

Run the local API:

```bash
uvicorn app.main:app --reload
```

Configuration defaults to `EXECUTION_ENVIRONMENT=local` and `REPOSITORY_BACKEND=sqlite`. Set `RECALL_DATABASE_PATH` and `LOG_LEVEL` as needed.

## Tests

```bash
pytest
```

AWS behavior is tested with local fakes and does not require AWS credentials or access to an AWS account.

## Build and validate AWS deployment

The Lambda artifact is built before Terraform operations:

```bash
./scripts/build_lambda.sh
terraform -chdir=infrastructure/terraform init -backend=false
terraform -chdir=infrastructure/terraform fmt -check
terraform -chdir=infrastructure/terraform validate
terraform -chdir=infrastructure/terraform plan -out=recall-dev.tfplan
```

Copy `infrastructure/terraform/terraform.tfvars.example` to an untracked environment-specific `.tfvars` file if overriding defaults. Review the plan before any apply. Milestone 2 implementation and validation do not run `terraform apply`.

Important AWS environment variables are supplied by Terraform: `EXECUTION_ENVIRONMENT`, `REPOSITORY_BACKEND`, `AWS_REGION`, `DYNAMODB_TABLE_NAME`, `INGESTION_STATE_TABLE_NAME`, `RAW_BUCKET_NAME`, `NORMALIZATION_QUEUE_URL`, and ingestion-window settings.

## Security and operations

- The S3 bucket is encrypted, versioned, private, and lifecycle-managed.
- Object Lock is intentionally not enabled.
- Ingestion and normalization Lambdas receive no S3 delete permission.
- API Gateway applies configurable default-route rate and burst throttles.
- The public API has no authentication in this milestone.
- CloudWatch alarms have no notification target yet; inspect them in AWS or add an approved notification destination in a later milestone.

## Intentionally not implemented

This milestone does not include authentication, user accounts, pantry/watchlists, notifications, recommendations, retailer integration, a frontend/mobile app, WAF, CloudFront, Kubernetes, Redis, ECS, or EKS. DynamoDB substring search and numeric offsets use a scan for compatibility at small scale; continuation-token pagination and a dedicated search solution remain future work.
