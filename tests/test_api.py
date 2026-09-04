from __future__ import annotations

from datetime import date


def test_health(client) -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_get_recall(client, sample_recall) -> None:
    response = client.get(f"/recalls/{sample_recall.id}")
    assert response.status_code == 200
    assert response.json()["product_name"] == "Peanut Butter"
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
