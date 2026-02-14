# Problem Persistence & User Dashboard Fix

## Issues Fixed

### 1. **Problems Disappearing After Server Restart**
**Problem**: Posted problems would disappear when returning to the website because the mock database was in-memory only.

**Solution**: Enhanced the mock database (`cosmos-mock.js`) to persist data to a JSON file (`mock-db-data.json`). Now all problems are saved to disk and loaded when the server restarts.

### 2. **User Problems Not Showing in Dashboard**
**Problem**: Users couldn't see their posted problems in their profile/dashboard.

**Solution**: 
- Created a new API endpoint `GetUserProblems` (`/api/user/problems`)
- Updated `builder-dashboard.tsx` to fetch and display user's posted problems
- Added authentication token support to properly identify users

### 3. **Authentication Token Not Sent with Requests**
**Problem**: The CreateProblem API wasn't receiving authentication tokens, so all problems were created with anonymous user IDs.

**Solution**: Updated `post-problem.tsx` to include the Supabase authentication token in the Authorization header when posting problems.

## Changes Made

### New Files
1. **`problem-hunt/python-function/GetUserProblems/__init__.py`** - API function to fetch problems by user
2. **`problem-hunt/python-function/GetUserProblems/function.json`** - Azure Function configuration
3. **`problem-hunt/mock-db-data.json`** - Persisted mock database (auto-generated, git-ignored)

### Modified Files
1. **`problem-hunt/python-function/shared/db.py`**
   - Added file-based persistence
   - Added support for `@authorId` filter parameter
   - Auto-saves on create, update, and delete operations

2. **`problem-hunt/src/app/components/builder-dashboard.tsx`**
   - Added state for user problems
   - Added `fetchUserProblems()` function
   - Replaced placeholder content with actual problem cards
   - Shows loading states and empty states

3. **`problem-hunt/src/app/components/post-problem.tsx`**
   - Added Supabase client import
   - Added authentication context
   - Includes Bearer token in API requests
   - Sends user's name/email as author

4. **`.gitignore`**
   - Added `problem-hunt/mock-db-data.json` to prevent committing local data

## How It Works

### Development Mode (Mock Database)
1. When no Cosmos DB credentials are configured, the app uses the mock database
2. Database starts **completely empty** - no dummy/sample data
3. All user-created data is stored in `mock-db-data.json` in the problem-hunt directory
4. Data persists across server restarts
5. File is automatically created on first write operation

### Production Mode (Real Cosmos DB)
1. Configure Cosmos DB environment variables in Azure Static Web App settings
2. The app automatically switches to using real Cosmos DB
3. All queries work the same way as in development

## API Endpoints

### New Endpoint
- **GET** `/api/user/problems?sortBy={newest|upvotes|budget}&limit={number}&offset={number}`
  - Returns problems posted by the authenticated user
  - Requires: Authorization Bearer token
  - Response: `{ problems: [...], total, limit, offset }`

### Updated Endpoint
- **POST** `/api/problems`
  - Now properly handles Authorization header
  - Associates problems with authenticated user's ID
  - Falls back to IP-based ID for anonymous users

## User Flow

1. **User signs up/logs in** → Receives authentication token
2. **User posts a problem** → Token sent with request → Problem saved with user's ID
3. **User navigates to dashboard** → Fetches problems where authorId matches user's ID
4. **Problems displayed** → User sees all their posted problems with stats

## Testing

### To Test Locally:
1. Start the development server
2. Sign in with a test account
3. Post a problem from `/post`
4. Navigate to `/dashboard` to see your posted problem
5. Restart the server - problem should still be there

### Verify Persistence:
- Check for `problem-hunt/mock-db-data.json` file
- Should contain all problems, proposals, upvotes, and tips

## Production Deployment

For production, ensure these environment variables are set in your Azure Static Web App:
- `COSMOS_ENDPOINT`
- `COSMOS_KEY`
- `COSMOS_DATABASE`
- `COSMOS_CONTAINER_PROBLEMS`
- `COSMOS_CONTAINER_PROPOSALS`
- `COSMOS_CONTAINER_UPVOTES`
- `COSMOS_CONTAINER_TIPS`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The GitHub Actions workflow already includes these in the env section.

## Notes

- Mock database is for development only
- File-based persistence is not recommended for production
- For production, use real Cosmos DB
- The mock database supports basic queries but not all Cosmos DB features

