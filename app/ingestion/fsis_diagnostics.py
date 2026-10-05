from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from xml.etree import ElementTree

from app.ingestion.fsis_client import FSIS_API_REQUEST_HEADERS, FSIS_USER_AGENT

FSIS_RECALLS_RSS_URL = "https://www.fsis.usda.gov/fsis-content/rss/recalls.xml"
FSIS_RSS_REQUEST_HEADERS = {
    "Accept": "application/rss+xml, application/xml;q=0.9",
    "User-Agent": FSIS_USER_AGENT,
}

_SAFE_RESPONSE_HEADERS = {
    "akamai-grn",
    "cf-ray",
    "content-type",
    "server",
    "via",
    "x-akamai-request-id",
    "x-amz-cf-id",
    "x-cache",
    "x-cache-hits",
    "x-reference-error",
    "x-request-id",
    "x-served-by",
}
_BODY_PREVIEW_BYTES = 512
_RSS_MAX_BYTES = 2_000_000


def _safe_headers(headers: Any) -> dict[str, str]:
    return {
        name.casefold(): value.strip()
        for name, value in headers.items()
        if name.casefold() in _SAFE_RESPONSE_HEADERS
    }


def _body_preview(body: bytes) -> str:
    decoded = body.decode("utf-8", errors="replace")
    return re.sub(r"\s+", " ", decoded).strip()[:_BODY_PREVIEW_BYTES]


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _rss_summary(body: bytes) -> dict[str, Any]:
    root = ElementTree.fromstring(body)  # noqa: S314 - trusted, bounded source response
    items = [element for element in root.iter() if _local_name(element.tag) == "item"]
    fields = sorted(
        {
            _local_name(child.tag)
            for item in items
            for child in list(item)
        }
    )

    def item_text(item: ElementTree.Element, field: str) -> str:
        for child in list(item):
            if _local_name(child.tag) == field:
                return "".join(child.itertext()).strip()
        return ""

    titles = [item_text(item, "title") for item in items]
    descriptions = [item_text(item, "description") for item in items]
    description_lengths = [len(value) for value in descriptions if value]
    if not description_lengths:
        content_mode = "links_only"
    elif max(description_lengths) >= 500:
        content_mode = "full_or_long_summary_content"
    else:
        content_mode = "short_summary_content"

    return {
        "item_count": len(items),
        "item_fields": fields,
        "contains_recall_titles": any("recall" in title.casefold() for title in titles),
        "contains_public_health_alert_titles": any(
            "public health alert" in title.casefold() for title in titles
        ),
        "content_mode": content_mode,
        "sample_items": [
            {
                "title": item_text(item, "title")[:240],
                "link": item_text(item, "link")[:500],
                "guid": item_text(item, "guid")[:500],
                "pubDate": item_text(item, "pubDate")[:100],
                "description_length": len(item_text(item, "description")),
            }
            for item in items[:3]
        ],
    }


def _probe(
    *,
    url: str,
    request_headers: dict[str, str],
    parse_rss: bool = False,
) -> dict[str, Any]:
    timestamp = datetime.now(timezone.utc).isoformat()
    request = Request(url, headers=request_headers)
    try:
        with urlopen(request, timeout=60) as response:  # noqa: S310 - fixed HTTPS hosts
            body = response.read(_RSS_MAX_BYTES + 1)
            result: dict[str, Any] = {
                "url": url,
                "timestamp_utc": timestamp,
                "request_headers": request_headers,
                "status": response.status,
                "response_headers": _safe_headers(response.headers),
                "body_preview": _body_preview(body),
                "response_truncated": len(body) > _RSS_MAX_BYTES,
            }
            if parse_rss and len(body) <= _RSS_MAX_BYTES:
                try:
                    result["rss"] = _rss_summary(body)
                except ElementTree.ParseError as exc:
                    result["rss_parse_error"] = str(exc)
            return result
    except HTTPError as exc:
        body = exc.read(_BODY_PREVIEW_BYTES)
        return {
            "url": url,
            "timestamp_utc": timestamp,
            "request_headers": request_headers,
            "status": exc.code,
            "response_headers": _safe_headers(exc.headers),
            "body_preview": _body_preview(body),
        }
    except URLError as exc:
        return {
            "url": url,
            "timestamp_utc": timestamp,
            "request_headers": request_headers,
            "network_error": str(exc.reason),
        }


def run_fsis_connectivity_diagnostics(
    *,
    api_base_url: str,
    aws_region: str,
    aws_request_id: str | None,
) -> dict[str, Any]:
    api_url = f"{api_base_url}?{urlencode({'field_translation_language': 'en'})}"
    return {
        "diagnostic": "usda_fsis_connectivity",
        "aws_region": aws_region,
        "aws_request_id": aws_request_id,
        "api": _probe(url=api_url, request_headers=FSIS_API_REQUEST_HEADERS),
        "rss": _probe(
            url=FSIS_RECALLS_RSS_URL,
            request_headers=FSIS_RSS_REQUEST_HEADERS,
            parse_rss=True,
        ),
    }
