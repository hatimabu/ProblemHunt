# ProblemHunt

ProblemHunt is a marketplace for technical work. Requesters post problems or paid jobs, builders submit proposals, and the community can upvote, tip, and track work through payment.

## Architecture

```text
React + Vite static site
        |
        v
Supabase: Auth, Postgres, RLS/RPC, Storage
```

There is no application server, Python runtime, Azure Function, Cosmos DB dependency, or service-role key in the browser. Azure Static Web Apps is retained only as an optional static-file host.

## Local setup

Requirements: Node.js 20+, npm, and the Supabase CLI.

```powershell
Copy-Item problem-hunt/.env.example problem-hunt/.env.local
```

Set the public values from your Supabase project in `problem-hunt/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
VITE_ALCHEMY_SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY
```

Apply the versioned database schema before starting the UI:

```powershell
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Then run the app:

```powershell
cd problem-hunt
npm ci
npm run dev
```

The Vite dev server prints the local URL. It talks directly to Supabase.

## Verification

```powershell
cd problem-hunt
npx tsc --noEmit
npm test
npm run build
```

## Deploy

The GitHub workflow in `.github/workflows/deploy-azure.yml` first applies `supabase/migrations/`, then deploys the built static site to Azure Static Web Apps. It requires these GitHub Actions secrets:

- `SUPABASE_DB_URL` — direct database connection string, used only by the migration job
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ALCHEMY_SOLANA_RPC_URL` (optional for payment features)
- `AZURE_CREDENTIALS` — only if using the included Azure Static Web Apps host

Any static host is compatible as long as it serves the `problem-hunt/dist/` output with SPA fallback to `index.html`, and injects the `VITE_*` values during the build.

## Main routes

- `/` — landing page
- `/browse` — marketplace
- `/problem/:id` — problem or job detail
- `/post` — create a listing
- `/dashboard` — profile, listings, proposals, wallets, and notifications
- `/leaderboard` — rankings
- `/auth` — Supabase authentication

## Security model

The browser uses only the Supabase publishable/anon key. Authorization is enforced by Supabase Auth, Row Level Security, and the SQL RPC functions in `supabase/migrations/20260722100000_supabase_only_workflows.sql`. Never place `SUPABASE_SERVICE_ROLE_KEY` in a frontend environment file or a GitHub build variable.
