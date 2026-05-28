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

variable "cosmos_database_throughput" {
  description = "Shared throughput for the Cosmos SQL database. Keep at 400 RU/s for the lowest provisioned setting."
  type        = number
  default     = 400

  validation {
    condition     = var.cosmos_database_throughput >= 400 && var.cosmos_database_throughput <= 1000
    error_message = "Cosmos database throughput must stay between 400 and 1000 RU/s for this student-project deployment."
  }
}
