# ProblemHunt

ProblemHunt is a marketplace for validated problems. A user posts a problem and bounty, builders submit proposals, users upvote demand, and builders can receive crypto tips while they work.

This repo is not a single app. It is a small platform made of:

- A React + Vite frontend in [`problem-hunt`](./problem-hunt)
- A Python Azure Functions API in [`problem-hunt/python-function`](./problem-hunt/python-function)
- A Supabase project for authentication, profiles, wallets, and optional Edge Functions
- Azure Cosmos DB for the main application data used by the Python API

This guide is written for a new DevOps engineer or junior developer who needs to understand the system, run it locally, and test it safely.

## 1. What The Product Does

Main user flows:

- A problem poster signs up or signs in with Supabase auth
- The user posts a problem with title, description, category, bounty, and deadline
- Builders browse problems and submit proposals
- Users upvote problems to show demand
- Builders manage profiles and optionally link wallets
- Users can record tips against proposals

The frontend routes reflect that workflow:

- `/` landing page
- `/browse` browse problems
- `/problem/:id` problem detail + proposals + tipping
- `/post` create a problem
- `/dashboard` profile, wallets, problems, proposals
- `/leaderboard` builder ranking
- `/auth` sign-in / sign-up

## 2. High-Level Architecture

```text
Browser
  |
  v
React + Vite frontend
  |
  +--> Supabase Auth + profiles + wallets
  |
  +--> Azure Functions API (/api/*)
           |
           +--> Cosmos DB containers
           |
           +--> Supabase JWT validation
           |
           +--> Optional wallet-related Supabase access
```

## 3. Repo Layout

```text
.
|-- package.json                  # Root helper scripts
|-- README.md                     # This file
|-- problem-hunt/
|   |-- package.json              # Frontend app
|   |-- src/                      # React application
|   |-- python-function/          # Azure Functions backend
|   |-- supabase/                 # Supabase migrations and Edge Functions
|   |-- .env.example              # Frontend env template
|   |-- server.js                 # Static server for built frontend
|-- AZURE_NEXT_STEPS.md           # Azure follow-up notes
|-- SUPABASE_NEXT_STEPS.md        # Supabase follow-up notes
|-- WEB3_SETUP.md                 # Web3 setup notes
```

## 4. Services Used In This Repo

| Service | Why it exists | Required for local frontend? | Required for full local testing? |
| --- | --- | --- | --- |
| Node.js | Runs Vite and frontend build | Yes | Yes |
| npm | Installs JS dependencies | Yes | Yes |
| Supabase | Auth, profiles, wallets, optional Edge Functions | Yes | Yes |
| Azure Functions Core Tools | Runs Python API locally | No | Yes |
| Python | Runs Azure Functions worker | No | Yes |
| Azurite | Satisfies local Azure Storage requirement for Functions | No | Usually yes |
| Azure Cosmos DB | Main API data store in cloud | No | Optional |
| Mock in-memory Cosmos mode | Lets API run without real Cosmos DB | No | Yes |
| Supabase CLI | Runs migrations and Edge Functions locally or deploys them | No | Recommended |
| Web3 RPC provider | Verifies blockchain payments | No | Optional |

## 5. Recommended Local Modes

There are two good ways to work locally.

### Mode A: Fastest local setup

Use this if you only need the app running quickly.

- Frontend runs locally
- Supabase is real remote Supabase
- Azure Functions run locally
- Cosmos DB uses the built-in mock in-memory fallback

This is the best starting point for a junior engineer.

### Mode B: Closer to production

Use this if you need end-to-end confidence.

- Frontend runs locally
- Supabase is real remote Supabase
- Azure Functions run locally
- Cosmos DB is a real Azure Cosmos DB account
- Optional Supabase Edge Functions are deployed or run locally
- Optional web3 RPC values are configured

## 6. Prerequisites

Install these before touching the app.

### Required

1. Node.js 20+
2. npm
3. Git

### Required for backend/API testing

1. Python
2. Azure Functions Core Tools v4
3. Azurite

### Recommended

1. Supabase CLI
2. Azure CLI
3. VS Code with Azure Functions extension

## 7. Before You Start: Security Note

This repo currently contains local environment files under [`problem-hunt/.env`](./problem-hunt/.env) and [`problem-hunt/.env.local`](./problem-hunt/.env.local). Treat any real credentials found there as already exposed to the repo and rotate them before using this project in a shared environment.

For real work, keep secrets only in:

- local `.env` files ignored by git
- Azure Function App settings
- Supabase project secrets
- CI/CD secret stores

## 8. First-Time Local Setup

### Step 1: Install root dependencies

From the repo root:

```powershell
npm install
```

### Step 2: Install frontend dependencies

The actual app is inside `problem-hunt`:

```powershell
cd problem-hunt
npm install
cd ..
```

You can also use the root helper:

```powershell
npm run install:all
```

### Step 3: Create a safe frontend env file

Copy the template:

```powershell
Copy-Item problem-hunt/.env.example problem-hunt/.env.local
```

Set these values in `problem-hunt/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:7071
```

Important:

- `VITE_API_BASE_URL=http://localhost:7071` is what makes the frontend call your local Azure Functions API instead of the deployed Azure site
- if you leave it unset, the app defaults to `https://problemhunt-api.azurewebsites.net`

### Step 4: Create backend local settings

Copy the Azure Functions example:

```powershell
Copy-Item problem-hunt/python-function/local.settings.example.json problem-hunt/python-function/local.settings.json
```

Then edit `problem-hunt/python-function/local.settings.json`.

For the easiest setup, use:

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

Why placeholders for Cosmos?

- this backend contains a fallback mock in-memory database
- if `COSMOS_ENDPOINT` or `COSMOS_KEY` are missing or obviously fake, the API switches to mock mode
- that is enough for basic local feature testing

### Step 5: Install Python dependencies

```powershell
cd problem-hunt/python-function
python -m pip install -r requirements.txt
cd ../..
```

### Step 6: Start Azurite

Azurite provides the local storage emulator required by Azure Functions when using `UseDevelopmentStorage=true`.

If installed globally:

```powershell
azurite
```

If installed with npm:

```powershell
npx azurite
```

Leave it running in its own terminal.

### Step 7: Start the backend API

In a new terminal:

```powershell
cd problem-hunt/python-function
func start
```

Expected local backend base URL:

```text
http://localhost:7071
```

### Step 8: Start the frontend

In another terminal:

```powershell
cd problem-hunt
npm run dev
```

Expected local frontend URL:

```text
http://localhost:5173
```

## 9. Quick Smoke Test

Once both services are running:

1. Open `http://localhost:5173`
2. Confirm the landing page loads
3. Open `/browse` and confirm the page renders
4. Sign up or sign in through Supabase auth
5. Post a new problem
6. Open the created problem detail page
7. Submit a proposal
8. Upvote the problem
9. Open `/dashboard` and confirm profile data appears

If you are in mock Cosmos mode:

- your data exists only in the API process memory
- restarting `func start` clears problems, proposals, upvotes, and tips

## 10. How Local API Routing Works

The frontend uses `authenticatedFetch()` and builds API URLs from `VITE_API_BASE_URL`.

When developing locally, set:

```env
VITE_API_BASE_URL=http://localhost:7071
```

The Vite dev server also proxies `/api` requests. That means the frontend can call:

```text
/api/problems
```

and Vite forwards the request to your configured backend.

## 11. Required Environment Variables

### Frontend env

File: `problem-hunt/.env.local`

| Variable | Purpose | Example |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public anon key for browser auth | `eyJ...` |
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:7071` |

### Backend env

File: `problem-hunt/python-function/local.settings.json`

| Variable | Purpose | Required? |
| --- | --- | --- |
| `AzureWebJobsStorage` | Local Azure storage connection | Yes |
| `FUNCTIONS_WORKER_RUNTIME` | Tells Functions to use Python | Yes |
| `SUPABASE_JWT_SECRET` or `JWT_SECRET` | Verifies Supabase bearer tokens | Yes |
| `SUPABASE_URL` | Used by some wallet/profile flows | Recommended |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access | Recommended |
| `COSMOS_ENDPOINT` | Real Cosmos DB endpoint | Optional |
| `COSMOS_KEY` | Real Cosmos DB key | Optional |
| `COSMOS_DATABASE` | Cosmos DB database name | Optional |
| `COSMOS_CONTAINER_PROBLEMS` | Problems container | Optional |
| `COSMOS_CONTAINER_PROPOSALS` | Proposals container | Optional |
| `COSMOS_CONTAINER_UPVOTES` | Upvotes container | Optional |
| `COSMOS_CONTAINER_TIPS` | Tips container | Optional |

## 12. Service Tutorial: Supabase

Supabase is used here for:

- email/password authentication
- JWT issuance
- `profiles` table
- `wallets` table
- optional `orders` and `tip_records`
- optional Edge Functions for wallet auth and payment verification

### How to create or inspect the Supabase project

1. Log in to Supabase
2. Open your project
3. Go to `Settings -> API`
4. Copy:
   - Project URL
   - anon key
   - service role key
   - JWT secret

You need:

- URL + anon key in the frontend
- JWT secret in the backend
- service role key only in server-side or Edge Function contexts

### How to apply the SQL migrations

This repo contains SQL in:

- `problem-hunt/supabase/migrations`

Recommended:

```powershell
cd problem-hunt
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
cd ..
```

Alternative:

- open Supabase SQL Editor
- run the migration files manually in order

### Tables you should expect

At minimum, verify these exist or are created by migrations:

- `profiles`
- `wallets`
- `orders` if using payment flows
- `tip_records` if you want tip tracking inside Supabase too

### What to test in Supabase

1. Sign up a new user in the app
2. Confirm a row exists for the user profile if your profile bootstrap flow is active
3. Edit profile details in `/dashboard`
4. Add or manage wallets if using that flow

### Common Supabase mistakes

- using the service role key in the browser
- forgetting to add `VITE_SUPABASE_URL`
- forgetting to set the JWT secret in `local.settings.json`
- enabling auth but not setting allowed redirect URLs

## 13. Service Tutorial: Azure Functions

The Python API is inside:

- `problem-hunt/python-function`

Important local routes include:

- `GET /api/problems`
- `POST /api/problems`
- `GET /api/problems/{id}`
- `POST /api/problems/{id}/proposals`
- `GET /api/problems/{id}/proposals`
- `POST /api/problems/{id}/upvote`
- `DELETE /api/problems/{id}/upvote`
- `GET /api/user/problems`
- `GET /api/user/proposals`
- `GET /api/leaderboard`
- `POST /api/proposals/{id}/tip`

### How auth works in the API

1. Frontend gets a Supabase session
2. Frontend sends `Authorization: Bearer <token>`
3. Python backend validates the token using `SUPABASE_JWT_SECRET`
4. Backend reads the user ID from the `sub` claim

### How to test the API directly

After `func start`, use PowerShell or Postman.

Unauthenticated example:

```powershell
Invoke-RestMethod http://localhost:7071/api/problems
```

Authenticated testing:

1. Sign in through the frontend
2. Copy the access token from browser storage or the Supabase session
3. Call the endpoint with the bearer token

Example:

```powershell
$token = "paste-access-token"
Invoke-RestMethod `
  -Uri http://localhost:7071/api/user/problems `
  -Headers @{ Authorization = "Bearer $token" }
```

### What to watch in backend logs

- JWT validation failures
- missing env vars
- `Using MOCK in-memory database`
- route not found errors

## 14. Service Tutorial: Cosmos DB

Cosmos DB is the main application store for:

- problems
- proposals
- upvotes
- tips

### Good news for local development

You do not need a real Cosmos DB account on day one.

This repo already supports a mock in-memory mode in `problem-hunt/python-function/cosmos.py`.

Use mock mode when:

- you are learning the app
- you only need local functional testing
- you do not need persistent data between runs

### When to switch to real Cosmos DB

Use a real Cosmos account when you need:

- persistent test data
- realistic query behavior
- shared test environments
- closer production parity

### Suggested Cosmos setup

Database:

- `ProblemHuntDB`

Containers:

- `Problems`
- `Proposals`
- `Upvotes`
- `Tips`

### Example backend config for real Cosmos

```json
{
  "Values": {
    "COSMOS_ENDPOINT": "https://your-account.documents.azure.com:443/",
    "COSMOS_KEY": "your-key",
    "COSMOS_DATABASE": "ProblemHuntDB",
    "COSMOS_CONTAINER_PROBLEMS": "Problems",
    "COSMOS_CONTAINER_PROPOSALS": "Proposals",
    "COSMOS_CONTAINER_UPVOTES": "Upvotes",
    "COSMOS_CONTAINER_TIPS": "Tips"
  }
}
```

### What to test with real Cosmos

1. Create a problem
2. Restart the Functions host
3. Confirm the problem still exists
4. Submit a proposal
5. Upvote it from another account

## 15. Service Tutorial: Web3 And Payment Flows

Web3 support in this repo is optional, not required for the core app to run locally.

Relevant files:

- `WEB3_SETUP.md`
- `WEB3_README.md`
- `problem-hunt/supabase/functions/auth-wallet`
- `problem-hunt/supabase/functions/verify-payment`

### What web3 features exist

- wallet sign-in
- wallet linking
- payment verification
- recorded tips with transaction hash

### What you need if you want to test web3 flows

1. Supabase Edge Functions deployed or running locally
2. Supabase service role key configured in Edge Functions
3. blockchain RPC endpoints, for example:
   - Ethereum RPC
   - Polygon RPC
   - Arbitrum RPC
   - Solana RPC

### Minimal approach for a junior engineer

Do this only after the core app works:

1. get frontend + auth + local API working
2. apply wallet/payment SQL migrations
3. deploy `auth-wallet` and `verify-payment`
4. test with testnet wallets first

## 16. Local Testing Checklist

Use this checklist every time you set up the repo on a fresh machine.

### Basic platform checks

- `npm install` completes
- `python -m pip install -r requirements.txt` completes
- `azurite` starts
- `func start` starts without config errors
- `npm run dev` starts without frontend env errors

### UI checks

- landing page loads
- browse page loads
- auth page loads
- dashboard loads after sign-in

### Auth checks

- sign up works
- sign in works
- sign out works
- protected routes redirect or block correctly when not signed in

### Problem flow checks

- create problem works
- problem appears in browse list
- problem detail loads
- upvote changes count

### Builder flow checks

- submit proposal works
- proposal appears on the problem detail page
- user proposals appear in dashboard

### Tip flow checks

- tip modal opens
- tip record API succeeds in mock or real mode

## 17. Troubleshooting

### Frontend loads, but API calls still go to Azure

Cause:

- `VITE_API_BASE_URL` or `VITE_API_BASE` still points to the deployed API

Fix:

- set `VITE_API_BASE_URL=http://localhost:7071`
- restart the Vite dev server

### Login works, but API returns 401

Cause:

- backend is missing `SUPABASE_JWT_SECRET`
- frontend and backend point at different Supabase projects

Fix:

1. verify frontend `VITE_SUPABASE_URL`
2. verify backend `SUPABASE_JWT_SECRET`
3. verify both values belong to the same Supabase project

### Functions host fails on storage startup

Cause:

- Azurite is not running

Fix:

1. start Azurite
2. keep `AzureWebJobsStorage=UseDevelopmentStorage=true`
3. restart `func start`

### Data disappears after restarting the API

Cause:

- you are in mock Cosmos mode

Fix:

- expected behavior in local mock mode
- configure real Cosmos DB if you need persistence

### Wallet or payment features fail

Cause:

- Edge Functions not deployed
- missing Supabase secrets
- missing RPC URLs

Fix:

- follow `WEB3_SETUP.md`
- test core app first, then web3

## 18. Build Commands

From repo root:

```powershell
npm run dev
npm run build
npm run server
```

From `problem-hunt`:

```powershell
npm run dev
npm run build
npm run server
```

## 19. Suggested Daily Workflow For A Junior DevOps Engineer

1. Pull latest code
2. Check `.env.local` and `local.settings.json`
3. Start Azurite
4. Start Azure Functions
5. Start frontend
6. Run smoke tests
7. Make one small change at a time
8. Re-test the affected user flow
9. Never commit secrets
10. Write down every assumption you made

## 20. What To Improve Next

This repo would benefit from:

- a sanitized `.env.example` for backend too
- automated tests for frontend and Python handlers
- a single root startup script for frontend + backend + Azurite
- a seeded local dataset for mock mode
- CI checks for missing env vars
- secret scanning in CI

## 21. Useful Commands Reference

Install frontend:

```powershell
npm run install:all
```

Run frontend:

```powershell
cd problem-hunt
npm run dev
```

Run backend:

```powershell
cd problem-hunt/python-function
func start
```

Run Azurite:

```powershell
npx azurite
```

Push Supabase migrations:

```powershell
cd problem-hunt
supabase db push
```

## 22. Final Recommendation

If you are new to DevOps, do not try to solve everything at once.

Start with this order:

1. Frontend env configured
2. Supabase auth working
3. Azure Functions running locally
4. Mock Cosmos mode working
5. Problem and proposal flows working
6. Real Cosmos DB
7. Wallet and payment flows
8. Production deployment automation

That order gives you the fastest feedback loop and the fewest moving parts.
