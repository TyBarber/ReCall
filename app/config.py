from __future__ import annotations

import os
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path


class RepositoryBackend(StrEnum):
    SQLITE = "sqlite"
    DYNAMODB = "dynamodb"


@dataclass(frozen=True, slots=True)
class Settings:
    database_path: Path
    log_level: str
    execution_environment: str
    repository_backend: RepositoryBackend
    aws_region: str
    dynamodb_table_name: str | None
    ingestion_state_table_name: str | None
    raw_bucket_name: str | None
    normalization_queue_url: str | None
    ingestion_overlap_minutes: int
    first_run_lookback_days: int
    ingestion_page_size: int
    ingestion_max_records: int
    fsis_api_url: str
    fsis_ingestion_overlap_days: int
    fsis_ingestion_max_records: int

    @classmethod
    def from_env(cls) -> "Settings":
        execution_environment = os.getenv("EXECUTION_ENVIRONMENT", "local").lower()
        default_backend = "dynamodb" if execution_environment == "aws" else "sqlite"
        return cls(
            database_path=Path(os.getenv("RECALL_DATABASE_PATH", "data/recalls.db")),
            log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
            execution_environment=execution_environment,
            repository_backend=RepositoryBackend(os.getenv("REPOSITORY_BACKEND", default_backend).lower()),
            aws_region=os.getenv("AWS_REGION", "us-east-1"),
            dynamodb_table_name=os.getenv("DYNAMODB_TABLE_NAME"),
            ingestion_state_table_name=os.getenv("INGESTION_STATE_TABLE_NAME"),
            raw_bucket_name=os.getenv("RAW_BUCKET_NAME"),
            normalization_queue_url=os.getenv("NORMALIZATION_QUEUE_URL"),
            ingestion_overlap_minutes=int(os.getenv("INGESTION_OVERLAP_MINUTES", "60")),
            first_run_lookback_days=int(os.getenv("FIRST_RUN_LOOKBACK_DAYS", "60")),
            ingestion_page_size=int(os.getenv("INGESTION_PAGE_SIZE", "100")),
            ingestion_max_records=int(os.getenv("INGESTION_MAX_RECORDS", "1000")),
            fsis_api_url=os.getenv(
                "FSIS_API_URL",
                "https://www.fsis.usda.gov/fsis/api/recall/v/1",
            ),
            fsis_ingestion_overlap_days=int(
                os.getenv("FSIS_INGESTION_OVERLAP_DAYS", "1")
            ),
            fsis_ingestion_max_records=int(
                os.getenv("FSIS_INGESTION_MAX_RECORDS", "5000")
            ),
        )

    def require(self, field_name: str) -> str:
        value = getattr(self, field_name)
        if not value:
            raise ValueError(f"{field_name} is required for AWS execution")
        return str(value)
