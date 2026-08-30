from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.models.recall import Recall, RecallSource
from app.services.repository import UpsertResult


class SQLiteRecallRepository:
    def __init__(self, path: Path | str) -> None:
        self.path = str(path)
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._connection = sqlite3.connect(self.path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._initialize()

    def _initialize(self) -> None:
        self._connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS recalls (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                source_recall_id TEXT NOT NULL,
                document TEXT NOT NULL,
                UNIQUE(source, source_recall_id)
            );
            CREATE TABLE IF NOT EXISTS raw_recall_records (
                source TEXT NOT NULL,
                source_recall_id TEXT NOT NULL,
                payload TEXT NOT NULL,
                fetched_at TEXT NOT NULL,
                PRIMARY KEY(source, source_recall_id)
            );
            """
        )
        self._connection.commit()

    def save_raw(self, source: RecallSource, source_recall_id: str, payload: dict[str, Any]) -> None:
        self._connection.execute(
            """INSERT INTO raw_recall_records(source, source_recall_id, payload, fetched_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(source, source_recall_id) DO UPDATE SET
                 payload=excluded.payload, fetched_at=excluded.fetched_at""",
            (source.value, source_recall_id, json.dumps(payload), datetime.now(timezone.utc).isoformat()),
        )
        self._connection.commit()

    def upsert(self, recall: Recall) -> UpsertResult:
        existing = self._connection.execute(
            "SELECT document FROM recalls WHERE source=? AND source_recall_id=?",
            (recall.source.value, recall.source_recall_id),
        ).fetchone()
        created = existing is None
        if existing:
            previous = Recall.model_validate_json(existing["document"])
            recall = recall.model_copy(update={"id": previous.id, "created_at": previous.created_at})
        self._connection.execute(
            """INSERT INTO recalls(id, source, source_recall_id, document) VALUES (?, ?, ?, ?)
               ON CONFLICT(source, source_recall_id) DO UPDATE SET document=excluded.document""",
            (recall.id, recall.source.value, recall.source_recall_id, recall.model_dump_json()),
        )
        self._connection.commit()
        return UpsertResult(recall=recall, created=created)

    def get(self, recall_id: str) -> Recall | None:
        row = self._connection.execute("SELECT document FROM recalls WHERE id=?", (recall_id,)).fetchone()
        return Recall.model_validate_json(row["document"]) if row else None

    def list(
        self,
        *,
        search: str | None = None,
        source: RecallSource | None = None,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Recall]:
        clauses: list[str] = []
        parameters: list[Any] = []
        if search:
            clauses.append("LOWER(document) LIKE ?")
            parameters.append(f"%{search.lower()}%")
        if source:
            clauses.append("source = ?")
            parameters.append(source.value)
        if status:
            clauses.append("LOWER(json_extract(document, '$.status')) = ?")
            parameters.append(status.lower())
        where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
        parameters.extend([limit, offset])
        rows = self._connection.execute(
            f"SELECT document FROM recalls{where} ORDER BY json_extract(document, '$.recall_date') DESC, id LIMIT ? OFFSET ?",
            parameters,
        ).fetchall()
        return [Recall.model_validate_json(row["document"]) for row in rows]

