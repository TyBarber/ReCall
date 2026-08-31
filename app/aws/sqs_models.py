from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RawRecordReference(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bucket: str
    key: str
    etag: str | None = None


class NormalizationMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = Field(default=1, ge=1, le=1)
    ingestion_id: str
    source: str
    source_recall_id: str
    raw_record: RawRecordReference
    fetched_at: datetime
