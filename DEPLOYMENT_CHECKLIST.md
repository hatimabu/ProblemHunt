# Deployment Checklist for problemhunt.cc

## Changes Made
✅ Updated GitHub Actions workflow to deploy Azure Functions API  
✅ Configured API location: `./problem-hunt/python-function`  
✅ Added Cosmos DB environment variables to workflow

## Before Pushing to GitHub

### 1. Add GitHub Secrets
You need to add these secrets in your GitHub repository settings:
**Settings → Secrets and variables → Actions → New repository secret**

#### Existing Secrets (verify these are set):
- `AZURE_STATIC_WEB_APPS_API_TOKEN_KIND_HILL_0837DB60F`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

#### New Secrets to Add:
- `COSMOS_ENDPOINT` → Your Cosmos DB endpoint (e.g., `https://problemhunt.documents.azure.com:443/`)
- `COSMOS_KEY` → Your Cosmos DB primary key
- `COSMOS_DATABASE` → `ProblemHuntDB`
- `COSMOS_CONTAINER_PROBLEMS` → `Problems`
- `COSMOS_CONTAINER_PROPOSALS` → `Proposals`
- `COSMOS_CONTAINER_UPVOTES` → `Upvotes`
- `COSMOS_CONTAINER_TIPS` → `Tips`

### 2. Verify Local Setup Works
- [x] Azure Functions running locally (`func host start`)
- [ ] Test all API endpoints:
  - GET `/api/problems` - Browse problems
  - POST `/api/problems` - Create problem
  - GET `/api/problems/{id}` - Get problem by ID
  - POST `/api/proposals` - Create proposal
  - POST `/api/upvotes` - Upvote problem
  - DELETE `/api/upvotes` - Remove upvote

### 3. Commit and Push
```bash
git add .
git commit -m "Configure Azure Functions API deployment"
git push origin main
```

### 4. Monitor Deployment
1. Go to GitHub Actions tab in your repository
2. Watch the deployment workflow
3. Check for any errors in the build/deploy steps
4. Once complete, test your live site at https://problemhunt.cc

### 5. Test Live Site
After deployment, verify:
- [ ] Browse problems page loads
- [ ] Problems display correctly
- [ ] Can create new problems
- [ ] Can upvote problems
- [ ] Proposals work

## Local Development Setup
Your local setup is configured correctly:
- Vite dev server: http://localhost:5173
- Azure Functions: http://localhost:7071
- Vite proxy forwards `/api/*` to Functions

**To run locally:**
1. Terminal 1: `npm run dev` (in problem-hunt folder)
2. Terminal 2: `npm run func:host:start` OR use the VS Code task

## Troubleshooting

### If API calls fail on live site:
1. Check Azure Static Web Apps configuration in Azure Portal
2. Verify Application Settings include all COSMOS_* variables
3. Check function logs in Azure Portal
4. Verify staticwebapp.config.json routes are correct

### If local development fails:
- Ensure Azure Functions runtime is running
- Check `local.settings.json` has correct Cosmos DB credentials
- Verify Vite proxy in `vite.config.js` points to `http://localhost:7071`

## Next Steps After Initial Deployment
- [ ] Set up custom domain (if not already: problemhunt.cc)
- [ ] Configure SSL/HTTPS (automatic with Static Web Apps)
- [ ] Set up monitoring and alerts in Azure Portal
- [ ] Configure staging environments for testing

