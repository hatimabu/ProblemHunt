#Requires -Version 7
<#
.SYNOPSIS
  Bootstraps Azure resources for ProblemHunt CI/CD.

.DESCRIPTION
  1. Ensures the resource group 'problemhunt' exists in the CURRENT subscription.
  2. Ensures the Terraform backend storage account exists.
  3. Creates a service principal for GitHub Actions (optional).

.PREREQUISITES
  - Azure CLI installed and logged in (az login)
  - You are in the CORRECT subscription (az account set --subscription <id>)
#>
param(
    [string]$ResourceGroupName = "problemhunt",
    [string]$Location = "eastus2",
    [string]$StorageAccountName = "problemhunttfstate",
    [string]$ContainerName = "tfstate",
    [switch]$CreateServicePrincipal
)

$ErrorActionPreference = "Stop"

# Verify logged in
$account = az account show --output json | ConvertFrom-Json
if (-not $account) {
    Write-Error "Not logged into Azure. Run 'az login' first."
}

Write-Host "Using subscription: $($account.name) ($($account.id))" -ForegroundColor Cyan

# 1. Resource Group
$rg = az group show --name $ResourceGroupName --output json 2>$null | ConvertFrom-Json
if (-not $rg) {
    Write-Host "Creating resource group '$ResourceGroupName'..." -ForegroundColor Yellow
    az group create --name $ResourceGroupName --location $Location
} else {
    Write-Host "Resource group '$ResourceGroupName' already exists." -ForegroundColor Green
}

# 2. Storage Account for Terraform state
$sa = az storage account show --name $StorageAccountName --resource-group $ResourceGroupName --output json 2>$null | ConvertFrom-Json
if (-not $sa) {
    Write-Host "Creating storage account '$StorageAccountName'..." -ForegroundColor Yellow
    az storage account create `
        --name $StorageAccountName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --sku Standard_LRS `
        --min-tls-version TLS1_2
} else {
    Write-Host "Storage account '$StorageAccountName' already exists." -ForegroundColor Green
}

# 3. Container
$container = az storage container show --name $ContainerName --account-name $StorageAccountName --auth-mode login --output json 2>$null | ConvertFrom-Json
if (-not $container) {
    Write-Host "Creating container '$ContainerName'..." -ForegroundColor Yellow
    az storage container create --name $ContainerName --account-name $StorageAccountName --auth-mode login
} else {
    Write-Host "Container '$ContainerName' already exists." -ForegroundColor Green
}

# 4. Service Principal (optional)
if ($CreateServicePrincipal) {
    Write-Host "`nCreating service principal for GitHub Actions..." -ForegroundColor Cyan
    $sp = az ad sp create-for-rbac `
        --name "problemhunt-gha" `
        --role contributor `
        --scopes "/subscriptions/$($account.id)" `
        --sdk-auth | ConvertFrom-Json

    Write-Host "`n=== AZURE_CREDENTIALS JSON ===" -ForegroundColor Green
    $sp | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host "================================" -ForegroundColor Green
    Write-Host "Copy the JSON above into your GitHub secret named AZURE_CREDENTIALS." -ForegroundColor Yellow
} else {
    Write-Host "`nSkipping service principal creation. Use -CreateServicePrincipal if you need one." -ForegroundColor Gray
}

Write-Host "`nBootstrap complete." -ForegroundColor Green
