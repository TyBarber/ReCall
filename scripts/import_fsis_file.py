"""Import a USDA FSIS snapshot saved from a browser into the AWS pipeline.

FSIS's firewall blocks automated requests, so:
  1. Open https://www.fsis.usda.gov/fsis/api/recall/v/1?field_translation_language=en
     in a browser and save the page (File > Save Page As) as a .json file.
  2. Run: .venv/bin/python -m scripts.import_fsis_file ~/Downloads/recalls.json

The file goes through the same archive, queue, and checkpoint steps as the
scheduled Lambda. AWS resource names are read from the deployed USDA FSIS
ingestion Lambda, so no extra configuration is needed.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import boto3

from app.aws.fsis_ingestion_handler import build_pipeline
from app.config import Settings
from app.ingestion.fsis_client import FileFSISJSONTransport, FSISSnapshotFileError
from app.logging import configure_logging

DEFAULT_FUNCTION = "recall-dev-usda-fsis-ingestion"
LAMBDA_SETTINGS = (
    "RAW_BUCKET_NAME",
    "NORMALIZATION_QUEUE_URL",
    "INGESTION_STATE_TABLE_NAME",
    "FSIS_API_URL",
    "FSIS_INGESTION_OVERLAP_DAYS",
    "FSIS_INGESTION_MAX_RECORDS",
)


def load_lambda_settings(function_name: str, region: str) -> None:
    variables = (
        boto3.client("lambda", region_name=region)
        .get_function_configuration(FunctionName=function_name)
        .get("Environment", {})
        .get("Variables", {})
    )
    for name in LAMBDA_SETTINGS:
        if name in variables:
            os.environ[name] = variables[name]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("snapshot", type=Path, help="JSON file saved from the FSIS API")
    parser.add_argument("--function-name", default=DEFAULT_FUNCTION)
    parser.add_argument("--region", default=os.getenv("AWS_REGION", "us-east-1"))
    args = parser.parse_args()

    if not args.snapshot.is_file():
        print(f"File not found: {args.snapshot}", file=sys.stderr)
        return 1

    os.environ["AWS_REGION"] = args.region
    load_lambda_settings(args.function_name, args.region)
    settings = Settings.from_env()
    configure_logging(settings.log_level)

    try:
        result = build_pipeline(settings, FileFSISJSONTransport(args.snapshot)).run()
    except FSISSnapshotFileError as exc:
        print(exc, file=sys.stderr)
        return 1

    print(
        f"Imported USDA FSIS snapshot: {result.records} records queued "
        f"(ingestion {result.ingestion_id})."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
