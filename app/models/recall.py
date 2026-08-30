from __future__ import annotations

from datetime import date, datetime, timezone
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class RecallSource(StrEnum):
    FDA = "fda"


class Recall(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    source: RecallSource
    source_recall_id: str
    product_name: str
    brand: str | None = None
    description: str | None = None
    recall_reason: str
    classification: str | None = None
    severity: str | None = None
    status: str
    recall_date: date | None = None
    distribution_pattern: str | None = None
    states: list[str] = Field(default_factory=list)
    upc_codes: list[str] = Field(default_factory=list)
    lot_numbers: list[str] = Field(default_factory=list)
    source_url: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

