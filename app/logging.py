from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any


_STANDARD_FIELDS = set(logging.makeLogRecord({}).__dict__) | {"message", "asctime"}


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        payload.update(
            {key: value for key, value in record.__dict__.items() if key not in _STANDARD_FIELDS}
        )
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str, separators=(",", ":"))


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(getattr(logging, level, logging.INFO))
    if not root.handlers:
        root.addHandler(logging.StreamHandler())
    for handler in root.handlers:
        handler.setFormatter(JSONFormatter())
