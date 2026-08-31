resource "aws_cloudwatch_log_group" "ingestion" {
  name              = "/aws/lambda/${local.ingestion_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "normalization" {
  name              = "/aws/lambda/${local.normalization_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.api_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "ingestion" {
  function_name    = local.ingestion_name
  role             = aws_iam_role.ingestion.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "app.aws.ingestion_handler.handler"
  filename         = local.lambda_package
  source_code_hash = filebase64sha256(local.lambda_package)
  memory_size      = 512
  timeout          = 120

  environment {
    variables = {
      EXECUTION_ENVIRONMENT      = "aws"
      REPOSITORY_BACKEND         = "dynamodb"
      RAW_BUCKET_NAME            = aws_s3_bucket.raw.id
      NORMALIZATION_QUEUE_URL    = aws_sqs_queue.normalization.id
      INGESTION_STATE_TABLE_NAME = aws_dynamodb_table.ingestion_state.name
      INGESTION_OVERLAP_MINUTES  = tostring(var.ingestion_overlap_minutes)
      FIRST_RUN_LOOKBACK_DAYS    = tostring(var.first_run_lookback_days)
      INGESTION_PAGE_SIZE        = tostring(var.ingestion_page_size)
      INGESTION_MAX_RECORDS      = tostring(var.ingestion_max_records)
      LOG_LEVEL                  = "INFO"
    }
  }

  depends_on = [aws_cloudwatch_log_group.ingestion]
}

resource "aws_lambda_function" "normalization" {
  function_name    = local.normalization_name
  role             = aws_iam_role.normalization.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "app.aws.normalization_handler.handler"
  filename         = local.lambda_package
  source_code_hash = filebase64sha256(local.lambda_package)
  memory_size      = 512
  timeout          = 30

  environment {
    variables = {
      EXECUTION_ENVIRONMENT = "aws"
      REPOSITORY_BACKEND    = "dynamodb"
      RAW_BUCKET_NAME       = aws_s3_bucket.raw.id
      DYNAMODB_TABLE_NAME   = aws_dynamodb_table.recalls.name
      LOG_LEVEL             = "INFO"
    }
  }

  depends_on = [aws_cloudwatch_log_group.normalization]
}

resource "aws_lambda_function" "api" {
  function_name    = local.api_name
  role             = aws_iam_role.api.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "app.aws.api_handler.handler"
  filename         = local.lambda_package
  source_code_hash = filebase64sha256(local.lambda_package)
  memory_size      = 512
  timeout          = 15

  environment {
    variables = {
      EXECUTION_ENVIRONMENT = "aws"
      REPOSITORY_BACKEND    = "dynamodb"
      DYNAMODB_TABLE_NAME   = aws_dynamodb_table.recalls.name
      LOG_LEVEL             = "INFO"
    }
  }

  depends_on = [aws_cloudwatch_log_group.api]
}

resource "aws_lambda_event_source_mapping" "normalization" {
  event_source_arn                   = aws_sqs_queue.normalization.arn
  function_name                      = aws_lambda_function.normalization.arn
  batch_size                         = var.normalization_batch_size
  function_response_types            = ["ReportBatchItemFailures"]
  maximum_batching_window_in_seconds = 5

  scaling_config {
    maximum_concurrency = var.normalization_max_concurrency
  }
}
