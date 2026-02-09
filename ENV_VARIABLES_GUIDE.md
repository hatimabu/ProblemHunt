# Environment Variables Template for ProblemHunt

This file explains all required environment variables for the full-stack application.

## Python Azure Functions (`python-function/local.settings.json` and Azure Portal)

### Supabase Authentication
```
SUPABASE_JWT_SECRET=<your-supabase-jwt-secret>
```
- **Required**: YES
- **Description**: Your Supabase JWT secret key (from Supabase project settings)
- **Used by**: `shared/auth.py` for JWT token validation (HS256)
- **Found in**: Supabase Dashboard → Settings → API → JWT Secret

### Azure Cosmos DB Connection
```
COSMOS_DB_ENDPOINT=https://<account-name>.documents.azure.com:443/
COSMOS_DB_KEY=<your-cosmos-db-primary-key>
COSMOS_DB_DATABASE=PostsDB
COSMOS_DB_CONTAINER=posts
```
- **COSMOS_DB_ENDPOINT**: Required. The URI of your Cosmos DB account
- **COSMOS_DB_KEY**: Required. The primary or secondary key for authentication
- **COSMOS_DB_DATABASE**: Optional. Database name (defaults to "PostsDB")
- **COSMOS_DB_CONTAINER**: Optional. Container name (defaults to "posts")
- **Used by**: `shared/db.py` for data persistence
- **Found in**: Azure Portal → Cosmos DB Account → Keys

## Frontend (`problem-hunt/staticwebapp.config.json` and .env)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```
- **VITE_SUPABASE_URL**: Your Supabase project URL
- **VITE_SUPABASE_ANON_KEY**: Your public API key (safe to expose in frontend)
- **Used by**: Frontend for user authentication via Supabase
- **Found in**: Supabase Dashboard → Settings → API → Project URL and Anon Key

## How to Find These Values

### Supabase JWT Secret
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **JWT Secret** value (keep this secret!)

### Cosmos DB Endpoint & Key
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Cosmos DB account
3. Click **Keys** in the left sidebar
4. Copy:
   - **URI** → `COSMOS_DB_ENDPOINT`
   - **PRIMARY KEY** → `COSMOS_DB_KEY`

### Supabase Anon Key & URL
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Key** → `VITE_SUPABASE_ANON_KEY` (this is public and okay to expose)

## Local Development Setup

### 1. Python Azure Functions
Create or update `python-function/local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "python",
    "SUPABASE_JWT_SECRET": "your-supabase-jwt-secret-here",
    "COSMOS_DB_ENDPOINT": "https://your-account.documents.azure.com:443/",
    "COSMOS_DB_KEY": "your-cosmos-db-key-here",
    "COSMOS_DB_DATABASE": "PostsDB",
    "COSMOS_DB_CONTAINER": "posts"
  }
}
```

### 2. Frontend Environment
Create `problem-hunt/.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Production Deployment

### Azure Function App Settings
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Function App
3. Click **Configuration** in the left sidebar
4. Add or update these Application Settings:
   - `SUPABASE_JWT_SECRET`
   - `COSMOS_DB_ENDPOINT`
   - `COSMOS_DB_KEY`
5. Click **Save**

### Azure Static Web App Environment Variables
1. Update `problem-hunt/staticwebapp.config.json` with:
   ```json
   "environmentVariables": {
     "VITE_SUPABASE_URL": "your-url",
     "VITE_SUPABASE_ANON_KEY": "your-key"
   }
   ```
2. Or use GitHub Secrets if deploying through GitHub Actions

## Security Best Practices

⚠️ **IMPORTANT**: Follow these security guidelines:

1. **Never commit secrets** to version control
2. **Add to .gitignore**:
   ```
   local.settings.json
   .env
   .env.local
   .env.*.local
   ```
3. **Use Azure Key Vault** for production secrets
4. **Rotate keys regularly**, especially if exposed
5. **JWT Secret**: Keep this extremely secure - it validates all user requests
6. **Database Key**: Only share with authorized services
7. **Anon Key**: Can be public (it's designed for it), but set proper RLS policies in Supabase

## Troubleshooting

### "Missing Authorization header" error
- Frontend is not sending the Bearer token
- Check: Is `authenticatedFetch()` being used?
- Check: Is user authenticated in Supabase?

### "Token validation failed" error
- `SUPABASE_JWT_SECRET` is incorrect or missing
- Check it matches your Supabase project exactly
- Restart the Function App after updating

### "Failed to connect to Cosmos DB" error
- `COSMOS_DB_ENDPOINT` or `COSMOS_DB_KEY` is incorrect
- Verify in Azure Portal that the keys work
- Check network connectivity if using private endpoints

### "User ID not found in token payload" error
- Supabase JWT format is unexpected
- Check Supabase JWT configuration
- Verify user is properly authenticated in Supabase
