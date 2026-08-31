from __future__ import annotations

import json
import logging
from collections.abc import Iterator
from datetime import datetime
from typing import Any, Protocol
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.ingestion.fda_schemas import FDAResponse

logger = logging.getLogger(__name__)


class JSONTransport(Protocol):
    def get_json(self, url: str) -> dict[str, Any]: ...


class UrllibJSONTransport:
    def get_json(self, url: str) -> dict[str, Any]:
        request = Request(url, headers={"User-Agent": "recall-tracker/0.1"})
        try:
            with urlopen(request, timeout=30) as response:  # noqa: S310 - fixed HTTPS host
                return json.load(response)
        except HTTPError as exc:
            try:
                payload = json.loads(exc.read())
            except (json.JSONDecodeError, UnicodeDecodeError):
                raise exc
            error = payload.get("error", {}) if isinstance(payload, dict) else {}
            if (
                exc.code == 404
                and error.get("code") == "NOT_FOUND"
                and error.get("message") == "No matches found!"
            ):
                logger.info("openFDA query returned no matching records")
                return {"results": []}
            raise


class FDAClient:
    base_url = "https://api.fda.gov/food/enforcement.json"

    def __init__(self, transport: JSONTransport | None = None) -> None:
        self.transport = transport or UrllibJSONTransport()

    def fetch(self, *, limit: int = 100, max_records: int | None = None) -> Iterator[dict[str, Any]]:
        for page in self.fetch_pages(limit=limit, max_records=max_records):
            yield from FDAResponse.model_validate(page).results

    def fetch_pages(
        self,
        *,
        limit: int = 100,
        max_records: int | None = None,
        start_at: datetime | None = None,
        end_at: datetime | None = None,
    ) -> Iterator[dict[str, Any]]:
        if limit < 1 or limit > 1000:
            raise ValueError("limit must be between 1 and 1000")

        skip = 0
        yielded = 0
        while max_records is None or yielded < max_records:
            page_limit = min(limit, max_records - yielded) if max_records is not None else limit
            parameters: dict[str, Any] = {"limit": page_limit, "skip": skip}
            if start_at and end_at:
                start = start_at.strftime("%Y%m%d")
                end = end_at.strftime("%Y%m%d")
                parameters["search"] = f"report_date:[{start}+TO+{end}]"
            url = f"{self.base_url}?{urlencode(parameters, safe=':+[]')}"
            logger.info("Fetching FDA recalls", extra={"skip": skip, "limit": page_limit})
            raw_payload = self.transport.get_json(url)
            payload = FDAResponse.model_validate(raw_payload)
            if not payload.results:
                break
            yield raw_payload
            yielded += len(payload.results)
            if len(payload.results) < page_limit:
                break
            skip += len(payload.results)
