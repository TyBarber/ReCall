from __future__ import annotations

from datetime import date
from uuid import NAMESPACE_URL, uuid5

import pytest
from pydantic import ValidationError

from app.ingestion.fda_schemas import FDAEnforcementRecord
from app.ingestion.normalizer import normalize_fda_record


def fallback_record(**updates: object) -> FDAEnforcementRecord:
    values: dict[str, object] = {
        "recall_number": "",
        "event_id": "99453",
        "product_description": "MARKON BLEND LETT/ROM 80/20",
        "reason_for_recall": "Potential Cyclospora contamination",
        "status": "Ongoing",
        "classification": "Not Yet Classified",
        "recalling_firm": "Taylor Farms de Mexico",
        "report_date": "20260819",
        "code_info": "TFMX183A05 7/21/2026",
    }
    values.update(updates)
    return FDAEnforcementRecord.model_validate(values)


def test_normalizes_fda_record() -> None:
    external = FDAEnforcementRecord.model_validate(
        {
            "recall_number": "F-1000-2025",
            "product_description": "Crunchy Peanut Butter, UPC 123456789012",
            "reason_for_recall": "Potential Salmonella",
            "status": "Ongoing",
            "classification": "Class I",
            "recalling_firm": "Example Foods",
            "recall_initiation_date": "20250102",
            "distribution_pattern": "Nationwide",
            "code_info": "Lot: ABC-123",
            "openfda": {"brand_name": ["Example Brand"], "upc": ["987654321098"]},
        }
    )
    recall = normalize_fda_record(external)
    assert recall.source_recall_id == "F-1000-2025"
    assert recall.brand == "Example Brand"
    assert recall.recall_date == date(2025, 1, 2)
    assert recall.upc_codes == ["987654321098", "123456789012"]
    assert recall.lot_numbers == ["ABC-123"]


def test_malformed_required_data_is_rejected() -> None:
    with pytest.raises(ValidationError):
        FDAEnforcementRecord.model_validate({"recall_number": "missing-fields"})


def test_malformed_date_is_rejected() -> None:
    external = FDAEnforcementRecord(
        recall_number="F-1", product_description="Food", reason_for_recall="Reason",
        status="Ongoing", recall_initiation_date="not-a-date"
    )
    with pytest.raises(ValueError):
        normalize_fda_record(external)


def test_null_openfda_metadata_is_allowed() -> None:
    external = FDAEnforcementRecord(
        recall_number="F-2", product_description="Food", reason_for_recall="Reason",
        status="Ongoing", openfda=None
    )
    recall = normalize_fda_record(external)
    assert recall.upc_codes == []


def test_valid_recall_number_preserves_legacy_id_exactly() -> None:
    record = fallback_record(recall_number="H-1237-2026")

    recall = normalize_fda_record(record)

    assert recall.id == "9111d5c1-d82d-5052-9161-f8b32d481860"
    assert recall.id == str(uuid5(NAMESPACE_URL, "fda:H-1237-2026"))


def test_same_blank_record_has_stable_fallback_id() -> None:
    record = fallback_record(recall_number="   ")

    first = normalize_fda_record(record)
    second = normalize_fda_record(record)

    assert first.id == second.id
    assert first.source_recall_id == "   "


def test_different_blank_records_have_different_fallback_ids() -> None:
    first = normalize_fda_record(fallback_record())
    second = normalize_fda_record(
        fallback_record(product_description="A different recalled product")
    )

    assert first.id != second.id


def test_different_na_records_have_different_fallback_ids() -> None:
    first = normalize_fda_record(fallback_record(recall_number="N/A"))
    second = normalize_fda_record(
        fallback_record(recall_number="N/A", event_id="different-event")
    )

    assert first.id != second.id


def test_na_matching_is_case_insensitive_and_preserves_source_value() -> None:
    upper = normalize_fda_record(fallback_record(recall_number="N/A"))
    lower = normalize_fda_record(fallback_record(recall_number="n/a"))

    assert upper.id == lower.id
    assert upper.source_recall_id == "N/A"
    assert lower.source_recall_id == "n/a"


def test_status_change_does_not_change_fallback_id() -> None:
    ongoing = normalize_fda_record(fallback_record(status="Ongoing"))
    completed = normalize_fda_record(fallback_record(status="Completed"))

    assert ongoing.id == completed.id


def test_classification_change_does_not_change_fallback_id() -> None:
    unclassified = normalize_fda_record(
        fallback_record(classification="Not Yet Classified")
    )
    classified = normalize_fda_record(fallback_record(classification="Class I"))

    assert unclassified.id == classified.id
