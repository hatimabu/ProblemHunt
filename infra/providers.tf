terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "azurerm" {
    resource_group_name  = "problemhunt"
    storage_account_name = "problemhuntnewtfstate"
    container_name       = "tfstate"
    key                  = "problemhunt.tfstate"
  }
}

provider "azurerm" {
  features {}
}
