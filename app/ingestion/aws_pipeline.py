from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Protocol
from uuid import uuid4

from app.aws.sqs_models import NormalizationMessage, RawRecordReference
from app.ingestion.fda_schemas import FDAResponse
from app.services.checkpoint import IngestionCheckpoint

logger = logging.getLogger(__name__)


class CheckpointStore(Protocol):
    def get(self, source: str) -> IngestionCheckpoint | None: ...
    def advance(self, checkpoint: IngestionCheckpoint) -> None: ...


@dataclass(frozen=True, slots=True)
class AWSIngestionResult:
    ingestion_id: str
    pages: int
    records: int
    window_start: datetime | None
    window_end: datetime


def calculate_ingestion_window(
    *,
    now: datetime,
    checkpoint: IngestionCheckpoint | None,
    overlap: timedelta,
    first_run_lookback: timedelta,
) -> tuple[datetime, datetime]:
    start = (
        checkpoint.last_successful_ingestion_at - overlap
        if checkpoint
        else now - first_run_lookback
    )
    return start, now


class FDAAWSIngestionPipeline:
    def __init__(
        self,
        *,
        client: Any,
        archive: Any,
        publisher: Any,
        checkpoints: CheckpointStore,
        overlap: timedelta,
        first_run_lookback: timedelta,
        page_size: int,
        max_records: int,
        clock: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
        id_factory: Callable[[], str] = lambda: str(uuid4()),
    ) -> None:
        self.client = client
        self.archive = archive
        self.publisher = publisher
        self.checkpoints = checkpoints
        self.overlap = overlap
        self.first_run_lookback = first_run_lookback
        self.page_size = page_size
        self.max_records = max_records
        self.clock = clock
        self.id_factory = id_factory

    def run(self) -> AWSIngestionResult:
        source = "fda"
        ingestion_id = self.id_factory()
        fetched_at = self.clock()
        checkpoint = self.checkpoints.get(source)
        window_start, window_end = calculate_ingestion_window(
            now=fetched_at,
            checkpoint=checkpoint,
            overlap=self.overlap,
            first_run_lookback=self.first_run_lookback,
        )
        pages = records = 0
        logger.info(
            "Starting FDA ingestion",
            extra={
                "ingestion_id": ingestion_id,
                "source": source,
                "window_start": window_start.isoformat(),
                "window_end": window_end.isoformat(),
            },
        )
        for pages, raw_page in enumerate(
            self.client.fetch_pages(
                limit=self.page_size,
                max_records=self.max_records,
                start_at=window_start,
                end_at=window_end,
            ),
            start=1,
        ):
            self.archive.archive_page(
                source=source,
                ingestion_id=ingestion_id,
                fetched_at=fetched_at,
                page_number=pages,
                payload=raw_page,
            )
            for raw_record in FDAResponse.model_validate(raw_page).results:
                records += 1
                source_recall_id = str(raw_record.get("recall_number", f"unknown-{records}"))
                key, etag = self.archive.archive_record(
                    source=source,
                    ingestion_id=ingestion_id,
                    fetched_at=fetched_at,
                    source_recall_id=source_recall_id,
                    record_number=records,
                    payload=raw_record,
                )
                self.publisher.publish(
                    NormalizationMessage(
                        ingestion_id=ingestion_id,
                        source=source,
                        source_recall_id=source_recall_id,
                        raw_record=RawRecordReference(
                            bucket=self.archive.bucket, key=key, etag=etag
                        ),
                        fetched_at=fetched_at,
                    )
                )
        self.archive.archive_manifest(
            source=source,
            ingestion_id=ingestion_id,
            fetched_at=fetched_at,
            payload={
                "schema_version": 1,
                "ingestion_id": ingestion_id,
                "source": source,
                "window_start": window_start.isoformat(),
                "window_end": window_end.isoformat(),
                "pages": pages,
                "records": records,
                "completed_at": self.clock().isoformat(),
            },
        )
        self.checkpoints.advance(
            IngestionCheckpoint(
                source=source,
                last_successful_ingestion_at=window_end,
                last_ingestion_id=ingestion_id,
                updated_at=self.clock(),
            )
        )
        logger.info(
            "FDA ingestion completed",
            extra={"ingestion_id": ingestion_id, "source": source, "pages": pages, "records": records},
        )
        return AWSIngestionResult(ingestion_id, pages, records, window_start, window_end)
