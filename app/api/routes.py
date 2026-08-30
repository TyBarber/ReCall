from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.models.recall import Recall, RecallSource
from app.services.repository import RecallRepository

router = APIRouter()


def get_repository(request: Request) -> RecallRepository:
    return request.app.state.repository


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/recalls", response_model=list[Recall])
def list_recalls(
    search: str | None = Query(default=None, min_length=1),
    source: RecallSource | None = None,
    status_filter: str | None = Query(default=None, alias="status", min_length=1),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    repository: RecallRepository = Depends(get_repository),
) -> list[Recall]:
    return repository.list(
        search=search, source=source, status=status_filter, limit=limit, offset=offset
    )


@router.get("/recalls/{recall_id}", response_model=Recall)
def get_recall(
    recall_id: str, repository: RecallRepository = Depends(get_repository)
) -> Recall:
    recall = repository.get(recall_id)
    if recall is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recall not found")
    return recall

