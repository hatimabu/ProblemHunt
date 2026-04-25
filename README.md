# ProblemHunt

ProblemHunt is a marketplace for technical work. A requester posts a problem or paid job, builders submit proposals, the community can upvote interest, and the owner can track the work through acceptance, completion, payment, tipping, and deletion.

This README is the single project guide. It is written for a fresh graduate or early junior DevOps / platform engineer who wants to understand the repo, run it locally, and test the main flows step by step.

## 1. What Lives In This Repo

The real application is inside `problem-hunt/`.

Main parts:

- React + Vite frontend
- Python Azure Functions API
- Supabase for auth, profiles, wallets, notifications, storage, and Edge Functions
- Cosmos DB for marketplace data
- Mock in-memory Cosmos fallback for easier local development

## 2. High-Level Architecture

```text
Browser
  |
  v
React + Vite frontend
  |
  +--> Supabase
  |      |- auth
  |      |- profiles
  |      |- wallets
  |      |- notifications
  |      |- storage
  |      \- optional Edge Functions
  |
  \--> Azure Functions API (/api/*)
         |
         +--> Cosmos DB
         |      |- Problems
         |      |- Proposals
         |      |- Upvotes
         |      \- Tips
         |
         \--> Supabase JWT validation
```

## 3. Project Structure

```text
.
|-- README.md
|-- package.json                        # Root helper scripts
|-- problem-hunt/
|   |-- package.json                    # Frontend package
|   |-- .env.example                    # Frontend env template
|   |-- server.js                       # Serves built frontend
|   |-- src/
|   |   |-- app/
|   |   |   |-- components/             # Pages and shared UI
|   |   |   |-- contexts/               # Auth context
|   |   |   |-- routes.tsx              # Frontend routes
|   |   |   |-- index.css               # Shared styling and motion
|   |   |   \-- theme.css               # Theme tokens
|   |   \-- lib/                        # Frontend helpers
|   |
|   |-- python-function/
|   |   |-- handlers/                   # API business logic
|   |   |-- router.py                   # Route dispatch
|   |   |-- cosmos.py                   # Cosmos + mock mode
|   |   |-- utils.py                    # Shared helpers
|   |   |-- host.json                   # Functions host config
|   |   \-- local.settings.example.json # Backend env template
|   |
|   \-- supabase/
|       |-- migrations/                 # SQL schema changes
|       \-- functions/                  # Edge Functions
```

## 4. Main User Flow

This is the product flow in plain English:

1. A user signs in with Supabase.
2. A requester creates a problem or a paid job.
3. Builders browse posts and submit proposals.
4. Users upvote posts to show demand.
5. A requester can accept one proposal for a paid job.
6. The accepted builder can mark the job complete.
7. The requester can record payment.
8. Users can record tips.
9. The owner can delete their own post.

image.png

## 5. Signal Flow

Think of signal flow as “which service talks to which other service.”

### Auth Flow

1. Frontend signs in through Supabase.
2. Supabase returns a session token.
3. Frontend sends `Authorization: Bearer <token>` to the Python API.
4. Python API validates the token with the Supabase JWT secret.
5. API uses the user ID from the token to authorize protected actions.

### Read Flow

1. Browser opens `/browse` or `/problem/:id`.
2. Frontend calls the API.
3. Azure Functions routes the request to a handler.
4. Handler reads Cosmos DB.
5. JSON is returned to the frontend.
6. UI renders the result.

### Write Flow

Example actions: create post, submit proposal, upvote, delete.

1. Frontend collects form data.
2. Frontend sends a request to the API.
3. API validates auth and payload.
4. Handler writes to Cosmos DB.
5. Frontend refreshes state and updates the UI.

## 6. Services You Need

Required:

1. Node.js 20+
2. npm
3. Python 3.11+
4. Azure Functions Core Tools v4
5. Azurite
6. Git

Recommended:

1. Supabase CLI
2. Azure CLI
3. VS Code

## 7. Recommended Local Mode

Start with the easiest working mode:

- frontend local
- Azure Functions local
- Supabase real remote project
- Cosmos in mock mode

Why this is best first:

- fewer moving parts
- faster setup
- enough to test most of the app

Later, switch to real Cosmos DB if you need persistent data between API restarts.

## 8. Step-By-Step Local Setup

### Step 1. Clone the repo

```powershell
git clone <your-repo-url>
cd ProblemHunt
```

### Step 2. Install root helper dependencies

```powershell
npm install
```

### Step 3. Install frontend dependencies

```powershell
cd problem-hunt
npm install
cd ..
```

Or use the helper:

```powershell
npm run install:all
```

### Step 4. Create the frontend env file

```powershell
Copy-Item problem-hunt/.env.example problem-hunt/.env.local
```

Set these values in `problem-hunt/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:7071
VITE_ALCHEMY_SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY
```

Important:

- `VITE_API_BASE_URL=http://localhost:7071` makes the browser call your local API
- if you forget this, the frontend may still talk to the deployed Azure API

### Step 5. Create the backend local settings file

```powershell
Copy-Item problem-hunt/python-function/local.settings.example.json problem-hunt/python-function/local.settings.json
```

Edit `problem-hunt/python-function/local.settings.json` and start with:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "python",
    "SUPABASE_JWT_SECRET": "your-supabase-jwt-secret",
    "SUPABASE_URL": "https://your-project-ref.supabase.co",
    "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
    "COSMOS_ENDPOINT": "placeholder-endpoint",
    "COSMOS_KEY": "placeholder-key",
    "COSMOS_DATABASE": "ProblemHuntDB",
    "COSMOS_CONTAINER_PROBLEMS": "Problems",
    "COSMOS_CONTAINER_PROPOSALS": "Proposals",
    "COSMOS_CONTAINER_UPVOTES": "Upvotes",
    "COSMOS_CONTAINER_TIPS": "Tips"
  }
}
```

Why fake Cosmos values are okay at first:

- this repo supports mock in-memory Cosmos mode
- placeholder values trigger the fallback
- that is enough for basic local testing

### Step 6. Create and activate a Python virtual environment

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If `py` does not work on your machine, use:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Step 7. Install Python dependencies

```powershell
cd problem-hunt/python-function
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd ../..
```

### Step 8. Apply Supabase migrations

```powershell
cd problem-hunt
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
cd ..
```

Minimum database areas you should expect after migrations:

- profiles
- wallets
- payments
- notifications
- tip-related tables

### Step 9. Start Azurite

```powershell
azurite
```

Or:

```powershell
npx azurite
```

Leave Azurite running in its own terminal.

### Step 10. Start the Python API

Open a new terminal:

```powershell
cd problem-hunt/python-function
func start
```

Expected local API base URL:

```text
http://localhost:7071
```

### Step 11. Start the frontend

Open another terminal:

```powershell
cd problem-hunt
npm run dev
```

Expected frontend URL:

```text
http://localhost:5173
```

### Step 12. Optional: test the built frontend

```powershell
cd problem-hunt
npm run build
npm run server
```

## 9. How To Test Everything

Use this order:

### Smoke Test

1. Open `http://localhost:5173`
2. Confirm the landing page loads
3. Open `/browse`
4. Open `/auth`

### Auth Test

1. Sign up or sign in
2. Confirm `/dashboard` opens
3. Confirm protected routes like `/post` are blocked when signed out

### Create Post Test

1. Go to `/post`
2. Create a problem or paid job
3. Confirm it appears in `/browse`
4. Open its detail page

### Proposal Test

1. Submit a proposal
2. Refresh the page
3. Confirm the proposal appears
4. Confirm related dashboard sections update

### Upvote Test

1. Upvote a problem
2. Confirm the count changes

### Delete Test

If you are the post owner:

1. Open your post
2. Click delete
3. Confirm it disappears from your dashboard and browse views

### Paid Job Lifecycle Test

Best done with two accounts:

1. Account A creates a paid job
2. Account B submits a proposal
3. Account A accepts it
4. Account B marks it complete
5. Account A records payment

### Tip Test

1. Open the tip flow from a proposal
2. Submit the tip details
3. Confirm the request succeeds

## 10. Mock Cosmos vs Real Cosmos

### Mock Cosmos Mode

Good for:

- learning the codebase
- fast local testing
- UI and route testing

Limitation:

- data disappears when the Functions host restarts

### Real Cosmos Mode

Good for:

- persistent local data
- closer production behavior
- shared testing

To use it, replace the placeholder Cosmos values in `local.settings.json` with real account values.

## 11. Important Routes

Frontend:

- `/`
- `/browse`
- `/problem/:id`
- `/post`
- `/dashboard`
- `/leaderboard`
- `/auth`

API:

- `GET /api/problems`
- `POST /api/problems`
- `GET /api/problems/{id}`
- `DELETE /api/problems/{id}`
- `POST /api/problems/{id}/proposals`
- `GET /api/problems/{id}/proposals`
- `POST /api/problems/{id}/upvote`
- `DELETE /api/problems/{id}/upvote`
- `GET /api/user/problems`
- `GET /api/user/proposals`
- `GET /api/leaderboard`
- `POST /api/problems/{id}/complete`
- `POST /api/problems/{id}/payments`
- `POST /api/proposals/{id}/tip`

## 12. Optional Web3 / Edge Function Setup

Do this only after the core app works.

Relevant folder:

- `problem-hunt/supabase/functions`

Suggested order:

1. make frontend + auth + API work
2. apply all Supabase migrations
3. configure RPC environment values
4. deploy or serve the Edge Functions
5. test with testnet wallets first

## 13. Troubleshooting

### Frontend still calls Azure instead of local API

Fix:

1. set `VITE_API_BASE_URL=http://localhost:7071`
2. restart the Vite dev server

### API returns `401`

Check:

1. `SUPABASE_JWT_SECRET`
2. frontend Supabase URL
3. backend Supabase URL

They must all point to the same Supabase project.

### Functions fail because of storage

Fix:

1. start Azurite
2. keep `AzureWebJobsStorage=UseDevelopmentStorage=true`
3. restart `func start`

### Data disappears after restart

Cause:

- you are using mock Cosmos mode

That is expected.

### Wallet / payment flows fail

Check:

1. migrations ran
2. Edge Functions are deployed or served
3. RPC values are set

## 14. Useful Commands

Root helpers:

```powershell
npm run install:all
npm run dev
npm run build
npm run server
```

Frontend:

```powershell
cd problem-hunt
npm run dev
npm run build
npm run server
```

Backend:

```powershell
cd problem-hunt/python-function
func start
```

Supabase migrations:

```powershell
cd problem-hunt
supabase db push
```

## 15. Final Advice

Do not debug everything at once.

Use this order:

1. frontend loads
2. auth works
3. API starts
4. mock Cosmos mode works
5. create / browse / proposal / delete work
6. real Cosmos
7. wallet / payment extras

That gives the fastest feedback loop and the lowest confusion.
