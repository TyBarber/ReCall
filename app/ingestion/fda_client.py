from __future__ import annotations

import json
import logging
from collections.abc import Iterator
from typing import Any, Protocol
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.ingestion.fda_schemas import FDAResponse

logger = logging.getLogger(__name__)


class JSONTransport(Protocol):
    def get_json(self, url: str) -> dict[str, Any]: ...


class UrllibJSONTransport:
    def get_json(self, url: str) -> dict[str, Any]:
        request = Request(url, headers={"User-Agent": "recall-tracker/0.1"})
        with urlopen(request, timeout=30) as response:  # noqa: S310 - fixed HTTPS host
            return json.load(response)


class FDAClient:
    base_url = "https://api.fda.gov/food/enforcement.json"

    def __init__(self, transport: JSONTransport | None = None) -> None:
        self.transport = transport or UrllibJSONTransport()

    def fetch(self, *, limit: int = 100, max_records: int | None = None) -> Iterator[dict[str, Any]]:
        if limit < 1 or limit > 1000:
            raise ValueError("limit must be between 1 and 1000")

        skip = 0
        yielded = 0
        while max_records is None or yielded < max_records:
            page_limit = min(limit, max_records - yielded) if max_records is not None else limit
            url = f"{self.base_url}?{urlencode({'limit': page_limit, 'skip': skip})}"
            logger.info("Fetching FDA recalls", extra={"skip": skip, "limit": page_limit})
            payload = FDAResponse.model_validate(self.transport.get_json(url))
            if not payload.results:
                break
            for record in payload.results:
                yield record
                yielded += 1
            if len(payload.results) < page_limit:
                break
            skip += len(payload.results)

