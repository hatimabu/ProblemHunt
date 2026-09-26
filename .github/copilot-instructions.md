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
- Add community queries and mutations to `src/lib/supabase-community.ts`; do not reactivate retired marketplace APIs.
- Put authorization-sensitive changes in a new migration under `supabase/migrations/`, protected by RLS and/or `SECURITY DEFINER` RPCs.
- Keep historical SQL migrations unchanged and add versioned migrations. Local development must not push to the hosted project. Verify history and apply only to an explicitly isolated test database; production migration is a separate approved release operation.

The browser must contain only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Service-role and direct database credentials are deployment-only secrets.

## Deployment

`deploy-azure.yml` uses Azure Static Web Apps solely to host the static build. It runs manually from main with release confirmation and never applies database migrations. During the community transformation, do not deploy or switch domains. Follow `docs/community-platform-audit.md` for the staged migration map.
