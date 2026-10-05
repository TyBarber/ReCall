from __future__ import annotations

from datetime import date, datetime, timezone
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class RecallSource(StrEnum):
    FDA = "fda"
    USDA_FSIS = "usda_fsis"


class RecallRecordType(StrEnum):
    RECALL = "recall"
    PUBLIC_HEALTH_ALERT = "public_health_alert"


class RecallCategory(StrEnum):
    FOOD = "food"


class RecallSort(StrEnum):
    NEWEST = "newest"


class Recall(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    source: RecallSource
    source_recall_id: str
    record_type: RecallRecordType = RecallRecordType.RECALL
    category: RecallCategory = RecallCategory.FOOD
    product_name: str
    brand: str | None = None
    recalling_firm: str | None = None
    description: str | None = None
    recall_reason: str
    classification: str | None = None
    severity: str | None = None
    status: str
    source_active: bool | None = None
    source_archived: bool | None = None
    recall_date: date | None = None
    reported_at: date | None = None
    source_updated_at: date | None = None
    distribution_pattern: str | None = None
    product_code_info: str | None = None
    product_items: list[str] = Field(default_factory=list)
    establishment_numbers: list[str] = Field(default_factory=list)
    source_documents: list[str] = Field(default_factory=list)
    states: list[str] = Field(default_factory=list)
    upc_codes: list[str] = Field(default_factory=list)
    lot_numbers: list[str] = Field(default_factory=list)
    source_url: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
