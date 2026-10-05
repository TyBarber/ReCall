from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.ingestion.fsis_client import FSISClient

FIXTURES = Path(__file__).parent / "fixtures" / "fsis"


def load_fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


class FakeTransport:
    def __init__(self, payload) -> None:
        self.payload = payload
        self.urls: list[str] = []

    def get_json(self, url: str):
        self.urls.append(url)
        return self.payload


def test_fsis_api_parses_bare_array_and_requests_english_records() -> None:
    raw = load_fixture("class_i_state_specific.json")
    spanish = {**raw, "langcode": "Spanish", "field_title": "Producto"}
    transport = FakeTransport([raw, spanish])

    snapshot = FSISClient(transport).fetch_snapshot()

    assert snapshot == [raw]
    assert transport.urls == [
        "https://www.fsis.usda.gov/fsis/api/recall/v/1?field_translation_language=en"
    ]


def test_fsis_api_rejects_non_array_response() -> None:
    with pytest.raises(ValidationError):
        FSISClient(FakeTransport({"results": []})).fetch_snapshot()


def test_fsis_first_run_selects_full_history_including_missing_modified_date() -> None:
    modified = load_fixture("class_ii_detailed.json")
    issue_date_only = {
        **load_fixture("class_i_state_specific.json"),
        "field_recall_date": "2005-01-01",
        "field_last_modified_date": "",
    }
    selected, skipped = FSISClient.records_for_first_run([modified, issue_date_only])

    assert selected == [modified, issue_date_only]
    assert skipped == 0


def test_fsis_subsequent_run_uses_only_modified_date_and_excludes_missing() -> None:
    in_window = {
        **load_fixture("class_ii_detailed.json"),
        "field_last_modified_date": "2026-08-25",
    }
    outside_window = {
        **load_fixture("public_health_alert_nationwide.json"),
        "field_last_modified_date": "2026-08-01",
    }
    missing_modified = {
        **load_fixture("class_i_state_specific.json"),
        "field_last_modified_date": "   ",
    }
    selected, skipped, missing = FSISClient.records_modified_in_window(
        [in_window, outside_window, missing_modified],
        start_at=datetime(2026, 8, 24, tzinfo=timezone.utc),
        end_at=datetime(2026, 8, 26, tzinfo=timezone.utc),
    )

    assert selected == [in_window]
    assert skipped == 0
    assert missing == 1


def test_fsis_window_skips_malformed_record_without_losing_valid_record() -> None:
    valid = load_fixture("class_i_state_specific.json")
    selected, skipped, missing = FSISClient.records_modified_in_window(
        [{"field_recall_date": "not-a-date"}, valid],
        start_at=datetime(2026, 8, 25, tzinfo=timezone.utc),
        end_at=datetime(2026, 8, 27, tzinfo=timezone.utc),
    )

    assert selected == [valid]
    assert skipped == 1
    assert missing == 0
