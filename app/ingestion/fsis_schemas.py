from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, RootModel


class FSISRecallRecord(BaseModel):
    """External FSIS Recall API schema; source field names stay source-specific."""

    model_config = ConfigDict(extra="allow")

    field_title: str
    field_recall_number_export: str = ""
    field_recall_number: str = ""
    field_recall_url: str | None = None
    field_active_notice: str | None = None
    field_archive_recall: str | None = None
    field_closed_year: str | None = None
    field_company_media_contact: list[str] = Field(default_factory=list)
    field_distro_list: list[str] = Field(default_factory=list)
    field_en_press_release: list[str] = Field(default_factory=list)
    field_establishment: list[str] = Field(default_factory=list)
    field_labels: list[str] = Field(default_factory=list)
    field_media_contact: str | None = None
    field_press_release: list[str] = Field(default_factory=list)
    field_processing: list[str] = Field(default_factory=list)
    field_product_items: list[str] = Field(default_factory=list)
    field_qty_recovered: str | None = None
    field_recall_classification: str | None = None
    field_recall_date: str
    field_recall_reason: list[str] = Field(default_factory=list)
    field_recall_type: str
    field_related_to_outbreak: str | None = None
    field_risk_level: str | None = None
    field_last_modified_date: str | None = None
    field_states: list[str] = Field(default_factory=list)
    field_summary: str | None = None
    field_year: str | None = None
    langcode: str | None = None
    field_has_spanish: str | None = None

    @property
    def source_recall_id(self) -> str:
        exported = self.field_recall_number_export.strip()
        return exported or self.field_recall_number.strip()


class FSISResponse(RootModel[list[dict[str, Any]]]):
    """The FSIS endpoint returns a bare JSON array rather than an envelope."""
