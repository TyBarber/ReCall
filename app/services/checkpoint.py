from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

import boto3


@dataclass(frozen=True, slots=True)
class IngestionCheckpoint:
    source: str
    last_successful_ingestion_at: datetime
    last_ingestion_id: str
    updated_at: datetime


class DynamoDBCheckpointStore:
    def __init__(self, table: Any) -> None:
        self.table = table

    @classmethod
    def from_resource(cls, *, table_name: str, region_name: str) -> "DynamoDBCheckpointStore":
        return cls(boto3.resource("dynamodb", region_name=region_name).Table(table_name))

    def get(self, source: str) -> IngestionCheckpoint | None:
        item = self.table.get_item(Key={"source": source}, ConsistentRead=True).get("Item")
        if not item:
            return None
        return IngestionCheckpoint(
            source=item["source"],
            last_successful_ingestion_at=datetime.fromisoformat(item["last_successful_ingestion_at"]),
            last_ingestion_id=item["last_ingestion_id"],
            updated_at=datetime.fromisoformat(item["updated_at"]),
        )

    def advance(self, checkpoint: IngestionCheckpoint) -> None:
        self.table.put_item(
            Item={
                "source": checkpoint.source,
                "last_successful_ingestion_at": checkpoint.last_successful_ingestion_at.isoformat(),
                "last_ingestion_id": checkpoint.last_ingestion_id,
                "updated_at": checkpoint.updated_at.isoformat(),
            }
        )
