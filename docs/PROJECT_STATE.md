# ProblemHunt project state

Updated 2026-09-26. Branch: `feature/community-knowledge-platform`.

ProblemHunt is a technical knowledge community: **Real problems. Tested solutions.** Cloud/DevOps and Professional AV authors publish structured problems, test contributions, and confirm the solution that worked.

## Milestones and architecture

Stages 2–8 are implemented; their runbooks and `community-release-report.md` retain historical evidence. Profile/dashboard milestone: `fa90ac4`. The current milestone restores the compact technical design from main and the supplied screenshots, with a landing page, persistent browse/dashboard shells, icon tabs, private account information, unique editable usernames and an empty public library. Its implementation commit is recorded below after verification.

React/Vite uses React Router and Supabase Auth, RLS/RPC, Postgres and Storage directly. The browser never receives a service-role key. Legacy tables remain; marketplace routes and wallet-dependent acceptance are outside the active journey. Only authors confirm acceptance; reputation is derived from trusted events. Reports and moderation notes are private. Profile ownership and avatar-folder policies protect edits; public profiles expose only selected identity/contribution fields, never sign-in email or private drafts.

## Current UI

- `/`: HUNT problems hero; only HUNT links to browse. Domain and workflow sections, no feed.
- `/browse` and `/domains/:domain`: persistent navigation/search shell, category/tag/state filters.
- `/dashboard`, `/my-problems`, `/my-solutions`, `/profile`, `/dashboard/reputation`: persistent workspace header, five summary cards, identity sidebar and six tabs. Accepted fixes use `/my-solutions?accepted=1`.
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

Review the visual milestone, configure an isolated Supabase test project and rerun the complete write journey on the release candidate. Resolve operational release gates before requesting approval to merge and deploy to the existing Azure resource. Keep `problemhunt.cc` unchanged until explicitly approved.
