# ProblemHunt project state
## Icon-only upvote design; Scout deployment verified — 2026-10-03

User requested an icon-only upvote button. Local main now uses a compact 44px upward-arrow control, outlined idle/filled selected state, separate numeric count, hidden live score announcements and accessible action labels. Voting permissions, confirmed count updates, busy disabling and error handling remain unchanged. Five existing community trust tests, TypeScript and production build pass; standalone visual state preview inspected. This upvote change is local, not published.

Scout commit 85ac23f is successfully deployed: GitHub run 37082900893 passed frontend, database, integration and Azure jobs. Read-only live checks at https://problemhunt.cc verify the hashed Scout SVG, homepage link, reduced-motion static pose, no page errors and no overflow at 320/390/1440px. No production writes or hosted configuration changes. Older pending logo-publication notes below are superseded.

## Approved Scout logo integrated on main — 2026-10-02

User explicitly requested the approved round-7 running Scout on the official website/main. Replaced the framed checkmark with the original sage fox sprite, square glasses, four-leg 280ms sprint and close ProblemHunt wordmark; no cube/gulp. Preserved homepage navigation, decorative image semantics and a static reduced-motion pose. Compact layout handles 320px screens.

Evidence: 98 frontend tests, TypeScript and final production build pass on local Node 25 (CI Node 22 remains authoritative). Browser checks at 320/390/768/1440px: no horizontal overflow or page errors, image decode, animation, reduced-motion static pose and Browse-to-home link pass. Desktop/mobile screenshots inspected. SVG is 39.29kB / 2.58kB gzip; existing ~719kB JS bundle warning persists. No database changes or synthetic writes.

Fresh GitHub read supersedes the old deployment-blocked note: main b79edd5 successfully deployed in run 37059064548. This logo change is prepared for main publication; next verify its own CI/deployment and the live header. No support configuration or migration was modified in this logo task.

## Main pushed; deployment blocked by contact configuration — 2026-10-02

User explicitly authorized main publication. Committed all completed work, merged into current main with its CSS correction preserved, and pushed `907c462540b390c9cc9995231726afa65db149df`. GitHub run https://github.com/hatimabu/ProblemHunt/actions/runs/37040380754 passed all frontend/database and real integration jobs. Azure authentication succeeded; Build frontend failed because SUPPORT_CONTACT is empty. No upload occurred, so this is NOT a successful live release. Required hosted privacy SQL remains pending. Release guard now also probes the anonymous export RPC to block a missing schema; mocked present/missing checks pass. No synthetic production writes, hosted migration, new resource or cost introduced. Next: contact configuration and scoped privacy migration approval/application, then retry deployment under existing user authorization. Dependency install reported 7 moderate/3 high advisories, untriaged; previous worker image scan remains a separate learning-service issue.

## Core implementation complete locally — 2026-10-02

Added private account JSON downloads, deletion request/cancel controls and a trusted moderator review queue. Requests do not erase accounts or other authors' replies. Additive `20261002000100_community_account_privacy.sql` is local-only; caller-bound export excludes credentials, private moderation notes, other authors' solution snapshots and reputation event keys. Operator export updated consistently. Public privacy copy describes the actual scope.

Evidence on Node 22.23.3: TypeScript, 98 frontend tests, 62 SQL scenarios across 36 migrations, five worker tests pass. Baseline was interrupted during its final build; a separate build on the same Node version passed (718.78 kB size warning). Real isolated browser privacy journeys passed for two-account download isolation, request persistence, moderator review, cancellation and mobile accessibility. Real signup confirmation and password recovery passed using local Mailpit, including old-password rejection and expired-link handling. Neither external email delivery nor production Auth settings are established by these checks. Integration CI now includes both journeys; not yet executed remotely.

October 2 read-only hosted inventory: 34 applied, no remote-only versions; optional worker observability and required account-privacy SQL are pending. No hosted mutations. Core scope is implemented locally with reply notifications off; learning sessions remain separate. Remaining release gates: owner-provided support contact/operator decisions, exact SQL review and scoped migration approval, authorized commit/push and remote CI, production Auth/rollback review, explicit deployment approval and live verification. No commit/push/deployment performed. See CORE_RELEASE.md and AGENT_MEMORY.md for the resumable handoff. Prior entries below are historical.

End-of-turn cleanup: dedicated core Supabase stack stopped successfully with its Docker volume retained; the local preview process was stopped. Ignored account/status/export files remain private and untracked. Final dist uses placeholder test configuration and must not be deployed; the release workflow must rebuild with reviewed production variables. Git whitespace check passes (line-ending normalization warnings only). All work remains uncommitted on the community branch.

## Core release preparation — 2026-10-01

User authorized finishing the functional core before personal learning. Added a dedicated real local Supabase integration configuration, preparation/replay/account scripts, API/browser/Storage/moderation coverage, read-only account export SQL/check, and a Node 22 GitHub integration workflow (prepared, not run remotely). Updated stale unresolved-close/dashboard test expectations. Fresh replay of all 35 unchanged migrations required local `supabase_admin` for historical Storage ownership; do not infer hosted-role equivalence. Replay tool refuses an occupied database. Repeated fixtures hit the real posting limit; fresh synthetic accounts were created with prior credentials preserved, without changing rate limits.

Core notifications now default off, with hidden follow/navigation controls and an honest direct-route message. Existing backend follows/events remain intact; no worker deployed. Added safe public support contact configuration and a deployment-build guard requiring `SUPPORT_CONTACT` plus notifications explicitly off. Contact is not yet supplied; no public copy claims a monitored mailbox. Account export excludes credentials, other users' authored content and private moderator notes; deletion remains an individually reviewed operator procedure, not an untested cascade.

Evidence: 94 frontend tests in 20 files, TypeScript and final build; 60 SQL scenarios/five worker tests earlier in this same turn. Real local Auth/PostgREST post-to-solved, preference privacy/upserts, anti-join, vote/state/write-up/visibility checks and moderation hide/restore pass. Real two-user profile/avatar Storage/browser checks pass. Final core desktop/mobile accessibility/header/no-overflow/page-error checks pass and screenshots inspected; support-contact helper/guard positive and missing-config cases checked. Both local account exports pass ownership/credential checks. Workflow YAML and script syntax checked; ignored credential/export paths verified. Local Node 25 remains a CI Node 22 parity limitation; final browser bundle ~713.5 kB emits a size warning.

Fresh read-only hosted history: 34 applied, only notification observability `20260929000100` pending (not needed for notifications-off core); no missing local versions. No hosted SQL applied. Read-only Azure confirms existing `problemhunt-web-sdm7w4743u274`, resource group `problemhunt`, Free SKU, main branch, hostname `thankful-hill-0ae5de10f.7.azurestaticapps.net`. A direct inventory attempt rejected certificate validation; verification was not disabled, CLI listing succeeded instead.

See CORE_RELEASE.md for exact scope, test reproduction and operational/deployment packet. Remaining: owner support contact and report/privacy operator/retention decisions; authorized commit/push and remote CI of exact candidate; production Auth/email/rollback review; explicit deployment approval and post-release verification. No commit, push, merge, cloud provisioning, production write or deployment performed. Existing learning-guide edits preserved; sessions 07–10 stay separate. Dedicated core integration services and preview were stopped after verification; local data and ignored credentials retained.

## Two learning guides delivered — 2026-09-30

At the user's request, created exactly two new guides: `LOCAL_LEARNING_GUIDE.md` and `AZURE_SHORT_EXERCISE_GUIDE.md`. Local guide uses the existing Docker/WSL lab, observed command paths, recovery scripts and safe retained-volume shutdown; it requires rebuilding after the cancelled candidate experiment. Azure guide explains architecture, cost assumptions, explicit image/bootstrap gates, staged commands, approval scope, monitoring, rollback and teardown. It does not pretend missing Azure operator tooling is implemented.

Documentation-only work: checked local links, PowerShell code-block syntax and whitespace; no application tests, containers, cloud operations, migration, commit or push performed for this request. Prior test evidence remains historical. Existing edits preserved. Website implementation is not fully release-ready: isolated backend integration, reviewed/authorized hosted migrations, image/runtime delivery readiness, operational data handling and final approved release/live checks remain. User asked for guides and status, then stop; do not continue implementation or advance sessions.


## Superseding cost clarification — 2026-09-30

The user clarified after the cancellation: paid services may be approved once the infrastructure and costs are understood. Session 07 is now on hold for explanation and informed scope/budget approval, not permanently rejected and not completed. No cloud resources, hosted SQL, registry publication or deployment occurred. Preserve the prior work; explain the optional learning lab versus the existing website and obtain informed approval before further implementation. The earlier cancellation record below describes the preceding instruction.


## Session 07 aborted on cost grounds — 2026-09-30

User initially approved Session 07, then clarified: “if there is no free plan abort” and required cost explanations because the project must remain free. The proposed Azure lab is not an assured free plan, so cloud exercise is aborted, not completed. No resource provisioning, registry push, hosted SQL, cloud deployment or production change occurred. Read-only Azure subscription enumeration was performed; no target was selected.

Session 06 is now committed at `b375957` (observed clean tree at this turn's start), superseding the previous uncommitted handoff; remote state was not checked. Before the cost clarification, a pinned Alpine candidate image built locally. It was not scanned or runtime-verified; Dockerfile/validator changes were reverted and ignored build context regenerated from the original source. Local Compose image tags may still reference the unverified candidate: run `npm run lab:prepare --prefix services/notifications` and `docker compose -f services/notifications/compose.yml build` before any later approved lab run. No containers were started this session; the retained volume is unchanged. The original vulnerability gate remains unresolved.

Saved the free-plan policy in AGENTS, memory, roadmap and Azure proposal. Documentation diff/whitespace checks only after cancellation; no further implementation tests necessary. Next: discuss a free-only roadmap, with local Docker/Kubernetes learning as an optional separately approved session. Do not resume paid Azure work or infer deployment approval from the earlier Session 07 approval.

## Session 06 operations and cloud preparation — 2026-09-29

Explicitly approved Session 06, implemented locally on `feature/community-knowledge-platform`. Added sanitized JSON/correlation/duration logs, bounded outcome counters and duration histogram, worker-only durable queue aggregates, stale-snapshot signal, independent liveness/readiness, and accurate exhausted-retry/lease-loss reporting. Additive `20260929000100_notification_observability.sql` is pending hosted; local count is 35. Runtime excludes lab/migrations and unused package managers, with digest-pinned base/scanner. New read-only-permission CI workflow prepares focused tests, Docker recovery drills, image archive/checksum, offline scan and SBOM without registry publishing or deployment.

Prepared separate ARM foundation/worker templates, private isolated PostgreSQL queue, identity/Vault/ACR, monitoring queries and alerts, cost inputs/calculator, permissions, rollback and teardown proposal under `infra/notifications/`. Azure lab config verifies TLS and restricts host/database/login; it does not authorize cloud connections. Managed-PostgreSQL bootstrap compatibility and a separately reviewed temporary operator path remain prerequisites; never upload the local Supabase bootstrap to hosted services. See `community-session-06-operations.md` and `infra/notifications/README.md`.

Evidence: 60 SQL scenarios across 35 migrations and five worker tests pass; worker tests also pass in final Node 22 Docker image. Real process-crash/concurrent-claim regressions, correlated failed-message repair and exactly one effect pass. Database outage preserves live=200 while health=503/error counters increase; restoring only DB recovers health=200/fresh metrics. Local ARM structural checks and Bicep 0.47.16 decompile/build pass; workflow YAML parses. Frontend unchanged, previous 91-test/build result not rerun. GitHub workflow/cloud provider tests have not run.

Release blocker: final offline Trivy scan reports 52 HIGH + 4 CRITICAL OS-package findings, no listed fixed versions, zero Node-package findings after removing package managers. Gate intentionally fails; no suppression/exception. Summary in `infra/notifications/scan-summary.json`; raw image/report/SBOM ignored. Cost proposal: Canada Central, USD 68.76–76.32/month including conditional networking, roughly USD 2.51/24h under recorded assumptions, not a cap; no budget approved.

No Session 06 commit/push, registry push, cloud resource/deployment, hosted SQL, production data changes or external messages. Local lab stopped with its volume retained. Prior Sessions 01–05 are pushed at `657becb`; Session 06 edits remain for review. Next: fresh Session 07 approval, then resolve image scan gate and exact subscription/group/budget/duration/bootstrap/image/teardown scope before cloud mutations. Do not advance automatically.

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
