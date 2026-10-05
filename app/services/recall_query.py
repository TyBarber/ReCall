from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.models.recall import Recall, RecallRecordType, RecallSort, RecallSource
from app.services.repository import RecallRepository


@dataclass(frozen=True, slots=True)
class RecallQueryResult:
    recalls: list[Recall]
    total_count: int


def query_recalls(
    repository: RecallRepository,
    *,
    search: str | None,
    source: RecallSource | None,
    status: str | None,
    record_type: RecallRecordType | None,
    sort: RecallSort | None,
    limit: int,
    offset: int,
) -> RecallQueryResult:
    if sort == RecallSort.NEWEST and source is None and search is None:
        # Each per-source query is bounded and uses source-reported-date-index in
        # DynamoDB. This avoids a cross-source full-table scan while the number
        # of supported food agencies remains small.
        target_count = offset + limit
        candidates: list[Recall] = []
        total_count = 0
        for supported_source in RecallSource:
            candidates.extend(
                repository.list(
                    source=supported_source,
                    status=status,
                    record_type=record_type,
                    sort=RecallSort.NEWEST,
                    limit=target_count,
                    offset=0,
                )
            )
            total_count += repository.count(
                source=supported_source,
                status=status,
                record_type=record_type,
            )
        candidates.sort(
            key=lambda recall: (
                recall.reported_at or date.min,
                recall.id,
            ),
            reverse=True,
        )
        return RecallQueryResult(
            recalls=candidates[offset:target_count],
            total_count=total_count,
        )

    return RecallQueryResult(
        recalls=repository.list(
            search=search,
            source=source,
            status=status,
            record_type=record_type,
            sort=sort,
            limit=limit,
            offset=offset,
        ),
        total_count=repository.count(
            search=search,
            source=source,
            status=status,
            record_type=record_type,
        ),
    )
