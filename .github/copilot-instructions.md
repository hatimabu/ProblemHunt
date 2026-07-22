# ProblemHunt contributor instructions

ProblemHunt is a React + Vite static SPA backed directly by Supabase. Do not add an application server, Azure Function, Python API, Cosmos DB client, or browser-accessible service-role key.

## Commands

Run from `problem-hunt/`:

```bash
npm run dev
npx tsc --noEmit
npm test
npm run build
```

## Data access

- Use `lib/supabaseClient.js` for the Supabase browser client.
- Add marketplace queries and mutations to `src/lib/supabase-marketplace.ts`.
- Put authorization-sensitive changes in a new migration under `supabase/migrations/`, protected by RLS and/or `SECURITY DEFINER` RPCs.
- Keep SQL migrations forward-only and apply them with `supabase db push`.

The browser must contain only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Service-role and direct database credentials are deployment-only secrets.

## Deployment

`deploy-azure.yml` uses Azure Static Web Apps solely to host the static build. It applies Supabase migrations before uploading `problem-hunt/dist/`; it does not deploy an API.
