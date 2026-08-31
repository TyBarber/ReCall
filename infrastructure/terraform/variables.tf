variable "project_name" {
  description = "Short project name used in resource names."
  type        = string
  default     = "recall"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "lambda_package_path" {
  description = "Path from this Terraform directory to the prebuilt Lambda ZIP."
  type        = string
  default     = "../../dist/recall_lambda.zip"
}

variable "schedule_expression" {
  description = "EventBridge Scheduler expression for FDA ingestion."
  type        = string
  default     = "rate(1 day)"
}

variable "log_retention_days" {
  description = "CloudWatch log retention."
  type        = number
  default     = 14
}

variable "raw_retention_days" {
  description = "Days to retain versioned raw FDA objects."
  type        = number
  default     = 365
}

variable "queue_message_retention_seconds" {
  description = "SQS message retention for normalization and dead-letter queues."
  type        = number
  default     = 1209600
}

variable "normalization_visibility_timeout_seconds" {
  description = "SQS visibility timeout; must be at least six times the normalization Lambda timeout."
  type        = number
  default     = 180
}

variable "normalization_max_receive_count" {
  description = "Receive attempts before a normalization message moves to the DLQ."
  type        = number
  default     = 5
}

variable "normalization_batch_size" {
  description = "Maximum SQS records passed to one normalization invocation."
  type        = number
  default     = 10
}

variable "normalization_max_concurrency" {
  description = "Maximum normalization Lambda concurrency from SQS."
  type        = number
  default     = 5
}

variable "api_throttle_rate_limit" {
  description = "Steady-state API Gateway requests per second."
  type        = number
  default     = 10
}

variable "api_throttle_burst_limit" {
  description = "API Gateway burst request limit."
  type        = number
  default     = 20
}

variable "ingestion_overlap_minutes" {
  description = "Overlap applied before the last successful checkpoint."
  type        = number
  default     = 60
}

variable "first_run_lookback_days" {
  description = "Initial FDA query window when no checkpoint exists."
  type        = number
  default     = 60
}

variable "ingestion_page_size" {
  description = "FDA records requested per page."
  type        = number
  default     = 100
}

variable "ingestion_max_records" {
  description = "Safety bound on FDA records fetched per scheduled invocation."
  type        = number
  default     = 1000
}

variable "alarm_queue_age_seconds" {
  description = "Oldest-message age that triggers an alarm."
  type        = number
  default     = 900
}

variable "tags" {
  description = "Additional tags applied to supported resources."
  type        = map(string)
  default     = {}
}
