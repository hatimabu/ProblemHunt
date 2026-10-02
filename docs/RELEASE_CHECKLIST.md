# Release checklist
## Current core implementation — 2026-10-02

- [x] Account data download, private deletion request/cancellation and moderator review implemented; actual erasure remains separately reviewed.
- [x] Node 22.23.3: TypeScript, 98 frontend tests, 62 SQL scenarios, five worker tests and separate production build pass. Existing bundle-size warning remains.
- [x] Real local privacy browser journeys plus signup confirmation/password recovery against Mailpit; no production synthetic writes or external email.
- [x] Fresh hosted inventory: 34 applied, TWO pending migrations; required account privacy plus optional notification observability. No hosted SQL applied.
- [x] Saved exact continuation instructions; local implementation is complete for the notifications-off core scope. Separate learning guides preserved.
- [ ] Owner supplies monitored support contact and identifies report/privacy operator and retention choices.
- [ ] Review and explicitly authorize required hosted account-privacy migration; do not blindly apply optional worker SQL.
- [ ] Authorized commit/push and remote CI on exact candidate; production Auth/redirect/email and rollback verification.
- [ ] Explicit merge/deployment approval, then live verification. Main push triggers deployment.

CORE_RELEASE.md contains the release packet. Older sections below describe their dated milestones, not current gaps or hosted state.

## Core website release candidate — 2026-10-01

- [x] User approval for core release preparation; learning work remains separate.
- [x] Real isolated Supabase replay and Auth/API/browser/Storage/moderation journeys; no public synthetic writes.
- [x] 94 frontend tests, 60 SQL scenarios, five worker tests, TypeScript/build, local export privacy checks and desktop/mobile accessibility evidence.
- [x] Notifications default off; public support contact wiring and release guard prepared.
- [x] Fresh hosted history: 34 applied, only optional worker-metrics SQL pending. Existing Azure target is Free SKU. No hosted changes.
- [x] Operator export and reviewed deletion procedure prepared; reproducible local integration workflow added.
- [ ] Supply monitored support contact and confirm report/privacy operations and retention choices. Deployment variable not changed.
- [ ] Approve commit/push, run remote CI on exact candidate; new integration workflow has only local equivalent evidence so far.
- [ ] Verify production Auth/redirect/email behavior and compatible rollback artifact; keep learning image's failing scan explicit.
- [ ] Explicitly approve target release before main merge/deployment; then verify live navigation, headers and authorized account behavior.

Details and exact next steps: CORE_RELEASE.md. Earlier sections are historical milestones, not current hosted history.

## Two learning guides — 2026-09-30

- [x] Create only two new guides: local Docker learning first; short Azure tutorial second, with architecture/cost/cleanup explanation.
- [x] Match commands to existing files/scripts, mark missing cloud bootstrap and scan gates explicitly, validate relative links and PowerShell syntax.
- [x] Preserve the local-only versus full Supabase/cloud evidence boundary; no execution or deployment authorization inferred.
- [ ] Website release remains incomplete: real isolated integration, hosted SQL review/approval, runtime security/delivery, operational data handling, final CI and approved live verification.
- [ ] Stop after reporting guides and remaining scope; await a new user request.


## Superseding cost clarification — 2026-09-30

The user clarified after the cancellation: paid services may be approved once the infrastructure and costs are understood. Session 07 is now on hold for explanation and informed scope/budget approval, not permanently rejected and not completed. No cloud resources, hosted SQL, registry publication or deployment occurred. Preserve the prior work; explain the optional learning lab versus the existing website and obtain informed approval before further implementation. The earlier cancellation record below describes the preceding instruction.


## Session 07 cost cancellation — 2026-09-30

- [x] Stop the paid Azure exercise after the user's free-plan constraint; no cloud mutations or image publication performed.
- [x] Record that Session 07 is aborted, not successfully completed; preserve the prior implementation and database volume.
- [x] Revert the unverified Alpine Dockerfile/validator experiment; regenerate ignored context. Rebuild original Compose images before a future local lab run because local tags may still point to the candidate.
- [x] Persist advance cost-disclosure/free-plan requirements in AGENTS, roadmap and memory; retain Azure templates only as an inactive proposal.
- [ ] Original scan findings remain unresolved. No cloud exercise, bootstrap compatibility or cloud monitoring results claimed.
- [ ] Any next local session needs separate approval; paid services require an explicit change to the user's cost policy.

## Session 06 operations and cloud preparation — 2026-09-29

- [x] Explicit Session 06 approval; preserve community branch and production isolation.
- [x] Sanitized structured logs, event correlation, per-job duration, bounded process counters/histogram, durable queue/failed/age gauges and stale-snapshot signal.
- [x] Worker-only aggregate SQL; local replay now 35 migrations. No hosted application.
- [x] 60 disposable SQL scenarios and five worker tests; Node 22 image test parity for worker, real crash/concurrency/replay drills and database-outage health/metrics recovery.
- [x] Separate liveness/readiness, final-attempt versus retry/lease-loss outcomes, atomic retained-lab upgrade and no volume reset.
- [x] Pinned runtime/scanner, runtime excludes bootstrap/package managers, offline image scan and SBOM; CI workflow prepared and YAML parsed, not remotely executed.
- [x] ARM foundation/worker drafts, offline policy checks and Bicep round-trip validation, monitoring queries, current regional pricing inputs, permission/rollback/teardown plan.
- [ ] Resolve 52 HIGH + 4 CRITICAL OS findings or obtain a reviewed explicit exception before image publication/deployment. Scan gate is failing, not waived.
- [ ] Approve exact isolated subscription/group/region/budget/expiry, registry publication, resources, SQL fixture/operator path and teardown scope. Session 07 separately gated.
- [ ] Rehearse managed-PostgreSQL-compatible bootstrap/grants; do not replay the local-only Supabase bootstrap in Azure. Validate provider what-if, quota, network/TLS, identity and alert delivery after authorization.
- [ ] Hosted Supabase history/migrations, real Auth/PostgREST integration, retention/export/delete and broader load/race gates remain open. No Session 06 push or cloud mutation authorized.

## Session 05 private reply notifications — 2026-09-28

- [x] Approved discussion follows, private inbox/read controls, follow removal and account isolation; legacy marketplace entries remain outside the active inbox.
- [x] Additive pending notification migration: transactional identifier-only events, durable queue, lease fencing, idempotence, bounded retry/recovery, opt-out generations and visibility rechecks.
- [x] Existing notification table reused; narrow browser updates and dedicated server worker role. Local credentials/context stay ignored and are excluded from the image context.
- [x] 91 frontend/API tests, 59 disposable SQL/recovery scenarios across 34 migrations, worker config test, TypeScript/build and whitespace checks.
- [x] Mocked compiled desktop/mobile journeys, axe/no-overflow/no page errors; screenshots inspected.
- [x] Real Docker/PostgreSQL build/init, UID 1000/Node 22, healthy endpoint and graceful exit, crash-before/after effects, deduplication, stale lease fencing, two-connection claims and hidden-content suppression.
- [x] Actual database/worker restart preserves one delivery; deliberate database outage yields 503 and recovery restores 200. Local lab stopped with its dedicated volume retained.
- [ ] Fresh hosted history/grant/role review and separately authorized isolated migration; real Supabase Auth/PostgREST and full browser-to-worker integration remain unverified.
- [ ] Define retention, export/deletion handling, capacity/load limits and wider concurrent visibility/opt-out exercises before launch.
- [ ] Session 06 requires fresh approval. Cloud resources, main integration/deployment and registry publishing remain unapproved.

## Session 04 typed knowledge posts — 2026-09-28

- [x] Approved typed editor, structured lab/incident publication requirements, draft/edit flow, accurate feed/browse/workspace labels and content-type filtering.
- [x] Prepare `20260928000200_community_post_types.sql`: backward-defaulted type, lessons, immutable type, publication/state constraints, solution restriction and compatible RPC arguments.
- [x] 83 frontend/API tests, TypeScript/build; 47 disposable SQL scenarios across 33 migrations. Existing problem acceptance and legacy data preservation pass.
- [x] Mocked compiled browser journeys at 1440/390px: both types draft/edit/publish/reload, failed validation/recovery, filtered browse, axe/no-overflow/no page errors; screenshots inspected.
- [x] Local unpublished incident draft attributes repository evidence and makes no unverified cloud-recovery claims. Runbook includes migration compatibility and rollback cautions.
- [ ] Review exact pending migrations and current hosted history before separately authorized application; no hosted SQL was applied. New frontend needs this schema, and old frontend is not a safe complete rollback once write-ups exist.
- [ ] Verify extended search and contributions RPC/grants/cache through real isolated Auth/PostgREST, plus private/hidden/pagination and multi-session journeys.
- [ ] Existing release/runtime/bundle and operational gates remain. No deployment or push is authorized here.
- [ ] Obtain explicit Session 05 approval before discussion following/Docker notification work; recheck Docker availability then.

## Session 03 private personal library — 2026-09-27

- [x] User-approved followed tags/saved cases with private feeds, persistent service reads, follow/save/remove controls and safe auth return routes.
- [x] Prepare additive `20260928000100_community_personal_library.sql`; owner RLS, idempotent keys, narrow grants, no client updates/timestamps, visibility checks before pagination.
- [x] 75 frontend tests, TypeScript/build and whitespace checks; 43 disposable SQL scenarios replay 32 migrations with unchanged legacy data.
- [x] Mocked compiled desktop/mobile review: follow/unfollow/save/remove/reload, hidden cases, failed write/retry, second account and logout; axe/no-overflow and screenshot review.
- [ ] Verify exact new grants/upserts and RPC via real isolated Auth/PostgREST; concurrency/load remain untested.
- [ ] Review current hosted migration history and all exact pending SQL before separate migration approval. New SQL has not been applied to hosted Supabase.
- [ ] Include private preference references in eventual account/content export/deletion procedures; saved references can persist when content is hidden. No automatic deletion/cascade was introduced.
- [ ] Existing release gates and bundle/runtime warnings remain. Obtain Session 04 approval before lab/incident content work.

## Session 02 community layout — 2026-09-27

- [x] Approved compact home feed, wide Home/Browse/domain shell, functional route links, mobile menu and contextual tested fixes.
- [x] Accurate server-filtered unanswered pagination; preserve acceptance semantics, simulated labels and honest loading/error/empty behavior.
- [x] 63 frontend tests, TypeScript/build; 37 disposable database tests across unchanged 31 migrations.
- [x] Mocked compiled-browser review at 390/820/1024/1440px: navigation/reload/retry/keyboard, no overflow, axe; desktop/mobile screenshots inspected.
- [ ] Verify new read query against isolated full Supabase/PostgREST; mocked HTTP and equivalent SQL do not prove hosted integration.
- [ ] Existing release gaps persist: Node 22 parity, full isolated write/concurrency journeys and bundle warning. No hosted data or deployment changed.
- [ ] Obtain Session 03 approval before followed tags/saved cases. Preserve all uncommitted planning and baseline work.

## Session 01 local baseline — 2026-09-27

- [x] Explicit Session 01 approval; preserve earlier planning edits on the community feature branch.
- [x] Locked installs for both packages; unified verification command and corrected root startup commands.
- [x] After installs: 57 frontend tests, 36 disposable database scenarios across 31 migrations, TypeScript and build pass.
- [x] Compiled-preview direct-route HTML/CSP smoke, script syntax/invalid-input guard, ignored secret paths and whitespace checks.
- [x] Save setup, evidence boundaries, recovery exercise and integration prerequisites in `community-session-01-baseline.md`.
- [ ] Verify under Node 22/CI; local Node 25 and existing bundle/localStorage warnings remain.
- [ ] Establish isolated full Supabase; adapt historical harness state expectations, local URL support and admin credential sources before write tests.
- [ ] Review current hosted history before any separately authorized migration; local replay does not establish remote application.
- [ ] Obtain Session 02 approval before redesign. Session 01 grants no release/deployment authorization.

## Community/cloud roadmap planning — 2026-09-27

- [x] Save repo memory, roadmap and ten sequenced prompts; add AGENTS.md discovery pointer.
- [x] Record approval before every session and separate approval for cloud/hosted actions; no reset-triggered automatic work.
- [x] Documentation-only whitespace, local reference and session-sequence checks; application code unchanged, application tests not rerun.
- [ ] Obtain approval for Session 01 and establish current baseline evidence before implementation milestones.
- [ ] Resolve isolated test prerequisites; assess exact hosted migration status before any separately authorized application.
- [ ] Review budget/resource scope before any cloud exercise. AKS remains optional.

## Discussion attribution and motion — 2026-09-27

- [x] Steady green solution contour, neutral accepted-solution surface, confirmed-summary-only idle glow, reduced-motion support and compact report actions.
- [x] Public display names and roles on the problem, solutions and comments; consistent fallback for private/unavailable identities. No private account fields fetched.
- [x] 57 frontend tests, TypeScript, production build and whitespace checks; existing bundle-size warning remains.
- [x] Compiled preview reviewed at 1440px and 390px with intercepted sample responses; verified name labels, motion, report open/close and no overflow. No hosted writes.
- [ ] Verify live assets after the authorized main push. Hosted identity reads and write workflows are not proved by the mocked preview; isolated hosted checks remain outstanding.

## Discussion design — 2026-09-27

- [x] Distinguish problem context, proposed answers, author-accepted fixes, clarification and test evidence using color, borders, labels and icons.
- [x] Lime HUNT-arrow upvote with accessible pressed/busy state, server-confirmed count, removal and reduced-motion support; unchanged voting permissions.
- [x] 55 frontend tests, TypeScript, production build and whitespace validation pass. Existing bundle-size warning remains. Tests use mocks; no fresh hosted write checks were run for this presentation-only change.
- [ ] Review a populated discussion on desktop/mobile in an isolated environment. No hosted synthetic records were created for this visual change.

Current checkpoint: 2026-09-26, `feature/community-knowledge-platform`. Read PROJECT_STATE first; earlier runbooks are historical evidence.

## Problem status milestone — 2026-09-26

Main integration authorized by the user: conflicts resolved while preserving main deployment settings and logo motion. Exact merged candidate passes 55 frontend tests, 36 disposable database tests, TypeScript, production build, YAML target/trigger checks and git diff whitespace checks. Hosted migration remains pending; deployment success is not yet verified.

- [x] Shared green Open/yellow Testing badges in Browse and dashboard; centered labels, reduced-motion-safe pulse, neutral private drafts.
- [x] Author Stop testing returns to Open; remove unresolved closure; retain tested-answer acceptance as the path to Solved.
- [x] 36 disposable database scenarios pass across 31 migrations; 55 frontend tests, TypeScript, production build and git diff whitespace checks pass, with the existing chunk warning.
- [ ] Review hosted history and exact pending `20260927000400_community_author_states.sql`, then obtain migration authorization. Until applied, the hosted RPC still allows the former closure behavior.
- [ ] Visually review badges on desktop/mobile and verify transitions on an isolated hosted test project. No production fixture writes or deployment were performed.


## Current deployment policy (main)

- [x] Fix the missing app-name variable failure: workflow directly selects the user-confirmed `problemhunt-web-sdm7w4743u274` in `problemhunt`. YAML parsing, exact target/token lookup assertions, comparison of all other settings against HEAD, and `git diff --check` pass.
- [ ] Push the app-selection fix during an authorized release and verify GitHub/Azure token retrieval and deployment. No deployment was performed for this fix; `AZURE_STATIC_WEB_APP_NAME` is no longer required as a repository variable.

- Frontend pushes to `main` deploy automatically after the reusable checks pass. Review database compatibility before pushing/merging; there is no additional manual confirmation gate on push events.
- Manual runs deploy only from `main` with `confirm_release` set to true. False confirmation skips the deploy job.
- Database migrations require a separate deliberate, authorized operation after reviewing hosted history and pending SQL. No hosted migrations run during Azure deployment; disposable database tests are test-only.
- Existing Azure resource, secrets, build path and deployment settings are retained. This fix does not change the custom domain or create resources.
- Validation: YAML parsing and 18 event/ref/confirmation combinations pass; deployment settings and test dependency match the previous workflow. All 54 frontend tests, 35 disposable database tests, TypeScript and production build pass. Actual GitHub/Azure execution is not verified until this commit is pushed. The existing bundle-size warning remains.

## Completed for this milestone

- [x] Compare dashboard layout with main and the supplied screenshots; retain compact cards, icon accents, identity/sidebar, lime states and bordered panels without marketplace behavior.
- [x] Landing page, persistent browse/workspace shells, keyboard focus and reduced motion.
- [x] Follow-up polish: problem HUNT word order/float, smaller domain tabs, clickable profile card, redundant summary removal and hidden skip-link layout fix. Frontend tests and build pass; no database changes.
- [x] Dashboard follow-up: removed the redundant My profile tab and the identity card's lime hover treatment; profile editing remains available through the identity card. Frontend component tests, TypeScript and production build pass; no database changes.
- [x] Dashboard navigation follow-up: moved the five workspace links directly below the dashboard summary and above the identity/sidebar and content panels. Frontend component tests, TypeScript and production build pass; no database changes.
- [x] Identity/motion follow-up: replaced the HUNT float with a reduced-motion-safe gift-box shake and made display name the sole community-facing profile identity; sign-in email remains private. Frontend component tests, TypeScript and production build pass; no database changes.
- [x] Landing motion follow-up: gave HUNT a continuous soft shake that immediately strengthens on hover/focus and added the main landing page's one-time staggered scroll reveal to the four community workflow cards. Frontend component tests, TypeScript and production build pass; no database changes.
- [x] Stronger HUNT motion, distinct icon colors, redesigned identity card and avatar URL renewal/recovery. 54 frontend tests, TypeScript and build pass; both existing avatar objects resolve in read-only Storage inspection. Confirm the affected user's picture in their active session; that session was not available for reproduction.
- [x] Username validation/uniqueness, private account view; existing avatar ownership retained.
- [x] 53 frontend tests, TypeScript, production build; 35 disposable database scenarios.
- [x] Exact cleanup rehearsal; explicit approval for all 94 synthetic rows; hosted cleanup applied without touching accounts, profiles, uploads or legacy tables.
- [x] Hosted history matches all 30 versions; anonymous public library/search is empty.
- [x] Two-account read-only hosted/browser checks, mobile layout, direct refresh, back/forward and automated accessibility.
- [x] Production synthetic-write guard and ignored credentials/backup.

## Required before launch approval

- [ ] Configure isolated Supabase test credentials and replay migrations there. Match all admin and account configurations to that project.
- [ ] Repeat complete author/contributor write journey on the candidate: private draft denial, edit/publish, clarification/solution, test evidence, Testing/Solved, forbidden acceptance, acceptance reversal, votes/removal, stopping Testing and denial of unresolved closure.
- [ ] Repeat profile display-name/avatar upload/replace/remove and cross-account denial against that isolated hosted service. Earlier real-service evidence is in `community-profile-dashboard.md`; this milestone did not repeat hosted writes.
- [ ] Review complete feature diff against main and rerun CI on the exact merge candidate.
- [ ] Verify Supabase production Auth site/redirect URLs and signup/recovery email delivery.
- [ ] Confirm moderator staffing, support/privacy request channel, retention and account export/deletion handling.
- [ ] Review keyboard/screen-reader use and Safari/physical mobile devices. Consider bundle splitting.
- [ ] Verify existing Azure resource, GitHub variables/secrets and optional sanitized monitoring delivery. No new resources are implied.
- [ ] Present release report and obtain explicit merge/deployment approval before changing main or Azure.
- [ ] After approved deployment, smoke-test the Azure hostname: SPA direct refresh, headers/CSP, auth and community permissions. Keep a compatible frontend rollback artifact.
- [ ] Obtain explicit approval before domain routing/TLS changes to `problemhunt.cc`.

## Reproduction

Frontend: `npm test --prefix problem-hunt`, `npx tsc --noEmit` from `problem-hunt`, then `npm run build --prefix problem-hunt`.

Database: `npm test --prefix supabase/tests` (disposable PGlite). Exact cleanup rehearsal: `node scripts/community-cleanup-rehearsal.mjs`, requiring the existing ignored backup; no hosted connection.

Read-only production preview: build, run `node scripts/community-preview.mjs`, then `node scripts/community-navigation-review.mjs --allow-project ajvobbpwgopinxtbpcpu`. Requires ignored credentials for the two dedicated accounts and local Edge/Playwright dependencies. The empty-library assertions describe this checkpoint and should be revised once genuine users contribute.

Do not run old seed/write harnesses on production. `COMMUNITY_TEST_CONFIG` can select an isolated test configuration; check every harness's admin-key inputs before using it. Never reset the existing project or assume local SQL has been applied remotely.
