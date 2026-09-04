from __future__ import annotations

from datetime import datetime, timezone

from app.ingestion.fda_schemas import FDAEnforcementRecord
from app.ingestion.normalizer import normalize_fda_record
from app.services.dynamodb_repository import DynamoDBRecallRepository
from scripts.backfill_fda_reported_at import (
    backfill_candidates,
    candidate_from_raw,
)


RAW_RECORD = {
    "recall_number": "H-1237-2026",
    "event_id": "99454",
    "product_description": "KC Everyday Mac & Cheese",
    "reason_for_recall": "Undeclared allergen (egg)",
    "status": "Ongoing",
    "classification": "Class I",
    "recalling_firm": "Kerry, Inc",
    "recall_initiation_date": "20260729",
    "report_date": "20260819",
    "code_info": "Lot ABC-123",
}


class FakeTable:
    def __init__(self, item: dict) -> None:
        self.items = {item["id"]: item}
        self.update_calls: list[dict] = []

    def get_item(self, *, Key, **kwargs):
        item = self.items.get(Key["id"])
        return {"Item": item} if item else {}

    def update_item(self, *, Key, ExpressionAttributeValues, **kwargs):
        self.update_calls.append(
            {"Key": Key, "ExpressionAttributeValues": ExpressionAttributeValues}
        )
        self.items[Key["id"]].update(
            {
                "reported_at": ExpressionAttributeValues[":reported_at"],
                "reported_sort": ExpressionAttributeValues[":reported_sort"],
                "updated_at": ExpressionAttributeValues[":updated_at"],
            }
        )
        return {}


def legacy_item() -> dict:
    recall = normalize_fda_record(FDAEnforcementRecord.model_validate(RAW_RECORD))
    item = DynamoDBRecallRepository._to_item(recall)
    item.pop("reported_at")
    item.pop("reported_sort")
    item["existing_field"] = "preserved"
    return item


def test_reported_at_backfill_is_dry_run_by_default_and_idempotent() -> None:
    candidate = candidate_from_raw("archive/records/record.json", RAW_RECORD)
    table = FakeTable(legacy_item())
    timestamp = datetime(2026, 9, 2, tzinfo=timezone.utc)

    dry_run = backfill_candidates(
        [candidate], table=table, execute=False, now=timestamp
    )

    assert dry_run[0].action == "would_backfill"
    assert table.update_calls == []
    assert "reported_at" not in table.items[candidate.recall_id]

    executed = backfill_candidates(
        [candidate], table=table, execute=True, now=timestamp
    )

    assert executed[0].action == "backfilled"
    assert table.items[candidate.recall_id]["reported_at"] == "2026-08-19"
    assert table.items[candidate.recall_id]["reported_sort"] == (
        f"2026-08-19#{candidate.recall_id}"
    )
    assert table.items[candidate.recall_id]["existing_field"] == "preserved"
    assert len(table.update_calls) == 1

    repeated = backfill_candidates(
        [candidate], table=table, execute=True, now=timestamp
    )

    assert repeated[0].action == "already_backfilled"
    assert len(table.update_calls) == 1


def test_backfill_candidate_preserves_existing_recall_id() -> None:
    candidate = candidate_from_raw("archive/records/record.json", RAW_RECORD)

    assert candidate.recall_id == "9111d5c1-d82d-5052-9161-f8b32d481860"
    assert candidate.reported_at.isoformat() == "2026-08-19"


def test_backfill_reports_missing_and_mismatched_normalized_items() -> None:
    candidate = candidate_from_raw("archive/records/record.json", RAW_RECORD)
    missing_table = FakeTable(legacy_item())
    missing_table.items.clear()

    missing = backfill_candidates(
        [candidate], table=missing_table, execute=True
    )

    mismatched_item = legacy_item()
    mismatched_item["source"] = "other"
    mismatched_table = FakeTable(mismatched_item)
    mismatched = backfill_candidates(
        [candidate], table=mismatched_table, execute=True
    )

    assert missing[0].action == "missing_normalized_item"
    assert missing_table.update_calls == []
    assert mismatched[0].action == "source_mismatch"
    assert mismatched_table.update_calls == []
