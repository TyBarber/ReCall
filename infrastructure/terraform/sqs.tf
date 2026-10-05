resource "aws_sqs_queue" "normalization_dlq" {
  name                      = "${local.normalization_name}-dlq"
  message_retention_seconds = var.queue_message_retention_seconds
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "normalization" {
  name                       = "${local.normalization_name}-queue"
  message_retention_seconds  = var.queue_message_retention_seconds
  visibility_timeout_seconds = var.normalization_visibility_timeout_seconds
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.normalization_dlq.arn
    maxReceiveCount     = var.normalization_max_receive_count
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "normalization_dlq" {
  queue_url = aws_sqs_queue.normalization_dlq.id
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.normalization.arn]
  })
}

resource "aws_sqs_queue" "scheduler_dlq" {
  name                      = "${local.ingestion_name}-scheduler-dlq"
  message_retention_seconds = var.queue_message_retention_seconds
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "fsis_scheduler_dlq" {
  name                      = "${local.fsis_ingestion_name}-scheduler-dlq"
  message_retention_seconds = var.queue_message_retention_seconds
  sqs_managed_sse_enabled   = true
}
