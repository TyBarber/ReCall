#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
from typing import Any, Iterable

import boto3
from boto3.dynamodb.conditions import Attr

from app.ingestion.fda_schemas import FDAEnforcementRecord
from app.ingestion.normalizer import normalize_fda_record
from app.models.recall import RecallSource


@dataclass(frozen=True, slots=True)
class ReportedAtCandidate:
    raw_key: str
    recall_id: str
    source_recall_id: str
    reported_at: date
    archived_at: datetime | None = None

    @property
    def reported_sort(self) -> str:
        return f"{self.reported_at.isoformat()}#{self.recall_id}"


@dataclass(frozen=True, slots=True)
class BackfillResult:
    raw_key: str
    recall_id: str
    source_recall_id: str
    reported_at: str
    reported_sort: str
    action: str


def candidate_from_raw(
    raw_key: str,
    raw: dict[str, Any],
    *,
    archived_at: datetime | None = None,
) -> ReportedAtCandidate:
    record = FDAEnforcementRecord.model_validate(raw)
    recall = normalize_fda_record(record)
    if recall.reported_at is None:
        raise ValueError(f"{raw_key} does not contain an FDA report_date")
    return ReportedAtCandidate(
        raw_key=raw_key,
        recall_id=recall.id,
        source_recall_id=recall.source_recall_id,
        reported_at=recall.reported_at,
        archived_at=archived_at,
    )


def discover_candidates(
    s3_client: Any,
    *,
    bucket: str,
    prefix: str,
) -> list[ReportedAtCandidate]:
    """Return the newest archived FDA source record for each normalized ID."""
    candidates: dict[str, ReportedAtCandidate] = {}
    paginator = s3_client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for item in page.get("Contents", []):
            key = str(item["Key"])
            if "/records/" not in key or not key.endswith(".json"):
                continue
            response = s3_client.get_object(Bucket=bucket, Key=key)
            candidate = candidate_from_raw(
                key,
                json.loads(response["Body"].read()),
                archived_at=item.get("LastModified"),
            )
            previous = candidates.get(candidate.recall_id)
            if previous is None or _archive_order(candidate) > _archive_order(previous):
                candidates[candidate.recall_id] = candidate
    return sorted(candidates.values(), key=lambda candidate: candidate.raw_key)


def _archive_order(candidate: ReportedAtCandidate) -> tuple[datetime, str]:
    archived_at = candidate.archived_at or datetime.min.replace(tzinfo=timezone.utc)
    return archived_at, candidate.raw_key


def backfill_candidates(
    candidates: Iterable[ReportedAtCandidate],
    *,
    table: Any,
    execute: bool,
    now: datetime | None = None,
) -> list[BackfillResult]:
    results: list[BackfillResult] = []
    updated_at = (now or datetime.now(timezone.utc)).isoformat()

    for candidate in candidates:
        response = table.get_item(
            Key={"id": candidate.recall_id}, ConsistentRead=True
        )
        item = response.get("Item")
        if item is None:
            results.append(_result(candidate, action="missing_normalized_item"))
            continue
        if item.get("source") != RecallSource.FDA.value:
            results.append(_result(candidate, action="source_mismatch"))
            continue

        reported_at = candidate.reported_at.isoformat()
        if (
            item.get("reported_at") == reported_at
            and item.get("reported_sort") == candidate.reported_sort
        ):
            results.append(_result(candidate, action="already_backfilled"))
            continue

        if not execute:
            results.append(_result(candidate, action="would_backfill"))
            continue

        table.update_item(
            Key={"id": candidate.recall_id},
            UpdateExpression=(
                "SET reported_at = :reported_at, "
                "reported_sort = :reported_sort, updated_at = :updated_at"
            ),
            ExpressionAttributeValues={
                ":reported_at": reported_at,
                ":reported_sort": candidate.reported_sort,
                ":updated_at": updated_at,
            },
            ConditionExpression=(
                Attr("id").exists() & Attr("source").eq(RecallSource.FDA.value)
            ),
        )
        verified = table.get_item(
            Key={"id": candidate.recall_id}, ConsistentRead=True
        ).get("Item")
        if (
            verified is None
            or verified.get("reported_at") != reported_at
            or verified.get("reported_sort") != candidate.reported_sort
        ):
            raise RuntimeError(
                f"reported_at backfill could not be verified for {candidate.recall_id}"
            )
        results.append(_result(candidate, action="backfilled"))
    return results


def _result(candidate: ReportedAtCandidate, *, action: str) -> BackfillResult:
    return BackfillResult(
        raw_key=candidate.raw_key,
        recall_id=candidate.recall_id,
        source_recall_id=candidate.source_recall_id,
        reported_at=candidate.reported_at.isoformat(),
        reported_sort=candidate.reported_sort,
        action=action,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill FDA reported_at and reported_sort from retained raw S3 records."
    )
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--table-name", required=True)
    parser.add_argument("--prefix", required=True)
    parser.add_argument(
        "--region",
        default=os.getenv("AWS_REGION")
        or os.getenv("AWS_DEFAULT_REGION")
        or "us-east-1",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Apply the planned field-only updates. The default is a dry run.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    session = boto3.session.Session(region_name=args.region)
    table = session.resource("dynamodb").Table(args.table_name)
    candidates = discover_candidates(
        session.client("s3"), bucket=args.bucket, prefix=args.prefix
    )
    results = backfill_candidates(candidates, table=table, execute=args.execute)
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
    issue_actions = {"missing_normalized_item", "source_mismatch"}
    return 1 if any(action in actions for action in issue_actions) else 0


if __name__ == "__main__":
    raise SystemExit(main())
