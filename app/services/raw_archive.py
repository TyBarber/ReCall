from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from urllib.parse import quote


class S3RawArchive:
    def __init__(self, client: Any, bucket: str) -> None:
        self.client = client
        self.bucket = bucket

    @staticmethod
    def prefix(source: str, ingestion_id: str, fetched_at: datetime) -> str:
        return (
            f"source={source}/date={fetched_at.date().isoformat()}/"
            f"ingestion_id={ingestion_id}"
        )

    def _put(self, key: str, payload: Any) -> str | None:
        response = self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=json.dumps(payload, separators=(",", ":")).encode(),
            ContentType="application/json",
            ServerSideEncryption="AES256",
        )
        etag = response.get("ETag")
        return etag.strip('"') if etag else None

    def archive_page(
        self,
        *,
        source: str,
        ingestion_id: str,
        fetched_at: datetime,
        page_number: int,
        payload: Any,
    ) -> str:
        key = f"{self.prefix(source, ingestion_id, fetched_at)}/pages/page-{page_number:04d}.json"
        self._put(key, payload)
        return key

    def archive_record(
        self,
        *,
        source: str,
        ingestion_id: str,
        fetched_at: datetime,
        source_recall_id: str,
        record_number: int,
        payload: dict[str, Any],
    ) -> tuple[str, str | None]:
        safe_id = quote(source_recall_id, safe="")
        key = (
            f"{self.prefix(source, ingestion_id, fetched_at)}/records/"
            f"{record_number:06d}-{safe_id}.json"
        )
        return key, self._put(key, payload)

    def archive_manifest(
        self,
        *,
        source: str,
        ingestion_id: str,
        fetched_at: datetime,
        payload: dict[str, Any],
    ) -> str:
        key = f"{self.prefix(source, ingestion_id, fetched_at)}/manifest.json"
        self._put(key, payload)
        return key

    def read_json(self, *, bucket: str, key: str) -> Any:
        response = self.client.get_object(Bucket=bucket, Key=key)
        return json.loads(response["Body"].read())
