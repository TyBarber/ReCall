from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.ingestion.aws_pipeline import FDAAWSIngestionPipeline, calculate_ingestion_window
from app.services.checkpoint import IngestionCheckpoint

NOW = datetime(2026, 8, 30, 12, 0, tzinfo=timezone.utc)
PAGE = {
    "results": [
        {
            "recall_number": "F-1",
            "product_description": "Food",
            "reason_for_recall": "Reason",
            "status": "Ongoing",
        }
    ]
}


class FakeFDAClient:
    def __init__(self, pages=None) -> None:
        self.calls = []
        self.pages = [PAGE] if pages is None else pages

    def fetch_pages(self, **kwargs):
        self.calls.append(kwargs)
        yield from self.pages


class FakeArchive:
    bucket = "raw-bucket"

    def __init__(self) -> None:
        self.manifests = []

    def archive_page(self, **kwargs):
        return "page.json"

    def archive_record(self, **kwargs):
        return "record.json", "etag"

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
        return "message-1"


class FakeCheckpoints:
    def __init__(self, current=None) -> None:
        self.current = current
        self.advanced = []

    def get(self, source):
        return self.current

    def advance(self, checkpoint):
        self.advanced.append(checkpoint)


def make_pipeline(checkpoints, publisher=None, client=None):
    return FDAAWSIngestionPipeline(
        client=client or FakeFDAClient(),
        archive=FakeArchive(),
        publisher=publisher or FakePublisher(),
        checkpoints=checkpoints,
        overlap=timedelta(hours=2),
        first_run_lookback=timedelta(days=60),
        page_size=100,
        max_records=1000,
        clock=lambda: NOW,
        id_factory=lambda: "ingestion-1",
    )


def test_first_run_uses_configured_lookback() -> None:
    start, end = calculate_ingestion_window(
        now=NOW,
        checkpoint=None,
        overlap=timedelta(hours=2),
        first_run_lookback=timedelta(days=60),
    )
    assert start == NOW - timedelta(days=60)
    assert end == NOW


def test_checkpoint_window_includes_overlap() -> None:
    prior = IngestionCheckpoint("fda", NOW - timedelta(days=1), "old", NOW - timedelta(days=1))
    start, _ = calculate_ingestion_window(
        now=NOW,
        checkpoint=prior,
        overlap=timedelta(hours=2),
        first_run_lookback=timedelta(days=30),
    )
    assert start == prior.last_successful_ingestion_at - timedelta(hours=2)


def test_success_advances_checkpoint_after_queueing() -> None:
    checkpoints = FakeCheckpoints()
    pipeline = make_pipeline(checkpoints)
    result = pipeline.run()
    assert result.records == 1
    assert checkpoints.advanced[0].last_successful_ingestion_at == NOW
    assert checkpoints.advanced[0].last_ingestion_id == "ingestion-1"


def test_failure_does_not_advance_checkpoint() -> None:
    checkpoints = FakeCheckpoints()
    pipeline = make_pipeline(checkpoints, FakePublisher(fail=True))
    with pytest.raises(RuntimeError, match="queue unavailable"):
        pipeline.run()
    assert checkpoints.advanced == []


def test_zero_record_run_completes_and_advances_checkpoint() -> None:
    checkpoints = FakeCheckpoints()
    pipeline = make_pipeline(checkpoints, client=FakeFDAClient(pages=[]))
    result = pipeline.run()
    assert result.pages == 0
    assert result.records == 0
    assert checkpoints.advanced[0].last_successful_ingestion_at == NOW
