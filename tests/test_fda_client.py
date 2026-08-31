from __future__ import annotations

import io
import json
from datetime import datetime, timezone
from urllib.error import HTTPError

import pytest

from app.ingestion import fda_client
from app.ingestion.fda_client import FDAClient, UrllibJSONTransport


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        self.close()


def http_error(status: int, payload: dict | bytes) -> HTTPError:
    body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
    return HTTPError("https://api.fda.gov/test", status, "error", {}, io.BytesIO(body))


def raising(error: Exception):
    def raise_error(*args, **kwargs):
        raise error

    return raise_error


def test_specific_openfda_no_matches_404_returns_empty_results(monkeypatch) -> None:
    error = http_error(
        404,
        {"error": {"code": "NOT_FOUND", "message": "No matches found!"}},
    )
    monkeypatch.setattr(fda_client, "urlopen", raising(error))
    assert list(FDAClient().fetch(limit=1, max_records=1)) == []


def test_unrelated_404_is_raised(monkeypatch) -> None:
    error = http_error(404, {"error": {"code": "NOT_FOUND", "message": "Unknown endpoint"}})
    monkeypatch.setattr(fda_client, "urlopen", raising(error))
    with pytest.raises(HTTPError) as raised:
        UrllibJSONTransport().get_json("https://api.fda.gov/test")
    assert raised.value.code == 404


def test_server_failure_is_raised(monkeypatch) -> None:
    error = http_error(500, {"error": {"code": "SERVER_ERROR", "message": "Unavailable"}})
    monkeypatch.setattr(fda_client, "urlopen", raising(error))
    with pytest.raises(HTTPError) as raised:
        UrllibJSONTransport().get_json("https://api.fda.gov/test")
    assert raised.value.code == 500


def test_rate_limit_is_raised(monkeypatch) -> None:
    error = http_error(429, {"error": {"code": "TOO_MANY_REQUESTS", "message": "Slow down"}})
    monkeypatch.setattr(fda_client, "urlopen", raising(error))
    with pytest.raises(HTTPError) as raised:
        UrllibJSONTransport().get_json("https://api.fda.gov/test")
    assert raised.value.code == 429


def test_malformed_404_is_raised(monkeypatch) -> None:
    error = http_error(404, b"not-json")
    monkeypatch.setattr(fda_client, "urlopen", raising(error))
    with pytest.raises(HTTPError) as raised:
        UrllibJSONTransport().get_json("https://api.fda.gov/test")
    assert raised.value.code == 404


def test_successful_response_returns_records(monkeypatch) -> None:
    payload = {"results": [{"recall_number": "F-1"}]}
    monkeypatch.setattr(
        fda_client,
        "urlopen",
        lambda *args, **kwargs: FakeResponse(json.dumps(payload).encode()),
    )
    assert UrllibJSONTransport().get_json("https://api.fda.gov/test") == payload


def test_discovery_uses_report_date_when_initiation_date_is_old() -> None:
    class CapturingTransport:
        def __init__(self) -> None:
            self.url = ""

        def get_json(self, url: str):
            self.url = url
            return {
                "results": [
                    {
                        "recall_number": "F-1",
                        "product_description": "Food",
                        "reason_for_recall": "Reason",
                        "status": "Ongoing",
                        "recall_initiation_date": "20250101",
                        "report_date": "20260812",
                    }
                ]
            }

    transport = CapturingTransport()
    pages = list(
        FDAClient(transport).fetch_pages(
            limit=100,
            max_records=100,
            start_at=datetime(2026, 8, 1, tzinfo=timezone.utc),
            end_at=datetime(2026, 8, 30, tzinfo=timezone.utc),
        )
    )
    assert pages[0]["results"][0]["recall_initiation_date"] == "20250101"
    assert pages[0]["results"][0]["report_date"] == "20260812"
    assert "search=report_date:" in transport.url
    assert "recall_initiation_date" not in transport.url
