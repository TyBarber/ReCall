from __future__ import annotations

from datetime import timedelta
from typing import Any

import boto3

from app.config import Settings
from app.ingestion.aws_pipeline import FDAAWSIngestionPipeline
from app.ingestion.fda_client import FDAClient
from app.logging import configure_logging
from app.services.checkpoint import DynamoDBCheckpointStore
from app.services.queue import SQSNormalizationPublisher
from app.services.raw_archive import S3RawArchive


def build_pipeline(settings: Settings) -> FDAAWSIngestionPipeline:
    session = boto3.session.Session(region_name=settings.aws_region)
    return FDAAWSIngestionPipeline(
        client=FDAClient(),
        archive=S3RawArchive(session.client("s3"), settings.require("raw_bucket_name")),
        publisher=SQSNormalizationPublisher(
            session.client("sqs"), settings.require("normalization_queue_url")
        ),
        checkpoints=DynamoDBCheckpointStore.from_resource(
            table_name=settings.require("ingestion_state_table_name"),
            region_name=settings.aws_region,
        ),
        overlap=timedelta(minutes=settings.ingestion_overlap_minutes),
        first_run_lookback=timedelta(days=settings.first_run_lookback_days),
        page_size=settings.ingestion_page_size,
        max_records=settings.ingestion_max_records,
    )


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    settings = Settings.from_env()
    configure_logging(settings.log_level)
    result = build_pipeline(settings).run()
    return {
        "ingestion_id": result.ingestion_id,
        "pages": result.pages,
        "records": result.records,
        "window_start": result.window_start.isoformat(),
        "window_end": result.window_end.isoformat(),
        "aws_request_id": getattr(context, "aws_request_id", None),
    }
