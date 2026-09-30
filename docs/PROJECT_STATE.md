# ProblemHunt project state

## Session 05 private reply notifications — 2026-09-28

Approved implementation plus same-branch GitHub commit/push. Public problems now support explicit reply follows; `/notifications` provides a private paginated inbox, read/unread controls and follow management, including unavailable discussions. The existing notification table is reused without exposing historical marketplace entries. Replies create versioned per-recipient events transactionally; a narrow-role Node worker dispatches/claims a durable PostgreSQL queue with fenced leases, idempotent inbox insertion, bounded backoff, failed-message recovery and visibility/subscription rechecks. No copied reply text is queued. See `community-session-05-notifications.md` for exact contracts, SQL/grant compatibility and reproducible drills.

Prepared `20260928000300_community_notifications.sql`; 34 local migrations. Hosted migration history/application remains separately gated. Runtime config intentionally permits only the isolated notification lab; no hosted worker connection or deployment is configured. Real isolated Supabase Auth/PostgREST/browser integration and broader load/race testing remain release gates.

Evidence: `npm run verify` passes 91 frontend/API tests in 19 files, 59 disposable database/recovery scenarios, one worker configuration test, TypeScript and build. Existing ~719 kB bundle warning and Windows Node 25 frontend/CI Node 22 parity gap remain. Mocked compiled browser follow/reload, read failure/retry, read persistence, two-account isolation, hidden-content exclusion and removal pass at 1440/390px with axe/no overflow/no page errors; screenshots inspected.

Docker was found in existing Ubuntu WSL. Compose configuration, image build and disposable PostgreSQL initialization succeeded. Real Docker evidence: UID 1000, Node 22.23.3, PostgreSQL 17.11; healthy 200 endpoint, graceful SIGTERM exit 0, real child-process crashes before/after delivery, duplicate suppression, stale lease fencing, two-connection locked claims, hidden-content suppression and restricted worker grants. A committed queued reply survived actual database/worker restart and produced one inbox row. Database outage changed health to 503; restoring it recovered 200 without worker restart. Lab services are stopped; only their dedicated local volume and ignored credentials/context remain.

The user explicitly authorized pushing all completed commits to `origin/feature/community-knowledge-platform`, including previous local milestone `c773bdb`. No main merge, hosted mutation, cloud deployment, image-registry push or email. Next action: request approval for Session 06 (observability, delivery preparation and isolated Azure plan). Do not advance automatically. Use Git status/log and the remote branch to identify the delivery commit; historical checkpoint instructions below are superseded by this section.

## Session 04 typed knowledge posts — 2026-09-28

Approved local implementation adds Lab write-up and Incident review alongside existing problems. The editor reuses structured context/steps with required verification and lessons for publication; content type stays fixed after first save. Browse has type filters, feeds and workspace cards preserve type labels, and active/unanswered/tested-fix views remain problem-only. Database constraints and solution guards prevent write-ups from entering acceptance. Existing problem acceptance regressions pass. See `community-session-04-writeups.md` for the model, compatibility and failure/recovery exercise; `examples/incident-deployment-app-selection.md` is an unpublished, evidence-attributed local draft.

Prepared but not hosted: `20260928000200_community_post_types.sql`. Search gains a defaulted type argument; contributions gain a type return field while retaining their arguments and RLS. New browser code requires the new schema. The migration and older pending SQL require separately approved hosted-history/dependency review and isolated rehearsal. The local preview's service-not-ready message is not resolved by this commit when it uses an unmigrated hosted database.

Evidence: `npm run verify` passes 83 frontend/API tests in 17 files, 47 disposable database scenarios across 33 migrations, TypeScript and production build. Compiled browser harness `community-post-review.mjs` passes draft/edit/publish/reload for both types, validation recovery and typed browsing at 1440/390px; axe, no horizontal overflow and no page errors. Desktop/mobile screenshots inspected under ignored `supabase/.temp/session-04/`. Existing ~712 kB bundle warning, Node 25/22 parity, real isolated Auth/PostgREST and concurrency gaps remain.

The user authorized committing accumulated planning and Sessions 01–04 to `feature/community-knowledge-platform`. No push, merge, hosted mutation, deployment or publication. Session 05 (Docker notifications) is the exact next approval gate; do not start it automatically. Historical sections below retain their checkpoint-specific next actions and are superseded by this handoff.

## Session 03 private personal library — 2026-09-27

Approved local implementation adds private followed tags and saved cases, Following/Saved feed views, save/remove controls on public case lists/discussions, follow/unfollow on tag-filtered Browse/discussions and a tag manager. Server-confirmed changes reload preferences, account switches discard previous private state, and sign-in returns preserve supported community routes. Public search, domains and acceptance behavior remain intact. Privacy copy documents these selections.

Prepared but not hosted: `20260928000100_community_personal_library.sql`, adding two owner-private RLS tables and an authenticated SECURITY INVOKER personal-feed RPC. Filtering occurs before pagination; drafts and hidden content are excluded even for authors. Saved rows contain only private references, not copied content. See `community-session-03-personal-library.md` for exact grants, retention behavior and review notes.

Evidence: 75 frontend tests, 43 disposable SQL scenarios across 32 migrations, TypeScript/build; mocked compiled-browser follow/save/reload/removal/retry/account isolation/sign-out at 1440/390px with axe and no overflow. Screenshots inspected. Existing ~709 kB bundle warning and Node 25/22 gap remain. Real isolated Auth/PostgREST/upsert and multi-session races are unverified. Hosted history was not queried, and the older author-state migration's pending status must be freshly checked before any separately approved migration. No hosted mutation, deployment or push. Session 04 needs approval.

## Session 02 community layout — 2026-09-27

Approved local implementation replaces the oversized landing hero with a compact welcome/search and Latest, Unanswered and Tested fixes feed. Home/Browse/domain pages share a wider responsive navigation/content/context shell. Existing library filters and discussion links remain; no fake activity or unimplemented following/saving controls. Read-only feed pagination filters public/non-hidden records in PostgREST, with a named solutions-FK anti-join for unanswered cases. No new schema or write behavior. See `community-session-02-layout.md` for exact semantics and screenshots.

Evidence: 63 frontend tests, TypeScript and build; 37 disposable database scenarios across 31 migrations; mocked compiled-browser populated/empty/error/retry and navigation checks at 390/820/1024/1440px, no overflow and axe passes. Desktop/mobile screenshots inspected; external requests intercepted, no production fixture writes. Existing ~701 kB bundle warning and Node version gap remain. Real isolated PostgREST anti-join integration/performance is unverified; SQL semantics and HTTP request contracts are tested separately. No migration, hosted action, deployment or push. Session 03 needs approval.

## Session 01 local baseline — 2026-09-27

User-approved local baseline complete; see `community-session-01-baseline.md`. Added a root `npm run verify` command that runs TypeScript, mocked frontend tests, disposable PGlite permissions/journey checks and a placeholder-configured build; added a locked two-package installer, fixed broken root start/server commands and recorded Node 22 in `.nvmrc`. README now documents local/isolated setup and the actual configured Azure app selection. Existing planning edits preserved.

Evidence: `npm ci` succeeded for both locked packages; the unified verification after installation passes 57 frontend tests, 36 database scenarios replaying 31 migrations, TypeScript and build. Compiled-preview direct `/browse` request returns SPA HTML and CSP. Script syntax, invalid-argument rejection, ignored environment/account paths and whitespace checks pass. No dependency lockfile changes. Existing ~695 kB JS bundle warning and Node 25 localStorage warnings remain; local Node 25.2.1/npm 11.7.0 does not establish CI Node 22 parity.

Docker is unavailable at checked locations; no local Supabase config or selected isolated config override. Full real Auth/PostgREST/Storage and concurrency evidence remains outstanding. Historical harnesses still include former closure expectations and fixed admin-file paths: review/adapt them before isolated use. The latest local migration is `20260927000400`; historical docs describe it as pending remotely, but hosted history was not queried here. No hosted writes, provisioning, deployment, push or migration. Session 02 requires fresh approval.

## Community/cloud roadmap planning — 2026-09-27

Saved persistent context in `AGENT_MEMORY.md`, the product/learning sequence in `COMMUNITY_CLOUD_ROADMAP.md`, and ten approval-gated session prompts in `COMMUNITY_CLOUD_SESSIONS.md`. AGENTS.md points future chats to these files. Planning only: Session 01 awaits approval; no implementation session has started. The sequence covers a reliable test environment, community layout, follows/saves, lab content, Docker notifications, operations, isolated Azure, local Kubernetes, optional AKS and evaluated retrieval. Each session requires explicit user approval; usage resets never authorize continuation. Cloud actions and hosted migrations retain separate authorization gates.

Validation: documentation-only diff reviewed with `git diff --check`; session sequence and linked repo paths checked. No application tests rerun because executable code is unchanged. No push, deployment, hosted query/write or migration was performed. Remaining prerequisites include baseline verification, isolated test setup and explicit cloud scope/budget approval when relevant.

## Discussion attribution and motion — 2026-09-27

Solution cards retain a steady green outline with hover feedback; accepted solutions keep the neutral charcoal card surface, with only their border and accepted label providing the green confirmation cue. Idle glow is limited to the confirmed-fix summary and respects reduced motion. Scoped panel styles now survive the shared panel cascade. Problem, solution and comment bylines show public display names beside Author/Contributor roles, with a separate `(you)` marker. A batched, public-consent-filtered query reads only user IDs and display names; private/missing profiles or failed lookups use a stable member label. Private names and login identifiers remain undisclosed. Report controls are compact flag actions; reporting permissions and forms are preserved.

Validation: 57 frontend tests (including anonymous attribution and lookup-failure coverage), TypeScript, production build and whitespace checks. Mocked browser preview checks the compiled build at 1440px and 390px: names/roles, green outline, no solution animation, confirmed-only glow, reduced motion, report open/close and no horizontal overflow. Desktop/mobile screenshots inspected. All external preview requests were intercepted; no production records or migrations changed. Existing bundle-size warning remains. Main publication follows the user's existing push authorization; live availability must be checked after the push.

## Discussion design — 2026-09-27

Feature-branch visual update: blue structured context, violet proposed solutions, green accepted fixes, amber test evidence, contributor/profile chips, tag links, section icons and stronger form boundaries. Solution upvotes use the lime HUNT arrow with count, pressed/busy states and reduced-motion-safe interaction animation. Acceptance remains distinct from community votes; existing permissions and API operations are unchanged. No hosted data, migration or deployment changes. Browser visual review of a populated discussion remains outstanding; no production fixtures were created.

Updated 2026-09-26. Deployment workflow fix on `main`, following website merge `c51cac7`.

## Problem status milestone — 2026-09-26

Main integration authorized by the user: conflicts resolved while preserving main deployment settings and logo motion. Exact merged candidate passes 55 frontend tests, 36 disposable database tests, TypeScript, production build, YAML target/trigger checks and git diff whitespace checks. Hosted migration remains pending; deployment success is not yet verified.

On `feature/community-knowledge-platform`, Browse and dashboard contribution cards now share centered status badges: filled green Open and yellow Testing with a subtle reduced-motion-safe pulse. Private drafts retain a neutral label. Authors can stop Testing and return to Open; the unresolved-close action is removed. Solved still requires accepting a tested answer with evidence.

Prepared migration `20260927000400_community_author_states.sql` restricts the author state RPC to Open/Testing on public active cases. Existing closed records are preserved. It is pending, not applied to hosted Supabase: the old hosted RPC still permits closure until this migration is separately reviewed and authorized. The user authorized merging and pushing to main; hosted migration application remains separately gated. Local database verification passes 36 scenarios across 31 migrations, including forbidden closure, contributor denial, stop-testing and acceptance-only resolution. All 55 frontend tests pass; TypeScript, production build and git diff whitespace checks pass (existing bundle-size warning). Visual browser review and isolated hosted verification remain outstanding.


## Deployment behavior

Static app selection fix (2026-09-26): the supplied failed run authenticated to Azure, then stopped because the repository variable `AZURE_STATIC_WEB_APP_NAME` was empty. The workflow now sets `STATIC_WEB_APP_NAME` directly to the user-confirmed existing app `problemhunt-web-sdm7w4743u274` in resource group `problemhunt`, removing that variable dependency. YAML parsing and comparison against HEAD passed: only app selection changed; triggers, release gates, token lookup, build and upload settings are preserved. `git diff --check` passed. This fix has not been pushed or run on GitHub/Azure; successful token retrieval and deployment remain unverified.

Every push to `main` automatically runs the deployment workflow. Deployment waits for the reusable frontend checks to succeed. Manual `workflow_dispatch` remains available, but deployment requires both the `main` ref and `confirm_release: true`; false confirmation or another ref skips deployment. Azure resource selection, secrets, build output and upload settings are unchanged.

Supabase/database migrations remain a separate deliberate operation: inspect hosted history and pending SQL before any authorized application. Azure deployment never applies hosted migrations. The reusable checks replay SQL only inside disposable PGlite tests, without connecting to Supabase. This workflow change was committed locally; pushing it to main will trigger deployment.

ProblemHunt is a technical knowledge community: **Real problems. Tested solutions.** Cloud/DevOps and Professional AV authors publish structured problems, test contributions, and confirm the solution that worked. Sign-in email remains private; the editable display name is the sole community-facing identity.

## Milestones and architecture

Stages 2–8 are implemented; their runbooks and `community-release-report.md` retain historical evidence. Profile/dashboard milestone: `fa90ac4`. Latest implementation milestone: **`61ea041`**, restoring the compact technical design from main and the supplied screenshots, with a landing page, persistent browse/dashboard shells, icon tabs, private account information, editable display names and an empty public library.

React/Vite uses React Router and Supabase Auth, RLS/RPC, Postgres and Storage directly. The browser never receives a service-role key. Legacy tables remain; marketplace routes and wallet-dependent acceptance are outside the active journey. Only authors confirm acceptance; reputation is derived from trusted events. Reports and moderation notes are private. Profile ownership and avatar-folder policies protect edits; public profiles expose only selected identity/contribution fields, never sign-in email or private drafts.

## Current UI

- `/`: problem HUNT hero; only HUNT links to browse, with a gentle floating animation (disabled for reduced motion). Domain and workflow sections, no feed.
- `/browse` and `/domains/:domain`: persistent navigation/search shell, category/tag/state filters.
- `/dashboard`, `/my-problems`, `/my-solutions`, `/profile`, `/dashboard/reputation`: persistent workspace header, clickable identity card and five tabs. The identity card is the sole dashboard route to profile editing; its hover state no longer adds a lime shine/border, while its existing behavior remains. Redundant upper summary cards and the separate edit-profile tab have been removed. Accepted fixes use `/my-solutions?accepted=1`.
- `/people/:id`: intended public profile view. `/problem/:id`: existing discussion, evidence and confirmed fix journey.
- Tips is visibly planned and disabled. Tips/payments, Docker and grounded AI remain deferred.

## Hosted state and cleanup

All **30** local migration versions match hosted history through `20260927000300`, verified after application. `20260927000200` adds username validation/uniqueness and the active-problem filter. `20260927000300` removes exactly the user-approved **94 synthetic records** in `community-fixture-cleanup-manifest.json`: 20 problems, 13 solutions, 18 comments, 7 reports, 3 reviews, 6 moderation events, 19 acceptance records and 8 reputation events. There were zero associated votes. No accounts, profiles, uploads or legacy records were removed; no reset occurred.

The cleanup was rehearsed against the exact ignored backup in PGlite, preserving an unrelated control case. It checks manifest identities and aborts on unexpected dependent content. Anonymous hosted reads now return zero public problems. The backup remains ignored under `supabase/.temp/`; it is not a general production backup.

Synthetic fixture-writing helpers now refuse the existing project. A separate test project with matching ignored credentials is required for future hosted write rehearsals; none is configured. Existing test accounts remain for read-only checks. Do not repopulate production with examples to rerun historical harnesses.

## Latest evidence and limits

- 53 frontend tests in 12 files; TypeScript and production build pass. Frontend component tests mock APIs.
- 35 database scenarios pass in disposable PGlite, replaying 30 migrations, including username privacy/ownership and cleanup safeguards. PGlite is not a full Supabase platform or concurrency test.
- Exact 94-record cleanup rehearsal passes independently.
- Real Supabase read-only checks: empty public browse/search, two dedicated account logins, private profile boundary, dashboard/profile/reputation navigation. Browser checks cover desktop and 390px mobile, direct reload, back/forward, persistent shells, reduced motion and automated axe checks.
- Full hosted draft/publish/solution/acceptance, voting, moderation and avatar write evidence belongs to earlier stage/profile reports. Those writes were not repeated after cleanup. New username writes are covered by database/component tests, not fresh hosted writes.
- Build has a ~692 kB JavaScript chunk warning. Automated accessibility is not screen-reader certification. Safari/physical devices, multi-user races and load remain untested.

No merge, Azure deployment or domain change was made. Azure routing/headers, production email/redirect configuration, monitoring delivery and operational support/moderation ownership remain release gates. See RELEASE_CHECKLIST for exact next steps.

## Next task

Latest visual/avatar follow-up: HUNT has a continuous soft gift-box shake and switches immediately to a slightly more visible but seamless shake on hover or keyboard focus; domain and workflow icons have distinct accents. The four workflow cards use the main branch's one-time staggered fade-up when scrolled into view. The clickable identity card uses a blue treatment, clear display-name hierarchy and contained avatar status. Avatar signed URLs refresh every 45 seconds and on focus/tab return. Read-only Storage inspection found both referenced files present and downloadable; the exact screenshot failure was not reproduced in that user's session. Recovery is covered by a component regression test. No Storage policies or hosted data changed.

Dashboard follow-up: removed the redundant My profile workspace tab because the identity card already links to `/profile`; removed its lime hover treatment; moved the five remaining workspace links directly under the dashboard summary, above the identity/sidebar and content panels. HUNT now gives a continuous subtle shake that becomes immediately stronger on hover/focus, and the four workflow cards reveal in a stagger when scrolled into view. Profile/dashboard identity uses only the editable display name; existing login identifiers remain stored and private. Frontend component tests, TypeScript and production build pass; no database or hosted changes.

Review the visual milestone, configure an isolated Supabase test project and rerun the complete write journey on the release candidate. Resolve operational release gates before requesting approval to merge and deploy to the existing Azure resource. Keep `problemhunt.cc` unchanged until explicitly approved.
