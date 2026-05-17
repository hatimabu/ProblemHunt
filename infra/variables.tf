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

variable "swa_sku_tier" {
  description = "Static Web App SKU tier (Free or Standard)"
  type        = string
  default     = "Standard"
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

variable "github_repo_url" {
  description = "GitHub repository URL for SWA deployment source"
  type        = string
  default     = ""
}

variable "github_branch" {
  description = "GitHub branch to deploy from"
  type        = string
  default     = "main"
}
