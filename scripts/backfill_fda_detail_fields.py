#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Iterable

import boto3
from boto3.dynamodb.conditions import Attr

from app.ingestion.fda_schemas import FDAEnforcementRecord
from app.ingestion.normalizer import normalize_fda_record
from app.models.recall import RecallSource

_UPDATABLE_FIELDS = ("recalling_firm", "product_code_info")
_UNCHANGED_FIELDS = (
    "id",
    "source",
    "source_recall_id",
    "reported_at",
    "reported_sort",
    "recall_date",
    "classification",
    "status",
)


@dataclass(frozen=True, slots=True)
class DetailFieldCandidate:
    raw_key: str
    recall_id: str
    source_recall_id: str
    recalling_firm: str | None
    product_code_info: str | None


@dataclass(frozen=True, slots=True)
class DiscoveryFailure:
    raw_key: str
    error: str


@dataclass(frozen=True, slots=True)
class DiscoveryResult:
    raw_records_inspected: int
    candidates: list[DetailFieldCandidate]
    failures: list[DiscoveryFailure]


@dataclass(frozen=True, slots=True)
class BackfillResult:
    raw_key: str
    recall_id: str
    source_recall_id: str
    action: str
    fields: tuple[str, ...] = ()
    error: str | None = None


def candidate_from_raw(raw_key: str, raw: dict[str, Any]) -> DetailFieldCandidate:
    record = FDAEnforcementRecord.model_validate(raw)
    recall = normalize_fda_record(record)
    return DetailFieldCandidate(
        raw_key=raw_key,
        recall_id=recall.id,
        source_recall_id=recall.source_recall_id,
        recalling_firm=recall.recalling_firm,
        product_code_info=recall.product_code_info,
    )


def discover_candidates(
    s3_client: Any,
    *,
    bucket: str,
    prefix: str,
) -> DiscoveryResult:
    candidates: list[DetailFieldCandidate] = []
    failures: list[DiscoveryFailure] = []
    inspected = 0
    seen_ids: set[str] = set()
    paginator = s3_client.get_paginator("list_objects_v2")

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for item in page.get("Contents", []):
            key = str(item["Key"])
            if "/records/" not in key or not key.endswith(".json"):
                continue
            inspected += 1
            try:
                response = s3_client.get_object(Bucket=bucket, Key=key)
                candidate = candidate_from_raw(
                    key, json.loads(response["Body"].read())
                )
                if candidate.recall_id in seen_ids:
                    raise ValueError(
                        f"duplicate deterministic recall ID {candidate.recall_id}"
                    )
                seen_ids.add(candidate.recall_id)
                candidates.append(candidate)
            except Exception as error:  # report every malformed archive entry
                failures.append(DiscoveryFailure(raw_key=key, error=str(error)))

    return DiscoveryResult(
        raw_records_inspected=inspected,
        candidates=sorted(candidates, key=lambda candidate: candidate.raw_key),
        failures=failures,
    )


def _fields_requiring_update(
    candidate: DetailFieldCandidate, item: dict[str, Any]
) -> tuple[str, ...]:
    fields: list[str] = []
    for field in _UPDATABLE_FIELDS:
        source_value = getattr(candidate, field)
        if source_value is not None and item.get(field) != source_value:
            fields.append(field)
    return tuple(fields)


def _verify_unchanged(
    before: dict[str, Any], after: dict[str, Any], *, recall_id: str
) -> None:
    for field in _UNCHANGED_FIELDS:
        if before.get(field) != after.get(field):
            raise RuntimeError(
                f"protected field {field} changed for recall {recall_id}"
            )

    allowed = {*_UPDATABLE_FIELDS, "updated_at"}
    before_unrelated = {
        key: value for key, value in before.items() if key not in allowed
    }
    after_unrelated = {
        key: value for key, value in after.items() if key not in allowed
    }
    if before_unrelated != after_unrelated:
        raise RuntimeError(f"unrelated fields changed for recall {recall_id}")


def _update_and_verify(
    candidate: DetailFieldCandidate,
    *,
    table: Any,
    before: dict[str, Any],
    fields: tuple[str, ...],
    updated_at: str,
) -> None:
    names: dict[str, str] = {}
    values: dict[str, Any] = {":updated_at": updated_at}
    assignments: list[str] = []
    for field in fields:
        name_key = f"#{field}"
        value_key = f":{field}"
        names[name_key] = field
        values[value_key] = getattr(candidate, field)
        assignments.append(f"{name_key} = {value_key}")
    assignments.append("updated_at = :updated_at")

    table.update_item(
        Key={"id": candidate.recall_id},
        UpdateExpression=f"SET {', '.join(assignments)}",
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
        ConditionExpression=(
            Attr("id").eq(candidate.recall_id)
            & Attr("source").eq(RecallSource.FDA.value)
            & Attr("source_recall_id").eq(candidate.source_recall_id)
        ),
    )
    after = table.get_item(
        Key={"id": candidate.recall_id}, ConsistentRead=True
    ).get("Item")
    if after is None:
        raise RuntimeError(f"updated recall {candidate.recall_id} is missing")
    for field in fields:
        if after.get(field) != getattr(candidate, field):
            raise RuntimeError(
                f"field {field} could not be verified for {candidate.recall_id}"
            )
    _verify_unchanged(before, after, recall_id=candidate.recall_id)


def backfill_candidates(
    candidates: Iterable[DetailFieldCandidate],
    *,
    table: Any,
    execute: bool,
    now: datetime | None = None,
) -> list[BackfillResult]:
    results: list[BackfillResult] = []
    updated_at = (now or datetime.now(timezone.utc)).isoformat()

    for candidate in candidates:
        try:
            item = table.get_item(
                Key={"id": candidate.recall_id}, ConsistentRead=True
            ).get("Item")
            if item is None:
                results.append(_result(candidate, action="missing_normalized_item"))
                continue
            if (
                item.get("id") != candidate.recall_id
                or item.get("source") != RecallSource.FDA.value
                or item.get("source_recall_id") != candidate.source_recall_id
            ):
                results.append(_result(candidate, action="source_mismatch"))
                continue

            fields = _fields_requiring_update(candidate, item)
            if not fields:
                results.append(_result(candidate, action="already_correct"))
                continue
            if not execute:
                results.append(
                    _result(candidate, action="would_update", fields=fields)
                )
                continue

            _update_and_verify(
                candidate,
                table=table,
                before=item,
                fields=fields,
                updated_at=updated_at,
            )
            results.append(_result(candidate, action="updated", fields=fields))
        except Exception as error:  # continue auditing remaining records
            results.append(
                _result(candidate, action="failed", error=str(error))
            )
    return results


def _result(
    candidate: DetailFieldCandidate,
    *,
    action: str,
    fields: tuple[str, ...] = (),
    error: str | None = None,
) -> BackfillResult:
    return BackfillResult(
        raw_key=candidate.raw_key,
        recall_id=candidate.recall_id,
        source_recall_id=candidate.source_recall_id,
        action=action,
        fields=fields,
        error=error,
    )


def report(
    discovery: DiscoveryResult, results: list[BackfillResult], *, execute: bool
) -> dict[str, Any]:
    actions = Counter(result.action for result in results)
    failures = [
        asdict(result) for result in results if result.action == "failed"
    ] + [asdict(failure) for failure in discovery.failures]
    issues = [
        asdict(result)
        for result in results
        if result.action in {"missing_normalized_item", "source_mismatch"}
    ]
    changes = [
        asdict(result)
        for result in results
        if result.action in {"would_update", "updated"}
    ]
    return {
        "mode": "execute" if execute else "dry-run",
        "raw_records_inspected": discovery.raw_records_inspected,
        "deterministic_ids_resolved": len(discovery.candidates),
        "ids_changed": 0,
        "requiring_recalling_firm_update": sum(
            "recalling_firm" in result.fields for result in results
        ),
        "requiring_product_code_info_update": sum(
            "product_code_info" in result.fields for result in results
        ),
        "already_correct": actions["already_correct"],
        "missing_normalized_items": actions["missing_normalized_item"],
        "source_mismatches": actions["source_mismatch"],
        "writes_verified": actions["updated"],
        "failures": len(failures),
        "actions": dict(sorted(actions.items())),
        "changes": changes,
        "issues": issues,
        "failure_details": failures,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Backfill FDA recalling_firm and product_code_info from retained raw "
            "S3 records. Runs without writes unless --execute is supplied."
        )
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
        help="Apply and verify field-only updates. The default is a dry run.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    session = boto3.session.Session(region_name=args.region)
    table = session.resource("dynamodb").Table(args.table_name)
    discovery = discover_candidates(
        session.client("s3"), bucket=args.bucket, prefix=args.prefix
    )
    results = backfill_candidates(
        discovery.candidates, table=table, execute=args.execute
    )
    payload = report(discovery, results, execute=args.execute)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 1 if payload["failures"] or payload["issues"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
