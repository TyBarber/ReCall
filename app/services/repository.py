from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from app.models.recall import Recall, RecallSort, RecallSource


@dataclass(frozen=True, slots=True)
class UpsertResult:
    recall: Recall
    created: bool


class RecallRepository(Protocol):
    def upsert(self, recall: Recall) -> UpsertResult: ...
    def get(self, recall_id: str) -> Recall | None: ...
    def count(
        self,
        *,
        search: str | None = None,
        source: RecallSource | None = None,
        status: str | None = None,
    ) -> int: ...
    def list(
        self,
        *,
        search: str | None = None,
        source: RecallSource | None = None,
        status: str | None = None,
        sort: RecallSort | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Recall]: ...


class RawRecallRepository(Protocol):
    def save_raw(
        self, source: RecallSource, source_recall_id: str, payload: dict[str, Any]
    ) -> None: ...
