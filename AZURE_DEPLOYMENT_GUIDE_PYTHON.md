# Python Function Backend - Azure Deployment Guide

## Overview

Your Problem Hunt application has been successfully rewired to use the **Python backend** (`problem-hunt/python-function`) instead of the old `/api` folder. This guide covers deploying the Python Functions to Azure.

## Current Status

✅ **Backend**: Python Azure Functions (`problem-hunt/python-function`)
✅ **Local Development**: Running on `localhost:7071` via Azure Functions Core Tools
✅ **Frontend**: Updated to use new API configuration with `api-config.js`
⚠️ **Cloud Deployment**: **NOT YET DEPLOYED** to Azure - currently local only

## Prerequisites

Before deploying to Azure, ensure you have:

1. **Azure CLI** installed: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
2. **Azure Functions Core Tools** installed: https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local
3. **Azure Subscription** with an active payment method
4. **View Azure Resource Graph** access to manage Function Apps

## Python Backend Structure

```
problem-hunt/python-function/
├── router.py                    # Main router for all endpoints
├── handlers/                    # Business logic for each endpoint
│   ├── create_problem.py
│   ├── get_problems.py
│   ├── get_problem_by_id.py
│   ├── update_problem.py
│   ├── delete_problem.py
│   ├── upvote_problem.py
│   ├── remove_upvote.py
│   ├── get_proposals.py
│   ├── create_proposal.py
│   ├── search_problems.py
│   ├── get_user_problems.py
│   └── tip_builder.py
├── shared/                      # Shared utilities
│   └── auth.py                 # JWT authentication
├── cosmos.py                    # Cosmos DB client
├── utils.py                     # Helper functions
├── requirements.txt             # Python dependencies
├── local.settings.json          # Local configuration
└── local.settings.example.json  # Configuration template
```

## API Endpoints

All endpoints are secured with Supabase JWT authentication.

### Problems Management
- `POST /api/problems` - Create a new problem
- `GET /api/problems` - Get all problems (with filtering/sorting)
  - Query params: `?category=AI/ML&sortBy=budget`
- `GET /api/problems/{id}` - Get problem by ID
- `PUT /api/problems/{id}` - Update problem
- `DELETE /api/problems/{id}` - Delete problem

### User Problems
- `GET /api/user/problems` - Get authenticated user's problems
  - Query params: `?sortBy=newest`

### Upvotes
- `POST /api/problems/{id}/upvote` - Upvote a problem
- `DELETE /api/problems/{id}/upvote` - Remove upvote

### Proposals
- `GET /api/problems/{id}/proposals` - Get proposals for a problem
- `POST /api/problems/{id}/proposals` - Create a proposal
- `POST /api/proposals/{id}/tip` - Send tip to proposal builder

### Search
- `GET /api/problems/search?q=<query>` - Search problems

## Step 1: Create Azure Resources

### 1.1 Create a Resource Group

```powershell
az group create `
  --name problenhunt-rg `
  --location eastus
```

### 1.2 Create a Storage Account (required for Function App)

```powershell
az storage account create `
  --name problemhuntstorage `
  --resource-group problemhunt-rg `
  --location eastus `
  --sku Standard_LRS
```

### 1.3 Create an Azure Function App

```powershell
az functionapp create `
  --resource-group problemhunt-rg `
  --consumption-plan-location eastus `
  --runtime python `
  --runtime-version 3.11 `
  --functions-version 4 `
  --name problemhunt-api `
  --storage-account problemhuntstorage
```

**Note**: The function app name (`problemhunt-api`) must be globally unique. Modify as needed.

## Step 2: Configure Environment Variables

### 2.1 Get Your Configuration Values

You'll need these from your existing setup:

```powershell
# From your Supabase project
$SUPABASE_JWT_SECRET = "your-jwt-secret-from-supabase"

# From your Cosmos DB
$COSMOS_ENDPOINT = "https://your-account.documents.azure.com:443/"
$COSMOS_KEY = "your-cosmos-db-key"
$COSMOS_DATABASE = "ProblemHuntDB"
```

### 2.2 Set Function App Settings

```powershell
az functionapp config appsettings set `
  --name problemhunt-api `
  --resource-group problemhunt-rg `
  --settings `
    SUPABASE_JWT_SECRET=$SUPABASE_JWT_SECRET `
    COSMOS_ENDPOINT=$COSMOS_ENDPOINT `
    COSMOS_KEY=$COSMOS_KEY `
    COSMOS_DATABASE=$COSMOS_DATABASE
```

## Step 3: Deploy the Python Functions

### 3.1 Login to Azure

```powershell
az login
```

### 3.2 Deploy from Local Machine

Navigate to the Python function directory and deploy:

```powershell
cd problem-hunt/python-function

# Deploy the functions
func azure functionapp publish problemhunt-api --build remote
```

**Output**: You'll see the deployed function URLs:
```
Functions in problemhunt-api:
    CreateProblem - [POST] https://problemhunt-api.azurewebsites.net/api/problems
    GetProblems - [GET] https://problemhunt-api.azurewebsites.net/api/problems
    GetProblemById - [GET] https://problemhunt-api.azurewebsites.net/api/problems/{id}
    ...
```

### 3.3 Verify Deployment

```powershell
# Check function app status
az functionapp show --name problemhunt-api --resource-group problemhunt-rg

# View deployment logs
func azure functionapp logstream problemhunt-api
```

## Step 4: Update Frontend Configuration

Once deployed to Azure, update your frontend to use the cloud endpoint:

### 4.1 Update `.env` File

In `problem-hunt/.env`:

```env
# Development (local Azure Functions emulator)
VITE_API_BASE=http://localhost:7071

# Production (Azure Functions)
# VITE_API_BASE=https://problemhunt-api.azurewebsites.net
```

### 4.2 Environment-Based Configuration

The `api-config.js` file automatically selects the endpoint based on `NODE_ENV`:

```javascript
// Development (npm run dev)
→ uses VITE_API_BASE or localhost:7071

// Production (npm run build)
→ uses VITE_API_BASE or relative path
```

## Step 5: Configure CORS (if needed)

If your frontend is on a different domain, update CORS:

```powershell
az functionapp cors add `
  --name problemhunt-api `
  --resource-group problemhunt-rg `
  --allowed-origins "https://yourdomain.com"
```

## Step 6: Enable Authentication

The Python functions automatically validate JWT tokens from Supabase. No additional Azure authentication configuration needed.

## Testing the Deployed API

### Test with cURL

```powershell
# Get all problems (public endpoint - no auth required)
curl -X GET "https://problemhunt-api.azurewebsites.net/api/problems"

# Create a problem (requires authentication)
$token = "your-supabase-access-token"
curl -X POST "https://problemhunt-api.azurewebsites.net/api/problems" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{
    "title": "Test Problem",
    "description": "This is a test",
    "category": "AI/ML",
    "budget": "5000"
  }'
```

### Test from Frontend

Update `.env`:
```env
VITE_API_BASE=https://problemhunt-api.azurewebsites.net
```

Build and run:
```powershell
npm run build
npm run preview
```

## Monitoring & Logs

### View Real-time Logs

```powershell
func azure functionapp logstream problemhunt-api
```

### View in Azure Portal

1. Go to Azure Portal → Function Apps → problemhunt-api
2. Click "Monitor" → "Logs"
3. Check Application Insights for errors and performance

## Troubleshooting

### 401 Unauthorized Error

**Cause**: Invalid or expired JWT token

**Solution**:
1. Verify `SUPABASE_JWT_SECRET` matches your Supabase settings
2. Ensure user is logged into Supabase
3. Check token expiration in Application Insights

### 404 Not Found

**Cause**: Endpoint not deployed or URL incorrect

**Solution**:
1. Verify function app name: `az functionapp list --resource-group problemhunt-rg`
2. Check deployed functions: `az functionapp function list --name problemhunt-api --resource-group problemhunt-rg`

### Cosmos DB Connection Error

**Cause**: Database credentials incorrect or network issue

**Solution**:
1. Verify credentials in Function App settings
2. Check Cosmos DB firewall allows Azure Functions
3. Verify database name in settings

### CORS Error in Browser

**Cause**: Frontend domain not allowed

**Solution**:
```powershell
az functionapp cors add \
  --name problemhunt-api \
  --resource-group problemhunt-rg \
  --allowed-origins "https://yourdomain.com"
```

## Advanced: CI/CD Deployment

### GitHub Actions Workflow

Create `.github/workflows/deploy-azure-functions.yml`:

```yaml
name: Deploy Python Functions to Azure

on:
  push:
    branches:
      - main
    paths:
      - 'problem-hunt/python-function/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install Azure Functions Core Tools
        run: |
          curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
          sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg
          sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/microsoft.gpg] https://packages.microsoft.com/repos/azure-cli/ jammy main" > /etc/apt/sources.list.d/azure-cli.list'
          sudo apt-get update
          sudo apt-get install azure-functions-core-tools-4
      
      - name: Deploy to Azure
        working-directory: problem-hunt/python-function
        run: |
          func azure functionapp publish problemhunt-api --build remote
        env:
          AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS }}
```

## Next Steps

1. ✅ Deploy Python Functions to Azure
2. ✅ Configure CORS if using custom frontend domain
3. ✅ Test all endpoints with deployed API
4. ✅ Update frontend `.env` to use Azure endpoint
5. ✅ Deploy Static Web App for frontend
6. ✅ Monitor with Application Insights
7. ✅ Set up CI/CD pipeline

## References

- [Azure Functions Documentation](https://learn.microsoft.com/en-us/azure/azure-functions/)
- [Azure Functions Python Developer Guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python)
- [Azure Cosmos DB Documentation](https://learn.microsoft.com/en-us/azure/cosmos-db/)
- [Supabase JWT Documentation](https://supabase.com/docs/guides/auth/jwt)

## Support

For issues or questions:
- Check Azure Function logs: `func azure functionapp logstream problemhunt-api`
- Review API specification: [API_SPECIFICATION.md](API_SPECIFICATION.md)
- Check Python migration guide: [PYTHON_API_MIGRATION.md](PYTHON_API_MIGRATION.md)
