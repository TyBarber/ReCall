# ReCall

ReCall ingests official U.S. food safety records, preserves their raw source data, normalizes them, exposes a FastAPI read API, and provides a consumer-facing recall finder.

Milestone 2 adds an entirely Terraform-managed AWS serverless deployment while preserving the Milestone 1 SQLite workflow. Milestone 3A adds the local Next.js consumer interface without changing the deployed backend.

## Architecture

```text
EventBridge Scheduler -> FDA ingestion Lambda ------┐
                      -> USDA FSIS ingestion Lambda ├-> S3 raw archive
                                                   └-> SQS normalization queue
                                                       -> normalization Lambda
                                                          -> DynamoDB recalls

API Gateway HTTP API -> FastAPI/Mangum Lambda -> DynamoDB recalls
```

Each ingestion source uses the separate DynamoDB checkpoint table under its own source key. FDA queries `report_date` with a 60-minute overlap. On its first successful run, USDA FSIS imports the complete available English history, including historical records with no `field_last_modified_date`. Later runs select only records whose `field_last_modified_date` falls inclusively between the prior successful checkpoint minus one calendar day and the current run date; rows without that field are excluded from daily republishing. A checkpoint advances only after archival, queue publication, and manifest creation all complete.

Architecture decisions are documented in [`docs/architecture`](docs/architecture/README.md).

## What works

- Paginated and checkpointed openFDA food-enforcement ingestion
- Checkpointed USDA FSIS recall and Public Health Alert ingestion
- Complete raw response pages, individual records, and manifests archived in S3
- SQS decoupling with a DLQ and record-level partial batch failure responses
- Separate FDA validation schemas and normalized internal Recall model
- Source-specific FDA and USDA FSIS schemas/normalizers behind one dispatch boundary
- Idempotent SQLite and DynamoDB repository adapters
- Environment-based local/AWS repository selection
- FastAPI routes exposed locally or through API Gateway using Mangum
- `GET /health`, `GET /recalls`, and `GET /recalls/{id}`
- Unified search, FDA/USDA FSIS source, exact source-status, record-type, limit, and offset filtering/pagination
- Source-correct initiation/publication dates with bounded cross-source `sort=newest`
- Structured JSON logging with ingestion, recall, source, message, and request identifiers
- Terraform-managed IAM, logs, alarms, throttling, queues, storage, compute, API, and schedule
- Responsive current-recall feed and recall detail pages in `frontend/`
- Search across normalized product, company/brand, reason, package, and source identifier fields
- Frontend loading, empty, error, not-found, and pagination states

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

## Frontend

Node.js 20 or newer is required. The local environment file points to the deployed development API.

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Run frontend checks with:

```bash
npm run lint
npm test
npm run build
```

Known frontend/backend contract limitations are tracked in [`docs/frontend-backend-contract-todos.md`](docs/frontend-backend-contract-todos.md).

## FDA reported-date backfill

Existing DynamoDB items require a one-time field-only backfill after the new
GSI and application code are deployed. The script reads retained raw FDA record
objects, chooses the newest archived copy per deterministic recall ID, and is a
dry run unless `--execute` is supplied:

```bash
python scripts/backfill_fda_reported_at.py \
  --bucket <raw-archive-bucket> \
  --table-name <recalls-table> \
  --prefix <reviewed-ingestion-prefix>
```

Review the candidate count and IDs before rerunning with `--execute`. The
script updates only `reported_at`, `reported_sort`, and `updated_at`, verifies
each write, safely reports already-backfilled records on repeat runs, and
reports archived records that have no matching FDA item in DynamoDB without
attempting a write.

## FDA detail-field backfill

After deploying normalization support for `recalling_firm` and
`product_code_info`, existing DynamoDB items can be updated from a reviewed raw
S3 ingestion prefix. The command is a dry run unless `--execute` is supplied:

```bash
python -m scripts.backfill_fda_detail_fields \
  --bucket <raw-archive-bucket> \
  --table-name <recalls-table> \
  --prefix <reviewed-ingestion-prefix>
```

The script derives each existing deterministic recall ID, conditionally updates
only the two detail fields and `updated_at`, verifies each write, and never
deletes records. Review all missing-item, source-mismatch, and failure counts
before using `--execute`.

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

Important AWS environment variables are supplied by Terraform: `EXECUTION_ENVIRONMENT`, `REPOSITORY_BACKEND`, `AWS_REGION`, `DYNAMODB_TABLE_NAME`, `INGESTION_STATE_TABLE_NAME`, `RAW_BUCKET_NAME`, `NORMALIZATION_QUEUE_URL`, and ingestion-window settings. The USDA FSIS schedule is initially disabled so its first complete-history import can be invoked and validated manually before scheduling is enabled in a separately reviewed Terraform change.

## Security and operations

- The S3 bucket is encrypted, versioned, private, and lifecycle-managed.
- Object Lock is intentionally not enabled.
- Ingestion and normalization Lambdas receive no S3 delete permission.
- API Gateway applies configurable default-route rate and burst throttles.
- The public API has no authentication in this milestone.
- CloudWatch alarms have no notification target yet; inspect them in AWS or add an approved notification destination in a later milestone.

## Intentionally not implemented

This milestone does not include authentication, user accounts, pantry/watchlists, notifications, recommendations, retailer integration, a mobile app, payments, barcode scanning, WAF, CloudFront, Kubernetes, Redis, ECS, or EKS. The frontend is local-only and has not been deployed. DynamoDB substring search and numeric offsets use a scan for compatibility at small scale; continuation-token pagination and a dedicated search solution remain future work.
