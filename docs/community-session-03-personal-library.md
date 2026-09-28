# Session 03: followed tags and saved cases

2026-09-27. Approved local implementation on `feature/community-knowledge-platform`. Prior planning and Sessions 01–02 work remains uncommitted and preserved. No hosted reads/writes, migrations, production fixtures, cloud changes, push or deployment.

## Delivered behavior

- Following and Saved cases are reachable from the community navigation. Anonymous visitors see a sign-in explanation; safe return links preserve the requested view or supported domain route.
- Follow a tag in the Following manager, on a tag-filtered Browse page, or alongside public discussion tags. Tags are trimmed/lowercased for preference storage. Following matches any selected tag case-insensitively, newest public case first, without duplicate cases when several tags match.
- Save/remove public cases from Home, Browse and discussions. Saved cases order by save time; removing then saving again moves a case to the newest position. Repeating a save/follow is idempotent and does not change its timestamp.
- Preferences are read from the service on page mount and again after writes. They are not simulated browser-only preferences. Writes are not optimistically confirmed; pending/error states and explicit retry prevent a failed write from appearing successful. A successful write followed by a failed refresh requires retry to confirm the resulting state.
- Account identity keys remount private state and discard previous-account responses. Request filters and mutation payloads explicitly include the expected user ID, and RLS independently enforces ownership.
- Personal feeds filter server-side before returning 20 cases plus a lookahead row. They retain their mode through pagination and return to page one when another view is chosen. Keyword search and domain/category/tag filters retain their existing behavior.
- The privacy page explains account-stored selections. No public follower/save counts, notifications, payments, reputation changes or acceptance changes were added.

## Exact local migration for separate review

`supabase/migrations/20260928000100_community_personal_library.sql` is prepared, not applied to hosted Supabase.

It creates:

1. `community_tag_follows`: `(user_id, tag)` primary key, server timestamp, canonical tag validation, owner-only SELECT/INSERT/DELETE. No client UPDATE, forged timestamp, anonymous reads or writes.
2. `community_saved_cases`: `(user_id, problem_id)` primary key, server timestamp, owner-only SELECT/DELETE and INSERT restricted to public, non-hidden problems. Narrow column insert grants, RLS, and lookup/order indexes.
3. `community_personal_feed(view, offset)`: authenticated-only, SECURITY INVOKER, fixed empty search path, current-user ownership, explicit public/non-hidden visibility, stable order and bounded offset. There is no caller-selected user argument and no elevated content access.

The migration is transactional and additive. It does not rewrite/delete existing content or change existing policies. New foreign keys use restrictive deletion, not cascading removal; a future account/content deletion workflow must account for these private references. Old clients can ignore the new tables. Prefer application rollback and retention of user selections rather than dropping populated tables.

Saving stores a private ID reference, not a copy of content. If a saved case becomes a draft or is moderator-hidden, it is excluded from the saved feed even for its author. The owner can still read/delete their own reference via the private table API; it may reappear if the case is made public again. The UI does not display inaccessible reference IDs or provide a bulk cleanup action. Account privacy/export/deletion handling remains an operational release gate.

Local history now contains 32 migrations. Previous reports described `20260927000400_community_author_states.sql` as pending remotely. Hosted history was not rechecked here: review exact current history and all pending SQL before obtaining migration approval. Do not infer that only the new migration is pending.

## Evidence

- 75 frontend tests in 16 files: existing regressions plus preference persistence/remount, follow/unfollow, save/remove, failed write/retry, account-switch stale responses, sign-in returns, private feed pagination, normalization, identity filters and batched preference reads.
- 43 disposable PGlite scenarios replay 32 migrations. New tests cover canonical/unique private follows; two-account and anonymous boundaries; forbidden ownership/timestamp updates; duplicate-safe saves; draft/hidden exclusion (including the author); later-private content; unfollow/remove; stable server-filtered pagination. Legacy records remain unchanged.
- TypeScript, production build and whitespace checks pass. Existing ~709 kB JavaScript chunk warning and local Node 25 warnings remain; Node 22 parity is not established by this machine.
- `scripts/community-library-review.mjs` tests the compiled UI at 1440px and 390px: follow/unfollow, save/remove, full-page reload persistence, hidden-content exclusion, failed removal/retry, a second account and sign-out. Axe and no-overflow checks pass for Following, Saved, error and signed-out states. Desktop/mobile screenshots visually inspected.
- That browser harness uses simulated Auth and an in-memory REST fixture, with every external request intercepted. No real credentials, production records, Auth users or service-role keys are used. Mocked browser checks do not prove hosted PostgREST grants/upsert behavior, real Auth integration or concurrency. PGlite independently proves SQL permissions but is single-connection.

Screenshots and machine evidence are ignored under `supabase/.temp/session-03/`: `following-1440.png`, `following-390.png`, `saved-1440.png`, `saved-390.png`, `evidence.json`.

Reproduce with `npm run verify`, followed by `node scripts/community-library-review.mjs`. The browser harness needs Edge on Windows (or Playwright Chromium elsewhere), a placeholder-configured build and a free local port 4173. It starts/stops its own preview. It is not a hosted migration runner.

## Learning point and remaining gaps

Hiding a Save button is not an ownership boundary. The database must reject another user's rows, and a saved-content query must recheck the content's current visibility. Keeping only a reference lets the feed respect later privacy changes instead of displaying stale copied content.

Before release: apply reviewed pending migrations only to an authorized isolated Supabase environment, run actual two-account Auth/PostgREST upsert/read/delete checks and multi-session races, then separately review production migration/deployment authorization. Large follow/save lists and following-query performance have not been load tested; preference metadata is fetched in ordered 500-row batches, and feed pagination is bounded. Existing full-platform, monitoring and support/privacy release gaps remain.

Session 04 (explicit lab write-ups and incident reviews) requires fresh user approval. It has not started.
