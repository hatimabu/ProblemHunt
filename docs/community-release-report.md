# Community release review — Stages 5–8

Branch: `feature/community-knowledge-platform`. Review date: 2026-09-26. No merge, deployment, Azure resource change or domain change has been performed. Earlier foundation changes are preserved and included in the release slice.

## Delivered

The React app supports structured private drafts, publication, contributor solutions and clarifications, author test evidence, Testing, author-confirmed Solved outcomes, unresolved closure, and acceptance reversal with retained evidence. Public Cloud/DevOps and Professional AV pages provide category/tag navigation, full-text symptom/product/tag search and state filters. Fictional examples are explicitly labelled; simulated outcomes are not represented as real verified fixes.

Stage 5 (`5e0b5ff`) adds unique non-self solution votes and category reputation. Trusted transactional events award +2 per vote and +10 per acceptance; removal/reversal appends compensating events. Clients cannot edit scores. Examples earn no reputation, and hidden/private content is excluded from public totals.

Stage 6 (`3c12331`) adds private reporting, trusted moderator membership, private review notes, reversible hide/restore and immutable moderation events. Database hourly posting limits, safe text/link rendering and legacy avatar ownership/type restrictions establish basic pilot safety. Stage 7 (`70fa05c`) adds explicit fictional labels, login-race handling, a tester checklist, optional on-device pilot counts and sanitized error-monitoring payloads. Tips, payments, Docker and AI remain deferred.

Stage 8 adds production CSP/security headers, corrected SPA fallback configuration, metadata/robots/favicon, a manual deployment gate targeting a reviewed existing Azure resource, hosted schema auditing, production browser/accessibility harnesses and narrower legacy helper protection. Release testing found that `/moderation` was omitted from safe login return paths; this is fixed with a regression test.

## Test evidence

- Real existing Supabase project `ajvobbpwgopinxtbpcpu`: separate dedicated author/contributor sessions completed draft/edit/publish, clarification, solution, test evidence, Testing, acceptance, solved revisits and unresolved closure. Contributor draft reads and acceptance were denied. Production browser checks included direct URLs, refresh and 390px layout.
- Real Supabase discovery: visitors found fictional solved cases by symptom, product and tag; category/state filters, empty results, direct refresh and distinct acceptance/upvote labels passed.
- Real Supabase reputation API: self/duplicate votes rejected; vote +2/removal 0; acceptance +10/reversal 0; contributor/repeated reversal denied; ledger forgery denied and evidence history retained. The scoring fixture is clearly fictional and marked as an example after the test, including on failure.
- Real Supabase safety API (Stage 6): private reports/notes, nonmoderator denial, moderator hide/restore, moderator draft denial, anonymous/foreign-folder Storage rejection and own-folder PNG upload passed. Only the newly created test image was removed.
- Automated accessibility: seven production pages at mobile width (home, both domains, search, solved example, privacy, auth) produced zero WCAG A/AA axe violations and no uncaught page errors. This is automated coverage, not an assistive-technology certification.
- Disposable PGlite: 29 database scenarios replay 27 migration files, exercising grants, RLS, constraints, trusted scoring, reversal, moderation, limits, Storage policy and legacy helper boundaries. Legacy fixture rows remain unchanged. PGlite uses a test Auth/Storage bootstrap; it does not reproduce the entire hosted platform or multi-connection races.
- Final checks: 43 frontend tests in 10 files pass, TypeScript passes and the production build passes. Frontend tests use mocked APIs; browser/API checks above use the real service. The final four-role production browser run passed votes/removal, author-only reversal/reacceptance across refresh, private reporting, unauthorized moderator denial, hide/restore, fictional labels and local-only opt-in/deletion. Repeated moderation direct visits passed three times each for contributor and moderator after fixing the return path.

## Hosted migration impact

Read-only hosted history matches all 27 local versions through `20260926000500`; none are pending. Catalog inspection found 26 public tables, 13 community tables with RLS enabled, and 80 public/Storage policies. Credentials and catalog evidence remain ignored under `supabase/.temp/`.

Stage 5–8 SQL was inspected and dry-run before application. Changes add trusted event/history/limit/moderation structures, protect columns, replace community functions and mark labelled synthetic examples. Existing legacy records/tables remain; no reset or project deletion occurred. No legacy content was migrated into the new community tables. Existing avatar objects remain; new uploads have tighter rules. Old votes/acceptances receive no retrospective awards.

Automatic approval review rejected an initially broader legacy permission retirement because it could disrupt profile/auth dependencies. It was never applied. The replacement `20260926000500_harden_legacy_helpers.sql` only removes browser execution of three unchecked counter helpers and restricts `get_primary_wallet` to the requesting owner (or service role), with a fixed search path. Other legacy grants remain intact. The old frontend may be incompatible with the new restrictions, as accepted by the owner.

## Remaining limits and release gates

- Azure-hosted routing/headers, GitHub deployment variables/secrets, production Auth redirect allowlists, real signup/recovery email delivery and Sentry delivery are not verified. GitHub CLI is unavailable in this environment. Local production tests apply checked-in headers but are not an Azure emulator.
- No Safari/physical-device/screen-reader, load, multi-connection race or adversarial penetration certification. The ~664 kB JavaScript chunk still produces a build-size warning. SPA metadata is updated client-side; rich social previews/SSR/sitemap remain future work.
- Operational moderator staffing, a published support/privacy request channel, retention maintenance for rate counters and account export/deletion handling need an owner before an open public launch. The latest-100 moderation queue has no assignment or notifications. Basic account limits do not prevent Sybil/collusion attacks.
- Legacy APIs/tables still exist; the active community UI does not use marketplace acceptance/payments. Their complete retirement requires a separate compatibility review. No general uploads are enabled in the community journey.
- Synthetic test accounts and clearly labelled fixtures remain in the authorized project. They establish workflow evidence, not customer validation. Monitoring is optional; pilot counters are off by default, local-only and removable, not central user analytics.

## Prepared merge and Azure/domain sequence

1. Review this report and the feature diff against `main`; choose the pilot moderator and resolve the operational gates above. Approve merge/deployment separately. Keep the feature branch intact until reviewed.
2. Before release, recheck hosted migration history and run CI database/frontend checks on the exact proposed merge. No workflow applies migrations. Preserve the current deployed artifact for frontend rollback; do not roll back the database by reset or drop.
3. Configure `AZURE_STATIC_WEB_APP_NAME` to the reviewed **existing** resource in resource group `problemhunt`; verify `AZURE_CREDENTIALS`, public Supabase URL/key secrets and optional `VITE_SENTRY_DSN`. The workflow does not create Azure resources. Verify production Supabase Auth site/redirect URLs and real email delivery.
4. After explicit approval, merge the reviewed feature commit and manually run `deploy-azure.yml` from `main` with confirmation. Verify the Azure hostname first: direct discussion refresh, login/recovery, role boundaries, CSP/headers and sanitized monitoring delivery. Pause if these fail.
5. Only after that smoke test and explicit approval, update/verify `problemhunt.cc` routing, TLS and redirect URLs. No domain switch is included in this work. Frontend rollback must use a build compatible with the community schema; restoring the old marketplace is not assumed safe.

See `pilot-tester-checklist.md` and stage runbooks 2–7 for reproduction details. Azure routing configuration was checked against the [official Static Web Apps configuration reference](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration).
