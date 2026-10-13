from __future__ import annotations

from fastapi import FastAPI

from app.api.routes import router
from app.config import Settings
from app.logging import configure_logging
from app.services.checkpoint import CheckpointReader, DynamoDBCheckpointStore
from app.services.repository import RecallRepository
from app.services.repository_factory import create_repository


def _create_checkpoints(settings: Settings) -> CheckpointReader | None:
    # Local SQLite runs have no ingestion checkpoints, so freshness is unknown.
    if not settings.ingestion_state_table_name:
        return None
    return DynamoDBCheckpointStore.from_resource(
        table_name=settings.ingestion_state_table_name,
        region_name=settings.aws_region,
    )


def create_app(
    repository: RecallRepository | None = None,
    checkpoints: CheckpointReader | None = None,
) -> FastAPI:
    settings = Settings.from_env()
    configure_logging(settings.log_level)
    app = FastAPI(title="Recall Tracker API", version="0.1.0")
    app.state.repository = repository or create_repository(settings)
    app.state.checkpoints = checkpoints or _create_checkpoints(settings)
    app.include_router(router)
    return app


app = create_app()
