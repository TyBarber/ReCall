from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.models.recall import Recall, RecallRecordType, RecallSort, RecallSource
from app.services.recall_query import query_recalls
from app.services.repository import RecallRepository

router = APIRouter()


def get_repository(request: Request) -> RecallRepository:
    return request.app.state.repository


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
