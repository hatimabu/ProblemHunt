variable "resource_group_name" {
  description = "Existing Azure resource group"
  type        = string
  default     = "problemhunt"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "function_app_name" {
  description = "Name of the Function App to create"
  type        = string
  default     = "problemhunt"
}

variable "swa_url" {
  description = "Your Static Web App URL for CORS"
  type        = string
  default     = "https://problemhunt.azurestaticapps.net"
}
