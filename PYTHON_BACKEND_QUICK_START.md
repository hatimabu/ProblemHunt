# Quick Start - Python Backend Integration

## 🎯 What Was Done

Your UI has been completely rewired to use the **Python backend** instead of the old `/api` folder. All components now use proper authentication and configuration management.

## 📝 Files Changed

### New Files Created
1. **`problem-hunt/src/lib/api-config.js`** - API endpoint configuration
2. **`AZURE_DEPLOYMENT_GUIDE_PYTHON.md`** - Complete Azure deployment steps
3. **`FRONTEND_REWIRING_COMPLETE.md`** - Detailed implementation summary
4. **`AZURE_DEPLOYMENT_STATUS.md`** - Deployment status and checklist

### Components Updated
1. **`post-problem.tsx`** - Now uses `authenticatedFetch()`
2. **`browse-problems.tsx`** - Now uses `buildApiUrl()`
3. **`problem-detail.tsx`** - Now uses `buildApiUrl()`
4. **`builder-dashboard.tsx`** - Now uses `authenticatedFetch()` and `handleResponse()`

### Library Updated
1. **`auth-helper.js`** - Now uses `api-config.js` for endpoint resolution

## ✅ What's Working

- ✅ All UI components use Python backend
- ✅ Local development at `localhost:7071`
- ✅ Proper JWT authentication for all protected endpoints
- ✅ Configuration supports both local and cloud endpoints
- ✅ Error handling improved across all components

## ⚠️ Azure Deployment Status

**NOT DEPLOYED TO AZURE** - API is running locally only via:
```
http://localhost:7071/api/*
```

To deploy to Azure, follow: **[AZURE_DEPLOYMENT_GUIDE_PYTHON.md](AZURE_DEPLOYMENT_GUIDE_PYTHON.md)**

## 🚀 To Run Locally

### Terminal 1: Start Python Backend
```powershell
cd problem-hunt/python-function
func start
```

Expected output:
```
Available Functions:

	CreateProblem: [POST] http://localhost:7071/api/problems
	GetProblems: [GET] http://localhost:7071/api/problems
	GetProblemById: [GET] http://localhost:7071/api/problems/{id}
	...
```

### Terminal 2: Start Frontend
```powershell
cd problem-hunt
npm run dev
```

Then open: http://localhost:5173

## 🔌 API Endpoints (Python Backend)

### Public Endpoints (No Auth Required)
```
GET /api/problems                           # Browse all problems
GET /api/problems?category=AI/ML&sortBy=... # Filter problems
GET /api/problems/{id}                      # View problem details
GET /api/problems/search?q=...              # Search problems
```

### Protected Endpoints (Requires Supabase Login)
```
POST /api/problems                          # Create problem
PUT /api/problems/{id}                      # Update problem
DELETE /api/problems/{id}                   # Delete problem
GET /api/user/problems                      # Get user's problems
POST /api/problems/{id}/upvote              # Upvote problem
DELETE /api/problems/{id}/upvote            # Remove upvote
GET /api/problems/{id}/proposals            # View proposals
POST /api/problems/{id}/proposals           # Create proposal
POST /api/proposals/{id}/tip                # Send tip
```

## 🔐 Authentication Flow

1. User logs in via Supabase UI
2. Supabase returns JWT access token
3. Frontend stores token automatically
4. `authenticatedFetch()` adds token to API requests
5. Python backend validates token
6. Request proceeds with authenticated context

## 📊 Key Code Examples

### Make Authenticated Request (Protected Endpoint)
```javascript
import { authenticatedFetch, handleResponse } from 'src/lib/auth-helper';

const response = await authenticatedFetch('/api/problems', {
  method: 'POST',
  body: { title: 'New Problem', description: '...' }
});
const data = await handleResponse(response);
```

### Make Public Request (No Auth)
```javascript
import { buildApiUrl } from 'src/lib/api-config';

const url = buildApiUrl('/api/problems?category=AI/ML');
const response = await fetch(url);
const data = await response.json();
```

## 🧪 Test the Connection

### In Browser Console
```javascript
// Test public endpoint
fetch('http://localhost:7071/api/problems')
  .then(r => r.json())
  .then(d => console.log('Problems:', d))
```

### With cURL
```powershell
# Get all problems
curl -X GET "http://localhost:7071/api/problems"

# Create problem (requires token)
$token = "your-supabase-token"
curl -X POST "http://localhost:7071/api/problems" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"title":"Test","description":"Test","category":"AI/ML","budget":"1000"}'
```

## 🐛 Debugging

### Frontend Issues
1. Check browser console (F12)
2. Look for network errors in Network tab
3. Check auth status in dev tools Storage → Cookies

### Backend Issues
1. Check Python function logs in terminal
2. Look for JWT validation errors
3. Verify environment variables in `local.settings.json`

### Connection Issues
1. Ensure `func start` is running
2. Check port 7071 is not blocked
3. Verify `localhost:5173` can reach `localhost:7071`

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [AZURE_DEPLOYMENT_GUIDE_PYTHON.md](AZURE_DEPLOYMENT_GUIDE_PYTHON.md) | How to deploy to Azure |
| [FRONTEND_REWIRING_COMPLETE.md](FRONTEND_REWIRING_COMPLETE.md) | Complete change summary |
| [AZURE_DEPLOYMENT_STATUS.md](AZURE_DEPLOYMENT_STATUS.md) | Current deployment status |
| [API_SPECIFICATION.md](API_SPECIFICATION.md) | API endpoint details |
| [PYTHON_API_MIGRATION.md](PYTHON_API_MIGRATION.md) | Backend structure |

## 🔄 Environment Configuration

### Local Development (Default)
```env
# problem-hunt/.env
VITE_API_BASE=http://localhost:7071
```

### Azure Production (When Deployed)
```env
# problem-hunt/.env
VITE_API_BASE=https://problemhunt-api.azurewebsites.net
```

## ⚡ Benefits of New Architecture

✅ **Centralized Configuration** - Single source of truth for API endpoints
✅ **Easy Switching** - Move between local/cloud with one env variable
✅ **Better Authentication** - Consistent token handling everywhere
✅ **Improved Error Handling** - Standardized error responses
✅ **Easier Testing** - Mock endpoints by changing config
✅ **Production Ready** - Scales to Azure Functions seamlessly

## 🎓 Learning Resources

- [Azure Functions Python Guide](https://docs.microsoft.com/azure/azure-functions/functions-reference-python)
- [Supabase Authentication](https://supabase.com/docs/guides/auth)
- [Cosmos DB Documentation](https://docs.microsoft.com/azure/cosmos-db/)

## 🆘 Common Issues & Solutions

### "localhost:7071 refused to connect"
**Solution**: Start Python backend with `func start` first

### "Cannot find module api-config"
**Solution**: Clear node_modules, run `npm install`

### "401 Unauthorized"
**Solution**: Log out and log back in to refresh token

### "CORS error"
**Solution**: Check Function App CORS settings if deployed to Azure

## 🚀 Next Steps

1. ✅ **Run Locally** - Test everything works
2. ⏳ **Deploy to Azure** (when ready) - Follow deployment guide
3. 📊 **Monitor Performance** - Use Application Insights
4. 🔄 **Set Up CI/CD** - Automate deployments (optional)

## 📞 Support

- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Review [AZURE_DEPLOYMENT_GUIDE_PYTHON.md](AZURE_DEPLOYMENT_GUIDE_PYTHON.md) for deployment help
- Inspect function logs in terminal: `func start` output

---

**Status**: ✅ LOCAL ONLY - Ready for testing
**Next**: Deploy to Azure when ready (follow deployment guide)
**Backend**: Python Functions in `problem-hunt/python-function/`
**Last Updated**: February 12, 2026
