from __future__ import annotations

import pytest

from app.config import RepositoryBackend, Settings
from app.services.dynamodb_repository import DynamoDBRecallRepository
from app.services.repository_factory import create_repository
from app.services.sqlite_repository import SQLiteRecallRepository


def test_local_configuration_selects_sqlite(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("EXECUTION_ENVIRONMENT", raising=False)
    monkeypatch.delenv("REPOSITORY_BACKEND", raising=False)
    monkeypatch.setenv("RECALL_DATABASE_PATH", str(tmp_path / "local.db"))
    settings = Settings.from_env()
    assert settings.repository_backend == RepositoryBackend.SQLITE
    assert isinstance(create_repository(settings), SQLiteRecallRepository)
    assert settings.fsis_ingestion_overlap_days == 1
    assert settings.fsis_ingestion_max_records == 5000
    assert settings.fsis_api_url.endswith("/fsis/api/recall/v/1")


def test_aws_configuration_selects_dynamodb(monkeypatch) -> None:
    sentinel = object()
    monkeypatch.setenv("EXECUTION_ENVIRONMENT", "aws")
    monkeypatch.setenv("DYNAMODB_TABLE_NAME", "recalls")
    monkeypatch.setattr(
        DynamoDBRecallRepository,
        "from_resource",
        classmethod(lambda cls, **kwargs: sentinel),
    )
    assert create_repository(Settings.from_env()) is sentinel


def test_aws_configuration_requires_table_name(monkeypatch) -> None:
    monkeypatch.setenv("EXECUTION_ENVIRONMENT", "aws")
    monkeypatch.delenv("DYNAMODB_TABLE_NAME", raising=False)
    with pytest.raises(ValueError, match="dynamodb_table_name"):
        create_repository(Settings.from_env())
