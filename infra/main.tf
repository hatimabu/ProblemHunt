# -----------------------------------------------------------------------------
# Local values
# -----------------------------------------------------------------------------
locals {
  name_prefix = "${var.prefix}-${var.environment}"
  common_tags = {
    Project     = "ProblemHunt"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# Resource Group (must already exist in Azure)
# -----------------------------------------------------------------------------
data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

# -----------------------------------------------------------------------------
# Application Insights (shared monitoring)
# -----------------------------------------------------------------------------
resource "azurerm_application_insights" "main" {
  name                = "${local.name_prefix}-appinsights"
  location            = data.azurerm_resource_group.main.location
  resource_group_name = data.azurerm_resource_group.main.name
  application_type    = "web"
  tags                = local.common_tags
}

# -----------------------------------------------------------------------------
# Azure Functions (Backend)
# -----------------------------------------------------------------------------
# NOTE: Static Web App is managed manually (already exists as 'problemhunt').
# Terraform only creates the Function App, Cosmos DB, Key Vault, and App Insights.

# Storage account required by Function App
resource "azurerm_storage_account" "functions" {
  name                     = "${var.prefix}func${random_string.storage_suffix.result}"
  resource_group_name      = data.azurerm_resource_group.main.name
  location                 = data.azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = local.common_tags
}

resource "random_string" "storage_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Service plan (Consumption) for Function App
resource "azurerm_service_plan" "functions" {
  name                = "${local.name_prefix}-asp"
  location            = data.azurerm_resource_group.main.location
  resource_group_name = data.azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "Y1" # Consumption plan

  tags = local.common_tags
}

# Linux Function App (Python 3.11)
resource "azurerm_linux_function_app" "api" {
  name                = "${local.name_prefix}-api"
  location            = data.azurerm_resource_group.main.location
  resource_group_name = data.azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.functions.id

  storage_account_name       = azurerm_storage_account.functions.name
  storage_account_access_key = azurerm_storage_account.functions.primary_access_key

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_insights_key               = azurerm_application_insights.main.instrumentation_key
    application_insights_connection_string = azurerm_application_insights.main.connection_string

    application_stack {
      python_version = "3.11"
    }

    cors {
      allowed_origins = concat(var.allowed_origins, [
        "http://localhost:5173",
        "http://localhost:4280"
      ])
      support_credentials = true
    }

    ftps_state          = "Disabled"
    minimum_tls_version = "1.2"
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME       = "python"
    SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
    ENABLE_ORYX_BUILD              = "true"

    # These will be overridden via GitHub Actions or Azure Portal
    SUPABASE_JWT_SECRET       = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/supabase-jwt-secret/)"
    SUPABASE_URL              = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/supabase-url/)"
    SUPABASE_SERVICE_ROLE_KEY = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/supabase-service-role-key/)"
    COSMOS_ENDPOINT           = azurerm_cosmosdb_account.main.endpoint
    COSMOS_KEY                = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/cosmos-key/)"
    COSMOS_DATABASE           = azurerm_cosmosdb_sql_database.main.name
    COSMOS_CONTAINER_PROBLEMS = "Problems"
    COSMOS_CONTAINER_PROPOSALS = "Proposals"
    COSMOS_CONTAINER_UPVOTES  = "Upvotes"
    COSMOS_CONTAINER_TIPS     = "Tips"
  }

  tags = local.common_tags

  depends_on = [azurerm_key_vault_secret.supabase_jwt_secret]
}

# -----------------------------------------------------------------------------
# Cosmos DB (Marketplace data)
# -----------------------------------------------------------------------------
resource "azurerm_cosmosdb_account" "main" {
  name                = "${local.name_prefix}-cosmos"
  location            = data.azurerm_resource_group.main.location
  resource_group_name = data.azurerm_resource_group.main.name
  offer_type          = var.cosmos_db_offer_type

  free_tier_enabled = var.cosmos_db_enable_free_tier

  # NOTE: Do NOT use EnableServerless capability with free tier.
  # Free tier provides 1000 RU/s of provisioned throughput.
  # Serverless billing is a separate model and incompatible with free tier.

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = data.azurerm_resource_group.main.location
    failover_priority = 0
  }

  tags = local.common_tags
}

resource "azurerm_cosmosdb_sql_database" "main" {
  name                = "ProblemHuntDB"
  resource_group_name = data.azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name

  # Shared throughput across all containers in this database.
  # Free tier covers the first 1000 RU/s at no cost.
  throughput = var.cosmos_db_throughput
}

resource "azurerm_cosmosdb_sql_container" "problems" {
  name                  = "Problems"
  resource_group_name   = data.azurerm_resource_group.main.name
  account_name          = azurerm_cosmosdb_account.main.name
  database_name         = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths   = ["/id"]
  partition_key_version = 2
}

resource "azurerm_cosmosdb_sql_container" "proposals" {
  name                  = "Proposals"
  resource_group_name   = data.azurerm_resource_group.main.name
  account_name          = azurerm_cosmosdb_account.main.name
  database_name         = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths   = ["/problem_id"]
  partition_key_version = 2
}

resource "azurerm_cosmosdb_sql_container" "upvotes" {
  name                  = "Upvotes"
  resource_group_name   = data.azurerm_resource_group.main.name
  account_name          = azurerm_cosmosdb_account.main.name
  database_name         = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths   = ["/problem_id"]
  partition_key_version = 2
}

resource "azurerm_cosmosdb_sql_container" "tips" {
  name                  = "Tips"
  resource_group_name   = data.azurerm_resource_group.main.name
  account_name          = azurerm_cosmosdb_account.main.name
  database_name         = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths   = ["/proposal_id"]
  partition_key_version = 2
}

# -----------------------------------------------------------------------------
# Key Vault (Secrets management)
# -----------------------------------------------------------------------------
resource "azurerm_key_vault" "main" {
  name                       = "${var.prefix}-kv-${random_string.kv_suffix.result}"
  location                   = data.azurerm_resource_group.main.location
  resource_group_name        = data.azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false

  tags = local.common_tags
}

resource "random_string" "kv_suffix" {
  length  = 6
  special = false
  upper   = false
}

data "azurerm_client_config" "current" {}

# Give current Terraform user access to Key Vault secrets
resource "azurerm_key_vault_access_policy" "terraform_user" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = ["Get", "List", "Set", "Delete", "Purge"]
}

# Give Function App managed identity access to Key Vault
resource "azurerm_key_vault_access_policy" "function_app" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = azurerm_linux_function_app.api.identity[0].tenant_id
  object_id    = azurerm_linux_function_app.api.identity[0].principal_id

  secret_permissions = ["Get", "List"]

  depends_on = [azurerm_linux_function_app.api]
}

# Placeholder secrets — replace values after provisioning via Azure Portal or CLI
resource "azurerm_key_vault_secret" "supabase_jwt_secret" {
  name         = "supabase-jwt-secret"
  value        = "REPLACE_ME_AFTER_PROVISIONING"
  key_vault_id = azurerm_key_vault.main.id

  tags = local.common_tags

  depends_on = [azurerm_key_vault_access_policy.terraform_user]
  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "supabase_url" {
  name         = "supabase-url"
  value        = "https://your-project-ref.supabase.co"
  key_vault_id = azurerm_key_vault.main.id

  tags = local.common_tags

  depends_on = [azurerm_key_vault_access_policy.terraform_user]
  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "supabase_service_role_key" {
  name         = "supabase-service-role-key"
  value        = "REPLACE_ME_AFTER_PROVISIONING"
  key_vault_id = azurerm_key_vault.main.id

  tags = local.common_tags

  depends_on = [azurerm_key_vault_access_policy.terraform_user]
  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "cosmos_key" {
  name         = "cosmos-key"
  value        = azurerm_cosmosdb_account.main.primary_key
  key_vault_id = azurerm_key_vault.main.id

  tags = local.common_tags

  depends_on = [azurerm_key_vault_access_policy.terraform_user]
}
