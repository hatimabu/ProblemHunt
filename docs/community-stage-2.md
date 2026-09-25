# Stage 2: community schema and database permissions

Implemented locally on `feature/community-knowledge-platform`, 2026-09-25.

## Delivered migrations

- `20260925180000_community_knowledge.sql`: ten new tables, two domains/six starter categories, RLS, explicit table/column privileges, validation and author workflow functions. No legacy content is copied or deleted.
- `20260925180100_protect_legacy_reputation.sql`: a new trigger rejects direct browser inserts of nonzero legacy profile reputation and direct changes to existing reputation. It changes no stored totals and leaves ordinary profile editing intact.

The historical twenty migrations are unchanged. New table creation is intentionally fail-fast rather than `IF NOT EXISTS`: a partially divergent preexisting community schema must be reconciled, not silently accepted.

## Tables and access

| Table | Browser access |
| --- | --- |
| `community_domains` | Anonymous/public read; only trusted server administration changes the two launch domains |
| `community_categories` | Public read; six seeded categories across the two domains; trusted writes |
| `community_problems` | Public rows readable anonymously; drafts readable only by their author, including against moderator accounts; authors insert/edit their own allowed content columns |
| `community_solutions` | Reads follow parent problem visibility; authenticated contributors can propose to another author's public Open/Testing problem and edit their own eligible solution |
| `community_comments` | Reads follow solution/parent visibility; signed-in users can clarify or record structured test results on public, non-Closed discussions; own-content editing only |
| `community_solution_votes` | One solution/voter pair; authenticated non-self voting on public, non-Closed discussions; owner reads/withdraws their own vote; no direct counter or voter changes |
| `community_reports` | Reporter and trusted moderators can read; reporter may create a report about exactly one visible public problem, solution or comment; reports cannot be rewritten by clients |
| `community_moderators` | A user may read their own membership; membership changes require the trusted server role, never user metadata |
| `community_report_reviews` | Moderator-only notes and status, separated from reporter-visible data; each reviewer edits their own review |
| `community_reputation_events` | Reserved Stage 5 append-only ledger; trusted server insert only; each user can read their own events; no browser scoring writes or awards |

Every new table enables RLS in the migration transaction. Supabase default grants are explicitly revoked and replaced with narrow grants. Browsers cannot delete community discussions or truncate tables. Foreign keys use restrictive deletion semantics; there are no new cascades that could remove legacy/user records. No new public profile table exposes private account data.

## Content contract

Problems retain title, symptom, environment JSON object, product/version, expected/actual behavior, ordered attempted tests, observations, verification method, tags, visibility and lifecycle state. Drafts may be incomplete; publishing requires a symptom, nonempty environment and expected/actual behavior. Attempted tests must contain nonempty string `test` and `observation` values, with optional `verification_method`.

Solutions contain diagnosis, nonempty ordered steps, reasoning, verification method, observations and source links. Clarification comments also support `kind = test_result` with required attempted test and observation. Text is stored as content, not trusted HTML. Stage 3 must validate URL protocols before rendering source links.

Frontend contracts are in `problem-hunt/src/lib/community.ts`; they distinguish client input from server-managed result fields. The existing marketplace UI has not been switched to these tables.

## State and acceptance API

Database values are lowercase (`open`, `testing`, `solved`, `closed`); UI labels should be Open, Testing, Solved and Closed.

```typescript
await supabase.rpc('community_set_problem_state', {
  p_problem_id: problemId,
  p_state: 'testing',
});
await supabase.rpc('community_accept_solution', {
  p_problem_id: problemId,
  p_solution_id: solutionId,
  p_observation: 'The health endpoint returned 200 after the fix.',
  p_verification: 'Repeated the previously failing request three times.',
});
```

Both functions require authentication and the problem author, use a fixed empty search path, and lock the parent row. Acceptance requires a public Testing problem, a solution belonging to that same problem, and nonempty test observation/verification. It atomically records Solved, the single accepted solution, evidence and timestamp. A composite foreign key independently prevents accepting another problem's solution. Direct inserts/updates cannot set acceptance, lifecycle state, identity or timestamps.

Solution writes lock the parent and recheck eligibility, serializing them with acceptance/state updates. Accepted solutions and Solved problem content cannot be edited through browser privileges. A second acceptance is rejected. Reopening a Solved case is deliberately unavailable until revision history and award reversals are implemented; do not present a working reopen action in Stage 3 yet. Open/Testing/Closed can be changed by the author; Testing requires public visibility. Draft visibility is independent of the lifecycle state.

An author may unpublish an unsolved problem; its solutions/comments then become inaccessible to everyone except that problem author. A report already submitted remains available to its reporter/moderators, but moderators gain no general draft access. Accepted evidence is separate from editable test-result comments.

## Reproducible database tests

Run from the repository root:

```powershell
npm ci --prefix supabase/tests
npm test --prefix supabase/tests
```

The separate locked test package uses [PGlite](https://pglite.dev/docs/), a local PostgreSQL runtime. It accepts no connection string, reads no environment credentials and creates a fresh in-memory database on every run. `supabase/tests/bootstrap.sql` supplies only the minimal Supabase-managed Auth/Storage surface and role/JWT claim plumbing needed by repository migrations. It deliberately supplies broad default grants so tests catch failure to revoke them. This bootstrap is test infrastructure, never a hosted migration.

`community.test.mjs` replays all 22 checked-in migrations, seeds synthetic legacy users/content before Stage 2, and compares all twelve legacy application tables before/after the new migrations. It then executes actual SQL under `anon`, `authenticated` and `service_role`, with per-scenario rollback and explicit SQLSTATE assertions for rejected operations. No application mocks replace RLS or SQL execution.

Results:

- **19 database scenarios passed:** migration replay/preservation; grants/RLS; public reads; author-only drafts; child-content privacy; own problem/solution/comment editing; eligible solution submission; unique votes/no self-votes; private/closed voting rejection; author-only transitions; Testing-to-Solved evidence; cross-parent FK protection; reporter/moderator privacy; visible report targets; reputation protection; anonymous RPC rejection; structured evidence validation.
- **20 frontend tests passed**, TypeScript passed, production build passed. The existing Vite large-chunk warning remains (approximately 1.07 MB JS before compression).
- CI now runs the isolated database suite alongside frontend checks, including pushes to this feature branch. This workflow has not been pushed or executed remotely.

Limits: PGlite is single-connection, so this suite does not prove multi-session lock races. The Supabase JWT/Storage bootstrap is intentionally minimal; it does not test GoTrue, PostgREST schema cache/grant behavior, Storage HTTP APIs or exact hosted configuration. Real two-browser authentication and the UI journey remain Stage 3 work. Before release, also run multi-connection acceptance/edit races and the permission suite in an isolated full Supabase environment. Native `psql`/`postgres` were unavailable here; Docker was not installed or used.

## Hosted status and migration risk

The authorized read-only `supabase migration list --linked` check succeeded before editing. All twenty existing local versions matched recorded remote versions through `20260915190000`. No new migration was pushed; no production application rows, domain settings or deployments were changed. Migration-history agreement does not prove exact hosted schema/grants or recover the historical `20260418125832` marker's missing SQL.

Risk is additive schema/privilege compatibility, not data conversion. The only behavior restriction on an existing table is blocking untrusted reputation writes. Supabase's `anon`, `authenticated`, `service_role`, `auth.users`, `auth.uid()` and the legacy `profiles` table must exist. Existing legacy policy/RPC risks outside reputation remain as identified in the audit; new tables do not call those workflows.

Before any separately authorized rollout: inspect actual hosted schema/grants, review a migration dry-run, take a recoverable backup, test on a disposable Supabase instance and approve the release explicitly. The local passing suite is not authorization to push. During rollback, keep populated community tables and revert the frontend independently; do not run table drops or rewrite history. Any future data retirement needs exact affected-row/cascade accounting and a tested restore path.

## Stage 3 integration requirements

1. Add a community data-access adapter using these table names and explicit columns; retain Supabase Auth. Use authenticated defaults for authorship. Report missing schema as a deployment/configuration error; never fall back to paid-job RPCs.
2. Replace paid-job posting with structured problem drafts/publishing and the two-domain taxonomy. Add solution submission, clarification/test results, Testing and evidence-based acceptance using the RPCs above.
3. Build public case pages and private draft views; respect RLS zero-row results and errors. Add safe public contributor display names without exposing legacy private profile fields/email defaults.
4. Expose vote totals through a privacy-preserving database aggregate that follows parent visibility; do not make voter identities public or add editable cached scores. Scoring/award events and their UI stay in Stage 5.
5. Add the reporting entry point and preserve private review data. Removal/moderation content actions, safe revisions, account export/deletion and solved-case reopening require separately tested workflows before enabling them.
6. Remove active wallet/payment/job-contract calls and visible marketplace language together with the new journey. Test author + contributor + anonymous visitor through the UI, and repeat auth/recovery regressions.

Tips, payment processing, Docker and AI are not implemented. No legacy records have been converted or deleted.
