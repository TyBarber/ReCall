from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FDAOpenFDAFields(BaseModel):
    model_config = ConfigDict(extra="allow")

    brand_name: list[str] = Field(default_factory=list)
    upc: list[str] = Field(default_factory=list)


class FDAEnforcementRecord(BaseModel):
    model_config = ConfigDict(extra="allow")

    recall_number: str
    event_id: str | None = None
    product_description: str
    reason_for_recall: str
    status: str
    classification: str | None = None
    recalling_firm: str | None = None
    recall_initiation_date: str | None = None
    report_date: str | None = None
    distribution_pattern: str | None = None
    code_info: str | None = None
    product_quantity: str | None = None
    openfda: FDAOpenFDAFields | None = Field(default_factory=FDAOpenFDAFields)


class FDAResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    results: list[dict[str, Any]] = Field(default_factory=list)
