from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urljoin
from uuid import NAMESPACE_URL, uuid5

from app.ingestion.fda_schemas import FDAEnforcementRecord, FDAOpenFDAFields
from app.ingestion.fsis_client import parse_fsis_date
from app.ingestion.fsis_schemas import FSISRecallRecord
from app.models.recall import (
    Recall,
    RecallCategory,
    RecallRecordType,
    RecallSource,
)

_UPC_PATTERN = re.compile(r"\b(?:UPC(?:s)?(?:\s*(?:Code|#|No\.?))?[:\s]*)?(\d{8,14})\b", re.IGNORECASE)
_LOT_PATTERN = re.compile(r"\b(?:lot|code)(?:\s*(?:#|no\.?))?[:\s-]+([A-Z0-9][A-Z0-9-]{1,30})", re.IGNORECASE)
_FDA_FALLBACK_IDENTITY_FIELDS = (
    "event_id",
    "recalling_firm",
    "product_description",
    "code_info",
    "report_date",
)
_FSIS_FALLBACK_IDENTITY_FIELDS = (
    "field_recall_url",
    "field_title",
    "field_recall_date",
)
_FSIS_ESTABLISHMENT_PATTERN = re.compile(
    r"\bestablishment\s+numbers?\s+(?:no\.?\s*)?[\"“]?"
    r"((?:EST\.?\s*|P-\s*|M-\s*)?\d+[A-Z0-9-]*)\b",
    re.IGNORECASE,
)


class _FSISHTMLExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.text: list[str] = []
        self.document_urls: list[str] = []

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.text.append(data.strip())

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.casefold() != "a":
            return
        href = dict(attrs).get("href")
        if href and href.casefold().split("?", 1)[0].endswith(".pdf"):
            self.document_urls.append(
                urljoin("https://www.fsis.usda.gov", unescape(href.strip()))
            )


def _parse_fda_date(value: str | None):
    if not value:
        return None
    return datetime.strptime(value, "%Y%m%d").date()


def _unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value.strip() for value in values if value.strip()))


def is_usable_fda_recall_number(value: str) -> bool:
    normalized = value.strip()
    return bool(normalized) and normalized.casefold() != "n/a"


def legacy_fda_recall_id(recall_number: str) -> str:
    """Return the pre-fallback deterministic ID for migration compatibility."""
    return str(uuid5(NAMESPACE_URL, f"fda:{recall_number.strip()}"))


def _canonicalize_fda_identity_value(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKC", value or "")
    return " ".join(normalized.split()).casefold()


def fda_fallback_identity_fingerprint(record: FDAEnforcementRecord) -> str:
    identity = {
        field: _canonicalize_fda_identity_value(getattr(record, field))
        for field in _FDA_FALLBACK_IDENTITY_FIELDS
    }
    canonical = json.dumps(
        identity,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def fda_recall_id(record: FDAEnforcementRecord) -> str:
    source_id = record.recall_number.strip()
    if is_usable_fda_recall_number(record.recall_number):
        return legacy_fda_recall_id(source_id)
    fingerprint = fda_fallback_identity_fingerprint(record)
    return str(uuid5(NAMESPACE_URL, f"fda:fallback:{fingerprint}"))


def normalize_fda_record(record: FDAEnforcementRecord, *, now: datetime | None = None) -> Recall:
    timestamp = now or datetime.now(timezone.utc)
    description = record.product_description.strip()
    normalized_source_id = record.recall_number.strip()
    source_id = (
        normalized_source_id
        if is_usable_fda_recall_number(record.recall_number)
        else record.recall_number
    )
    text_for_codes = " ".join(filter(None, [description, record.code_info]))
    openfda = record.openfda or FDAOpenFDAFields()
    upcs = _unique(openfda.upc + _UPC_PATTERN.findall(text_for_codes))
    lots = _unique(_LOT_PATTERN.findall(record.code_info or ""))
    brand = openfda.brand_name[0].strip() if openfda.brand_name else None

    return Recall(
        id=fda_recall_id(record),
        source=RecallSource.FDA,
        source_recall_id=source_id,
        product_name=description.split(",", 1)[0].strip(),
        brand=brand or (record.recalling_firm.strip() if record.recalling_firm else None),
        recalling_firm=(
            record.recalling_firm.strip()
            if record.recalling_firm and record.recalling_firm.strip()
            else None
        ),
        description=description,
        recall_reason=record.reason_for_recall.strip(),
        classification=record.classification,
        status=record.status.strip(),
        recall_date=_parse_fda_date(record.recall_initiation_date),
        reported_at=_parse_fda_date(record.report_date),
        distribution_pattern=record.distribution_pattern,
        product_code_info=(
            record.code_info.strip()
            if record.code_info and record.code_info.strip()
            else None
        ),
        upc_codes=upcs,
        lot_numbers=lots,
        source_url=f"https://api.fda.gov/food/enforcement.json?search=recall_number:{normalized_source_id}",
        created_at=timestamp,
        updated_at=timestamp,
    )


def is_usable_fsis_recall_number(value: str) -> bool:
    normalized = value.strip()
    return bool(normalized) and normalized.casefold() != "n/a"


def _canonicalize_fsis_identity_value(value: object) -> object:
    if isinstance(value, list):
        return [_canonicalize_fsis_identity_value(item) for item in value]
    normalized = unicodedata.normalize("NFKC", str(value or ""))
    return " ".join(unescape(normalized).split()).casefold()


def fsis_fallback_identity_fingerprint(record: FSISRecallRecord) -> str:
    identity = {
        field: _canonicalize_fsis_identity_value(getattr(record, field))
        for field in _FSIS_FALLBACK_IDENTITY_FIELDS
    }
    canonical = json.dumps(
        identity,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def fsis_recall_id(record: FSISRecallRecord) -> str:
    source_id = record.source_recall_id
    if is_usable_fsis_recall_number(source_id):
        return str(uuid5(NAMESPACE_URL, f"usda_fsis:{source_id}"))
    fingerprint = fsis_fallback_identity_fingerprint(record)
    return str(uuid5(NAMESPACE_URL, f"usda_fsis:fallback:{fingerprint}"))


def _unique_source_values(values: list[str]) -> list[str]:
    return _unique([unescape(value) for value in values])


def _fsis_summary(record: FSISRecallRecord) -> tuple[str | None, list[str]]:
    if not record.field_summary:
        return None, []
    extractor = _FSISHTMLExtractor()
    extractor.feed(record.field_summary)
    text = " ".join(extractor.text).strip() or None
    return text, _unique(extractor.document_urls)


def _parse_fsis_boolean(value: str | None) -> bool | None:
    normalized = (value or "").strip().casefold()
    if normalized == "true":
        return True
    if normalized == "false":
        return False
    return None


def normalize_fsis_record(record: FSISRecallRecord, *, now: datetime | None = None) -> Recall:
    timestamp = now or datetime.now(timezone.utc)
    title = unescape(record.field_title).strip()
    if not title:
        raise ValueError("FSIS record title must not be empty")

    source_id = record.source_recall_id
    summary, documents = _fsis_summary(record)
    product_items = _unique_source_values(record.field_product_items)
    states = _unique_source_values(record.field_states)
    nationwide = any(state.casefold() == "nationwide" for state in states)
    states = [state for state in states if state.casefold() != "nationwide"]
    recall_type = record.field_recall_type.strip()
    is_public_health_alert = (
        recall_type.casefold() == "public health alert"
        or (record.field_recall_classification or "").strip().casefold()
        == "public health alert"
    )
    classification = (
        None
        if is_public_health_alert
        else (record.field_recall_classification or "").strip() or None
    )
    severity = (
        None
        if is_public_health_alert
        else (record.field_risk_level or "").strip() or None
    )
    firm = next(iter(_unique_source_values(record.field_establishment)), None)
    reason = "; ".join(_unique_source_values(record.field_recall_reason))
    if not reason:
        reason = "Reason not provided by USDA FSIS"
    establishment_numbers = _unique(
        [match.group(1) for match in _FSIS_ESTABLISHMENT_PATTERN.finditer(summary or "")]
    )

    return Recall(
        id=fsis_recall_id(record),
        source=RecallSource.USDA_FSIS,
        source_recall_id=source_id,
        record_type=(
            RecallRecordType.PUBLIC_HEALTH_ALERT
            if is_public_health_alert
            else RecallRecordType.RECALL
        ),
        category=RecallCategory.FOOD,
        product_name=title,
        brand=firm,
        recalling_firm=firm,
        description="\n".join(product_items) or summary,
        recall_reason=reason,
        classification=classification,
        severity=severity,
        # FSIS lifecycle values are preserved; they are not translated into the
        # FDA Ongoing/Completed/Terminated vocabulary.
        status=recall_type,
        source_active=_parse_fsis_boolean(record.field_active_notice),
        source_archived=_parse_fsis_boolean(record.field_archive_recall),
        # FSIS calls field_recall_date the issue date; it is not a firm initiation date.
        recall_date=None,
        reported_at=parse_fsis_date(record.field_recall_date),
        source_updated_at=parse_fsis_date(record.field_last_modified_date),
        distribution_pattern="Nationwide" if nationwide else None,
        product_code_info="\n".join(product_items) or None,
        product_items=product_items,
        establishment_numbers=establishment_numbers,
        source_documents=documents,
        states=states,
        upc_codes=[],
        lot_numbers=[],
        source_url=(record.field_recall_url or "").strip() or None,
        created_at=timestamp,
        updated_at=timestamp,
    )
