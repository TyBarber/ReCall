from __future__ import annotations

from datetime import date

from app.models.recall import RecallRecordType, RecallSort, RecallSource
from app.services.recall_query import query_recalls


class TrackingRepository:
    def __init__(self, fda, fsis) -> None:
        self.by_source = {RecallSource.FDA: fda, RecallSource.USDA_FSIS: fsis}
        self.list_calls = []

    def list(self, **kwargs):
        self.list_calls.append(kwargs)
        values = self.by_source[kwargs["source"]]
        if kwargs.get("status"):
            values = [
                recall
                for recall in values
                if recall.status.casefold() == kwargs["status"].casefold()
            ]
        if kwargs.get("record_type"):
            values = [
                recall
                for recall in values
                if recall.record_type == kwargs["record_type"]
            ]
        return sorted(
            values,
            key=lambda recall: (recall.reported_at or date.min, recall.id),
            reverse=True,
        )[: kwargs["limit"]]

    def count(self, **kwargs):
        values = self.by_source[kwargs["source"]]
        if kwargs.get("status"):
            values = [
                recall
                for recall in values
                if recall.status.casefold() == kwargs["status"].casefold()
            ]
        if kwargs.get("record_type"):
            values = [
                recall
                for recall in values
                if recall.record_type == kwargs["record_type"]
            ]
        return len(values)


def test_cross_source_newest_uses_bounded_per_source_queries(sample_recall) -> None:
    fda = sample_recall.model_copy(update={"reported_at": date(2026, 8, 1)})
    fsis = sample_recall.model_copy(
        update={
            "id": "fsis",
            "source": RecallSource.USDA_FSIS,
            "source_recall_id": "001-2026",
            "reported_at": date(2026, 9, 1),
        }
    )
    repository = TrackingRepository([fda], [fsis])

    result = query_recalls(
        repository,
        search=None,
        source=None,
        status=None,
        record_type=None,
        sort=RecallSort.NEWEST,
        limit=1,
        offset=0,
    )

    assert [recall.id for recall in result.recalls] == ["fsis"]
    assert result.total_count == 2
    assert [call["source"] for call in repository.list_calls] == [
        RecallSource.FDA,
        RecallSource.USDA_FSIS,
    ]
    assert all(call["limit"] == 1 for call in repository.list_calls)
    assert all(call["sort"] == RecallSort.NEWEST for call in repository.list_calls)


def test_cross_source_newest_deep_offset_fetches_enough_per_source(sample_recall) -> None:
    fda = [
        sample_recall.model_copy(
            update={
                "id": f"fda-{day}",
                "source_recall_id": f"F-{day}",
                "reported_at": date(2026, 9, day),
            }
        )
        for day in (10, 8, 6, 4, 2)
    ]
    fsis = [
        sample_recall.model_copy(
            update={
                "id": f"fsis-{day}",
                "source": RecallSource.USDA_FSIS,
                "source_recall_id": f"FSIS-{day}",
                "reported_at": date(2026, 9, day),
            }
        )
        for day in (9, 7, 5, 3, 1)
    ]
    repository = TrackingRepository(fda, fsis)

    result = query_recalls(
        repository,
        search=None,
        source=None,
        status=None,
        record_type=None,
        sort=RecallSort.NEWEST,
        limit=3,
        offset=4,
    )

    assert [recall.id for recall in result.recalls] == ["fda-6", "fsis-5", "fda-4"]
    assert result.total_count == 10
    assert all(call["limit"] == 7 for call in repository.list_calls)


def test_cross_source_newest_applies_record_type_to_results_and_total(sample_recall) -> None:
    alert = sample_recall.model_copy(
        update={
            "id": "fsis-alert",
            "source": RecallSource.USDA_FSIS,
            "source_recall_id": "PHA-1",
            "record_type": RecallRecordType.PUBLIC_HEALTH_ALERT,
            "status": "Public Health Alert",
            "reported_at": date(2026, 9, 1),
        }
    )
    repository = TrackingRepository([sample_recall], [alert])

    result = query_recalls(
        repository,
        search=None,
        source=None,
        status=None,
        record_type=RecallRecordType.PUBLIC_HEALTH_ALERT,
        sort=RecallSort.NEWEST,
        limit=10,
        offset=0,
    )

    assert [recall.id for recall in result.recalls] == ["fsis-alert"]
    assert result.total_count == 1
