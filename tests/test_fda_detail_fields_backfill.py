from __future__ import annotations

from datetime import datetime, timezone

from app.ingestion.fda_schemas import FDAEnforcementRecord
from app.ingestion.normalizer import normalize_fda_record
from app.services.dynamodb_repository import DynamoDBRecallRepository
from scripts.backfill_fda_detail_fields import (
    DetailFieldCandidate,
    DiscoveryResult,
    backfill_candidates,
    candidate_from_raw,
    report,
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
    "code_info": "Lot ABC-123; UPC 123456789012",
}


class FakeTable:
    def __init__(self, item: dict) -> None:
        self.items = {item["id"]: item}
        self.update_calls: list[dict] = []

    def get_item(self, *, Key, **kwargs):
        item = self.items.get(Key["id"])
        return {"Item": dict(item)} if item else {}

    def update_item(
        self,
        *,
        Key,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        **kwargs,
    ):
        self.update_calls.append(
            {
                "Key": Key,
                "names": ExpressionAttributeNames,
                "values": ExpressionAttributeValues,
            }
        )
        item = self.items[Key["id"]]
        for name_key, field in ExpressionAttributeNames.items():
            item[field] = ExpressionAttributeValues[f":{name_key[1:]}"]
        item["updated_at"] = ExpressionAttributeValues[":updated_at"]
        return {}


def legacy_item() -> dict:
    recall = normalize_fda_record(FDAEnforcementRecord.model_validate(RAW_RECORD))
    item = DynamoDBRecallRepository._to_item(recall)
    item.pop("recalling_firm")
    item.pop("product_code_info")
    item["unrelated_field"] = "preserve-me"
    return item


def test_detail_field_backfill_is_dry_run_first_verified_and_idempotent() -> None:
    candidate = candidate_from_raw("archive/records/record.json", RAW_RECORD)
    table = FakeTable(legacy_item())
    timestamp = datetime(2026, 9, 4, tzinfo=timezone.utc)

    dry_run = backfill_candidates(
        [candidate], table=table, execute=False, now=timestamp
    )
    assert dry_run[0].action == "would_update"
    assert dry_run[0].fields == ("recalling_firm", "product_code_info")
    assert table.update_calls == []

    executed = backfill_candidates(
        [candidate], table=table, execute=True, now=timestamp
    )
    assert executed[0].action == "updated"
    assert table.items[candidate.recall_id]["recalling_firm"] == "Kerry, Inc"
    assert table.items[candidate.recall_id]["product_code_info"] == RAW_RECORD[
        "code_info"
    ]
    assert table.items[candidate.recall_id]["unrelated_field"] == "preserve-me"
    assert table.items[candidate.recall_id]["reported_at"] == "2026-08-19"
    assert table.items[candidate.recall_id]["reported_sort"] == (
        f"2026-08-19#{candidate.recall_id}"
    )
    assert len(table.update_calls) == 1

    repeated = backfill_candidates(
        [candidate], table=table, execute=True, now=timestamp
    )
    assert repeated[0].action == "already_correct"
    assert len(table.update_calls) == 1


def test_candidate_preserves_identity_and_maps_source_fields() -> None:
    candidate = candidate_from_raw("archive/records/record.json", RAW_RECORD)

    assert candidate.recall_id == "9111d5c1-d82d-5052-9161-f8b32d481860"
    assert candidate.recalling_firm == "Kerry, Inc"
    assert candidate.product_code_info == RAW_RECORD["code_info"]


def test_backfill_reports_missing_and_source_mismatch_without_writes() -> None:
    candidate = candidate_from_raw("archive/records/record.json", RAW_RECORD)
    missing_table = FakeTable(legacy_item())
    missing_table.items.clear()
    mismatch = legacy_item()
    mismatch["source_recall_id"] = "different"
    mismatch_table = FakeTable(mismatch)

    missing = backfill_candidates(
        [candidate], table=missing_table, execute=True
    )
    mismatched = backfill_candidates(
        [candidate], table=mismatch_table, execute=True
    )

    assert missing[0].action == "missing_normalized_item"
    assert mismatched[0].action == "source_mismatch"
    assert missing_table.update_calls == []
    assert mismatch_table.update_calls == []


def test_report_exposes_required_audit_counts() -> None:
    candidate = DetailFieldCandidate(
        raw_key="raw.json",
        recall_id="recall-1",
        source_recall_id="F-1",
        recalling_firm="Firm",
        product_code_info="Lot 1",
    )
    discovery = DiscoveryResult(
        raw_records_inspected=1, candidates=[candidate], failures=[]
    )
    results = backfill_candidates(
        [candidate], table=FakeTable({"id": "missing"}), execute=False
    )

    payload = report(discovery, results, execute=False)

    assert payload["raw_records_inspected"] == 1
    assert payload["deterministic_ids_resolved"] == 1
    assert payload["ids_changed"] == 0
    assert payload["missing_normalized_items"] == 1
