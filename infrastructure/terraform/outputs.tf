output "api_url" {
  description = "Public API Gateway base URL."
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "raw_bucket_name" {
  description = "S3 bucket retaining raw FDA ingestion data."
  value       = aws_s3_bucket.raw.id
}

output "normalization_queue_url" {
  description = "SQS normalization queue URL."
  value       = aws_sqs_queue.normalization.id
}

output "normalization_dlq_url" {
  description = "SQS normalization dead-letter queue URL."
  value       = aws_sqs_queue.normalization_dlq.id
}

output "recalls_table_name" {
  description = "DynamoDB normalized recalls table."
  value       = aws_dynamodb_table.recalls.name
}

output "ingestion_state_table_name" {
  description = "DynamoDB ingestion checkpoint table."
  value       = aws_dynamodb_table.ingestion_state.name
}
