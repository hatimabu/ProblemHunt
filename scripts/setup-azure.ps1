#!/usr/bin/env pwsh
# -----------------------------------------------------------------------------
# One-time Azure setup for ProblemHunt CI/CD
# -----------------------------------------------------------------------------
# This script creates:
#   1. An Azure Service Principal for GitHub Actions
#   2. A Storage Account for Terraform remote state
#
# Run this ONCE on your local machine with `az login` first.
# Then copy the JSON output into GitHub Secret: AZURE_CREDENTIALS
# -----------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

$subscriptionId = az account show --query id -o tsv
$tenantId       = az account show --query tenantId -o tsv

if (-not $subscriptionId) {
    Write-Host "❌ Not logged into Azure. Run: az login" -ForegroundColor Red
    exit 1
}

Write-Host "Subscription: $subscriptionId" -ForegroundColor Cyan
Write-Host "Tenant:       $tenantId" -ForegroundColor Cyan
Write-Host ""

# 1. Create Resource Group if it doesn't exist
$rgName = "problemhunt"
$rgExists = az group exists --name $rgName
if ($rgExists -eq "false") {
    Write-Host "Creating resource group: $rgName ..." -ForegroundColor Yellow
    az group create --name $rgName --location eastus
} else {
    Write-Host "Resource group already exists: $rgName" -ForegroundColor Green
}

# 2. Create Terraform backend storage account
$storageName = "problemhunttfstate"
$containerName = "tfstate"

$storageExists = az storage account check-name --name $storageName --query nameAvailable -o tsv
if ($storageExists -eq "true") {
    Write-Host "Creating Terraform state storage account: $storageName ..." -ForegroundColor Yellow
    az storage account create `
        --name $storageName `
        --resource-group $rgName `
        --location eastus `
        --sku Standard_LRS `
        --min-tls-version TLS1_2

    $storageKey = az storage account keys list --account-name $storageName --query "[0].value" -o tsv
    az storage container create --name $containerName --account-name $storageName --account-key $storageKey
} else {
    Write-Host "Storage account already exists: $storageName" -ForegroundColor Green
}

# 3. Create Service Principal for GitHub Actions
Write-Host "Creating Service Principal for GitHub Actions ..." -ForegroundColor Yellow

$sp = az ad sp create-for-rbac `
    --name "problemhunt-github-actions" `
    --role contributor `
    --scopes "/subscriptions/$subscriptionId/resourceGroups/$rgName" `
    --sdk-auth | ConvertFrom-Json

if (-not $sp) {
    Write-Host "❌ Failed to create Service Principal" -ForegroundColor Red
    exit 1
}

# 4. Output the credentials JSON
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  COPY THE JSON BELOW INTO GITHUB SECRET: AZURE_CREDENTIALS" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

$creds = @{
    clientId       = $sp.clientId
    clientSecret   = $sp.clientSecret
    subscriptionId = $subscriptionId
    tenantId       = $tenantId
} | ConvertTo-Json -Depth 10

Write-Host $creds -ForegroundColor Cyan
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ALSO SAVE THESE SECRETS IN GITHUB:" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  AZURE_STATIC_WEB_APPS_API_TOKEN  →  From Azure Portal → SWA 'problemhunt' → Manage deployment token"
Write-Host ""
Write-Host "Done." -ForegroundColor Green
