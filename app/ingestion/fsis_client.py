from __future__ import annotations

import json
import logging
from datetime import date, datetime
from typing import Any, Protocol
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from pydantic import ValidationError

from app.ingestion.fsis_schemas import FSISRecallRecord, FSISResponse

logger = logging.getLogger(__name__)

FSIS_USER_AGENT = (
    "ReCall/0.2 public consumer food-safety recall ingestion "
    "(+https://github.com/TyBarber/ReCall)"
)
FSIS_API_REQUEST_HEADERS = {
    "Accept": "application/json",
    "User-Agent": FSIS_USER_AGENT,
}


class FSISJSONTransport(Protocol):
    def get_json(self, url: str) -> Any: ...


class UrllibFSISJSONTransport:
    def get_json(self, url: str) -> Any:
        request = Request(
            url,
            headers=FSIS_API_REQUEST_HEADERS,
        )
        with urlopen(request, timeout=60) as response:  # noqa: S310 - fixed HTTPS host
            return json.load(response)


def parse_fsis_date(value: str | None) -> date | None:
    if not value or not value.strip():
        return None
    return datetime.strptime(value.strip(), "%Y-%m-%d").date()


class FSISClient:
    base_url = "https://www.fsis.usda.gov/fsis/api/recall/v/1"

    def __init__(
        self,
        transport: FSISJSONTransport | None = None,
        *,
        base_url: str | None = None,
    ) -> None:
        self.transport = transport or UrllibFSISJSONTransport()
        self.url = base_url or self.base_url

    def fetch_snapshot(self) -> list[dict[str, Any]]:
        # English and Spanish variants share case numbers. Normalize the English
        # source record once while retaining the language-filtered raw snapshot.
        query = urlencode({"field_translation_language": "en"})
        url = f"{self.url}?{query}"
        logger.info(
            "Fetching USDA FSIS recall snapshot",
            extra={"source": "usda_fsis", "url": self.url},
        )
        payload = FSISResponse.model_validate(self.transport.get_json(url)).root
        # Retain only the English consumer record when the source includes both
        # translations. The endpoint filter is requested above, but this local
        # guard keeps source behavior explicit and deterministic.
        return [
            raw
            for raw in payload
            if str(raw.get("langcode", "English")).strip().casefold()
            in {"english", "en"}
        ]

    @staticmethod
    def records_for_first_run(
        snapshot: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], int]:
        """Select every valid English-history record, including missing update dates."""

        selected: list[dict[str, Any]] = []
        malformed = 0
        for raw in snapshot:
            try:
                record = FSISRecallRecord.model_validate(raw)
                if parse_fsis_date(record.field_recall_date) is None:
                    raise ValueError("FSIS issue date is empty")
                if (
                    record.field_last_modified_date
                    and record.field_last_modified_date.strip()
                ):
                    parse_fsis_date(record.field_last_modified_date)
            except (ValidationError, ValueError, TypeError) as exc:
                malformed += 1
                logger.warning(
                    "Skipping malformed USDA FSIS bootstrap record",
                    extra={"source": "usda_fsis", "error": str(exc)},
                )
                continue
            selected.append(raw)
        return selected, malformed

    @staticmethod
    def records_modified_in_window(
        snapshot: list[dict[str, Any]],
        *,
        start_at: datetime,
        end_at: datetime,
    ) -> tuple[list[dict[str, Any]], int, int]:
        """Select only rows with a source modification date in the inclusive window."""

        selected: list[dict[str, Any]] = []
        malformed = 0
        missing_last_modified = 0
        for raw in snapshot:
            try:
                record = FSISRecallRecord.model_validate(raw)
                if not record.field_last_modified_date or not record.field_last_modified_date.strip():
                    missing_last_modified += 1
                    continue
                discovery_date = parse_fsis_date(record.field_last_modified_date)
                if discovery_date is None:
                    raise ValueError("FSIS modification date is empty")
            except (ValidationError, ValueError, TypeError) as exc:
                malformed += 1
                logger.warning(
                    "Skipping malformed USDA FSIS discovery record",
                    extra={"source": "usda_fsis", "error": str(exc)},
                )
                continue
            if start_at.date() <= discovery_date <= end_at.date():
                selected.append(raw)
        return selected, malformed, missing_last_modified
