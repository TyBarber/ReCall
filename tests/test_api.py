from __future__ import annotations

from datetime import date, datetime, timezone

from app.models.recall import Recall, RecallRecordType, RecallSource


def test_health(client) -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_get_recall(client, sample_recall) -> None:
    response = client.get(f"/recalls/{sample_recall.id}")
    assert response.status_code == 200
    assert response.json()["product_name"] == "Peanut Butter"
    assert response.json()["recalling_firm"] == "Example Foods, Inc."
    assert response.json()["product_code_info"] == "Lot ABC-123; UPC 123456789012"
    assert client.get("/recalls/missing").status_code == 404


def test_filters(client) -> None:
    assert len(client.get("/recalls", params={"search": "salmonella"}).json()) == 1
    assert len(client.get("/recalls", params={"source": "fda"}).json()) == 1
    assert len(client.get("/recalls", params={"status": "ongoing"}).json()) == 1
    assert client.get("/recalls", params={"search": "undeclared milk"}).json() == []


def test_total_count_headers_match_current_filters(
    client, repository, sample_recall
) -> None:
    repository.upsert(
        sample_recall.model_copy(
            update={
                "id": "recall-2",
                "source_recall_id": "F-1001-2025",
                "product_name": "Chocolate Cookies",
                "recall_reason": "Undeclared milk",
                "status": "Completed",
            }
        )
    )

    unfiltered = client.get("/recalls")
    completed = client.get("/recalls", params={"status": "completed"})
    searched = client.get("/recalls", params={"search": "salmonella"})
    combined = client.get(
        "/recalls", params={"search": "cookies", "status": "completed"}
    )

    assert isinstance(unfiltered.json(), list)
    assert unfiltered.headers["x-total-count"] == "2"
    assert unfiltered.headers["x-limit"] == "100"
    assert unfiltered.headers["x-offset"] == "0"
    assert completed.headers["x-total-count"] == "1"
    assert searched.headers["x-total-count"] == "1"
    assert combined.headers["x-total-count"] == "1"


def test_cross_source_total_counts_match_supported_filter_combinations(
    client, repository, sample_recall
) -> None:
    repository.upsert(
        sample_recall.model_copy(
            update={
                "id": "fda-completed",
                "source_recall_id": "F-2000-2026",
                "product_name": "FDA cheese recall",
                "status": "Completed",
            }
        )
    )
    repository.upsert(
        sample_recall.model_copy(
            update={
                "id": "fsis-recall",
                "source": RecallSource.USDA_FSIS,
                "source_recall_id": "020-2026",
                "product_name": "FSIS beef recall",
                "status": "Active Recall",
            }
        )
    )
    repository.upsert(
        sample_recall.model_copy(
            update={
                "id": "fsis-alert",
                "source": RecallSource.USDA_FSIS,
                "source_recall_id": "PHA-2026-1",
                "record_type": RecallRecordType.PUBLIC_HEALTH_ALERT,
                "product_name": "FSIS chicken alert",
                "status": "Public Health Alert",
            }
        )
    )

    cases = [
        ({}, 4),
        ({"source": "fda"}, 2),
        ({"source": "usda_fsis"}, 2),
        ({"record_type": "recall"}, 3),
        ({"record_type": "public_health_alert"}, 1),
        ({"record_type": "public_health_alert", "sort": "newest"}, 1),
        ({"search": "FSIS"}, 2),
        ({"source": "usda_fsis", "record_type": "recall"}, 1),
        (
            {
                "source": "usda_fsis",
                "record_type": "public_health_alert",
                "status": "Public Health Alert",
                "search": "chicken",
            },
            1,
        ),
        ({"source": "usda_fsis", "status": "Ongoing"}, 0),
    ]

    for params, expected in cases:
        response = client.get("/recalls", params=params)
        assert response.status_code == 200
        assert len(response.json()) == expected
        assert response.headers["x-total-count"] == str(expected)


def test_pagination(client, repository, sample_recall) -> None:
    repository.upsert(
        sample_recall.model_copy(
            update={"id": "recall-2", "source_recall_id": "F-1001-2025", "product_name": "Cookies"}
        )
    )
    first_response = client.get("/recalls", params={"limit": 1, "offset": 0})
    second_response = client.get("/recalls", params={"limit": 1, "offset": 1})
    first = first_response.json()
    second = second_response.json()
    assert len(first) == len(second) == 1
    assert first[0]["id"] != second[0]["id"]
    assert first_response.headers["x-total-count"] == "2"
    assert second_response.headers["x-total-count"] == "2"
    assert second_response.headers["x-limit"] == "1"
    assert second_response.headers["x-offset"] == "1"


def test_invalid_pagination_returns_422(client) -> None:
    assert client.get("/recalls", params={"limit": 0}).status_code == 422
    assert client.get("/recalls", params={"offset": -1}).status_code == 422


def test_newest_sort_uses_reported_date_not_initiation_date(
    client, repository, sample_recall
) -> None:
    repository.upsert(
        sample_recall.model_copy(
            update={
                "id": "reported-later",
                "source_recall_id": "F-1001-2025",
                "product_name": "Earlier recall listed later",
                "recall_date": date(2024, 12, 1),
                "reported_at": date(2025, 2, 1),
            }
        )
    )

    response = client.get("/recalls", params={"sort": "newest"})

    assert response.status_code == 200
    assert [recall["id"] for recall in response.json()] == [
        "reported-later",
        sample_recall.id,
    ]
    assert client.get("/recalls", params={"sort": "unsupported"}).status_code == 422


def test_newest_sort_merges_sources_and_source_filter_remains_supported(
    client, repository, sample_recall
) -> None:
    fsis = Recall(
        id="fsis-newest",
        source=RecallSource.USDA_FSIS,
        source_recall_id="PHA-TEST-1",
        record_type=RecallRecordType.PUBLIC_HEALTH_ALERT,
        product_name="USDA FSIS alert",
        recall_reason="Product contamination",
        status="Public Health Alert",
        reported_at=date(2025, 3, 1),
        source_url="https://www.fsis.usda.gov/recalls-alerts/example",
        created_at=datetime(2025, 3, 1, tzinfo=timezone.utc),
        updated_at=datetime(2025, 3, 1, tzinfo=timezone.utc),
    )
    repository.upsert(fsis)

    unified = client.get("/recalls", params={"sort": "newest", "limit": 2})
    fsis_only = client.get("/recalls", params={"source": "usda_fsis"})
    fda_only = client.get("/recalls", params={"source": "fda"})

    assert unified.status_code == 200
    assert unified.json()[0]["id"] == "fsis-newest"
    assert unified.headers["x-total-count"] == "2"
    assert [item["source"] for item in fsis_only.json()] == ["usda_fsis"]
    assert [item["source"] for item in fda_only.json()] == ["fda"]


def test_usda_fsis_search_and_detail_serialization(client, repository) -> None:
    fsis = Recall(
        id="fsis-detail",
        source=RecallSource.USDA_FSIS,
        source_recall_id="020-2026",
        product_name="Beef jerky products",
        recalling_firm="Example Meat Company",
        recall_reason="Unreported Allergens",
        classification="Class II",
        severity="Low - Class II",
        status="Active Recall",
        reported_at=date(2026, 6, 3),
        source_updated_at=date(2026, 6, 4),
        product_items=["Jerky package with lot A12"],
        establishment_numbers=["EST. 20528"],
        source_documents=["https://www.fsis.usda.gov/example-label.pdf"],
        source_url="https://www.fsis.usda.gov/recalls-alerts/example",
    )
    repository.upsert(fsis)

    search = client.get("/recalls", params={"search": "EST. 20528"})
    detail = client.get("/recalls/fsis-detail")

    assert [item["id"] for item in search.json()] == ["fsis-detail"]
    assert detail.status_code == 200
    assert detail.json()["record_type"] == "recall"
    assert detail.json()["category"] == "food"
    assert detail.json()["establishment_numbers"] == ["EST. 20528"]
