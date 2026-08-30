from __future__ import annotations


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


def test_pagination(client, repository, sample_recall) -> None:
    repository.upsert(
        sample_recall.model_copy(
            update={"id": "recall-2", "source_recall_id": "F-1001-2025", "product_name": "Cookies"}
        )
    )
    first = client.get("/recalls", params={"limit": 1, "offset": 0}).json()
    second = client.get("/recalls", params={"limit": 1, "offset": 1}).json()
    assert len(first) == len(second) == 1
    assert first[0]["id"] != second[0]["id"]


def test_invalid_pagination_returns_422(client) -> None:
    assert client.get("/recalls", params={"limit": 0}).status_code == 422
    assert client.get("/recalls", params={"offset": -1}).status_code == 422

