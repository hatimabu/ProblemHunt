# Python API Migration Guide

## Overview

All Problem Hunt API endpoints have been successfully migrated from Node.js to Python. The API maintains the same functionality and routes while leveraging Python and Azure Functions.

## Project Structure

```
python-function/
├── cosmos.py                 # Cosmos DB client
├── utils.py                  # Utility functions
├── requirements.txt          # Python dependencies
├── local.settings.json       # Local configuration
├── handlers/                 # Handler implementations
│   ├── __init__.py
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
├── CreateProblem/           # Function: POST /problems
├── GetProblems/             # Function: GET /problems
├── GetProblemById/          # Function: GET /problems/{id}
├── UpdateProblem/           # Function: PUT /problems/{id}
├── DeleteProblem/           # Function: DELETE /problems/{id}
├── UpvoteProblem/           # Function: POST /problems/{id}/upvote
├── RemoveUpvote/            # Function: DELETE /problems/{id}/upvote
├── GetProposals/            # Function: GET /problems/{id}/proposals
├── CreateProposal/          # Function: POST /problems/{id}/proposals
├── SearchProblems/          # Function: GET /problems/search
├── GetUserProblems/         # Function: GET /user/problems
└── TipBuilder/              # Function: POST /proposals/{id}/tip
```

## Changes from Node.js

### 1. Database Access
- **Before**: Used `@azure/cosmos` npm package with async/await
- **After**: Uses `azure-cosmos` Python package with async operations
- **Improvement**: Simplified mock container for local development

### 2. Authentication
- **Before**: Supabase token verification using `@supabase/supabase-js`
- **After**: JWT verification using `PyJWT` library
- **Improvement**: Direct JWT verification without Supabase client initialization

### 3. Response Handling
- **Before**: Azure Functions context object (`context.res`)
- **After**: Direct `HttpResponse` objects
- **Improvement**: Cleaner response generation with proper status codes

### 4. Error Handling
- **Before**: Try/catch with `context.log.error()`
- **After**: Try/except with Python logging
- **Improvement**: Better stack trace visibility in Azure logs

## API Endpoints

All endpoints maintain the same routes and functionality:

### Problems
- `POST /problems` - Create a problem
- `GET /problems` - Get all problems (with filtering/sorting)
- `GET /problems/{id}` - Get problem by ID
- `PUT /problems/{id}` - Update problem
- `DELETE /problems/{id}` - Delete problem

### Upvotes
- `POST /problems/{id}/upvote` - Upvote problem
- `DELETE /problems/{id}/upvote` - Remove upvote

### Proposals
- `GET /problems/{id}/proposals` - Get proposals for problem
- `POST /problems/{id}/proposals` - Create proposal for problem
- `POST /proposals/{id}/tip` - Send tip to proposal builder

### Search & User
- `GET /problems/search?q=term` - Search problems
- `GET /user/problems` - Get authenticated user's problems

## Configuration

### Environment Variables

Update `local.settings.json` with your Cosmos DB and Supabase credentials:

```json
{
  "Values": {
    "COSMOS_ENDPOINT": "https://your-account.documents.azure.com:443/",
    "COSMOS_KEY": "your-cosmos-key",
    "COSMOS_DATABASE": "ProblemHuntDB",
    "COSMOS_CONTAINER_PROBLEMS": "Problems",
    "COSMOS_CONTAINER_PROPOSALS": "Proposals",
    "COSMOS_CONTAINER_UPVOTES": "Upvotes",
    "COSMOS_CONTAINER_TIPS": "Tips",
    "SUPABASE_URL": "your-supabase-url",
    "SUPABASE_ANON_KEY": "your-supabase-anon-key",
    "SUPABASE_JWT_SECRET": "your-supabase-jwt-secret"
  }
}
```

### Local Development

For local development without Cosmos DB credentials, the system will automatically use mock in-memory containers. This allows testing without Azure setup.

## Installation

1. Install Python dependencies:
```bash
cd python-function
pip install -r requirements.txt
```

2. Install Azure Functions Core Tools:
```bash
npm install -g azure-functions-core-tools@4
```

3. Start local development:
```bash
func start
```

## Key Utilities

### cosmos.py
- `CosmosDBClient`: Singleton client for Cosmos DB operations
- `MockContainer`: In-memory container for local development
- Automatic fallback to mock mode if credentials are missing

### utils.py
- `create_response()`: Standardized response creation
- `error_response()`: Error response formatting
- `get_authenticated_user_id()`: JWT token verification
- `validate_required()`: Field validation
- `parse_requirements()`: Parse requirements from various formats
- `generate_id()`: UUID generation
- `get_timestamp()`: ISO timestamp generation

## Migration Checklist

- [x] Create Cosmos DB client (Python)
- [x] Create authentication utilities
- [x] Implement all 12 API handlers
- [x] Create function.json for each endpoint
- [x] Update requirements.txt with dependencies
- [x] Set up local configuration
- [x] Implement error handling
- [x] Add mock mode for local testing

## Testing

### Local Testing
1. Start the local Functions host: `func start`
2. API will be available at `http://localhost:7071`

### Test Example
```bash
# Create a problem
curl -X POST http://localhost:7071/api/problems \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "title": "Test Problem",
    "description": "Test description",
    "category": "AI/ML",
    "budget": "$1000",
    "requirements": ["Requirement 1"]
  }'
```

## Deployment

### To Azure

1. Sign in to Azure:
```bash
az login
```

2. Create function app (if not existing):
```bash
az functionapp create \
  --resource-group problemhunt-rg \
  --consumption-plan-location eastus \
  --runtime python \
  --functions-version 4 \
  --name problemhunt-api-python
```

3. Deploy:
```bash
func azure functionapp publish problemhunt-api-python
```

## Performance Considerations

1. **Cosmos DB Queries**: Queries are optimized for common filters (category, budget)
2. **Pagination**: All list endpoints support offset/limit parameters
3. **Sorting**: Multiple sort options (newest, upvotes, budget)
4. **Search**: Client-side search with case-insensitive matching

## Known Limitations

1. **Full-Text Search**: Uses client-side filtering (Cosmos DB CONTAINS is limited)
   - Recommendation: Consider Azure Cognitive Search for production

2. **Mock Mode**: In-memory storage is lost on restart
   - Use only for local development

3. **Cascade Deletes**: Manual cleanup of upvotes/proposals on problem delete
   - TODO: Implement cascade delete logic

## Next Steps

1. Deploy to Azure
2. Update API gateway/proxy routes to point to new Python functions
3. Run comprehensive tests against production data
4. Monitor logs for any issues
5. Gradually migrate traffic from Node.js to Python API
6. Retire Node.js API once fully migrated

## Support

For issues or questions about the Python API:
1. Check Azure Functions logs
2. Verify environment variables are correctly set
3. Ensure Python packages are installed: `pip install -r requirements.txt`
4. Check Cosmos DB connectivity
