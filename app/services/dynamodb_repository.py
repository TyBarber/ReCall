from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key

from app.models.recall import Recall, RecallRecordType, RecallSort, RecallSource
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
        if recall.reported_at:
            item["reported_sort"] = f"{recall.reported_at.isoformat()}#{recall.id}"
        return item

    @staticmethod
    def _from_item(item: dict[str, Any]) -> Recall:
        document = {
            key: value
            for key, value in item.items()
            if key
            not in {
                "status_normalized",
                "source_status",
                "recall_sort",
                "reported_sort",
            }
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

    def _newest_by_source(
        self,
        *,
        source: RecallSource,
        status: str | None,
        record_type: RecallRecordType | None,
        limit: int,
        offset: int,
    ) -> list[Recall]:
        target_count = offset + limit
        recalls: list[Recall] = []
        kwargs: dict[str, Any] = {
            "IndexName": "source-reported-date-index",
            "KeyConditionExpression": Key("source").eq(source.value),
            "ScanIndexForward": False,
            "Limit": target_count,
        }
        while len(recalls) < target_count:
            response = self.table.query(**kwargs)
            for item in response.get("Items", []):
                recall = self._from_item(item)
                if status is not None and recall.status.casefold() != status.casefold():
                    continue
                if record_type is not None and recall.record_type != record_type:
                    continue
                recalls.append(recall)
            last_key = response.get("LastEvaluatedKey")
            if not last_key:
                break
            kwargs["ExclusiveStartKey"] = last_key
            kwargs["Limit"] = target_count - len(recalls)
        return recalls[offset:target_count]

    def _matching_recalls(
        self,
        *,
        search: str | None = None,
        source: RecallSource | None = None,
        status: str | None = None,
        record_type: RecallRecordType | None = None,
        sort: RecallSort | None = None,
    ) -> list[Recall]:
        recalls: list[Recall] = []
        kwargs: dict[str, Any] = {}
        operation = self.table.scan
        if search is None and source is not None and sort == RecallSort.NEWEST:
            operation = self.table.query
            kwargs = {
                "IndexName": "source-reported-date-index",
                "KeyConditionExpression": Key("source").eq(source.value),
                "ScanIndexForward": False,
            }
        elif search is None and source is not None and status is not None:
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
            and (record_type is None or recall.record_type == record_type)
            and (search_value is None or search_value in recall.model_dump_json().casefold())
        ]
        date_field = (
            (lambda recall: recall.reported_at)
            if sort == RecallSort.NEWEST
            else (lambda recall: recall.recall_date)
        )
        filtered.sort(
            key=lambda recall: (
                date_field(recall) is not None,
                date_field(recall),
                recall.id,
            ),
            reverse=True,
        )
        return filtered

    def count(
        self,
        *,
        search: str | None = None,
        source: RecallSource | None = None,
        status: str | None = None,
        record_type: RecallRecordType | None = None,
    ) -> int:
        return len(
            self._matching_recalls(
                search=search,
                source=source,
                status=status,
                record_type=record_type,
            )
        )

    def list(
        self,
        *,
        search: str | None = None,
        source: RecallSource | None = None,
        status: str | None = None,
        record_type: RecallRecordType | None = None,
        sort: RecallSort | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Recall]:
        if (
            sort == RecallSort.NEWEST
            and search is None
            and source is not None
        ):
            return self._newest_by_source(
                source=source,
                status=status,
                record_type=record_type,
                limit=limit,
                offset=offset,
            )
        filtered = self._matching_recalls(
            search=search,
            source=source,
            status=status,
            record_type=record_type,
            sort=sort,
        )
        return filtered[offset : offset + limit]
