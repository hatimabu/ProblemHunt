# ProblemHunt

**Real problems. Tested solutions.** ProblemHunt is being transformed into a free technical community for Cloud/DevOps and Professional AV. Authors post problems, test proposed solutions and accept the fix that worked.

The active UI now implements public discovery, structured problems, tested solutions, votes, category reputation and private moderation. Legacy marketplace files and tables remain for retention, outside the active routes; unsafe legacy helpers are separately restricted. See [the audit and staged migration map](docs/community-platform-audit.md) for historical context and the [community/cloud roadmap](docs/COMMUNITY_CLOUD_ROADMAP.md) for the approval-gated next milestones. Docker and AI are future milestones; payment behavior remains excluded.

## Architecture

```text
React + Vite static site
        |
        v
Supabase: Auth, Postgres, RLS/RPC, Storage
```

There is no application server, Python runtime, Azure Function, Cosmos DB dependency, or service-role key in the browser. Azure Static Web Apps is retained only as an optional static-file host.

## Local setup

Requirements: Node.js 22 and npm (`.nvmrc` records the CI major version). From the repository root, install both locked test packages and verify the baseline without hosted credentials:

```powershell
npm run install:all
npm run verify
```

The database suite creates its own disposable in-memory PGlite instance. Docker and hosted credentials are not required for these checks. The verification build uses placeholder public configuration and disables Sentry; it is not a release artifact. See the [Session 01 runbook](docs/community-session-01-baseline.md) for evidence, limits and full Supabase prerequisites.

For interactive development, configure a separately isolated Supabase environment:

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

The GitHub workflow in `.github/workflows/deploy-azure.yml` deploys automatically on every push to `main` after frontend checks pass. Manual runs are also available from `main` with `confirm_release: true`. It does **not** apply hosted database migrations; those require a separate deliberate operation after schema/history review. Review database compatibility before pushing to main. The static deployment uses these GitHub Actions secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN` (optional repository variable for sanitized error monitoring)
- `AZURE_CREDENTIALS` — only if using the included Azure Static Web Apps host

The existing app name and resource group are set directly in the workflow; an `AZURE_STATIC_WEB_APP_NAME` variable is not required.

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

See [release report](docs/community-release-report.md), [pilot checklist](docs/pilot-tester-checklist.md), and stage runbooks 2–7. The existing hosted project was explicitly authorized for this transformation; normal setup should still use an isolated project. Run database tests with `npm test --prefix supabase/tests`. Never reset the hosted project. Frontend deployment is automatic on pushes to main; it does not provision resources or apply hosted migrations.
