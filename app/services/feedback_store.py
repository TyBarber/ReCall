from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Protocol

import boto3

from app.models.feedback import (
    AlertSignupRequest,
    SurveyResponseRequest,
    WatchPlacement,
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class FeedbackStore(Protocol):
    def save_alert_signup(self, signup: AlertSignupRequest) -> None: ...

    def save_survey_response(self, response: SurveyResponseRequest) -> None: ...

    def record_watch(self, placement: WatchPlacement) -> None: ...


class DynamoDBFeedbackStore:
    """One table, three item shapes, distinguished by the `id` prefix.

    - ``signup#<email>``: one item per address, so repeat signups update
      rather than duplicate it.
    - ``survey#<uuid>``: one item per questionnaire submission.
    - ``watch#<placement>#<YYYY-MM-DD>``: a daily counter of Watch clicks.
      Counters hold no personal data.
    """

    def __init__(self, table: Any, *, clock: Callable[[], datetime] = _utc_now) -> None:
        self.table = table
        self.clock = clock

    @classmethod
    def from_resource(cls, *, table_name: str, region_name: str) -> "DynamoDBFeedbackStore":
        return cls(boto3.resource("dynamodb", region_name=region_name).Table(table_name))

    def save_alert_signup(self, signup: AlertSignupRequest) -> None:
        now = self.clock().isoformat()
        self.table.update_item(
            Key={"id": f"signup#{signup.email}"},
            UpdateExpression=(
                "SET kind = :kind, email = :email, watch_terms = :terms, "
                "updated_at = :now, created_at = if_not_exists(created_at, :now)"
            ),
            ExpressionAttributeValues={
                ":kind": "alert_signup",
                ":email": signup.email,
                ":terms": signup.watch_terms,
                ":now": now,
            },
        )

    def save_survey_response(self, response: SurveyResponseRequest) -> None:
        item: dict[str, Any] = {
            "id": f"survey#{uuid.uuid4()}",
            "kind": "survey_response",
            "created_at": self.clock().isoformat(),
        }
        item.update(response.model_dump(mode="json", exclude_none=True))
        self.table.put_item(Item=item)

    def record_watch(self, placement: WatchPlacement) -> None:
        day = self.clock().date().isoformat()
        self.table.update_item(
            Key={"id": f"watch#{placement.value}#{day}"},
            UpdateExpression="SET kind = :kind, placement = :placement, #day = :day ADD clicks :one",
            ExpressionAttributeNames={"#day": "day"},
            ExpressionAttributeValues={
                ":kind": "watch_clicks",
                ":placement": placement.value,
                ":day": day,
                ":one": 1,
            },
        )


class SQLiteFeedbackStore:
    """Local development store with the same item shapes as DynamoDB."""

    def __init__(self, path: Path | str, *, clock: Callable[[], datetime] = _utc_now) -> None:
        self.path = str(path)
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.clock = clock
        self._connection = sqlite3.connect(self.path, check_same_thread=False)
        self._connection.execute(
            "CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY, document TEXT NOT NULL)"
        )
        self._connection.commit()

    def _get(self, item_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT document FROM feedback WHERE id = ?", (item_id,)
        ).fetchone()
        return json.loads(row[0]) if row else None

    def _put(self, item: dict[str, Any]) -> None:
        self._connection.execute(
            "INSERT INTO feedback(id, document) VALUES (?, ?) "
            "ON CONFLICT(id) DO UPDATE SET document = excluded.document",
            (item["id"], json.dumps(item)),
        )
        self._connection.commit()

    def items(self) -> list[dict[str, Any]]:
        return [
            json.loads(row[0])
            for row in self._connection.execute("SELECT document FROM feedback ORDER BY id")
        ]

    def save_alert_signup(self, signup: AlertSignupRequest) -> None:
        item_id = f"signup#{signup.email}"
        now = self.clock().isoformat()
        existing = self._get(item_id) or {}
        self._put(
            {
                "id": item_id,
                "kind": "alert_signup",
                "email": signup.email,
                "watch_terms": signup.watch_terms,
                "created_at": existing.get("created_at", now),
                "updated_at": now,
            }
        )

    def save_survey_response(self, response: SurveyResponseRequest) -> None:
        item: dict[str, Any] = {
            "id": f"survey#{uuid.uuid4()}",
            "kind": "survey_response",
            "created_at": self.clock().isoformat(),
        }
        item.update(response.model_dump(mode="json", exclude_none=True))
        self._put(item)

    def record_watch(self, placement: WatchPlacement) -> None:
        day = self.clock().date().isoformat()
        item_id = f"watch#{placement.value}#{day}"
        existing = self._get(item_id)
        self._put(
            {
                "id": item_id,
                "kind": "watch_clicks",
                "placement": placement.value,
                "day": day,
                "clicks": (existing or {}).get("clicks", 0) + 1,
            }
        )
