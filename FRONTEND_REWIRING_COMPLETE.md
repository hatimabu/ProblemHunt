# Frontend Rewiring Complete - Python Backend Integration

## 📋 Summary

All UI components have been successfully rewired to use the **Python backend** instead of the old `/api` folder. The system now properly routes all API calls through the configured endpoint (local or Azure).

## ✅ Changes Made

### 1. Created API Configuration Layer
**File**: [src/lib/api-config.js](src/lib/api-config.js)

- Centralized configuration for API endpoints
- Supports both local development (`localhost:7071`) and Azure deployment (`https://function-app.azurewebsites.net`)
- Automatic endpoint selection based on environment
- Named endpoints for easy maintenance

### 2. Updated Authentication Helper
**File**: [src/lib/auth-helper.js](src/lib/auth-helper.js)

- Now uses `api-config.js` for endpoint resolution
- `authenticatedFetch()` automatically builds full URLs
- Supports both relative paths (`/api/problems`) and absolute URLs
- Cleaner error handling and logging

### 3. Fixed UI Components

#### ✅ [src/app/components/post-problem.tsx](src/app/components/post-problem.tsx)
- **Before**: Manual token handling with `fetch()` and `getSessionWithTimeout()`
- **After**: Uses `authenticatedFetch()` helper
- **Endpoint**: `POST /api/problems`

#### ✅ [src/app/components/browse-problems.tsx](src/app/components/browse-problems.tsx)
- **Before**: Plain `fetch()` without configuration
- **After**: Uses `buildApiUrl()` for consistent URL building
- **Endpoint**: `GET /api/problems?category={category}&sortBy={sortBy}`

#### ✅ [src/app/components/problem-detail.tsx](src/app/components/problem-detail.tsx)
- **Before**: Plain `fetch()` without configuration
- **After**: Uses `buildApiUrl()` for dynamic problem fetching
- **Endpoint**: `GET /api/problems/{id}`

#### ✅ [src/app/components/builder-dashboard.tsx](src/app/components/builder-dashboard.tsx)
- **Before**: Manual token handling with `getSessionWithTimeout()`
- **After**: Uses `authenticatedFetch()` and `handleResponse()` helpers
- **Endpoints**: 
  - `GET /api/user/problems` (fetch user's problems)
  - `DELETE /api/problems/{id}` (delete problem)

## 🔌 API Endpoints

All endpoints point to the Python backend in `problem-hunt/python-function/`:

### Problems
```
POST   /api/problems                    # Create problem
GET    /api/problems?category=...       # List problems
GET    /api/problems/{id}               # Get problem by ID
PUT    /api/problems/{id}               # Update problem
DELETE /api/problems/{id}               # Delete problem
```

### User Problems
```
GET    /api/user/problems?sortBy=...    # Get user's problems
```

### Upvotes
```
POST   /api/problems/{id}/upvote        # Upvote problem
DELETE /api/problems/{id}/upvote        # Remove upvote
```

### Proposals
```
GET    /api/problems/{id}/proposals     # Get proposals
POST   /api/problems/{id}/proposals     # Create proposal
POST   /api/proposals/{id}/tip          # Send tip
```

### Search
```
GET    /api/problems/search?q=...       # Search problems
```

## 🔐 Authentication

All authenticated endpoints require:
- **Header**: `Authorization: Bearer {supabase_jwt_token}`
- **Automatically added by**: `authenticatedFetch()` helper
- **Token sourced from**: Supabase session (after user login)

Examples:
- ✅ Authenticated: Creating problems, fetching user problems, deleting
- ✅ Public: Browsing problems, viewing problem details

## 🌍 Environment Configuration

### Local Development
```
# problem-hunt/.env
VITE_API_BASE=http://localhost:7071
```

Start local backend:
```powershell
cd problem-hunt/python-function
func start
```

### Azure Deployment (Future)
```
# problem-hunt/.env
VITE_API_BASE=https://problemhunt-api.azurewebsites.net
```

Deploy functions:
```powershell
cd problem-hunt/python-function
func azure functionapp publish problemhunt-api --build remote
```

## 📊 Current Status

### ✅ Completed
- [x] Frontend UI components updated
- [x] API configuration layer created
- [x] Authentication helper updated
- [x] All manual token handling removed
- [x] Consistent endpoint usage across app
- [x] Error handling improved
- [x] Local development fully functional

### ⚠️ Azure Deployment Status
- **NOT DEPLOYED** to Azure cloud
- Currently running locally via `localhost:7071`
- Python functions are ready for deployment
- See [AZURE_DEPLOYMENT_GUIDE_PYTHON.md](AZURE_DEPLOYMENT_GUIDE_PYTHON.md) for deployment instructions

## 🧪 Testing

### Local Testing
1. Start Python backend:
   ```powershell
   cd problem-hunt/python-function
   func start
   ```

2. In another terminal, start frontend:
   ```powershell
   cd problem-hunt
   npm run dev
   ```

3. Test endpoints:
   - Browse problems: http://localhost:5173/browse
   - Post problem: http://localhost:5173/post (requires login)
   - View problem: http://localhost:5173/problem/{id}
   - Dashboard: http://localhost:5173/dashboard (requires login)

### Manual API Testing
```powershell
# Get all problems (public)
curl -X GET "http://localhost:7071/api/problems"

# Create problem (requires auth token)
$token = "your-supabase-token"
curl -X POST "http://localhost:7071/api/problems" \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test","category":"AI/ML"}'
```

## 📁 File Structure Reference

```
problem-hunt/
├── src/
│   ├── lib/
│   │   ├── api-config.js          ✅ NEW - API configuration
│   │   ├── auth-helper.js         ✅ UPDATED - Uses api-config
│   │   └── supabaseClient.js      (unchanged)
│   └── app/
│       └── components/
│           ├── post-problem.tsx   ✅ UPDATED - Uses authenticatedFetch
│           ├── browse-problems.tsx ✅ UPDATED - Uses buildApiUrl
│           ├── problem-detail.tsx ✅ UPDATED - Uses buildApiUrl
│           └── builder-dashboard.tsx ✅ UPDATED - Uses authenticatedFetch
└── python-function/               ✅ Backend handlers
    ├── router.py                  (routes all endpoints)
    ├── handlers/
    │   ├── create_problem.py
    │   ├── get_problems.py
    │   ├── get_problem_by_id.py
    │   ├── update_problem.py
    │   ├── delete_problem.py
    │   ├── get_user_problems.py
    │   └── ... (other handlers)
    └── shared/
        └── auth.py                (JWT validation)
```

## 🔍 Key Code Patterns

### Using authenticatedFetch (for protected endpoints)
```javascript
import { authenticatedFetch, handleResponse } from './lib/auth-helper';

try {
  const response = await authenticatedFetch('/api/problems', {
    method: 'POST',
    body: { title: 'My Problem', description: '...' }
  });
  const data = await handleResponse(response);
  console.log('Success:', data);
} catch (error) {
  console.error('Failed:', error.message);
}
```

### Using buildApiUrl (for public endpoints)
```javascript
import { buildApiUrl } from './lib/api-config';

const url = buildApiUrl(`/api/problems?category=AI/ML`);
const response = await fetch(url);
```

## 🚀 Next Steps

1. **Deploy to Azure** (Optional):
   - See [AZURE_DEPLOYMENT_GUIDE_PYTHON.md](AZURE_DEPLOYMENT_GUIDE_PYTHON.md)
   - Follow step-by-step instructions for Azure Function App deployment

2. **Production Build**:
   ```powershell
   npm run build
   npm run preview
   ```

3. **Monitor & Debug**:
   - Local: Check browser console and terminal
   - Azure: Use Application Insights and function logs

## 📚 Documentation

- [API Specification](API_SPECIFICATION.md)
- [Python API Migration Guide](PYTHON_API_MIGRATION.md)
- [Azure Deployment Guide](AZURE_DEPLOYMENT_GUIDE_PYTHON.md)
- [Troubleshooting](TROUBLESHOOTING.md)

## ❓ FAQ

**Q: Is the API deployed to Azure?**
A: No, currently running locally. See deployment guide for cloud deployment.

**Q: Can I switch between local and Azure endpoints?**
A: Yes, update `VITE_API_BASE` in `.env` file and rebuild.

**Q: What happens if the backend is down?**
A: Users will see connection errors. Check logs and restart `func start`.

**Q: Can I use this with Azure Static Web Apps?**
A: Yes, deploy Python functions to Azure and update `VITE_API_BASE`.

**Q: Are all endpoints authenticated?**
A: No, GET endpoints (browse, view problem details) are public. POST/PUT/DELETE require authentication.
