resource "aws_cloudwatch_metric_alarm" "ingestion_errors" {
  alarm_name          = "${local.ingestion_name}-errors"
  alarm_description   = "FDA ingestion Lambda reported an error."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { FunctionName = aws_lambda_function.ingestion.function_name }
}

resource "aws_cloudwatch_metric_alarm" "normalization_errors" {
  alarm_name          = "${local.normalization_name}-errors"
  alarm_description   = "Normalization Lambda reported an invocation error."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { FunctionName = aws_lambda_function.normalization.function_name }
}

resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "${local.api_name}-errors"
  alarm_description   = "API Lambda reported an error."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { FunctionName = aws_lambda_function.api.function_name }
}

resource "aws_cloudwatch_metric_alarm" "normalization_dlq_depth" {
  alarm_name          = "${local.normalization_name}-dlq-depth"
  alarm_description   = "Normalization messages reached the dead-letter queue."
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = aws_sqs_queue.normalization_dlq.name }
}

resource "aws_cloudwatch_metric_alarm" "normalization_queue_age" {
  alarm_name          = "${local.normalization_name}-oldest-message"
  alarm_description   = "Normalization processing is falling behind."
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateAgeOfOldestMessage"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.alarm_queue_age_seconds
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = aws_sqs_queue.normalization.name }
}

resource "aws_cloudwatch_metric_alarm" "scheduler_dlq_depth" {
  alarm_name          = "${local.ingestion_name}-scheduler-dlq-depth"
  alarm_description   = "EventBridge Scheduler could not deliver an ingestion invocation."
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = aws_sqs_queue.scheduler_dlq.name }
}

resource "aws_cloudwatch_metric_alarm" "normalization_throttles" {
  alarm_name          = "${local.normalization_name}-throttles"
  alarm_description   = "Normalization Lambda is being throttled."
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { FunctionName = aws_lambda_function.normalization.function_name }
}
