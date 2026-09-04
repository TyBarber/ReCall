resource "aws_dynamodb_table" "recalls" {
  name         = "${local.name_prefix}-recalls"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "source"
    type = "S"
  }

  attribute {
    name = "source_status"
    type = "S"
  }

  attribute {
    name = "recall_sort"
    type = "S"
  }

  attribute {
    name = "reported_sort"
    type = "S"
  }

  global_secondary_index {
    name            = "source-recall-date-index"
    hash_key        = "source"
    range_key       = "recall_sort"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "source-status-date-index"
    hash_key        = "source_status"
    range_key       = "recall_sort"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "source-reported-date-index"
    hash_key        = "source"
    range_key       = "reported_sort"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

resource "aws_dynamodb_table" "ingestion_state" {
  name         = "${local.name_prefix}-ingestion-state"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "source"

  attribute {
    name = "source"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}
