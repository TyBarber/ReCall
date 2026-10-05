from datetime import datetime, timezone

from app.services.raw_archive import S3RawArchive


def test_usda_fsis_raw_prefix_is_source_specific() -> None:
    prefix = S3RawArchive.prefix(
        "usda_fsis",
        "batch-123",
        datetime(2026, 9, 4, tzinfo=timezone.utc),
    )
    assert prefix == "source=usda_fsis/date=2026-09-04/ingestion_id=batch-123"
    assert "source=fda" not in prefix
