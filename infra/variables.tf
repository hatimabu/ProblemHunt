variable "resource_group_name" {
  description = "Existing Azure resource group name where all resources will be deployed"
  type        = string
  default     = "problemhunt"
}

variable "prefix" {
  description = "Prefix for all resources"
  type        = string
  default     = "problemhunt"
}

variable "environment" {
  description = "Environment name (prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "allowed_origins" {
  description = "List of allowed CORS origins for the Function App (include your Static Web App URL)"
  type        = list(string)
  default     = ["https://problemhunt.azurestaticapps.net"]
}

variable "cosmos_db_offer_type" {
  description = "Cosmos DB offer type"
  type        = string
  default     = "Standard"
}

variable "cosmos_db_enable_free_tier" {
  description = "Enable Cosmos DB free tier (first 1000 RU/s and 25 GB free for the lifetime of the account). Cannot be used with serverless."
  type        = bool
  default     = true
}

variable "cosmos_db_throughput" {
  description = "Shared database throughput in RU/s. Free tier covers the first 1000 RU/s. Use 400 for lowest cost."
  type        = number
  default     = 400
}
