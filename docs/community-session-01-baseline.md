# Session 01: development and test baseline

2026-09-27. User approved Session 01 only. Existing planning edits preserved on `feature/community-knowledge-platform`. No hosted reads/writes, migrations, deployments, pushes or cloud provisioning are part of this evidence.

## Fresh checkout

Use Node 22 (matching CI and `.nvmrc`) and npm. A Node version manager must already be installed/configured to interpret `.nvmrc`; the file does not install or switch Node. From the repository root:

```powershell
npm run install:all
npm run verify
```

The install command uses `npm ci` in both `problem-hunt` and `supabase/tests`, preserving lockfiles. It requires registry access on a machine without cached dependencies. Installing root dependencies is not required for these commands. Verification checks dependencies, then runs TypeScript, frontend tests, disposable database tests and a Vite production build, stopping on the first failure. The runner uses Node subprocesses without shell interpolation, fixes public Supabase values to placeholders and disables Sentry. It does not read test-account files or invoke hosted harnesses. Placeholder configuration is not a network firewall: frontend isolation relies on mocked test adapters. Do not add live integration tests to that suite.

For interactive development, copy `problem-hunt/.env.example` to ignored `.env.local` and fill only the public URL/key of an isolated environment. Every VITE value is browser-visible. Run `npm run dev` (or `npm start`) from the root. Do not point a writable development session at the public project. Without a configured backend, UI rendering is not proof of a functioning journey.

For compiled preview, `npm run server` serves `problem-hunt/dist` on loopback port 4173 with the checked-in static headers. Build first. This server is not an Azure emulator. After `verify`, that directory contains placeholder configuration; intentionally rebuild with the approved target values before a separately authorized release.

## Evidence layers

Fresh `npm ci` completed for both packages without lockfile changes. The unified `npm run verify` then passed TypeScript, 57 frontend tests in 12 files, 36 database scenarios replaying 31 migrations and the production build. A loopback preview smoke verified `/browse` returns SPA HTML and CSP, then stopped its server. Syntax, invalid-argument rejection, ignored secret paths and whitespace checks passed. The ~695 kB JS chunk warning and Node 25 localStorage warnings remain. No hosted harness ran. This is local baseline completion with the integration prerequisites below still open.

| Layer | What it establishes | What it does not establish |
| --- | --- | --- |
| Frontend tests | UI role controls, author test/acceptance flow, save failure recovery, navigation and data-adapter contracts against mocks | Real Auth/PostgREST integration |
| PGlite suite | Actual SQL, RLS/grants, author/contributor/anonymous actors, state transitions, acceptance evidence, privacy, vote/reputation rules | Multi-connection races, real JWT verification, hosted platform configuration |
| TypeScript/build | Compile and bundle compatibility with installed dependencies | Deployed behavior or real-service access |
| Future isolated integration | Real Auth, PostgREST, Storage and browser journey | Not yet available in this session |

PGlite is a real local PostgreSQL engine with a small simulated Supabase Auth/Storage surface. Synthetic users and rows live in memory, and scenarios roll back. This is why database permission evidence is stronger than UI mocks while still not being full Supabase evidence.

## Environment and migration reconciliation

- Local Node is 25.2.1, npm 11.7.0; CI targets Node 22. Report this difference rather than claiming runtime parity.
- Docker was not found on PATH or at the standard Windows Docker Desktop executable path. No Docker runtime was installed or started.
- No `supabase/config.toml` exists, and no `COMMUNITY_TEST_CONFIG` override is set. No isolated hosted credential set was selected or validated.
- There are 31 local migrations. `20260927000400_community_author_states.sql` replaces the author state RPC to allow only Open/Testing transitions for public active problems. It preserves existing closed records and reserves resolution for acceptance. Local permission tests replay it.
- Previous state docs report 30 hosted versions through `20260927000300` and the next migration pending. Hosted history was not rechecked here; that is historical evidence, not a current assertion.
- `20260418125832` is a historical marker whose original SQL is unavailable. Successful replay against the test bootstrap does not reconstruct unknown hosted history.

## Full integration prerequisites, in priority order

1. Choose a local Docker-backed Supabase stack or a separately approved isolated hosted project. Installing Docker/WSL and changing host virtualization settings have not been performed. For local setup, inspect current official Supabase requirements, initialize a dedicated config and validate migration compatibility before starting the stack. Never reset the public project.
2. Adapt and review harnesses before use. `community-test-support.mjs` currently accepts only `https://<ref>.supabase.co`, so it rejects a local HTTP endpoint. A local integration path needs an explicit loopback allowlist and independent project guard, not removal of the production safeguard.
3. Align all credential and fixture sources. `COMMUNITY_TEST_CONFIG` changes the ordinary config, but account setup and several admin/moderator harnesses still read fixed ignored `.temp` files. Do not mix an isolated URL with existing production admin/account files. Add project binding and isolated paths before privileged tests.
4. Update historical expectations. The API/browser stage harnesses include former unresolved-close behavior; they are not ready to validate the new author-state RPC unchanged. Review every selected harness against all 31 migrations before executing it in isolation.
5. Run real two-user draft/publish/propose/evidence/acceptance and avatar/privacy journeys, then multi-connection race tests. These remain release gates; no production fixture writes are permitted to satisfy them.

The supported existing-project navigation harness is `community-navigation-review.mjs` with read-only configuration and explicit project selection, as described in RELEASE_CHECKLIST. It was not run for this local baseline. Read-only navigation includes account sign-in; it must not be substituted with historical write harnesses.

## Small failure/recovery exercise

Run the existing mocked journey suite from `problem-hunt`:

```powershell
node node_modules/vitest/vitest.mjs run src/app/components/__tests__/community-journey.test.tsx --maxWorkers=1
```

It includes save failures that preserve entered text, schema failures with retry, and a failed Stop testing operation that preserves Testing and allows retry. Explain why showing an error without discarding input matters. These exercises use mocked responses, not a deliberate production outage. The complete baseline already runs them; rerun the focused command only when studying or changing that behavior.

## Next boundary

Session 02 may develop the responsive shell with existing APIs and local fixtures after user approval. Full isolated service integration remains necessary before release and before trusting new hosted write workflows. It is not necessary to create cloud resources just to review a layout.
