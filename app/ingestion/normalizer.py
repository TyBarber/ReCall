from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import NAMESPACE_URL, uuid5

from app.ingestion.fda_schemas import FDAEnforcementRecord, FDAOpenFDAFields
from app.models.recall import Recall, RecallSource

_UPC_PATTERN = re.compile(r"\b(?:UPC(?:s)?(?:\s*(?:Code|#|No\.?))?[:\s]*)?(\d{8,14})\b", re.IGNORECASE)
_LOT_PATTERN = re.compile(r"\b(?:lot|code)(?:\s*(?:#|no\.?))?[:\s-]+([A-Z0-9][A-Z0-9-]{1,30})", re.IGNORECASE)


def _parse_fda_date(value: str | None):
    if not value:
        return None
    return datetime.strptime(value, "%Y%m%d").date()


def _unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value.strip() for value in values if value.strip()))


def normalize_fda_record(record: FDAEnforcementRecord, *, now: datetime | None = None) -> Recall:
    timestamp = now or datetime.now(timezone.utc)
    description = record.product_description.strip()
    source_id = record.recall_number.strip()
    text_for_codes = " ".join(filter(None, [description, record.code_info]))
    openfda = record.openfda or FDAOpenFDAFields()
    upcs = _unique(openfda.upc + _UPC_PATTERN.findall(text_for_codes))
    lots = _unique(_LOT_PATTERN.findall(record.code_info or ""))
    brand = openfda.brand_name[0].strip() if openfda.brand_name else None

    return Recall(
        id=str(uuid5(NAMESPACE_URL, f"fda:{source_id}")),
        source=RecallSource.FDA,
        source_recall_id=source_id,
        product_name=description.split(",", 1)[0].strip(),
        brand=brand or (record.recalling_firm.strip() if record.recalling_firm else None),
        description=description,
        recall_reason=record.reason_for_recall.strip(),
        classification=record.classification,
        status=record.status.strip(),
        recall_date=_parse_fda_date(record.recall_initiation_date),
        distribution_pattern=record.distribution_pattern,
        upc_codes=upcs,
        lot_numbers=lots,
        source_url=f"https://api.fda.gov/food/enforcement.json?search=recall_number:{source_id}",
        created_at=timestamp,
        updated_at=timestamp,
    )
