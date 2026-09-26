# ProblemHunt project state

Updated 2026-09-26. Branch: `feature/community-knowledge-platform`.

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

Latest visual/avatar follow-up: HUNT uses a brief gift-box-style shake to invite browsing; domain and workflow icons have distinct accents. The clickable identity card uses a blue treatment, clear display-name hierarchy and contained avatar status. Avatar signed URLs refresh every 45 seconds and on focus/tab return. Read-only Storage inspection found both referenced files present and downloadable; the exact screenshot failure was not reproduced in that user's session. Recovery is covered by a component regression test. No Storage policies or hosted data changed.

Dashboard follow-up: removed the redundant My profile workspace tab because the identity card already links to `/profile`; removed its lime hover treatment; moved the five remaining workspace links directly under the dashboard summary, above the identity/sidebar and content panels. HUNT now shakes like a clickable gift, and profile/dashboard identity uses only the editable display name; existing login identifiers remain stored and private. Frontend component tests, TypeScript and production build pass; no database or hosted changes.

Review the visual milestone, configure an isolated Supabase test project and rerun the complete write journey on the release candidate. Resolve operational release gates before requesting approval to merge and deploy to the existing Azure resource. Keep `problemhunt.cc` unchanged until explicitly approved.
