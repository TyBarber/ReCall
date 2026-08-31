from __future__ import annotations

from datetime import datetime, timezone

from app.services.dynamodb_repository import DynamoDBRecallRepository
from scripts.migrate_fda_unusable_recall_ids import (
    candidate_from_raw,
    migrate_candidates,
)


RAW_RECORD = {
    "recall_number": "",
    "event_id": "99453",
    "product_description": "MARKON BLEND LETT/ROM 80/20",
    "reason_for_recall": "Potential Cyclospora contamination",
    "status": "Ongoing",
    "classification": "Not Yet Classified",
    "recalling_firm": "Taylor Farms de Mexico",
    "report_date": "20260819",
    "code_info": "TFMX183A05 7/21/2026",
}


class FakeTable:
    def __init__(self) -> None:
        self.items: dict[str, dict] = {}
        self.mutations: list[tuple[str, str]] = []

    def get_item(self, *, Key, **kwargs):
        item = self.items.get(Key["id"])
        return {"Item": item} if item else {}

    def put_item(self, *, Item):
        self.mutations.append(("put", Item["id"]))
        self.items[Item["id"]] = Item
        return {}

    def delete_item(self, *, Key, **kwargs):
        self.mutations.append(("delete", Key["id"]))
        self.items.pop(Key["id"], None)
        return {}


def test_migration_writes_before_delete_and_is_idempotent() -> None:
    timestamp = datetime(2026, 8, 30, tzinfo=timezone.utc)
    candidate = candidate_from_raw("raw.json", RAW_RECORD, now=timestamp)
    table = FakeTable()
    repository = DynamoDBRecallRepository(table)
    legacy = candidate.recall.model_copy(update={"id": candidate.legacy_id})
    repository.upsert(legacy)
    table.mutations.clear()

    first = migrate_candidates(
        [candidate],
        repository=repository,
        table=table,
        execute=True,
        now=timestamp,
    )

    assert first[0].action == "migrated"
    assert repository.get(candidate.recall.id) is not None
    assert repository.get(candidate.legacy_id) is None
    assert table.mutations[-1] == ("delete", candidate.legacy_id)
    assert ("put", candidate.recall.id) in table.mutations[:-1]

    table.mutations.clear()
    second = migrate_candidates(
        [candidate],
        repository=repository,
        table=table,
        execute=True,
        now=timestamp,
    )

    assert second[0].action == "already_migrated"
    assert table.mutations == []


def test_migration_defaults_to_a_non_mutating_plan() -> None:
    candidate = candidate_from_raw("raw.json", RAW_RECORD)
    table = FakeTable()
    repository = DynamoDBRecallRepository(table)
    legacy = candidate.recall.model_copy(update={"id": candidate.legacy_id})
    repository.upsert(legacy)
    table.mutations.clear()

    result = migrate_candidates(
        [candidate], repository=repository, table=table, execute=False
    )

    assert result[0].action == "would_migrate"
    assert table.mutations == []
    assert repository.get(candidate.legacy_id) is not None
    assert repository.get(candidate.recall.id) is None
