# Full-Stack Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (SPA)                            │
│         Azure Static Web App / Vite + React                 │
│  - Supabase Auth (session management)                        │
│  - auth-helper.js (sends Bearer tokens)                      │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS + JWT Bearer Token
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API Layer                               │
│         Python Azure Functions                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Each Route Handler:                                  │  │
│  │  1. Extract Authorization header                     │  │
│  │  2. Validate JWT (HS256) via auth.py               │  │
│  │  3. Get user_id from 'sub' claim                    │  │
│  │  4. Call Cosmos DB helpers (db.py)                 │  │
│  │  5. Return JSON response                            │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │ Partition Key: user_id
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Storage Layer                              │
│    Azure Cosmos DB (URL/Password auth)                      │
│    - Database: PostsDB                                       │
│    - Container: posts                                        │
│    - Partition Key: /user_id                                 │
│    - Unique Constraints: id (per user)                       │
└─────────────────────────────────────────────────────────────┘
                   ▲
                   │ User Authentication
                   │ (Email/Password via Supabase)
┌─────────────────────────────────────────────────────────────┐
│              Auth Service                                    │
│         Supabase Auth (PostgreSQL)                           │
│  - Email/Password verification                              │
│  - JWT Generation (HS256)                                    │
│  - Session Management                                        │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### 1. User Authentication (Frontend)
```
User →→ Supabase Auth UI →→ Gets access_token →→ Stored in localStorage
```

### 2. Authenticated API Request (Frontend)
```
authenticatedFetch() {
  1. Get access_token from Supabase session
  2. Attach: Authorization: Bearer <access_token>
  3. Send request to /api/* endpoint
}
```

### 3. Request Validation (Backend)
```
Each Azure Function Route:
  1. Extract token from Authorization header
  2. Decode JWT using SUPABASE_JWT_SECRET (HS256)
  3. Verify signature and expiration
  4. Extract user_id from 'sub' claim
  5. Proceed with authenticated view of data
```

## Data Flow: Create a Post

```
Frontend                              Backend                    Database
─────────                           ─────────                    ────────

User clicks "Create"
        │
        ├─ authenticatedFetch()
        │  • Gets access token from Supabase
        │  • Adds Authorization header
        │
        ├─ POST /api/create-post ──────────────→ CreatePost handler
        │   (with JWT token)                      │
        │                                         ├─ authenticate_request()
        │                                         │  • Extract header
        │                                         │  • Validate JWT
        │                                         │  • Get user_id = "user-123"
        │                                         │
        │                                         ├─ Parse POST body
        │                                         │  { title, content, tags }
        │                                         │
        │                                         ├─ db_client.save_post()
        │                                         │  {
        │                                         │    id: uuid,
        │                                         │    user_id: "user-123",
        │                                         │    title: "...",
        │                                         │    content: "...",
        │                                         │    created_at: NOW()
        │                                         │  }
        │                                         │
        │                                         ├─ CosmosDB: UPSERT item ────→ Storage
        │                                         │
        │  ←─ 201 Created + Post JSON ──────────┤
        │
        └─ Display new post to user
```

## File Structure

```
python-function/
├── shared/
│   ├── __init__.py              # Exports all shared utilities
│   ├── auth.py                  # JWT validation (HS256)
│   └── db.py                    # Cosmos DB singleton client
│
├── CreatePost/                  # /api/create-post (POST)
│   └── __init__.py
├── GetProblems/                 # /api/get-posts (GET)
│   └── __init__.py
├── DeleteProblem/               # /api/delete-post/{id} (DELETE)
│   └── __init__.py
│
├── host.json                    # Azure Functions config
├── local.settings.json          # Local environment (DO NOT COMMIT)
├── local.settings.example.json  # Template with instructions
├── requirements.txt             # Python dependencies
└── function.json                # Function-specific config

problem-hunt/
├── src/
│   ├── lib/
│   │   └── auth-helper.js       # Frontend auth utilities
│   ├── components/
│   ├── pages/
│   └── App.tsx
├── staticwebapp.config.json     # SWA routing & CORS config
└── .env.local                   # Frontend env vars
```

## Key Components Explained

### 1. Backend: shared/auth.py

**Purpose**: Validates Supabase JWT tokens in all API requests

**Key Functions**:
- `authenticate_request(req)`: Main function - extract, validate, return user_id
- `extract_token(req)`: Parse Authorization header
- `validate_jwt(token)`: Verify signature using HS256
- `get_user_id_from_token(payload)`: Get 'sub' claim

**Usage in Route Handler**:
```python
from shared.auth import authenticate_request, AuthError

def main(req: func.HttpRequest):
    try:
        user_id, auth_payload = authenticate_request(req)
        # Now use user_id for database operations
    except AuthError as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=401)
```

### 2. Backend: shared/db.py

**Purpose**: Manages all Cosmos DB operations with singleton pattern

**Key Class**: `CosmosDBClient` (singleton)
- `save_post(user_id, post_data)`: Create/update post
- `get_posts(user_id, limit, offset)`: Retrieve user's posts
- `get_post_by_id(user_id, post_id)`: Get specific post
- `delete_post(user_id, post_id)`: Remove post
- `update_post(user_id, post_id, updates)`: Update fields

**Why Singleton?**
- Reuses one database connection across all requests
- Better performance and resource management
- Handles connection pooling internally

**Partition Key Strategy**:
- All queries use `user_id` as partition key
- Enables efficient per-user querying
- Prevents hot partitions
- Scales linearly with users

### 3. Frontend: auth-helper.js

**Purpose**: Simplifies authenticated API calls from React

**Key Functions**:
- `getAccessToken()`: Retrieve current user's JWT from Supabase
- `authenticatedFetch(endpoint, options)`: Make auth'd HTTP request
- `handleResponse(response)`: Parse & error-handle responses
- `createPost()`, `getPosts()`, `deletePost()`: Example helpers

**Usage**:
```javascript
import { authenticatedFetch, handleResponse } from './auth-helper';

// Create a post
const response = await authenticatedFetch('/api/create-post', {
  method: 'POST',
  body: { title: 'My Post', content: 'Content' }
});
const post = await handleResponse(response);
```

### 4. Configuration: staticwebapp.config.json

**Key Settings**:
- `navigationFallback: /index.html` - SPA routing
- `routes['/api/*']` - Allow anonymous access (auth handled in code)
- `allowedRoles: ["anonymous"]` - Don't restrict at SWA level
- `Access-Control-Allow-*` headers - CORS enabled
- `environmentVariables` - Supabase credentials

## Step-by-Step Implementation

### Backend Setup

#### Step 1: Configure Environment Variables
```bash
cd python-function
cp local.settings.example.json local.settings.json
# Edit local.settings.json with your credentials
```

#### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

#### Step 3: Test Locally
```bash
func start
```

Expected output:
```
Functions runtime initialized
Http Functions:
    CreatePost: http://localhost:7071/api/create-post
    GetProblems: http://localhost:7071/api/get-posts
    DeleteProblem: http://localhost:7071/api/delete-post/{post_id}
```

#### Step 4: Test with cURL (requires valid JWT)
```bash
curl -X POST http://localhost:7071/api/create-post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{"title":"Test","content":"Test post","tags":[]}'
```

### Frontend Setup

#### Step 1: Configure Auth Helper
```javascript
// problem-hunt/src/lib/auth-helper.js
// Already configured for your Supabase instance
import { authenticatedFetch, handleResponse } from './auth-helper';
```

#### Step 2: Update API Endpoint (if needed)
```javascript
// Modify auth-helper.js to point to your API
const API_BASE = 'https://your-api.azurewebsites.net';

export async function authenticatedFetch(endpoint, options = {}) {
  const fullUrl = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE}${endpoint}`;
  // ...rest of function
}
```

#### Step 3: Use in Components
```typescript
// src/pages/CreatePost.tsx
import { createPost, handleResponse } from '../lib/auth-helper';

function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const post = await createPost(title, content, []);
      console.log('Created:', post);
    } catch (error) {
      console.error('Failed:', error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

## Production Deployment

### Backend: Deploy Python Functions

1. **Update Azure Function App Settings**:
   ```bash
   az functionapp config appsettings set \
     --resource-group problemhunt-rg \
     --name <FunctionAppName> \
     --settings SUPABASE_JWT_SECRET=<secret> \
                COSMOS_DB_ENDPOINT=<endpoint> \
                COSMOS_DB_KEY=<key>
   ```

2. **Deploy code**:
   ```bash
   func azure functionapp publish <FunctionAppName>
   ```

### Frontend: Deploy Static Web App

1. **Update API endpoint in auth-helper.js**:
   ```javascript
   const API_BASE = 'https://your-function-app.azurewebsites.net';
   ```

2. **Build and deploy**:
   ```bash
   cd problem-hunt
   npm run build
   # SWA CLI deployment or use GitHub Actions
   ```

## Testing the Complete Flow

### 1. Local Testing
```bash
# Terminal 1: Start backend
cd python-function
func start

# Terminal 2: Start frontend
cd problem-hunt
npm run dev

# Open browser: http://localhost:5173
```

### 2. End-to-End Test
```javascript
// 1. User logs in (Supabase handles this)
// 2. Click "Create Post"
// 3. Frontend calls createPost('title', 'content')
// 4. Backend validates JWT, saves to Cosmos DB
// 5. Post appears in UI with timestamp

// 5. Click "Delete Post"
// 6. Frontend calls deletePost(postId)
// 7. Backend validates ownership, deletes from Cosmos DB
// 8. Post disappears from UI
```

## Troubleshooting

### Issue: "Missing Authorization header"
**Cause**: Frontend not sending token
**Fix**: Verify `authenticatedFetch()` is used, not `fetch()`

### Issue: "Token validation failed"
**Cause**: `SUPABASE_JWT_SECRET` mismatch
**Fix**: Copy exact secret from Supabase Settings → API

### Issue: "User ID not found in token"
**Cause**: JWT doesn't have 'sub' claim
**Fix**: Verify user is logged into Supabase, token is fresh

### Issue: 404 on API routes
**Cause**: Function app not deployed or routes not configured
**Fix**: Check Azure Function App → Functions exist and HTTP trigger enabled

### Issue: CORS errors in browser
**Cause**: Frontend domain not allowed
**Fix**: Update CORS in staticwebapp.config.json or Azure Function CORS settings

## Security Checklist

- ✅ JWT validated on every request (backend)
- ✅ `user_id` from JWT used as partition key (no cross-user data access)
- ✅ Authorization header NOT stripped by Static Web App
- ✅ SUPABASE_JWT_SECRET stored in Azure Key Vault (production)
- ✅ Cosmos DB connection uses Key-based auth (change keys periodically)
- ✅ Bearer token sent only over HTTPS
- ✅ JWT expiration verified (token refresh handled by Supabase)
- ✅ Content-Security-Policy set in SWA config
- ✅ API endpoints allow anonymous (auth in code, not in SWA)

## Next Steps

1. **Add more routes**: Follow the pattern in CreatePost/GetProblems/DeleteProblem
2. **Error handling**: Implement retry logic for CosmosDB 429 errors
3. **Pagination**: Extend GetPosts with cursor-based pagination
4. **Caching**: Add response caching strategy
5. **Monitoring**: Set up Application Insights in Function App
6. **Rate limiting**: Consider Azure API Management for rate limiting
