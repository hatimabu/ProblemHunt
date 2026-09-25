# Stage 3: connected community journey

Implemented on `feature/community-knowledge-platform`, 2026-09-25.

## Repeat verification, 2026-09-25 23:50 UTC

Reread all six PDF pages, the audit and Stage 2 report, inspected routes/data adapter/discussion UI and Git history, and confirmed implementation commit `4de0097`. The roadmap's embedded Stage-1-only prompt is document content; the user's Stage 3 request controls this work. Hosted migration history has no pending SQL: both community versions are already applied, so no migration was reapplied.

Fresh runs passed: real hosted API checks at 23:49 UTC; the complete two-account browser journey at 23:50 UTC; 30 frontend tests; 19 disposable PGlite scenarios; TypeScript; production build. The new mobile solved screenshot was visually inspected. Existing dedicated accounts were reused and newly labelled synthetic cases retained. No configuration is currently blocking these checks. Email delivery, concurrent database races and deployed Azure navigation remain untested as detailed below. The existing foundation diff was checked unchanged; this follow-up only records verification and does not replace the implementation commit.

## Delivered

The active React routes now use the community schema: public library, personal problems/drafts, structured create/edit form, and direct-link discussion pages. Supabase Auth and the existing navigation/visual components are reused. Problems capture symptoms, environment, product/version, expected/actual results, attempted tests, observations, verification and tags. Drafts can be saved, edited and published.

Other signed-in users can propose structured solutions and add clarification comments to solutions. Authors record test results, move public problems to Testing, accept a solution with observation/verification evidence, and close unresolved cases. Solved pages prominently show the confirmed fix. Acceptance calls the author-protected database RPC; no wallet or payment call is involved. Solved content is preserved rather than presenting an unsupported edit/reopen action.

The data adapter uses explicit column lists and allowlisted input payloads. Identity and acceptance/state fields are never client-editable payload fields. Source links allow only HTTP(S). Contributor labels use neutral ID-derived names rather than exposing private legacy profiles. Loading, empty, unavailable/permission and retryable error states are included. Forms use mobile layouts and accessible labels.

Authentication now retains safe local return destinations and explains email confirmation when signup does not produce a session. Auth event profile queries are deferred until the event callback returns: querying Supabase inside the awaited callback could block session initialization on direct navigation. This was exposed during the real browser test and fixed before the successful full rerun.

## Hosted migration authorization and outcome

The initial isolated-test-project request was superseded by the user's explicit instruction to use the existing project, accepting legacy-site compatibility risk and waiving a backup. Before mutation, hosted migration history showed exactly two pending versions:

- `20260925180000_community_knowledge.sql`
- `20260925180100_protect_legacy_reputation.sql`

The pending versions were shown to the user and confirmed by a dry run, then applied successfully. A subsequent read-only migration listing confirms all 22 local and remote versions match. Stage 3 adds no further SQL migration. Legacy tables/records were not converted or deleted. No database reset, project deletion, Azure change, domain switch, deployment, merge or push was performed.

The migration risk remains additive schema/grant compatibility and the intentional restriction on legacy reputation writes. The current hosted frontend has not been deployed with these local React changes.

## Verification and reproduction

Real hosted Auth/PostgREST checks (`scripts/community-api-smoke.mjs`) passed: two distinct synthetic accounts; author draft creation/edit/publish; anonymous and contributor draft denial; unauthorized edit denial; solution and clarification submission; structured author testing; Testing; contributor acceptance rejected with SQLSTATE 42501; author acceptance; persisted Solved reads by author, fresh contributor session and anonymous client; unresolved close.

Real browser checks (`scripts/community-browser-smoke.mjs`) passed in separate Edge contexts against the local frontend and authorized hosted Supabase project. They cover draft edit/save and refresh, contributor draft direct-link/refresh denial, publication, solution, clarification, test evidence, Testing, absent contributor acceptance controls plus an actual forbidden RPC, author acceptance, solved direct navigation/refresh for both accounts and anonymous viewing. An unresolved case closes and remains closed after refresh. The 390x844 author layout has no horizontal overflow; its solved-page screenshot was visually inspected.

Credentials and admin API keys are stored only in ignored `supabase/.temp/` files. The harness requires `--allow-project <authorized-ref>` matching its ignored configuration before hosted writes. Synthetic accounts and clearly labelled test discussions remain in that project; result IDs and screenshot are also ignored. No secrets are committed. Browser tests require a local frontend, the configured project, and Edge on Windows (or a Playwright Chromium installation elsewhere).

Commands from the repository root:

```powershell
npm test --prefix supabase/tests
npm test --prefix problem-hunt -- --maxWorkers=1
# From problem-hunt:
npx tsc --noEmit
npm run build
# With ignored credentials already configured and the local frontend running:
node scripts/community-api-smoke.mjs --allow-project <authorized-ref>
node scripts/community-browser-smoke.mjs --allow-project <authorized-ref>
```

The database suite passes 19 scenarios using real SQL/RLS in disposable PGlite, replaying all 22 migrations and preserving seeded legacy rows. This is not a full Supabase service emulator or multi-connection concurrency proof. All 30 frontend tests across seven files pass. Frontend component tests use mocked auth/data adapters; the hosted API and browser checks above do not. TypeScript and production build pass; Vite still reports the large-chunk warning (781 KB JavaScript before gzip).

## Review scope and remaining work

Review the community adapter and five community UI/style files; route/navigation/branding changes; protected-route/auth-page changes; the AuthContext callback fix; component tests; hosted test harnesses and the separate database-test package's Playwright dependency. Earlier uncommitted foundation changes (README, workflow, gitignore, copilot instructions, legacy browse component/test, audit and PDF) are preserved and excluded from this commit.

Stage 4 can build search/filtering/pagination and richer public-library discovery; the current library loads the latest 100 accessible problems. Stage 5 reputation scoring/UI remains deferred and direct client scoring remains blocked. Vote/report/moderation UI, public display-name profiles, top-level problem clarifications, revision history and solved-case reopening are not included in this core journey. Clarifications currently belong to proposed solutions, matching the Stage 2 schema.

Remaining validation limits: no isolated hosted project was available; tests used the existing project with explicit authorization. Email delivery/confirmation, password recovery through real email, multi-session database races and Azure production-route fallback were not exercised by the two-account browser harness. Existing recovery component tests remain part of the frontend suite. Legacy marketplace files/dependencies remain outside the active journey; their retirement should be reviewed separately. Docker, AI, tips and payment processing remain out of scope.
