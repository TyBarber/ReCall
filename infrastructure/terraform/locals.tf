locals {
  name_prefix        = "${var.project_name}-${var.environment}"
  lambda_package     = abspath("${path.module}/${var.lambda_package_path}")
  ingestion_name     = "${local.name_prefix}-fda-ingestion"
  normalization_name = "${local.name_prefix}-normalization"
  api_name           = "${local.name_prefix}-api"

  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    },
    var.tags
  )
}
