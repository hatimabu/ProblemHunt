# Quick Reference Guide - Full-Stack Authentication & API

## For Frontend Developers

### Making Authenticated API Calls

Instead of using `fetch()` directly, use the `authenticatedFetch()` helper:

```javascript
// ❌ DON'T DO THIS
fetch('/api/create-post', {
  method: 'POST',
  body: JSON.stringify(data)
  // Token is NOT included!
})

// ✅ DO THIS
import { authenticatedFetch, handleResponse } from './auth-helper';

const response = await authenticatedFetch('/api/create-post', {
  method: 'POST',
  body: data
});
const result = await handleResponse(response);
```

### Common API Operations

```javascript
// Create a post
const post = await authenticatedFetch('/api/create-post', {
  method: 'POST',
  body: { title: 'My Title', content: 'My Content', tags: [] }
});

// Get user's posts
const posts = await authenticatedFetch('/api/get-posts?limit=10&offset=0', {
  method: 'GET'
});

// Delete a post
const result = await authenticatedFetch('/api/delete-post/post-uuid', {
  method: 'DELETE'
});

// Update a post (custom endpoint)
const updated = await authenticatedFetch('/api/update-post', {
  method: 'PUT',
  body: { id: 'post-uuid', title: 'New Title' }
});
```

### Error Handling

```javascript
import { authenticatedFetch, handleResponse } from './auth-helper';

try {
  const response = await authenticatedFetch('/api/get-posts');
  const posts = await handleResponse(response);
  // Handle success
} catch (error) {
  if (error.status === 401) {
    console.log('User not authenticated - redirect to login');
  } else if (error.status === 403) {
    console.log('Permission denied');
  } else if (error.status === 404) {
    console.log('Resource not found');
  } else if (error.status >= 500) {
    console.log('Server error - try again later');
  } else {
    console.log('Error:', error.message);
  }
}
```

## For Backend Developers

### Protecting an Azure Function Endpoint

Every route handler must validate the JWT:

```python
import json
import azure.functions as func
from shared.auth import authenticate_request, AuthError
from shared.db import get_db_client, CosmosDBError

def main(req: func.HttpRequest) -> func.HttpResponse:
    # Step 1: Validate JWT & get user_id
    try:
        user_id, auth_payload = authenticate_request(req)
    except AuthError as e:
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=401,
            mimetype="application/json"
        )
    
    # Step 2: Get the authenticated user's data from Cosmos DB
    db = get_db_client()
    posts = db.get_posts(user_id)
    
    # Step 3: Return response
    return func.HttpResponse(
        json.dumps(posts),
        status_code=200,
        mimetype="application/json"
    )
```

### Database Operations

```python
from shared.db import get_db_client, CosmosDBError

db = get_db_client()

# Create or update a post
post = db.save_post(
    user_id="user-uuid",
    post_data={
        "title": "My Post",
        "content": "Content here",
        "tags": ["urgent"],
        "upvotes": 0
    }
)

# Get all posts for a user
posts = db.get_posts(user_id="user-uuid", limit=10, offset=0)

# Get a specific post
post = db.get_post_by_id(user_id="user-uuid", post_id="post-uuid")

# Update a post
updated = db.update_post(
    user_id="user-uuid",
    post_id="post-uuid",
    updates={"title": "New Title", "upvotes": 5}
)

# Delete a post
db.delete_post(user_id="user-uuid", post_id="post-uuid")
```

## Deployment Checklist

### Backend (Python Functions)

- [ ] All `SUPABASE_JWT_SECRET`, `COSMOS_DB_*` vars set in Azure Portal
- [ ] `requirements.txt` updated with dependencies
- [ ] Tested locally with `func start`
- [ ] Functions deployed with `func azure functionapp publish <FunctionAppName>`
- [ ] CORS settings configured (if needed)
- [ ] Application Insights enabled for monitoring

### Frontend (Static Web App)

- [ ] `auth-helper.js` points to correct API endpoint
- [ ] Supabase credentials in `staticwebapp.config.json`
- [ ] Built and tested locally with `npm run dev`
- [ ] Deployed to Azure Static Web App
- [ ] CORS headers present in `staticwebapp.config.json`
- [ ] `/api/*` routes allow anonymous (auth in code)

## Environment Variables Quick Reference

| Variable | Location | Example | Required |
|----------|----------|---------|----------|
| `SUPABASE_JWT_SECRET` | Function App Settings | `abc123xyz...` | Yes |
| `COSMOS_DB_ENDPOINT` | Function App Settings | `https://...documents.azure.com:443/` | Yes |
| `COSMOS_DB_KEY` | Function App Settings | `Eby8...==` | Yes |
| `VITE_SUPABASE_URL` | staticwebapp.config.json | `https://xxx.supabase.co` | Yes |
| `VITE_SUPABASE_ANON_KEY` | staticwebapp.config.json | `eyabc...` | Yes |

## Debugging Tips

### Issue: "Missing Authorization header"
**Check**: Is `authenticatedFetch()` being used?
**Solution**: Replace `fetch()` with `authenticatedFetch()`

### Issue: "Invalid token"
**Check**: Is `SUPABASE_JWT_SECRET` correct?
**Solution**: Copy exact secret from Supabase Dashboard → Settings → API

### Issue: 404 on API routes
**Check**: Does the function exist in Azure?
**Solution**: Run `func azure functionapp publish <FunctionAppName>`

### Issue: CORS errors in browser console
**Check**: Is the API endpoint allowing the frontend domain?
**Solution**: Update CORS headers in `staticwebapp.config.json`

### Issue: "No active session" error
**Check**: Is user logged into Supabase?
**Solution**: Show Supabase login UI before making API calls

## Local Development Commands

```bash
# Backend
cd python-function
func start                    # Start local function runtime
func azure functionapp publish my-app  # Deploy to Azure

# Frontend
cd problem-hunt
npm run dev                   # Start Vite dev server
npm run build                 # Build for production
npm run preview               # Preview production build

# Testing
curl -X GET http://localhost:7071/api/get-posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Response Format

All API responses are JSON:

```javascript
// Success Response (2xx)
{
  "id": "post-uuid",
  "user_id": "user-uuid",
  "title": "Post Title",
  "content": "Content",
  "tags": ["tag1"],
  "upvotes": 5,
  "created_at": "2024-01-15T10:30:00.000000",
  "updated_at": "2024-01-15T10:35:00.000000"
}

// Error Response (4xx/5xx)
{
  "error": "Descriptive error message"
}
```

## Security Best Practices

✅ **DO**:
- Always use `authenticatedFetch()` in frontend
- Validate JWT on every backend request
- Use `user_id` from JWT as data filter
- Store secrets in Azure Key Vault (production)
- Refresh tokens via Supabase automatically
- Log all authentication failures

❌ **DON'T**:
- Commit `local.settings.json` or `.env.local`
- Send plain `fetch()` without Authorization header
- Trust `user_id` from request body (use JWT 'sub' claim)
- Expose JWT secret in frontend code
- Disable HTTPS in production
- Skip JWT validation in any route

## Additional Resources

- [Supabase JWT Documentation](https://supabase.com/docs/learn/auth-deep-dive/jwt)
- [Azure Functions Python Guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python)
- [Cosmos DB Best Practices](https://learn.microsoft.com/en-us/azure/cosmos-db/best-practices)
- [Azure Static Web Apps Config](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration)

## Support

For issues:
1. Check logs: `func start` shows local errors
2. Check Azure Portal: Function App → Application Insights
3. Check browser console: Frontend auth errors
4. Check network tab: Verify Bearer token is sent
