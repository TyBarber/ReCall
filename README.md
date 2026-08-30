# Recall Tracker — Milestone 1

A production-oriented foundation for ingesting official U.S. food recalls and exposing normalized recall data through a small HTTP API.

## What works

- Paginated ingestion from the openFDA food enforcement API
- Separate validation models for FDA payloads and internal recall records
- Raw FDA JSON stored separately from normalized recall records
- Conservative extraction of UPC and lot numbers
- Idempotent upserts keyed by source and source recall ID
- Replaceable repository interface with a local SQLite implementation
- `GET /health`, `GET /recalls`, and `GET /recalls/{id}`
- Search, source/status filtering, limit, and offset pagination
- Tests for normalization, malformed records, duplicates, API behavior, filtering, and pagination

## Local setup

Python 3.12 is required.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
```

Ingest up to 1,000 current FDA records into `data/recalls.db`:

```bash
python scripts/ingest_fda.py --max-records 1000
```

Run the API:

```bash
uvicorn app.main:app --reload
```

Examples:

```bash
curl 'http://127.0.0.1:8000/health'
curl 'http://127.0.0.1:8000/recalls?search=salmonella&status=ongoing&limit=20&offset=0'
```

Set `RECALL_DATABASE_PATH` to use a different SQLite file and `LOG_LEVEL` to change logging verbosity.

## Tests

```bash
pytest
```

Tests use temporary SQLite databases and do not call openFDA.

## Intentionally not implemented

This milestone does not include AWS or Terraform resources, authentication, a frontend, pantry/watchlists, alert delivery, or substitute-product recommendations. The Terraform directory is only a placeholder. SQLite is temporary; the repository boundary is intended to support a future DynamoDB adapter without coupling the API or ingestion pipeline to that choice.

