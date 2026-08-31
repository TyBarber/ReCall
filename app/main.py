from __future__ import annotations

from fastapi import FastAPI

from app.api.routes import router
from app.config import Settings
from app.logging import configure_logging
from app.services.repository import RecallRepository
from app.services.repository_factory import create_repository


def create_app(repository: RecallRepository | None = None) -> FastAPI:
    settings = Settings.from_env()
    configure_logging(settings.log_level)
    app = FastAPI(title="Recall Tracker API", version="0.1.0")
    app.state.repository = repository or create_repository(settings)
    app.include_router(router)
    return app


app = create_app()
