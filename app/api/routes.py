from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel

from app.models.recall import (
    Recall,
    RecallClass,
    RecallRecordType,
    RecallSort,
    RecallSource,
)
from app.services.checkpoint import CheckpointReader
from app.services.recall_query import query_recalls
from app.services.repository import RecallRepository

router = APIRouter()


def get_repository(request: Request) -> RecallRepository:
    return request.app.state.repository


def get_checkpoints(request: Request) -> CheckpointReader | None:
    return request.app.state.checkpoints


class SourceFreshness(BaseModel):
    source: RecallSource
    last_checked_at: datetime | None


class Freshness(BaseModel):
    sources: list[SourceFreshness]


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/recalls", response_model=list[Recall])
def list_recalls(
    response: Response,
    search: str | None = Query(default=None, min_length=1),
    source: RecallSource | None = None,
    status_filter: str | None = Query(default=None, alias="status", min_length=1),
    record_type: RecallRecordType | None = None,
    classification: RecallClass | None = None,
    sort: RecallSort | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    repository: RecallRepository = Depends(get_repository),
) -> list[Recall]:
    result = query_recalls(
        repository,
        search=search,
        source=source,
        status=status_filter,
        record_type=record_type,
        classification=classification,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(result.total_count)
    response.headers["X-Limit"] = str(limit)
    response.headers["X-Offset"] = str(offset)
    return result.recalls


@router.get("/recalls/{recall_id}", response_model=Recall)
def get_recall(
    recall_id: str, repository: RecallRepository = Depends(get_repository)
) -> Recall:
    recall = repository.get(recall_id)
    if recall is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recall not found")
    return recall


@router.get("/freshness", response_model=Freshness)
def get_freshness(
    response: Response,
    checkpoints: CheckpointReader | None = Depends(get_checkpoints),
) -> Freshness:
    """Reports when each source was last successfully checked for new records."""
    response.headers["Cache-Control"] = "public, max-age=300"
    sources = []
    for source in RecallSource:
        checkpoint = checkpoints.get(source.value) if checkpoints else None
        sources.append(
            SourceFreshness(
                source=source,
                last_checked_at=(
                    checkpoint.last_successful_ingestion_at if checkpoint else None
                ),
            )
        )
    return Freshness(sources=sources)
