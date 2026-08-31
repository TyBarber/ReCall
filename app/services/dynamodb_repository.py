from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key

from app.models.recall import Recall, RecallSource
from app.services.repository import UpsertResult


class DynamoDBRecallRepository:
    """DynamoDB adapter; scans preserve Milestone 1 search and offset semantics."""

    def __init__(self, table: Any) -> None:
        self.table = table

    @classmethod
    def from_resource(cls, *, table_name: str, region_name: str) -> "DynamoDBRecallRepository":
        return cls(boto3.resource("dynamodb", region_name=region_name).Table(table_name))

    @staticmethod
    def _to_item(recall: Recall) -> dict[str, Any]:
        item = recall.model_dump(mode="json")
        status = recall.status.strip().lower()
        recall_date = recall.recall_date.isoformat() if recall.recall_date else "0000-00-00"
        item["status_normalized"] = status
        item["source_status"] = f"{recall.source.value}#{status}"
        item["recall_sort"] = f"{recall_date}#{recall.id}"
        return item

    @staticmethod
    def _from_item(item: dict[str, Any]) -> Recall:
        document = {
            key: value
            for key, value in item.items()
            if key not in {"status_normalized", "source_status", "recall_sort"}
        }
        return Recall.model_validate(document)

    def upsert(self, recall: Recall) -> UpsertResult:
        response = self.table.get_item(Key={"id": recall.id}, ConsistentRead=True)
        existing = response.get("Item")
        created = existing is None
        if existing:
            previous = self._from_item(existing)
            recall = recall.model_copy(
                update={"created_at": previous.created_at, "updated_at": datetime.now(timezone.utc)}
            )
        self.table.put_item(Item=self._to_item(recall))
        return UpsertResult(recall=recall, created=created)

    def get(self, recall_id: str) -> Recall | None:
        item = self.table.get_item(Key={"id": recall_id}).get("Item")
        return self._from_item(item) if item else None

    def list(
        self,
        *,
        search: str | None = None,
        source: RecallSource | None = None,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Recall]:
        recalls: list[Recall] = []
        kwargs: dict[str, Any] = {}
        operation = self.table.scan
        if search is None and source is not None and status is not None:
            operation = self.table.query
            kwargs = {
                "IndexName": "source-status-date-index",
                "KeyConditionExpression": Key("source_status").eq(
                    f"{source.value}#{status.casefold()}"
                ),
                "ScanIndexForward": False,
            }
        elif search is None and source is not None:
            operation = self.table.query
            kwargs = {
                "IndexName": "source-recall-date-index",
                "KeyConditionExpression": Key("source").eq(source.value),
                "ScanIndexForward": False,
            }
        while True:
            response = operation(**kwargs)
            recalls.extend(self._from_item(item) for item in response.get("Items", []))
            last_key = response.get("LastEvaluatedKey")
            if not last_key:
                break
            kwargs["ExclusiveStartKey"] = last_key

        search_value = search.casefold() if search else None
        status_value = status.casefold() if status else None
        filtered = [
            recall
            for recall in recalls
            if (source is None or recall.source == source)
            and (status_value is None or recall.status.casefold() == status_value)
            and (search_value is None or search_value in recall.model_dump_json().casefold())
        ]
        filtered.sort(
            key=lambda recall: (recall.recall_date is not None, recall.recall_date, recall.id),
            reverse=True,
        )
        return filtered[offset : offset + limit]
