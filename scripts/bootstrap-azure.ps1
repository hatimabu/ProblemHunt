#Requires -Version 7
<#
.SYNOPSIS
  Bootstraps Azure resources for ProblemHunt CI/CD.

.DESCRIPTION
  1. Ensures the resource group 'problemhunt' exists in the target subscription.
  2. Ensures the Terraform backend storage account exists.
  3. Creates a service principal for GitHub Actions (optional).

.PREREQUISITES
  - Azure CLI installed and logged in (az login)
  - Pass -SubscriptionId, set AZURE_SUBSCRIPTION_ID, or set AZURE_CREDENTIALS
#>
param(
    [string]$ResourceGroupName = "problemhunt",
    [string]$Location = "eastus2",
    [string]$StorageAccountName = "problemhuntnewtfstate",
    [string]$ContainerName = "tfstate",
    [string]$SubscriptionId = $env:AZURE_SUBSCRIPTION_ID,
    [switch]$CreateServicePrincipal
)

$ErrorActionPreference = "Stop"

# Verify logged in
$account = az account show --output json | ConvertFrom-Json
if (-not $account) {
    Write-Error "Not logged into Azure. Run 'az login' first."
}

if (-not $SubscriptionId -and $env:AZURE_CREDENTIALS) {
    $SubscriptionId = ($env:AZURE_CREDENTIALS | ConvertFrom-Json).subscriptionId
}

if ($SubscriptionId) {
    az account set --subscription $SubscriptionId
    $account = az account show --output json | ConvertFrom-Json
} else {
    $SubscriptionId = $account.id
}

Write-Host "Using subscription: $($account.name) ($($account.id))" -ForegroundColor Cyan

# 1. Resource Group
$rg = az group show --name $ResourceGroupName --subscription $SubscriptionId --output json 2>$null | ConvertFrom-Json
if (-not $rg) {
    Write-Host "Creating resource group '$ResourceGroupName'..." -ForegroundColor Yellow
    az group create --name $ResourceGroupName --location $Location --subscription $SubscriptionId
} else {
    Write-Host "Resource group '$ResourceGroupName' already exists." -ForegroundColor Green
}

# 2. Storage Account for Terraform state
$sa = az storage account show --name $StorageAccountName --resource-group $ResourceGroupName --subscription $SubscriptionId --output json 2>$null | ConvertFrom-Json
if (-not $sa) {
    Write-Host "Creating storage account '$StorageAccountName'..." -ForegroundColor Yellow
    az storage account create `
        --name $StorageAccountName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --sku Standard_LRS `
        --min-tls-version TLS1_2 `
        --allow-blob-public-access false `
        --subscription $SubscriptionId
} else {
    Write-Host "Storage account '$StorageAccountName' already exists." -ForegroundColor Green
}

# 3. Container
$container = az storage container show --name $ContainerName --account-name $StorageAccountName --auth-mode login --subscription $SubscriptionId --output json 2>$null | ConvertFrom-Json
if (-not $container) {
    Write-Host "Creating container '$ContainerName'..." -ForegroundColor Yellow
    az storage container create --name $ContainerName --account-name $StorageAccountName --auth-mode login --subscription $SubscriptionId
} else {
    Write-Host "Container '$ContainerName' already exists." -ForegroundColor Green
}

# 4. Service Principal (optional)
if ($CreateServicePrincipal) {
    Write-Host "`nCreating service principal for GitHub Actions..." -ForegroundColor Cyan
    $sp = az ad sp create-for-rbac `
        --name "problemhunt-gha" `
        --role contributor `
        --scopes "/subscriptions/$SubscriptionId" `
        --sdk-auth | ConvertFrom-Json

    Write-Host "`n=== AZURE_CREDENTIALS JSON ===" -ForegroundColor Green
    $sp | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host "================================" -ForegroundColor Green
    Write-Host "Copy the JSON above into your GitHub secret named AZURE_CREDENTIALS." -ForegroundColor Yellow
} else {
    Write-Host "`nSkipping service principal creation. Use -CreateServicePrincipal if you need one." -ForegroundColor Gray
}

Write-Host "`nBootstrap complete." -ForegroundColor Green
