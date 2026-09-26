# ProblemHunt

**Real problems. Tested solutions.** ProblemHunt is being transformed into a free technical community for Cloud/DevOps and Professional AV. Authors post problems, test proposed solutions and accept the fix that worked.

The active UI now implements public discovery, structured problems, tested solutions, votes, category reputation and private moderation. Legacy marketplace files and tables remain for retention, outside the active routes; unsafe legacy helpers are separately restricted. See [the audit and staged migration map](docs/community-platform-audit.md) for what exists, known risks and the implementation sequence. Tips, payment processing, Docker and AI are outside this transformation's current scope.

## Architecture

```text
React + Vite static site
        |
        v
Supabase: Auth, Postgres, RLS/RPC, Storage
```

There is no application server, Python runtime, Azure Function, Cosmos DB dependency, or service-role key in the browser. Azure Static Web Apps is retained only as an optional static-file host.

## Local setup

Requirements: Node.js 22 and npm. Database migration work additionally requires a separately configured disposable test database; it is not part of starting the frontend.

```powershell
Copy-Item problem-hunt/.env.example problem-hunt/.env.local
```

Set public values for an isolated development Supabase project in `problem-hunt/.env.local`. Do not point a writable local development session at production:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
```

Do not run `supabase db push`, link to production, or reset a hosted database as a local setup step. Checked-in migration files do not establish which versions are applied remotely. Before database testing, reconcile the schema/history and use a disposable test database as described in the audit. Without configuration the frontend can render, but data operations report unavailable configuration.

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

The GitHub workflow in `.github/workflows/deploy-azure.yml` is manual, requires the release confirmation input, and deploys only from `main` after frontend checks pass. It does **not** apply database migrations. Schema review, backup/restore checks and migration approval are separate release prerequisites. No release is authorized during local transformation work. The static deployment uses these GitHub Actions secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `AZURE_STATIC_WEB_APP_NAME` (repository variable naming the reviewed existing resource)
- `VITE_SENTRY_DSN` (optional repository variable for sanitized error monitoring)
- `AZURE_CREDENTIALS` — only if using the included Azure Static Web Apps host

Any static host is compatible as long as it serves the `problem-hunt/dist/` output with SPA fallback to `index.html`, and injects the `VITE_*` values during the build.

## Main routes

- `/` — landing page
- `/browse` — public search and filters
- `/problem/:id` — discussion and tested evidence; `#solution-:id` links to an answer
- `/post-problem` — structured drafts and publication
- `/dashboard` — persistent community workspace, overview and contribution links
- `/my-problems`, `/my-solutions` — own problems/drafts and submitted answers
- `/profile`, `/people/:id` — private account editing and public community profile
- `/dashboard/reputation` — own category reputation and event history
- `/leaderboard` — category reputation and own event history
- `/auth` — Supabase authentication

## Security model

The browser uses the Supabase publishable/anon key. Authorization depends on Supabase Auth, RLS and versioned SQL RPCs. The audit documents current policy gaps; frontend tests do not prove database authorization. Never place `SUPABASE_SERVICE_ROLE_KEY`, database credentials or private RPC provider credentials in frontend variables or Git. Every `VITE_*` value is public in the built bundle.

## Community release review

Start with [current project state](docs/PROJECT_STATE.md) and [release checklist](docs/RELEASE_CHECKLIST.md). These supersede historical runbook counts and fixture status. The public library has been cleared of the explicitly approved synthetic cases; future synthetic write tests require an isolated project.

See [release report](docs/community-release-report.md), [pilot checklist](docs/pilot-tester-checklist.md), and stage runbooks 2–7. The existing hosted project was explicitly authorized for this transformation; normal setup should still use an isolated project. Run database tests with `npm test --prefix supabase/tests`. Never reset the hosted project. Deployment remains manual and does not provision resources or apply migrations.
