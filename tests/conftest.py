from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.models.recall import Recall, RecallSource
from app.services.sqlite_repository import SQLiteRecallRepository


@pytest.fixture
def repository(tmp_path):
    return SQLiteRecallRepository(tmp_path / "test.db")


@pytest.fixture
def sample_recall() -> Recall:
    now = datetime(2025, 1, 1, tzinfo=timezone.utc)
    return Recall(
        id="recall-1",
        source=RecallSource.FDA,
        source_recall_id="F-1000-2025",
        product_name="Peanut Butter",
        brand="Example Foods",
        description="Peanut Butter, 16 oz jars",
        recall_reason="Potential Salmonella contamination",
        classification="Class I",
        status="Ongoing",
        recall_date="2025-01-01",
        distribution_pattern="Nationwide",
        upc_codes=["123456789012"],
        lot_numbers=["ABC-123"],
        created_at=now,
        updated_at=now,
    )


@pytest.fixture
def client(repository, sample_recall):
    repository.upsert(sample_recall)
    with TestClient(create_app(repository)) as test_client:
        yield test_client

