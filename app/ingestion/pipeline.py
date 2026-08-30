from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Iterable

from pydantic import ValidationError

from app.ingestion.fda_schemas import FDAEnforcementRecord
from app.ingestion.normalizer import normalize_fda_record
from app.models.recall import RecallSource
from app.services.repository import RecallRepository

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class IngestionResult:
    fetched: int = 0
    created: int = 0
    updated: int = 0
    skipped: int = 0


def ingest_fda_records(records: Iterable[dict[str, Any]], repository: RecallRepository) -> IngestionResult:
    result = IngestionResult()
    for raw in records:
        result.fetched += 1
        try:
            external = FDAEnforcementRecord.model_validate(raw)
            repository.save_raw(RecallSource.FDA, external.recall_number, raw)
            recall = normalize_fda_record(external)
            saved = repository.upsert(recall)
            if saved.created:
                result.created += 1
            else:
                result.updated += 1
        except (ValidationError, ValueError, TypeError) as exc:
            result.skipped += 1
            logger.warning("Skipping malformed FDA record: %s", exc)
    logger.info(
        "FDA ingestion complete: fetched=%d created=%d updated=%d skipped=%d",
        result.fetched, result.created, result.updated, result.skipped,
    )
    return result

