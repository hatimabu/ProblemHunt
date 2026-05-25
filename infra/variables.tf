variable "resource_group_name" {
  description = "Azure resource group for ProblemHunt resources."
  type        = string
}

variable "location" {
  description = "Azure region for ProblemHunt resources."
  type        = string
}

variable "function_app_name" {
  description = "Name of the Azure Function App."
  type        = string
}

variable "swa_url" {
  description = "Static Web App URL allowed by Function App CORS."
  type        = string
}

variable "backend_resource_group_name" {
  description = "Azure resource group for the Terraform backend storage account."
  type        = string
}

variable "backend_storage_account_name" {
  description = "Azure storage account name for Terraform backend state."
  type        = string
}
