from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Callable
from uuid import uuid4

from app.aws.sqs_models import NormalizationMessage, RawRecordReference
from app.ingestion.aws_pipeline import (
    AWSIngestionResult,
    CheckpointStore,
)
from app.ingestion.fsis_schemas import FSISRecallRecord
from app.services.checkpoint import IngestionCheckpoint

logger = logging.getLogger(__name__)


class USDAFSISAWSIngestionPipeline:
    def __init__(
        self,
        *,
        client: Any,
        archive: Any,
        publisher: Any,
        checkpoints: CheckpointStore,
        overlap: timedelta,
        max_records: int,
        clock: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
        id_factory: Callable[[], str] = lambda: str(uuid4()),
    ) -> None:
        self.client = client
        self.archive = archive
        self.publisher = publisher
        self.checkpoints = checkpoints
        self.overlap = overlap
        self.max_records = max_records
        self.clock = clock
        self.id_factory = id_factory

    def run(self) -> AWSIngestionResult:
        source = "usda_fsis"
        ingestion_id = self.id_factory()
        fetched_at = self.clock()
        checkpoint = self.checkpoints.get(source)
        window_end = fetched_at
        window_start = (
            checkpoint.last_successful_ingestion_at - self.overlap
            if checkpoint
            else None
        )
        selection_mode = "incremental_modified_date" if checkpoint else "full_history"
        logger.info(
            "Starting USDA FSIS ingestion",
            extra={
                "ingestion_id": ingestion_id,
                "source": source,
                "window_start": window_start.isoformat() if window_start else None,
                "window_end": window_end.isoformat(),
                "selection_mode": selection_mode,
            },
        )

        snapshot = self.client.fetch_snapshot()
        self.archive.archive_page(
            source=source,
            ingestion_id=ingestion_id,
            fetched_at=fetched_at,
            page_number=1,
            payload=snapshot,
        )
        missing_last_modified = 0
        if checkpoint and window_start:
            selected, skipped, missing_last_modified = (
                self.client.records_modified_in_window(
                    snapshot,
                    start_at=window_start,
                    end_at=window_end,
                )
            )
        else:
            selected, skipped = self.client.records_for_first_run(snapshot)
        if len(selected) > self.max_records:
            raise RuntimeError(
                "USDA FSIS window exceeded FSIS_INGESTION_MAX_RECORDS; "
                "checkpoint was not advanced"
            )

        for record_number, raw_record in enumerate(selected, start=1):
            external = FSISRecallRecord.model_validate(raw_record)
            source_recall_id = external.source_recall_id or f"unknown-{record_number}"
            key, etag = self.archive.archive_record(
                source=source,
                ingestion_id=ingestion_id,
                fetched_at=fetched_at,
                source_recall_id=source_recall_id,
                record_number=record_number,
                payload=raw_record,
            )
            self.publisher.publish(
                NormalizationMessage(
                    ingestion_id=ingestion_id,
                    source=source,
                    source_recall_id=source_recall_id,
                    raw_record=RawRecordReference(
                        bucket=self.archive.bucket,
                        key=key,
                        etag=etag,
                    ),
                    fetched_at=fetched_at,
                )
            )

        records = len(selected)
        self.archive.archive_manifest(
            source=source,
            ingestion_id=ingestion_id,
            fetched_at=fetched_at,
            payload={
                "schema_version": 1,
                "ingestion_id": ingestion_id,
                "source": source,
                "window_start": window_start.isoformat() if window_start else None,
                "window_end": window_end.isoformat(),
                "selection_mode": selection_mode,
                "incremental_field": (
                    "field_last_modified_date" if checkpoint else None
                ),
                "pages": 1,
                "snapshot_records": len(snapshot),
                "records": records,
                "malformed_discovery_records": skipped,
                "missing_last_modified_excluded": missing_last_modified,
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
            "USDA FSIS ingestion completed",
            extra={
                "ingestion_id": ingestion_id,
                "source": source,
                "snapshot_records": len(snapshot),
                "records": records,
                "malformed_discovery_records": skipped,
                "missing_last_modified_excluded": missing_last_modified,
            },
        )
        return AWSIngestionResult(
            ingestion_id,
            1,
            records,
            window_start,
            window_end,
        )
