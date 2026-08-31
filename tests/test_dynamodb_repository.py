from __future__ import annotations

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
        return {"Items": list(self.items.values())}


def test_dynamodb_upsert_is_idempotent(sample_recall) -> None:
    repository = DynamoDBRecallRepository(FakeTable())
    first = repository.upsert(sample_recall)
    second = repository.upsert(sample_recall.model_copy(update={"status": "Completed"}))
    assert first.created is True
    assert second.created is False
    assert repository.get(sample_recall.id).status == "Completed"
    assert second.recall.created_at == sample_recall.created_at


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
