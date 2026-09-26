# Release checklist

Current checkpoint: 2026-09-26, `feature/community-knowledge-platform`. Read PROJECT_STATE first; earlier runbooks are historical evidence.

## Completed for this milestone

- [x] Compare dashboard layout with main and the supplied screenshots; retain compact cards, icon accents, identity/sidebar, lime states and bordered panels without marketplace behavior.
- [x] Landing page, persistent browse/workspace shells, keyboard focus and reduced motion.
- [x] Username validation/uniqueness, private account view; existing avatar ownership retained.
- [x] 53 frontend tests, TypeScript, production build; 35 disposable database scenarios.
- [x] Exact cleanup rehearsal; explicit approval for all 94 synthetic rows; hosted cleanup applied without touching accounts, profiles, uploads or legacy tables.
- [x] Hosted history matches all 30 versions; anonymous public library/search is empty.
- [x] Two-account read-only hosted/browser checks, mobile layout, direct refresh, back/forward and automated accessibility.
- [x] Production synthetic-write guard and ignored credentials/backup.

## Required before launch approval

- [ ] Configure isolated Supabase test credentials and replay migrations there. Match all admin and account configurations to that project.
- [ ] Repeat complete author/contributor write journey on the candidate: private draft denial, edit/publish, clarification/solution, test evidence, Testing/Solved, forbidden acceptance, acceptance reversal, votes/removal and unresolved closure.
- [ ] Repeat profile username/avatar upload/replace/remove and cross-account denial against that isolated hosted service. Earlier real-service evidence is in `community-profile-dashboard.md`; this milestone did not repeat hosted writes.
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
