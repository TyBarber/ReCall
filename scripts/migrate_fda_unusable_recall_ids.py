#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Iterable

import boto3
from boto3.dynamodb.conditions import Attr

from app.ingestion.fda_schemas import FDAEnforcementRecord
from app.ingestion.normalizer import (
    is_usable_fda_recall_number,
    legacy_fda_recall_id,
    normalize_fda_record,
)
from app.models.recall import Recall, RecallSource
from app.services.dynamodb_repository import DynamoDBRecallRepository


@dataclass(frozen=True, slots=True)
class MigrationCandidate:
    raw_key: str
    recall: Recall
    legacy_id: str
    archived_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class MigrationResult:
    raw_key: str
    source_recall_id: str
    legacy_id: str
    corrected_id: str
    action: str


def candidate_from_raw(
    raw_key: str,
    raw: dict[str, Any],
    *,
    archived_at: datetime | None = None,
    now: datetime | None = None,
) -> MigrationCandidate:
    record = FDAEnforcementRecord.model_validate(raw)
    if is_usable_fda_recall_number(record.recall_number):
        raise ValueError(f"{raw_key} has a usable FDA recall_number")
    recall = normalize_fda_record(record, now=now)
    legacy_id = legacy_fda_recall_id(record.recall_number)
    if recall.id == legacy_id:
        raise ValueError(f"{raw_key} did not resolve to a corrected fallback ID")
    return MigrationCandidate(
        raw_key=raw_key,
        recall=recall,
        legacy_id=legacy_id,
        archived_at=archived_at,
    )


def discover_candidates(
    s3_client: Any,
    *,
    bucket: str,
    prefix: str,
    now: datetime | None = None,
) -> list[MigrationCandidate]:
    """Return the newest archived copy of each unusable-ID FDA record."""
    candidates: dict[str, MigrationCandidate] = {}
    paginator = s3_client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for item in page.get("Contents", []):
            key = str(item["Key"])
            if "/records/" not in key or not key.endswith(".json"):
                continue
            response = s3_client.get_object(Bucket=bucket, Key=key)
            raw = json.loads(response["Body"].read())
            record = FDAEnforcementRecord.model_validate(raw)
            if is_usable_fda_recall_number(record.recall_number):
                continue
            candidate = candidate_from_raw(
                key,
                raw,
                archived_at=item.get("LastModified"),
                now=now,
            )
            existing = candidates.get(candidate.recall.id)
            if existing is None or _archive_order(candidate) > _archive_order(existing):
                candidates[candidate.recall.id] = candidate
    return sorted(candidates.values(), key=lambda candidate: candidate.raw_key)


def _archive_order(candidate: MigrationCandidate) -> tuple[datetime, str]:
    archived_at = candidate.archived_at or datetime.min.replace(tzinfo=timezone.utc)
    return archived_at, candidate.raw_key


def migrate_candidates(
    candidates: Iterable[MigrationCandidate],
    *,
    repository: DynamoDBRecallRepository,
    table: Any,
    execute: bool,
    now: datetime | None = None,
) -> list[MigrationResult]:
    grouped: dict[str, list[MigrationCandidate]] = defaultdict(list)
    for candidate in candidates:
        grouped[candidate.legacy_id].append(candidate)

    results: list[MigrationResult] = []
    migration_time = now or datetime.now(timezone.utc)
    for legacy_id, group in sorted(grouped.items()):
        legacy = repository.get(legacy_id)
        existing_corrected = {
            candidate.recall.id: repository.get(candidate.recall.id)
            for candidate in group
        }
        if legacy is None:
            missing = [
                candidate.recall.id
                for candidate in group
                if existing_corrected[candidate.recall.id] is None
            ]
            if missing:
                raise RuntimeError(
                    f"legacy item {legacy_id} is missing before corrected items exist: {missing}"
                )
            results.extend(
                _result(candidate, action="already_migrated") for candidate in group
            )
            continue
        if legacy.source != RecallSource.FDA or is_usable_fda_recall_number(
            legacy.source_recall_id
        ):
            raise RuntimeError(f"legacy item {legacy_id} is not an unusable-ID FDA recall")

        if not execute:
            results.extend(_result(candidate, action="would_migrate") for candidate in group)
            continue

        for candidate in group:
            corrected = candidate.recall
            if existing_corrected[corrected.id] is None:
                corrected = corrected.model_copy(
                    update={
                        "created_at": legacy.created_at,
                        "updated_at": migration_time,
                    }
                )
            repository.upsert(corrected)
            verified = repository.get(corrected.id)
            if verified is None or verified.source_recall_id != corrected.source_recall_id:
                raise RuntimeError(f"corrected item {corrected.id} could not be verified")

        table.delete_item(
            Key={"id": legacy_id},
            ConditionExpression=(
                Attr("id").eq(legacy_id)
                & Attr("source").eq(RecallSource.FDA.value)
                & Attr("source_recall_id").eq(legacy.source_recall_id)
            ),
        )
        results.extend(_result(candidate, action="migrated") for candidate in group)
    return results


def _result(candidate: MigrationCandidate, *, action: str) -> MigrationResult:
    return MigrationResult(
        raw_key=candidate.raw_key,
        source_recall_id=candidate.recall.source_recall_id,
        legacy_id=candidate.legacy_id,
        corrected_id=candidate.recall.id,
        action=action,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate only FDA recalls whose recall_number is blank or N/A."
    )
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--table-name", required=True)
    parser.add_argument("--prefix", required=True)
    parser.add_argument(
        "--region",
        default=os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Write corrected items and conditionally delete verified legacy items.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    session = boto3.session.Session(region_name=args.region)
    table = session.resource("dynamodb").Table(args.table_name)
    repository = DynamoDBRecallRepository(table)
    candidates = discover_candidates(
        session.client("s3"),
        bucket=args.bucket,
        prefix=args.prefix,
    )
    results = migrate_candidates(
        candidates,
        repository=repository,
        table=table,
        execute=args.execute,
    )
    actions = Counter(result.action for result in results)
    print(
        json.dumps(
            {
                "mode": "execute" if args.execute else "dry-run",
                "candidate_count": len(candidates),
                "actions": dict(sorted(actions.items())),
                "items": [asdict(result) for result in results],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
