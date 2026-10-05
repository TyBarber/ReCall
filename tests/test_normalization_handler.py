from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from app.aws.normalization_handler import process_normalization_event
from app.aws.sqs_models import NormalizationMessage, RawRecordReference


VALID_RAW = {
    "recall_number": "F-1",
    "product_description": "Food",
    "reason_for_recall": "Reason",
    "status": "Ongoing",
}
FSIS_RAW = json.loads(
    (
        Path(__file__).parent
        / "fixtures"
        / "fsis"
        / "public_health_alert_nationwide.json"
    ).read_text()
)


class FakeArchive:
    def __init__(self, records):
        self.records = records

    def read_json(self, *, bucket, key):
        value = self.records[key]
        if isinstance(value, Exception):
            raise value
        return value


def message_body(key: str, recall_id: str = "F-1", source: str = "fda") -> str:
    return NormalizationMessage(
        ingestion_id="ingestion-1",
        source=source,
        source_recall_id=recall_id,
        raw_record=RawRecordReference(bucket="raw", key=key),
        fetched_at=datetime.now(timezone.utc),
    ).model_dump_json()


def test_sqs_handler_normalizes_successfully(repository) -> None:
    event = {"Records": [{"messageId": "one", "body": message_body("one")}]}
    response = process_normalization_event(
        event, archive=FakeArchive({"one": VALID_RAW}), repository=repository
    )
    assert response == {"batchItemFailures": []}
    assert len(repository.list()) == 1


def test_sqs_handler_dispatches_usda_fsis_public_health_alert(repository) -> None:
    event = {
        "Records": [
            {
                "messageId": "fsis-one",
                "body": message_body(
                    "fsis-one",
                    "PHA-08082026-01",
                    source="usda_fsis",
                ),
            }
        ]
    }

    response = process_normalization_event(
        event,
        archive=FakeArchive({"fsis-one": FSIS_RAW}),
        repository=repository,
    )

    assert response == {"batchItemFailures": []}
    recall = repository.list()[0]
    assert recall.source.value == "usda_fsis"
    assert recall.record_type.value == "public_health_alert"
    assert recall.classification is None


def test_malformed_fsis_record_is_acknowledged(repository) -> None:
    event = {
        "Records": [
            {
                "messageId": "bad-fsis",
                "body": message_body("bad-fsis", "bad", source="usda_fsis"),
            }
        ]
    }
    response = process_normalization_event(
        event,
        archive=FakeArchive({"bad-fsis": {"field_recall_number": "bad"}}),
        repository=repository,
    )
    assert response == {"batchItemFailures": []}
    assert repository.list() == []


def test_malformed_fda_record_is_acknowledged(repository) -> None:
    event = {"Records": [{"messageId": "bad", "body": message_body("bad")}]}
    response = process_normalization_event(
        event, archive=FakeArchive({"bad": {"recall_number": "bad"}}), repository=repository
    )
    assert response == {"batchItemFailures": []}
    assert repository.list() == []


def test_partial_batch_failure_only_returns_failed_message(repository) -> None:
    event = {
        "Records": [
            {"messageId": "good", "body": message_body("good")},
            {"messageId": "retry", "body": message_body("retry", "F-2")},
        ]
    }
    response = process_normalization_event(
        event,
        archive=FakeArchive({"good": VALID_RAW, "retry": RuntimeError("S3 unavailable")}),
        repository=repository,
    )
    assert response == {"batchItemFailures": [{"itemIdentifier": "retry"}]}
    assert len(repository.list()) == 1


def test_malformed_sqs_envelope_is_failed(repository) -> None:
    event = {"Records": [{"messageId": "bad-envelope", "body": json.dumps({"wrong": True})}]}
    response = process_normalization_event(
        event, archive=FakeArchive({}), repository=repository
    )
    assert response == {"batchItemFailures": [{"itemIdentifier": "bad-envelope"}]}
