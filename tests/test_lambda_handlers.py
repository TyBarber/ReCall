from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

from app.aws import fsis_ingestion_handler, ingestion_handler
from app.ingestion.aws_pipeline import AWSIngestionResult


def test_ingestion_lambda_handler(monkeypatch) -> None:
    result = AWSIngestionResult(
        ingestion_id="batch-1",
        pages=2,
        records=3,
        window_start=datetime(2026, 8, 29, tzinfo=timezone.utc),
        window_end=datetime(2026, 8, 30, tzinfo=timezone.utc),
    )
    monkeypatch.setattr(
        ingestion_handler,
        "build_pipeline",
        lambda settings: SimpleNamespace(run=lambda: result),
    )
    response = ingestion_handler.handler({}, SimpleNamespace(aws_request_id="request-1"))
    assert response["ingestion_id"] == "batch-1"
    assert response["aws_request_id"] == "request-1"


def test_fsis_ingestion_lambda_handler(monkeypatch) -> None:
    result = AWSIngestionResult(
        ingestion_id="fsis-batch-1",
        pages=1,
        records=4,
        window_start=datetime(2026, 9, 3, tzinfo=timezone.utc),
        window_end=datetime(2026, 9, 4, tzinfo=timezone.utc),
    )
    monkeypatch.setattr(
        fsis_ingestion_handler,
        "build_pipeline",
        lambda settings: SimpleNamespace(run=lambda: result),
    )

    response = fsis_ingestion_handler.handler(
        {}, SimpleNamespace(aws_request_id="request-fsis")
    )

    assert response["ingestion_id"] == "fsis-batch-1"
    assert response["source"] == "usda_fsis"
    assert response["aws_request_id"] == "request-fsis"
