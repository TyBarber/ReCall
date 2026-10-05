from __future__ import annotations

from datetime import timedelta
from typing import Any

import boto3

from app.config import Settings
from app.ingestion.fsis_aws_pipeline import USDAFSISAWSIngestionPipeline
from app.ingestion.fsis_client import FSISClient
from app.ingestion.fsis_diagnostics import run_fsis_connectivity_diagnostics
from app.logging import configure_logging
from app.services.checkpoint import DynamoDBCheckpointStore
from app.services.queue import SQSNormalizationPublisher
from app.services.raw_archive import S3RawArchive


def build_pipeline(settings: Settings) -> USDAFSISAWSIngestionPipeline:
    session = boto3.session.Session(region_name=settings.aws_region)
    return USDAFSISAWSIngestionPipeline(
        client=FSISClient(base_url=settings.fsis_api_url),
        archive=S3RawArchive(session.client("s3"), settings.require("raw_bucket_name")),
        publisher=SQSNormalizationPublisher(
            session.client("sqs"), settings.require("normalization_queue_url")
        ),
        checkpoints=DynamoDBCheckpointStore.from_resource(
            table_name=settings.require("ingestion_state_table_name"),
            region_name=settings.aws_region,
        ),
        overlap=timedelta(days=settings.fsis_ingestion_overlap_days),
        max_records=settings.fsis_ingestion_max_records,
    )


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    settings = Settings.from_env()
    configure_logging(settings.log_level)
    if event.get("operation") == "connectivity_diagnostics":
        return run_fsis_connectivity_diagnostics(
            api_base_url=settings.fsis_api_url,
            aws_region=settings.aws_region,
            aws_request_id=getattr(context, "aws_request_id", None),
        )
    result = build_pipeline(settings).run()
    return {
        "ingestion_id": result.ingestion_id,
        "source": "usda_fsis",
        "pages": result.pages,
        "records": result.records,
        "window_start": result.window_start.isoformat() if result.window_start else None,
        "window_end": result.window_end.isoformat(),
        "aws_request_id": getattr(context, "aws_request_id", None),
    }
