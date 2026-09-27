# ProblemHunt project state

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
