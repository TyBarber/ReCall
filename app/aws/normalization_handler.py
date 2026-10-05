from __future__ import annotations

import json
import logging
from typing import Any

import boto3
from pydantic import ValidationError

from app.aws.sqs_models import NormalizationMessage
from app.config import Settings
from app.ingestion.fda_schemas import FDAEnforcementRecord
from app.ingestion.fsis_schemas import FSISRecallRecord
from app.ingestion.normalizer import normalize_fda_record, normalize_fsis_record
from app.logging import configure_logging
from app.models.recall import Recall
from app.services.dynamodb_repository import DynamoDBRecallRepository
from app.services.raw_archive import S3RawArchive
from app.services.repository import RecallRepository

logger = logging.getLogger(__name__)


def normalize_source_record(source: str, raw: Any) -> Recall:
    """Single dispatch boundary for source-specific schemas and normalizers."""

    if source == "fda":
        return normalize_fda_record(FDAEnforcementRecord.model_validate(raw))
    if source == "usda_fsis":
        return normalize_fsis_record(FSISRecallRecord.model_validate(raw))
    raise LookupError(f"Unsupported normalization source: {source}")


def process_normalization_event(
    event: dict[str, Any],
    *,
    archive: Any,
    repository: RecallRepository,
    aws_request_id: str | None = None,
) -> dict[str, list[dict[str, str]]]:
    failures: list[dict[str, str]] = []
    for sqs_record in event.get("Records", []):
        message_id = str(sqs_record.get("messageId", "unknown"))
        try:
            message = NormalizationMessage.model_validate_json(sqs_record["body"])
        except (KeyError, TypeError, ValidationError, json.JSONDecodeError) as exc:
            logger.error(
                "Invalid normalization message",
                extra={"sqs_message_id": message_id, "aws_request_id": aws_request_id, "error": str(exc)},
            )
            failures.append({"itemIdentifier": message_id})
            continue
        if message.source not in {"fda", "usda_fsis"}:
            logger.error(
                "Unsupported normalization source",
                extra={"sqs_message_id": message_id, "source": message.source, "ingestion_id": message.ingestion_id},
            )
            failures.append({"itemIdentifier": message_id})
            continue
        try:
            raw = archive.read_json(
                bucket=message.raw_record.bucket,
                key=message.raw_record.key,
            )
            recall = normalize_source_record(message.source, raw)
        except (ValidationError, ValueError, TypeError) as exc:
            logger.warning(
                "Malformed source record acknowledged",
                extra={
                    "sqs_message_id": message_id,
                    "ingestion_id": message.ingestion_id,
                    "source": message.source,
                    "source_recall_id": message.source_recall_id,
                    "error": str(exc),
                },
            )
            continue
        except Exception:
            logger.exception(
                "Unable to read raw recall",
                extra={"sqs_message_id": message_id, "ingestion_id": message.ingestion_id},
            )
            failures.append({"itemIdentifier": message_id})
            continue
        try:
            saved = repository.upsert(recall)
            logger.info(
                "Normalized recall persisted",
                extra={
                    "sqs_message_id": message_id,
                    "ingestion_id": message.ingestion_id,
                    "recall_id": saved.recall.id,
                    "source": saved.recall.source.value,
                    "item_created": saved.created,
                    "aws_request_id": aws_request_id,
                },
            )
        except Exception:
            logger.exception(
                "Unable to persist normalized recall",
                extra={"sqs_message_id": message_id, "ingestion_id": message.ingestion_id, "recall_id": recall.id},
            )
            failures.append({"itemIdentifier": message_id})
    return {"batchItemFailures": failures}


def handler(event: dict[str, Any], context: Any) -> dict[str, list[dict[str, str]]]:
    settings = Settings.from_env()
    configure_logging(settings.log_level)
    session = boto3.session.Session(region_name=settings.aws_region)
    archive = S3RawArchive(session.client("s3"), settings.require("raw_bucket_name"))
    repository = DynamoDBRecallRepository.from_resource(
        table_name=settings.require("dynamodb_table_name"),
        region_name=settings.aws_region,
    )
    return process_normalization_event(
        event,
        archive=archive,
        repository=repository,
        aws_request_id=getattr(context, "aws_request_id", None),
    )
