from __future__ import annotations

from datetime import date

from app.models.recall import RecallSort
from app.services.dynamodb_repository import DynamoDBRecallRepository


class FakeTable:
    def __init__(self) -> None:
        self.items: dict[str, dict] = {}
        self.query_calls = []

    def get_item(self, *, Key, **kwargs):
        item = self.items.get(Key["id"])
        return {"Item": item} if item else {}

    def put_item(self, *, Item):
        self.items[Item["id"]] = Item
        return {}

    def scan(self, **kwargs):
        return {"Items": list(self.items.values())}

    def query(self, **kwargs):
        self.query_calls.append(kwargs)
        items = list(self.items.values())
        index_name = kwargs.get("IndexName")
        if index_name == "source-reported-date-index":
            items = [item for item in items if "reported_sort" in item]
            items.sort(
                key=lambda item: item["reported_sort"],
                reverse=not kwargs.get("ScanIndexForward", True),
            )
        limit = kwargs.get("Limit")
        return {"Items": items[:limit] if limit else items}


def test_dynamodb_upsert_is_idempotent(sample_recall) -> None:
    table = FakeTable()
    repository = DynamoDBRecallRepository(table)
    first = repository.upsert(sample_recall)
    second = repository.upsert(sample_recall.model_copy(update={"status": "Completed"}))
    assert first.created is True
    assert second.created is False
    assert repository.get(sample_recall.id).status == "Completed"
    assert second.recall.created_at == sample_recall.created_at
    assert table.items[sample_recall.id]["reported_at"] == "2025-01-03"
    assert table.items[sample_recall.id]["reported_sort"] == (
        f"2025-01-03#{sample_recall.id}"
    )


def test_dynamodb_list_filters_and_paginates(sample_recall) -> None:
    table = FakeTable()
    repository = DynamoDBRecallRepository(table)
    repository.upsert(sample_recall)
    repository.upsert(
        sample_recall.model_copy(
            update={"id": "recall-2", "source_recall_id": "F-2", "product_name": "Cookies"}
        )
    )
    assert [item.product_name for item in repository.list(search="cookies")] == ["Cookies"]
    assert len(repository.list(status="ongoing", limit=1, offset=1)) == 1
    assert len(repository.list(source=sample_recall.source, status="ongoing")) == 2
    assert table.query_calls[-1]["IndexName"] == "source-status-date-index"
    assert repository.count(search="cookies") == 1
    assert repository.count(source=sample_recall.source, status="ongoing") == 2


def test_dynamodb_newest_uses_reported_date_and_new_gsi(sample_recall) -> None:
    table = FakeTable()
    repository = DynamoDBRecallRepository(table)
    initiated_later = sample_recall.model_copy(
        update={
            "id": "initiated-later",
            "source_recall_id": "F-2",
            "recall_date": date(2025, 2, 1),
            "reported_at": date(2025, 2, 10),
        }
    )
    reported_later = sample_recall.model_copy(
        update={
            "id": "reported-later",
            "source_recall_id": "F-3",
            "recall_date": date(2024, 12, 1),
            "reported_at": date(2025, 3, 1),
        }
    )
    repository.upsert(initiated_later)
    repository.upsert(reported_later)

    default_order = repository.list(source=sample_recall.source)
    newest = repository.list(
        source=sample_recall.source, sort=RecallSort.NEWEST, limit=2
    )

    assert [recall.id for recall in default_order] == [
        "initiated-later",
        "reported-later",
    ]
    assert [recall.id for recall in newest] == ["reported-later", "initiated-later"]
    assert table.query_calls[-1]["IndexName"] == "source-reported-date-index"
    assert table.query_calls[-1]["ScanIndexForward"] is False
    assert table.query_calls[-1]["Limit"] == 2
