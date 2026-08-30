from __future__ import annotations

from app.ingestion.pipeline import ingest_fda_records


VALID_RECORD = {
    "recall_number": "F-1000-2025",
    "product_description": "Peanut Butter",
    "reason_for_recall": "Potential Salmonella",
    "status": "Ongoing",
}


def test_ingestion_is_idempotent(repository) -> None:
    first = ingest_fda_records([VALID_RECORD], repository)
    second = ingest_fda_records([VALID_RECORD], repository)
    assert (first.created, first.updated) == (1, 0)
    assert (second.created, second.updated) == (0, 1)
    assert len(repository.list()) == 1


def test_malformed_records_are_skipped(repository) -> None:
    result = ingest_fda_records([{"recall_number": "bad"}], repository)
    assert result.skipped == 1
    assert repository.list() == []

