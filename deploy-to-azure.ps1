# Azure Deployment Script for Problem Hunt Python Functions
# This script automates the deployment to Azure

Write-Host "🚀 Starting Azure Deployment..." -ForegroundColor Cyan

# Configuration
$resourceGroup = "problemhunt-rg"
$location = "eastus"
$storageName = "problemhuntstorage"
$functionAppName = "problemhunt-api"
$pythonVersion = "3.11"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Resource Group: $resourceGroup"
Write-Host "  Location: $location"
Write-Host "  Function App: $functionAppName"
Write-Host ""

# Step 1: Check if logged in
Write-Host "✓ Step 1: Checking Azure Login..." -ForegroundColor Cyan
$account = az account show 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Azure. Please run: az login" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in as: $(($account | ConvertFrom-Json).user.name)" -ForegroundColor Green

# Step 2: Create Resource Group
Write-Host ""
Write-Host "✓ Step 2: Creating Resource Group..." -ForegroundColor Cyan
$rg = az group create --name $resourceGroup --location $location 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Resource Group created" -ForegroundColor Green
} else {
    Write-Host "⚠️  Resource Group might already exist, continuing..." -ForegroundColor Yellow
}

# Step 3: Create Storage Account
Write-Host ""
Write-Host "✓ Step 3: Creating Storage Account..." -ForegroundColor Cyan
$storage = az storage account create --name $storageName --resource-group $resourceGroup --location $location --sku Standard_LRS 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Storage Account created" -ForegroundColor Green
} else {
    Write-Host "⚠️  Storage Account might already exist, continuing..." -ForegroundColor Yellow
}

# Step 4: Create Function App
Write-Host ""
Write-Host "✓ Step 4: Creating Function App..." -ForegroundColor Cyan
$funcApp = az functionapp create `
    --resource-group $resourceGroup `
    --consumption-plan-location $location `
    --runtime python `
    --runtime-version $pythonVersion `
    --functions-version 4 `
    --name $functionAppName `
    --storage-account $storageName 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Function App created" -ForegroundColor Green
} else {
    Write-Host "⚠️  Function App might already exist, continuing..." -ForegroundColor Yellow
}

# Step 5: Get credentials from local.settings.json
Write-Host ""
Write-Host "✓ Step 5: Reading Cosmos DB and Supabase credentials..." -ForegroundColor Cyan
$settingsPath = "problem-hunt/python-function/local.settings.json"
$settings = Get-Content $settingsPath | ConvertFrom-Json

$cosmosEndpoint = $settings.Values.COSMOS_ENDPOINT
$cosmosKey = $settings.Values.COSMOS_KEY
$cosmosDatabase = $settings.Values.COSMOS_DATABASE
$supabaseUrl = $settings.Values.SUPABASE_URL
$supabaseAnonKey = $settings.Values.SUPABASE_ANON_KEY
$supabaseJwtSecret = $settings.Values.SUPABASE_JWT_SECRET

Write-Host "✅ Credentials loaded" -ForegroundColor Green

# Step 6: Configure Function App Settings
Write-Host ""
Write-Host "✓ Step 6: Configuring Function App settings..." -ForegroundColor Cyan
az functionapp config appsettings set `
    --name $functionAppName `
    --resource-group $resourceGroup `
    --settings `
        COSMOS_ENDPOINT=$cosmosEndpoint `
        COSMOS_KEY=$cosmosKey `
        COSMOS_DATABASE=$cosmosDatabase `
        COSMOS_CONTAINER_PROBLEMS="Problems" `
        COSMOS_CONTAINER_PROPOSALS="Proposals" `
        COSMOS_CONTAINER_UPVOTES="Upvotes" `
        COSMOS_CONTAINER_TIPS="Tips" `
        SUPABASE_URL=$supabaseUrl `
        SUPABASE_ANON_KEY=$supabaseAnonKey `
        SUPABASE_JWT_SECRET=$supabaseJwtSecret 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Settings configured" -ForegroundColor Green
} else {
    Write-Host "❌ Error setting configuration" -ForegroundColor Red
    exit 1
}

# Step 7: Deploy Functions
Write-Host ""
Write-Host "✓ Step 7: Deploying Python Functions..." -ForegroundColor Cyan
Write-Host "  This may take 2-3 minutes..." -ForegroundColor Yellow
Push-Location "problem-hunt/python-function"

func azure functionapp publish $functionAppName --build remote

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Functions deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Error deploying functions" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# Step 8: Configure CORS
Write-Host ""
Write-Host "✓ Step 8: Configuring CORS..." -ForegroundColor Cyan
az functionapp cors add `
    --name $functionAppName `
    --resource-group $resourceGroup `
    --allowed-origins "*" 2>$null

Write-Host "✅ CORS configured" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your API is now live at:" -ForegroundColor Yellow
Write-Host "   https://$functionAppName.azurewebsites.net/api/*" -ForegroundColor Cyan
Write-Host ""
Write-Host "Important URLs:" -ForegroundColor Yellow
Write-Host "   GET /api/problems           - https://$functionAppName.azurewebsites.net/api/problems" -ForegroundColor Cyan
Write-Host "   POST /api/problems          - https://$functionAppName.azurewebsites.net/api/problems" -ForegroundColor Cyan
Write-Host "   GET /api/problems/{id}      - https://$functionAppName.azurewebsites.net/api/problems/{id}" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Update .env file:"
Write-Host "      VITE_API_BASE=https://$functionAppName.azurewebsites.net"
Write-Host ""
Write-Host "   2. Build and deploy frontend:"
Write-Host "      npm run build"
Write-Host "      npm run preview"
Write-Host ""
Write-Host "   3. Test the API:"
Write-Host "      curl https://$functionAppName.azurewebsites.net/api/problems"
Write-Host ""
Write-Host "Monitor your deployment:"
Write-Host "   Azure Portal: https://portal.azure.com"
Write-Host "   Resource: $functionAppName"
Write-Host "   Logs: Monitor - Application logs"
Write-Host ""
