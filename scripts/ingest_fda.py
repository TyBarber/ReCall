from __future__ import annotations

import argparse

from app.config import Settings
from app.ingestion.fda_client import FDAClient
from app.ingestion.pipeline import ingest_fda_records
from app.logging import configure_logging
from app.services.sqlite_repository import SQLiteRecallRepository


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest openFDA food enforcement recalls")
    parser.add_argument("--max-records", type=int, default=1000)
    parser.add_argument("--page-size", type=int, default=100)
    args = parser.parse_args()
    settings = Settings.from_env()
    configure_logging(settings.log_level)
    repository = SQLiteRecallRepository(settings.database_path)
    result = ingest_fda_records(
        FDAClient().fetch(limit=args.page_size, max_records=args.max_records), repository
    )
    print(
        f"fetched={result.fetched} created={result.created} "
        f"updated={result.updated} skipped={result.skipped}"
    )


if __name__ == "__main__":
    main()

