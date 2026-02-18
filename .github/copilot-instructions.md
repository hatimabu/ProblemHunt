# ProblemHunt Copilot Instructions

## Project Overview

ProblemHunt is a platform where "clients" post problems with bounties and "builders" propose solutions. It consists of:

- **`problem-hunt/`** — React SPA (Vite + TypeScript + Tailwind v4)
- **`problem-hunt/python-function/`** — Azure Functions v2 (Python) for the `/api/*` backend
- **`problem-hunt/supabase/`** — Supabase Edge Functions + database migrations

## Build & Dev Commands

All commands run from `problem-hunt/`:

```bash
npm run dev          # Start Vite dev server (proxies /api to localhost:7071)
npm run build        # Production build → dist/
npm run server       # Serve dist/ via Express (for production preview)
npm start            # build + server
```

The Python Azure Functions run separately — start them with the Azure Functions Core Tools from `problem-hunt/python-function/`:
```bash
func start
```

## Architecture

### Frontend (`problem-hunt/src/`)

```
src/
  app/
    components/       # Page-level components + ui/ (shadcn)
    contexts/
      AuthContext.tsx # Global auth state; wraps everything
    routes.tsx        # React Router v7 route definitions
    utils/
  lib/
    supabaseClient    # Supabase JS client (imported as ../../lib/supabaseClient)
    auth-helper.js    # authenticatedFetch() — use for all /api calls
    auth-session.js   # Token refresh logic, persistAuthSession
    api-config.js     # API_ENDPOINTS constants, buildApiUrl()
  main.tsx
```

**Path alias:** `@` resolves to `src/app/` (configured in `vite.config.js`).

### Authentication flow

1. `AuthContext` initializes from `supabase.auth.getSession()` on mount
2. After login/signup, `fetchUserProfile()` reads `profiles` table for `username` and `user_type`
3. `user.role` is either `'builder'` or `'client'` (mapped from `user_type` in DB)
4. `ProtectedRoute` wraps routes requiring login; optionally accepts `requireBuilder`
5. All `/api/` calls go through `authenticatedFetch()` which attaches the Supabase JWT as `Authorization: Bearer <token>` and auto-retries on 401

### Backend (Python Azure Functions)

Each function lives in its own folder (`GetProblems/`, `PostProblem/`, etc.) with `__init__.py` and `function.json`. Shared logic is in `python-function/shared/`:

- `shared/auth.py` — JWT validation using `SUPABASE_JWT_SECRET`
- `shared/db.py` — CosmosDB client wrapper

Every function follows the same pattern:
1. `authenticate_request(req)` → returns `(user_id, auth_payload)` or raises `AuthError`
2. Business logic using `get_db_client()`
3. Return `func.HttpResponse(json.dumps(...), mimetype="application/json")`

### Supabase Edge Functions

Deployed via `supabase functions deploy`. Located in `supabase/functions/`:
- `auth-wallet` — Web3 wallet sign-in (signature verification)
- `verify-payment` — On-chain crypto payment verification

### Database

Migrations in `supabase/migrations/`. Key tables:
- `profiles` — `id`, `username`, `user_type` (`'builder'` | `'problem_poster'`), linked to `auth.users`
- `wallets` — user crypto wallets; chains: `ethereum`, `solana`, `polygon`, `arbitrum`
- Payment orders table (see `20260201_web3_wallet_payments.sql`)

All tables use Supabase RLS. Run migrations in Supabase Dashboard → SQL Editor.

## Key Conventions

### UI Components
All UI primitives are shadcn/ui components in `src/app/components/ui/`. Use `cn()` from `src/app/components/ui/utils.ts` for conditional className merging (re-exports `clsx` + `tailwind-merge`).

### Imports
- Supabase client: `import { supabase } from '../../../lib/supabaseClient'` (path varies by depth)
- Auth context: `import { useAuth } from '../contexts/AuthContext'`
- Authenticated API calls: `import { authenticatedFetch, handleResponse } from '../../lib/auth-helper'`

### Environment Variables
- Dev: set in `problem-hunt/.env` (copy from `.env.example`)
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_BASE` (defaults to `http://localhost:7071` in dev)
- Production (Azure Static Web Apps): env vars are injected at runtime via `/env.js` endpoint served by `server.js` as `window.env`

### User Roles
`user_type` in the DB is `'builder'` or `'problem_poster'`; the frontend maps this to `user.role` as `'builder'` or `'client'`.

### Deployment Target
The frontend deploys to **Azure Static Web Apps** — `staticwebapp.config.json` handles SPA routing fallback. The Python functions deploy as **Azure Functions**. Supabase hosts the database and Edge Functions.
