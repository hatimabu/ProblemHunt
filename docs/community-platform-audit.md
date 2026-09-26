# Community knowledge platform: audit and migration map

Date: 2026-09-25. Branch: `feature/community-knowledge-platform`.

## Scope and evidence

The starting working tree was clean on `main`; the feature branch was created before edits. All six pages of the supplied transformation PDF were read. The requested docs copy was absent; the attachment in Downloads is the source. No AGENTS.md was found in the repository or its checked ancestor directories. Contributor guidance in `.github/copilot-instructions.md` and the local memory index were inspected. The user's request takes precedence over the PDF's embedded audit-only prompt: begin reversible implementation, defer tips, payments, Docker and AI, and do not change hosted services.

This is a repository audit, not a certification of the hosted schema. No hosted queries, migration pushes, deployments or domain changes were performed. The migration history contains an explicitly unrecoverable SQL marker (`20260418125832`); an earlier baseline document records historical remote versions, not current production state. No local PostgreSQL executable or Supabase local configuration was found. Database permission tests and the new two-account journey have not run.

Baseline verification: TypeScript passes; 5 Vitest files / 17 tests pass. These tests mock Supabase and cannot prove RLS, concurrency or hosted compatibility.

## Reuse and change

| Area | Reuse | Required change |
| --- | --- | --- |
| React/Vite, routing, UI | Responsive board styling, components, form controls, SPA links | Keep the same application; replace marketplace language and workflows |
| Auth | Supabase client, PKCE sessions, auth context, protected routes, password recovery | Remove forced builder/client product roles; separate private account data from public contributor identity |
| Problems and proposals | Existing relationship and identifiers as migration source | Structured symptoms, environment, product/version, expected/actual behavior, attempts; diagnosis, steps, reasoning, verification and sources |
| Acceptance | Transactional RPC pattern and row locks | New author-only tested-fix acceptance; no wallet, funding or contract trigger |
| Browse | Board layout, category controls | Server pagination/full-text search, two-domain taxonomy, tags, solved filter; surface fetch failures and prevent stale results |
| Profile/dashboard | Authenticated account shell, avatar display, notifications | Contribution history and category reputation; remove wallet count and payout dependencies |
| Hosting | Azure Static Web Apps, ARM template, SPA fallback | Separate deliberate release authorization from checks; do not auto-apply unknown migration history |
| Tests | Vitest, Testing Library, auth/recovery tests | Real SQL/RLS tests plus anonymous/author/contributor/moderator journey |

The post form currently always creates a paid job with SOL budget, deadline and job type. `accept_proposal` only accepts jobs, requires a Solana wallet and changes state to `awaiting_funding`; a trigger creates `job_contracts`. This is not equivalent to a tested solution. Legacy `completed` or `paid` must never be automatically labelled Solved.

## Database and policies represented by local migrations

Policies below describe the cumulative checked-in definitions, subject to actual table grants and hosted drift.

| Table | Data / relationships | Read policy | Write policy |
| --- | --- | --- | --- |
| profiles | auth user id and unique user_id, username, full_name, user_type, bio, reputation_score, wallet_address, avatar_url | Own row | Own insert/update; column-wide policy does not protect reputation_score |
| wallets | auth user, chain/address, primary flag; unique chain/address and primary per user/chain | Own row | Own insert/update/delete; set_primary_wallet RPC |
| orders | User payment orders, amounts, addresses, transaction/verification metadata | Own row | Own insert/update; later policy no longer restricts updates to pending; mark_order_paid restricted |
| payments | Job id, payer/recipient auth users, amount, transaction receipt | Payer or recipient | Payer insert |
| notifications | User, message, link, is_read | Own row | Own update; workflow RPCs insert |
| tip_transactions | Proposal/problem, sender/recipient, currency, receipt | Tipper or builder | No client write policy defined |
| payment_intents | Payer/builder, payment state and provider metadata | Payer or builder | Payer insert/update |
| problems | Public listings, author, category, budget, job state, accepted proposal/wallet, payment fields | Everyone, without visibility filtering | Author insert/delete; direct update policy removed in September; update RPC remains |
| proposals | Problem FK with cascade delete; builder, explanation, cost, delivery, status | Everyone, without parent visibility filtering | Builder insert; direct update removed in September; create RPC |
| upvotes | Problem/user unique pair, composite text id | Own votes | Own insert/delete and toggle RPC; these are problem votes, not solution votes |
| tips | Proposal FK SET NULL, participants, amount, payment fields | Tipper or builder | Tipper insert and record_tip RPC |
| job_contracts | Unique job, selected proposal, participants, SOL amount, provider/delivery/dispute state | Contract participants only | Workflow RPCs; funding confirmation granted to service_role only |
| storage.objects (avatars) | Public avatar bucket | Public avatar reads | Avatar insert checks bucket only; delete checks user's folder |

No domains, normalized categories, solutions, comments, solution votes, immutable reputation events, content reports or revisions currently exist in tracked migrations. `get_leaderboard` is called by the frontend but has no checked-in SQL definition. Existing auth/users and Storage are Supabase-managed, not replacement application tables.

## Main risks, in priority order

1. **Unknown hosted baseline and automatic migrations.** Deployment currently runs db push on main pushes and manual runs. A frontend change could apply unrelated historical SQL; the marker cannot recreate lost SQL. Decouple migration application before adding schema changes.
2. **Privacy and direct-write bypasses.** Public problems/proposals have no drafts. Owners can insert status/counter fields directly. Profile updates allow modifying reputation_score; avatars allow inserts outside the user's folder. UI checks cannot fix these policies.
3. **Legacy privileged RPCs.** Counter increment/decrement functions have no explicit execute revocations in tracked SQL; authenticated get_primary_wallet accepts another user's id. Retire/restrict these in a versioned migration, verifying actual grants first. Review every SECURITY DEFINER entry point, not only new functions.
4. **Data meaning and deletion.** Paid contracts, rejected bids and receipts cannot become community outcomes mechanically. Deleting a problem cascades proposals, votes and contracts; tip proposal links may be nulled. No destructive cleanup is authorized without exact affected counts and backup/restore evidence.
5. **Auth/profile identity leakage.** Signup can default full_name to email and existing RPCs copy full_name into public author/builder fields. Public contributor identity must use an explicit display name; do not expose private profiles as a public view wholesale.
6. **Incomplete reproducibility.** Leaderboard SQL and auth-wallet Edge Function are absent; historical docs reference removed Python APIs. `server/db.ts` imports a missing shared schema and dependencies and is not part of the active Vite app. Root start/server scripts call absent frontend scripts.
7. **Misleading discovery.** Browse silently treats backend failure as an empty library and overlapping requests can overwrite newer filters. Search is client substring matching after fetching all matching rows; leaderboard weekly selection does not change its RPC arguments.
8. **Verification gap.** Existing tests exercise mocked auth/recovery, detail interactions and RPC arguments. No database RLS, migration replay, real two-user acceptance, race or search-index tests exist. CI uses Node 22 while deploy builds use Node 20.

## Proposed schema and migration strategy

Use additive `community_*` tables alongside the legacy tables during transition. Reuse Supabase Auth identities and the existing app, not legacy financial state machines. This avoids exposing private drafts through old public policies or firing contract triggers. No legacy rows are dropped or automatically copied into the public library.

| Proposed table | Contract |
| --- | --- |
| community_domains | Fixed Cloud Computing and DevOps / Professional AV and Audio slugs; public read, no client writes |
| community_categories | Domain FK, unique domain/slug; curated seeds |
| community_profiles | User PK, explicitly public display name, bio, expertise; owner may edit allowed columns only |
| community_problems | Author, category, title, symptom, environment, product/version, expected/actual, prior attempts, tags, draft/public visibility, Open/Testing/Solved/Closed state, accepted solution and confirmation evidence, timestamps |
| community_solutions | Problem FK, contributor, diagnosis, ordered steps, reasoning, verification, sources, timestamps; access follows parent visibility |
| community_comments | Solution FK, author, clarification text; same parent visibility |
| community_solution_votes | Unique solution/voter pair; no self-votes; visible-parent check; no client counter writes |
| community_reputation_events | Contributor/category, source solution/event, signed points, unique idempotency key; immutable client-side, trusted writes and compensating reversals |
| community_reports | Reporter, target problem/solution, reason, private details; reporter and trusted moderators only |
| community_moderators | Trusted role membership; no self-enrollment or auth metadata authority |
| community_revisions | Content changes and actor, respecting parent visibility and deletion; never expose private historical text |

Solve using one transactional RPC: authenticate author, lock problem, verify selected solution belongs to this problem, require recorded test result, set accepted id and Solved atomically. A composite FK must enforce the selected solution's parent. Reopening clears acceptance with an auditable event. Votes and acceptance remain distinct; reputation is derived by category from immutable events, never caller-supplied totals. Restrict direct mutations of protected columns and revoke PUBLIC execute on privileged functions.

Migration phases:

1. Keep historical migrations unchanged. Obtain an authorized read-only inventory of hosted migration versions, schema, policies, grants, functions, triggers and row counts before any hosted rollout. Do not interpret local filenames as applied migrations.
2. Add new versioned schema migrations with RLS enabled in the same transaction, explicit grants, fixed search_path RPCs and seeds for only the two domains. Add SQL tests using disposable synthetic users and rollback.
3. Verify replay on a disposable PostgreSQL/Supabase test database. Docker is deferred; a separately approved disposable test database or native PostgreSQL can provide this check. Never use the live project to run tests or reset commands.
4. Wire the new application to the new schema only after its test database has passed permission tests. Fail clearly if schema is unavailable; do not silently fall back to paid-job RPCs.
5. Backfill only reviewed, anonymized technical cases into private drafts, with unique legacy id mapping. Preserve original ids in mapping records and account for every source row. No blanket mapping of job status or old reputation totals.
6. Before retiring legacy data: capture exact rows/counts and FK cascade impact, take encrypted schema/data and Storage backups outside Git, prove restore on a disposable database, then request approval for the specific retirement. Until then keep legacy records intact. Roll back application routing independently; retain new data rather than dropping populated tables.

## File-by-file delivery order and exit tests

1. **Audit and safe foundation (this milestone):** this report; README local setup; `.github/workflows/deploy-azure.yml` migration/deploy separation; `.github/copilot-instructions.md`; browse error/retry/stale-response fix in `src/app/components/browse-problems.tsx` and component regression tests. No schema changes or hosted actions.
2. **Data model:** `supabase/migrations/<version>_community_knowledge.sql`, `supabase/tests/community_access.sql`, new `src/lib/community.ts` types and schema runbook. Exit: anonymous cannot read drafts/comments/revisions/reports; unrelated authenticated user cannot mutate them; public content is readable; self-vote, duplicates, forged reputation and foreign-problem acceptance rejected. Test direct table writes and RPCs.
3. **Core journey:** `src/lib/supabase-community.ts`; replace post/detail/dashboard components; adapt AuthContext, auth-page, navbar, landing-page and routes. Remove active imports/actions from payout-wallet-dialog, LinkWallet, SignInWithWallet, wallets/user-wallets-api/solana-payments; remove obsolete crypto packages only after import audit. Exit: author posts, second account proposes, author comments/tests/accepts, visitor reads solved evidence. No visible or active payments/tips remain. Preserve login/recovery tests.
4. **Discovery:** browse, category routes and public case pages; SQL text search/index and pagination. Exit: anonymous symptom/product/tag query finds seeded solved fixes and never finds drafts, including through snippets or counts.
5. **Reputation/moderation:** contributor profiles, leaderboard, trusted event RPCs, report UI and moderator access. Exit: concurrency and idempotency tests; points reproducible per category, independent of tips; reporter privacy and no self-promotion.
6. **Pilot readiness:** anonymized fixtures, revisions/privacy/export/deletion process, docs and tests. Prepare 20-30 real cases and tester invitation materials; publishing and sending invitations require separate authorization.
7. **Launch readiness only:** environment template, Azure headers, release runbook, monitoring/backups/restore and domain checklist. Do not deploy, merge, push migrations or switch the domain in this local transformation. Tips, Docker and AI remain future work.

The new post-to-solved journey and Stage 2 RLS exit tests are not claimed complete by this audit/foundation milestone.

## Foundation implementation and verification

- Added the supplied PDF at its requested `docs/` path; the original attachment is unchanged.
- Changed the local deployment workflow to manual confirmed releases from main, removed its database migration job, and aligned its Node version with CI. This file change has not been pushed or activated in GitHub.
- Corrected local setup instructions so starting the frontend does not instruct developers to mutate the hosted database. Documented current product status and the actual posting route.
- Extended environment-file ignores to cover variants such as `.env.development`, while retaining `.env.example`.
- Fixed browse failures being rendered as an empty library; added retry and guarded against out-of-order requests overwriting current filters or showing late failures.
- Verification: 6 Vitest files / 20 tests pass, including recovery after a failed browse request and both stale success and stale failure responses; the 3 new tests also passed after the final TypeScript correction. TypeScript and git diff whitespace checks pass. Deployment YAML was parsed and its manual trigger, default-false confirmation, main branch guard, test dependency and absence of migration execution checked. Environment-file ignore behavior was checked. Production Vite build passes with a large-chunk warning (roughly 1.07 MB JavaScript before compression). These are local checks, not hosted access-control tests.

No migrations were added or applied in this foundation slice. Legacy workflows remain until the new schema and core journey can replace them together. Next implementation stage is the additive data model and SQL permission suite described above.
