from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app.ingestion.fsis_aws_pipeline import USDAFSISAWSIngestionPipeline
from app.ingestion.fsis_client import FSISClient
from app.services.checkpoint import IngestionCheckpoint

FIXTURES = Path(__file__).parent / "fixtures" / "fsis"
NOW = datetime(2026, 9, 4, 12, tzinfo=timezone.utc)


def load_fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


class FakeFSISClient:
    def __init__(self, snapshot: list[dict]) -> None:
        self.snapshot = snapshot

    def fetch_snapshot(self):
        return self.snapshot

    records_for_first_run = staticmethod(FSISClient.records_for_first_run)
    records_modified_in_window = staticmethod(FSISClient.records_modified_in_window)


class FakeArchive:
    bucket = "raw-bucket"

    def __init__(self) -> None:
        self.pages = []
        self.records = []
        self.manifests = []

    def archive_page(self, **kwargs):
        self.pages.append(kwargs)
        return "page.json"

    def archive_record(self, **kwargs):
        self.records.append(kwargs)
        return f"record-{len(self.records)}.json", "etag"

    def archive_manifest(self, **kwargs):
        self.manifests.append(kwargs["payload"])
        return "manifest.json"


class FakePublisher:
    def __init__(self, fail: bool = False) -> None:
        self.messages = []
        self.fail = fail

    def publish(self, message):
        if self.fail:
            raise RuntimeError("queue unavailable")
        self.messages.append(message)
        return "message-id"


class FakeCheckpoints:
    def __init__(self, current=None) -> None:
        self.current = current
        self.advanced = []
        self.get_sources = []

    def get(self, source):
        self.get_sources.append(source)
        return self.current

    def advance(self, checkpoint):
        self.advanced.append(checkpoint)


def make_pipeline(*, checkpoints, publisher=None, snapshot=None, max_records=5000):
    return USDAFSISAWSIngestionPipeline(
        client=FakeFSISClient(snapshot or []),
        archive=FakeArchive(),
        publisher=publisher or FakePublisher(),
        checkpoints=checkpoints,
        overlap=timedelta(days=1),
        max_records=max_records,
        clock=lambda: NOW,
        id_factory=lambda: "fsis-ingestion-1",
    )


def test_fsis_checkpoint_source_first_run_window_and_raw_keys() -> None:
    checkpoints = FakeCheckpoints()
    raw = {
        **load_fixture("class_i_state_specific.json"),
        "field_last_modified_date": "2026-09-04",
    }
    historical_without_modified = {
        **load_fixture("public_health_alert_nationwide.json"),
        "field_recall_date": "2007-02-01",
        "field_last_modified_date": "",
    }
    pipeline = make_pipeline(
        checkpoints=checkpoints,
        snapshot=[raw, historical_without_modified],
    )

    result = pipeline.run()

    assert checkpoints.get_sources == ["usda_fsis"]
    assert result.window_start is None
    assert result.records == 2
    assert pipeline.archive.pages[0]["source"] == "usda_fsis"
    assert pipeline.archive.records[0]["source"] == "usda_fsis"
    assert pipeline.publisher.messages[0].source == "usda_fsis"
    assert pipeline.archive.manifests[0]["selection_mode"] == "full_history"
    assert pipeline.archive.manifests[0]["incremental_field"] is None
    assert pipeline.archive.manifests[0]["missing_last_modified_excluded"] == 0
    assert checkpoints.advanced[0].source == "usda_fsis"
    assert checkpoints.advanced[0].last_successful_ingestion_at == NOW


def test_fsis_existing_checkpoint_uses_one_day_overlap() -> None:
    prior = IngestionCheckpoint(
        "usda_fsis",
        NOW - timedelta(days=3),
        "previous",
        NOW - timedelta(days=3),
    )
    in_window = {
        **load_fixture("class_i_state_specific.json"),
        "field_last_modified_date": "2026-09-02",
    }
    missing_modified = {
        **load_fixture("public_health_alert_nationwide.json"),
        "field_last_modified_date": "",
    }
    pipeline = make_pipeline(
        checkpoints=FakeCheckpoints(prior),
        snapshot=[in_window, missing_modified],
    )

    result = pipeline.run()

    assert result.window_start == prior.last_successful_ingestion_at - timedelta(days=1)
    assert result.records == 1
    assert len(pipeline.publisher.messages) == 1
    assert pipeline.archive.manifests[0]["selection_mode"] == "incremental_modified_date"
    assert pipeline.archive.manifests[0]["incremental_field"] == "field_last_modified_date"
    assert pipeline.archive.manifests[0]["missing_last_modified_excluded"] == 1


def test_fsis_failure_does_not_advance_checkpoint() -> None:
    checkpoints = FakeCheckpoints()
    raw = {
        **load_fixture("class_i_state_specific.json"),
        "field_last_modified_date": "2026-09-04",
    }
    pipeline = make_pipeline(
        checkpoints=checkpoints,
        publisher=FakePublisher(fail=True),
        snapshot=[raw],
    )

    with pytest.raises(RuntimeError, match="queue unavailable"):
        pipeline.run()
    assert checkpoints.advanced == []


def test_fsis_safety_bound_fails_without_checkpoint_advancement() -> None:
    checkpoints = FakeCheckpoints()
    raw = {
        **load_fixture("class_i_state_specific.json"),
        "field_last_modified_date": "2026-09-04",
    }
    pipeline = make_pipeline(checkpoints=checkpoints, snapshot=[raw], max_records=0)

    with pytest.raises(RuntimeError, match="exceeded"):
        pipeline.run()
    assert checkpoints.advanced == []


def test_fsis_zero_record_window_archives_manifest_and_advances() -> None:
    checkpoints = FakeCheckpoints()
    pipeline = make_pipeline(checkpoints=checkpoints, snapshot=[])

    result = pipeline.run()

    assert result.pages == 1
    assert result.records == 0
    assert pipeline.archive.manifests[0]["snapshot_records"] == 0
    assert checkpoints.advanced[0].last_successful_ingestion_at == NOW
