from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import create_app
from app.models.feedback import (
    AlertSignupRequest,
    SurveyResponseRequest,
    WatchPlacement,
)
from app.services.feedback_store import DynamoDBFeedbackStore


def _items(store) -> dict[str, dict]:
    return {item["id"]: item for item in store.items()}


def test_alert_signup_is_saved_once_per_address(client, feedback_store) -> None:
    first = client.post(
        "/alerts/signups",
        json={"email": " Ty@Example.com ", "watch_terms": ["Jif", "jif", "  Salsa  "]},
    )
    second = client.post(
        "/alerts/signups", json={"email": "ty@example.com", "watch_terms": ["Cheese"]}
    )

    assert first.status_code == 202
    assert first.json() == {"status": "accepted", "first_signup": True}
    assert second.status_code == 202
    assert second.json()["first_signup"] is False
    items = _items(feedback_store)
    assert list(items) == ["signup#ty@example.com"]
    signup = items["signup#ty@example.com"]
    assert signup["watch_terms"] == ["Cheese"]
    assert signup["source"] == "how_it_works"
    assert signup["created_at"] <= signup["updated_at"]


def test_alert_signup_records_where_it_came_from(client, feedback_store) -> None:
    client.post("/alerts/signups", json={"email": "a@b.co", "source": "home"})
    client.post("/alerts/signups", json={"email": "a@b.co", "source": "how_it_works"})

    [signup] = feedback_store.items()
    assert signup["source"] == "home"
    assert signup["last_source"] == "how_it_works"
    assert (
        client.post("/alerts/signups", json={"email": "a@b.co", "source": "popup"}).status_code
        == 422
    )


def test_alert_signup_rejects_bad_input(client, feedback_store) -> None:
    assert client.post("/alerts/signups", json={"email": "not-an-email"}).status_code == 422
    assert client.post("/alerts/signups", json={}).status_code == 422
    too_many = {"email": "a@b.co", "watch_terms": [f"term {n}" for n in range(11)]}
    assert client.post("/alerts/signups", json=too_many).status_code == 422
    unknown_field = {"email": "a@b.co", "admin": True}
    assert client.post("/alerts/signups", json=unknown_field).status_code == 422
    assert feedback_store.items() == []


def test_survey_response_is_saved(client, feedback_store) -> None:
    response = client.post(
        "/survey/responses",
        json={
            "heard_from": "social_media",
            "visit_reason": "brand_i_buy",
            "wants_alerts": "maybe",
            "comment": "  Add baby formula  ",
        },
    )

    assert response.status_code == 202
    [item] = feedback_store.items()
    assert item["id"].startswith("survey#")
    assert item["kind"] == "survey_response"
    assert item["heard_from"] == "social_media"
    assert item["comment"] == "Add baby formula"


def test_survey_response_rejects_empty_or_unknown_answers(client, feedback_store) -> None:
    assert client.post("/survey/responses", json={}).status_code == 422
    assert (
        client.post("/survey/responses", json={"heard_from": "billboard"}).status_code
        == 422
    )
    assert (
        client.post("/survey/responses", json={"comment": "x" * 501}).status_code == 422
    )
    assert feedback_store.items() == []


def test_watch_events_are_counted_per_placement_and_day(client, feedback_store) -> None:
    for placement in ["results", "results", "empty_results"]:
        assert (
            client.post("/events/watch", json={"placement": placement}).status_code
            == 202
        )
    assert client.post("/events/watch", json={"placement": "footer"}).status_code == 422

    counts = {
        item["placement"]: item["clicks"]
        for item in feedback_store.items()
        if item["kind"] == "watch_clicks"
    }
    assert counts == {"results": 2, "empty_results": 1}


def test_feedback_routes_return_503_without_a_store(repository, monkeypatch) -> None:
    monkeypatch.setenv("EXECUTION_ENVIRONMENT", "aws")
    monkeypatch.setenv("REPOSITORY_BACKEND", "dynamodb")
    monkeypatch.delenv("FEEDBACK_TABLE_NAME", raising=False)
    with TestClient(create_app(repository)) as test_client:
        response = test_client.post("/events/watch", json={"placement": "results"})
    assert response.status_code == 503


class FakeFeedbackTable:
    def __init__(self) -> None:
        self.puts: list[dict] = []
        self.updates: list[dict] = []

    def put_item(self, *, Item):
        self.puts.append(Item)
        return {}

    def update_item(self, **kwargs):
        self.updates.append(kwargs)
        return self.next_update_response

    next_update_response: dict = {}


def _fixed_clock() -> datetime:
    return datetime(2026, 10, 15, 9, 30, tzinfo=timezone.utc)


def test_dynamodb_store_upserts_signups_by_address() -> None:
    table = FakeFeedbackTable()
    store = DynamoDBFeedbackStore(table, clock=_fixed_clock)

    signup = AlertSignupRequest(email="Ty@Example.com", watch_terms=["Jif"], source="home")

    assert store.save_alert_signup(signup) is True
    table.next_update_response = {"Attributes": {"created_at": "2026-10-01T00:00:00+00:00"}}
    assert store.save_alert_signup(signup) is False

    update = table.updates[0]
    assert update["Key"] == {"id": "signup#ty@example.com"}
    assert "if_not_exists(created_at, :now)" in update["UpdateExpression"]
    assert update["ReturnValues"] == "UPDATED_OLD"
    assert update["ExpressionAttributeValues"][":terms"] == ["Jif"]
    assert update["ExpressionAttributeValues"][":source"] == "home"


def test_dynamodb_store_puts_survey_responses() -> None:
    table = FakeFeedbackTable()
    store = DynamoDBFeedbackStore(table, clock=_fixed_clock)

    store.save_survey_response(SurveyResponseRequest(wants_alerts="yes"))

    [item] = table.puts
    assert item["id"].startswith("survey#")
    assert item["wants_alerts"] == "yes"
    assert "comment" not in item
    assert item["created_at"] == "2026-10-15T09:30:00+00:00"


def test_dynamodb_store_counts_watch_clicks_atomically() -> None:
    table = FakeFeedbackTable()
    store = DynamoDBFeedbackStore(table, clock=_fixed_clock)

    store.record_watch(WatchPlacement.DETAIL)

    [update] = table.updates
    assert update["Key"] == {"id": "watch#detail#2026-10-15"}
    assert "ADD clicks :one" in update["UpdateExpression"]
    assert update["ExpressionAttributeValues"][":one"] == 1
