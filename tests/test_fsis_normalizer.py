from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.ingestion.fsis_schemas import FSISRecallRecord
from app.ingestion.normalizer import fsis_recall_id, normalize_fsis_record
from app.models.recall import RecallCategory, RecallRecordType, RecallSource

FIXTURES = Path(__file__).parent / "fixtures" / "fsis"
NOW = datetime(2026, 9, 4, tzinfo=timezone.utc)


def load_record(name: str) -> FSISRecallRecord:
    return FSISRecallRecord.model_validate_json((FIXTURES / name).read_text())


def test_class_i_mapping_preserves_distribution_products_and_documents() -> None:
    recall = normalize_fsis_record(load_record("class_i_state_specific.json"), now=NOW)

    assert recall.source == RecallSource.USDA_FSIS
    assert recall.category == RecallCategory.FOOD
    assert recall.record_type == RecallRecordType.RECALL
    assert recall.source_recall_id == "018-2026"
    assert recall.classification == "Class I"
    assert recall.severity == "High - Class I"
    assert recall.status == "Active Recall"
    assert recall.source_active is True
    assert recall.source_archived is False
    assert recall.reported_at == date(2026, 8, 26)
    assert recall.recall_date is None
    assert recall.source_updated_at == date(2026, 8, 26)
    assert recall.states == [
        "Maine",
        "Massachusetts",
        "New Hampshire",
        "Rhode Island",
        "Vermont",
    ]
    assert recall.distribution_pattern is None
    assert len(recall.product_items) == 2
    assert recall.product_items[0] in recall.product_code_info
    assert recall.establishment_numbers == ["EST. 18004"]
    assert recall.source_documents == [
        "https://www.fsis.usda.gov/sites/default/files/food_label_pdf/2026-08/Recall-018-2026-Labels.pdf"
    ]


def test_class_ii_mapping_preserves_firm_and_unprefixed_establishment_number() -> None:
    recall = normalize_fsis_record(load_record("class_ii_detailed.json"), now=NOW)

    assert recall.classification == "Class II"
    assert recall.recalling_firm == "Power Plate Meals, LLC"
    assert recall.brand == "Power Plate Meals, LLC"
    assert recall.establishment_numbers == ["217SEND"]
    assert recall.source_updated_at == date(2026, 6, 20)


def test_public_health_alert_is_not_misclassified_as_recall_or_severity() -> None:
    record = load_record("public_health_alert_nationwide.json")
    first = normalize_fsis_record(record, now=NOW)
    second = normalize_fsis_record(record, now=NOW)

    assert first.id == second.id
    assert first.record_type == RecallRecordType.PUBLIC_HEALTH_ALERT
    assert first.status == "Public Health Alert"
    assert first.source_active is False
    assert first.source_archived is False
    assert first.classification is None
    assert first.severity is None
    assert first.distribution_pattern == "Nationwide"
    assert first.states == []
    assert first.source_documents == [
        "https://www.fsis.usda.gov/sites/default/files/distro_list/2026-08/PHA-08082026-01-product-list_1.pdf"
    ]


def test_fsis_identity_uses_stable_case_id_and_ignores_mutable_fields() -> None:
    record = load_record("class_i_state_specific.json")
    expected = fsis_recall_id(record)
    changed = record.model_copy(
        update={
            "field_recall_type": "Closed Recall",
            "field_recall_classification": "Class II",
            "field_last_modified_date": "2026-09-04",
        }
    )

    assert expected == "7221603b-ab12-5d06-88a1-4134091cac65"
    assert expected == fsis_recall_id(changed)


def test_fsis_fallback_identity_is_stable_and_distinguishes_records() -> None:
    first = load_record("class_i_state_specific.json").model_copy(
        update={"field_recall_number_export": "", "field_recall_number": "N/A"}
    )
    changed_lifecycle = first.model_copy(
        update={
            "field_recall_type": "Closed Recall",
            "field_last_modified_date": "2026-09-04",
            "field_product_items": ["An updated list of affected products"],
        }
    )
    different = first.model_copy(update={"field_title": "A different source notice"})

    assert fsis_recall_id(first) == fsis_recall_id(changed_lifecycle)
    assert fsis_recall_id(first) != fsis_recall_id(different)


def test_fsis_normalization_is_idempotent(repository) -> None:
    recall = normalize_fsis_record(load_record("class_i_state_specific.json"), now=NOW)

    assert repository.upsert(recall).created is True
    assert repository.upsert(recall).created is False
    assert repository.count(source=RecallSource.USDA_FSIS) == 1


def test_malformed_fsis_record_is_rejected() -> None:
    with pytest.raises(ValidationError):
        FSISRecallRecord.model_validate({"field_recall_date": "2026-01-01"})

    record = load_record("class_i_state_specific.json").model_copy(
        update={"field_title": ""}
    )
    with pytest.raises(ValueError, match="title"):
        normalize_fsis_record(record, now=NOW)


def test_missing_fsis_reason_is_labeled_without_guessing() -> None:
    record = load_record("class_i_state_specific.json").model_copy(
        update={"field_recall_reason": []}
    )
    recall = normalize_fsis_record(record, now=NOW)
    assert recall.recall_reason == "Reason not provided by USDA FSIS"
