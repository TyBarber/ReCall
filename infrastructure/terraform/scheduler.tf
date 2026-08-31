resource "aws_scheduler_schedule" "ingestion" {
  name                = local.ingestion_name
  schedule_expression = var.schedule_expression

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.ingestion.arn
    role_arn = aws_iam_role.scheduler.arn

    dead_letter_config {
      arn = aws_sqs_queue.scheduler_dlq.arn
    }

    retry_policy {
      maximum_event_age_in_seconds = 3600
      maximum_retry_attempts       = 2
    }

    input = jsonencode({ source = "fda" })
  }
}
