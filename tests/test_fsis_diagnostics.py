from __future__ import annotations

from email.message import Message
from urllib.error import HTTPError

from app.ingestion import fsis_diagnostics


def test_http_403_diagnostic_keeps_only_safe_metadata(monkeypatch) -> None:
    headers = Message()
    headers["Content-Type"] = "text/html"
    headers["Server"] = "AkamaiGHost"
    headers["Akamai-GRN"] = "edge-reference"
    headers["Set-Cookie"] = "must-not-be-recorded"
    error = HTTPError(
        "https://www.fsis.usda.gov/example",
        403,
        "Forbidden",
        headers,
        None,
    )
    error.read = lambda size: b"<html>Access Denied. Reference #18.safe</html>"  # type: ignore[method-assign]
    monkeypatch.setattr(
        fsis_diagnostics,
        "urlopen",
        lambda *args, **kwargs: (_ for _ in ()).throw(error),
    )

    result = fsis_diagnostics._probe(  # noqa: SLF001 - focused diagnostic test
        url="https://www.fsis.usda.gov/example",
        request_headers={"Accept": "application/json", "User-Agent": "ReCall"},
    )

    assert result["status"] == 403
    assert result["response_headers"] == {
        "content-type": "text/html",
        "server": "AkamaiGHost",
        "akamai-grn": "edge-reference",
    }
    assert "Access Denied" in result["body_preview"]
    assert "set-cookie" not in result["response_headers"]


def test_connectivity_diagnostic_probes_api_and_official_rss_once(monkeypatch) -> None:
    calls = []

    def fake_probe(**kwargs):
        calls.append(kwargs)
        return {"status": 403}

    monkeypatch.setattr(fsis_diagnostics, "_probe", fake_probe)

    result = fsis_diagnostics.run_fsis_connectivity_diagnostics(
        api_base_url="https://www.fsis.usda.gov/fsis/api/recall/v/1",
        aws_region="us-east-1",
        aws_request_id="request-1",
    )

    assert result["aws_region"] == "us-east-1"
    assert result["aws_request_id"] == "request-1"
    assert len(calls) == 2
    assert calls[0]["url"].endswith("?field_translation_language=en")
    assert calls[1]["url"] == fsis_diagnostics.FSIS_RECALLS_RSS_URL
    assert calls[1]["parse_rss"] is True
