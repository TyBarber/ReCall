from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class Settings:
    database_path: Path
    log_level: str

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            database_path=Path(os.getenv("RECALL_DATABASE_PATH", "data/recalls.db")),
            log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
        )

