from __future__ import annotations

from datetime import date

import pytest
from pydantic import ValidationError

from app.ingestion.fda_schemas import FDAEnforcementRecord
from app.ingestion.normalizer import normalize_fda_record


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
