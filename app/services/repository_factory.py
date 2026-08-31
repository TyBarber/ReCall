from __future__ import annotations

from app.config import RepositoryBackend, Settings
from app.services.dynamodb_repository import DynamoDBRecallRepository
from app.services.repository import RecallRepository
from app.services.sqlite_repository import SQLiteRecallRepository


def create_repository(settings: Settings) -> RecallRepository:
    if settings.repository_backend == RepositoryBackend.SQLITE:
        return SQLiteRecallRepository(settings.database_path)
    if settings.repository_backend == RepositoryBackend.DYNAMODB:
        return DynamoDBRecallRepository.from_resource(
            table_name=settings.require("dynamodb_table_name"),
            region_name=settings.aws_region,
        )
    raise ValueError(f"Unsupported repository backend: {settings.repository_backend}")
