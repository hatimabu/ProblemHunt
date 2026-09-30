# Session 05 — Durable private reply notifications

Approved 2026-09-28, including committing and pushing all completed work to `feature/community-knowledge-platform` on GitHub. This permission does not authorize main integration, hosted migrations, cloud deployment or Session 06.

## Delivered behavior

Public problem discussions have an explicit **Follow replies** control. New solutions and comments from other people generate private in-app notifications for current followers. Posting does not automatically subscribe anyone. Existing tag follows remain separate. Write-ups have no reply workflow and cannot be followed for replies.

`/notifications` shows paginated community notifications with read/unread controls and a paginated followed-discussion manager. It also allows removal of follows for unavailable content. No copied reply text or title enters a notification: messages are generic and links reference the problem/solution. Requests and database policies bind reads/writes to the signed-in account; account changes remount private UI state. Loading, failure/retry, empty and signed-out states are explicit. Refresh is manual; this milestone does not implement realtime delivery or email.

The existing `notifications` table is reused. Historical marketplace rows remain untouched and are excluded from the community inbox. The browser can update only `is_read`; message, recipient, link and delivery identity are protected. Existing marketplace behavior is not reactivated.

## Reliability model

```text
Solution/comment INSERT
  └─ same transaction: one outbox event per eligible follower
       └─ dispatcher: durable PostgreSQL queue row + dispatched timestamp
            └─ worker: claim with lease token → recheck access → inbox INSERT → acknowledge
```

The queue is a PostgreSQL table in the same local database, not an external broker. This is sufficient to learn durable asynchronous processing with one useful service. A future cloud queue adapter is a separately reviewed change; there is no claim that this design emulates Azure Service Bus or Storage Queues.

Event contract: UUID id, version `1`, kind `solution.created` or `comment.created`, problem/solution/comment references, actor/recipient ids and follow generation. No email, tokens, titles or message body is queued. Existing insertion policies and guards validate the original reply. Its outbox rows commit or roll back with it. Edits do not create new reply events, and actors do not receive their own replies.

Dispatch is transactional and idempotent. Claiming uses row locks with `SKIP LOCKED`, a unique lease token and a 30-second lease. Delivery and acknowledgement require the current unexpired lease. The inbox has a unique event key: a crash after insert but before acknowledgement can retry without duplicating the visible entry. This is **at-least-once processing with an idempotent effect**, not a promise that code executes exactly once.

Unfollowing removes the subscription; refollowing creates a new generation. Old queued work never revives. Delivery locks/rechecks the parent and subscription; read policies also exclude private/hidden content and old generations. Unfollowing therefore removes existing entries from the visible inbox as well as suppressing pending delivery. Hiding does not physically erase previously delivered rows; restoring a still-followed public case can make those generic entries visible again. Already viewed content cannot be recalled.

Recoverable failures retry with exponential delays (4, 8, 16, 32 seconds; maximum five claims). Expired fifth claims enter `failed`. Unsupported versions also fail through this bounded path. An operator can inspect the problem and invoke `community_requeue_notification(event_id)` after correction; workers/browser roles cannot invoke recovery. Error records/logs contain fixed codes, not raw exception text or credentials.

## Local Docker workflow

Requirements: Node/npm for preparation and an existing Docker Engine with Compose. This machine has Docker in **Ubuntu WSL**, despite no Windows `docker` executable. Docker 29.4.2, PostgreSQL 17.11 and Node 22.23.3 were observed during verification.

From the repository root:

```powershell
npm run install:all
npm run verify
npm run lab:prepare --prefix services/notifications
wsl -d Ubuntu --cd /mnt/a/REPO/ProblemHunt -- docker compose -f services/notifications/compose.yml up --build
```

On a native Docker shell, omit the WSL prefix and run the same Compose command from the repository root. Keep the foreground Compose terminal open while using this WSL lab. Initial detached execution lost the database when the WSL environment shut down; attached operation and database restart policy were exercised successfully.

Preparation creates ignored random local credentials and a 45-file allowlisted build context under `services/notifications/.local/`. It preserves existing passwords but regenerates only the dedicated context directory. Rerun preparation after changing worker/lab/migration sources. No credentials, node_modules or backups are sent in the context. Keep passwords with the existing database volume; replacing password files alone does not rotate PostgreSQL users.

Compose starts a private PostgreSQL database, a one-shot initializer, then the worker. No host ports are published. Initialization replays the repository migrations against a disposable approximation of Auth/Storage (`supabase/tests/bootstrap.sql`), never a hosted Supabase project. It refuses a partially initialized nonempty database. This lab is not a full Supabase/Auth/PostgREST installation and the normal browser cannot connect directly to it.

The worker runs as UID 1000, with a read-only filesystem, dropped capabilities and no-new-privileges. It receives only the worker password. The initializer alone receives the local admin password. The worker database login inherits only the five processing function permissions; it cannot read community content or notification tables directly. Runtime configuration rejects remote hosts, other database names and privileged logins.

Health: internal `/health` is 200 after successful processing/polling and 503 during startup, database failure or shutdown. It does not prove a queue is empty or that every event succeeds. SIGTERM stops new cycles, completes in-flight work, wakes idle delay, closes connections and has a 20-second exit bound (Compose allows 25 seconds). Leases recover work if a forced stop is necessary.

## Reproduce failure/recovery drills

Use another terminal while the lab runs; prepend the WSL prefix above on this machine:

```text
docker compose -f services/notifications/compose.yml stop worker
docker compose -f services/notifications/compose.yml run --rm init node lab/verify.mjs
docker compose -f services/notifications/compose.yml run --rm init node lab/verify.mjs prepare-restart
docker compose -f services/notifications/compose.yml restart db
docker compose -f services/notifications/compose.yml start worker
docker compose -f services/notifications/compose.yml run --rm init node lab/verify.mjs check-restart
```

The verifier inserts clearly fictional records only into `problemhunt_notification_lab`. It exits real child processes with code 23 before delivery and after the inbox insert. It advances those test leases explicitly to avoid waiting 30 seconds, then asserts one inbox entry. Two real connections exercise locked claims. The restart probe commits a queued event, then checks it after database/worker restart. These scripts accept only the dedicated local database configuration.

For a readiness drill, stop only `db`, observe worker `/health` become 503, start `db` and observe recovery to 200 without restarting the worker. Both transitions were verified. Finish with `docker compose -f services/notifications/compose.yml stop`; this retains the dedicated volume for inspection and restart. Do not use a hosted reset or casually delete the volume/password files.

Manual failed-message recovery, using only the local operator connection:

```sql
SELECT event_id, attempts, last_error FROM public.community_notification_queue WHERE status='failed';
-- After correcting the cause and reviewing this particular event:
SELECT public.community_requeue_notification('reviewed-event-uuid');
```

A replay still rechecks the current subscription and content visibility. Do not manually insert inbox rows or bypass the unique event key.

## Verification and limits

`npm run verify` includes TypeScript, frontend/API tests, existing SQL regressions, notification permission/recovery tests, worker config checks and the placeholder-configured build. `node scripts/community-notification-review.mjs` exercises the compiled UI with intercepted Auth/REST at 1440/390px; no hosted request is sent. Screenshots and browser evidence are ignored under `supabase/.temp/session-05/`. Final counts are in PROJECT_STATE.

Verified in real Docker/PostgreSQL: migration initialization, UID 1000/Node 22, healthy endpoint, SIGTERM exit 0, both crash boundaries, idempotence, fenced stale acknowledgement, two-connection locked claims, hidden-content suppression, restricted worker access, persistent restart delivery and outage health/recovery. Disposable tests additionally cover rollback, private follows, actor exclusion, opt-out/refollow generations, protected fields, bounded failure/requeue and closing/reopening the database runtime.

Remaining release gates: real isolated Supabase Auth/PostgREST/UI integration, wider concurrency/load testing, retention/export/deletion operations, cloud credentials/network/monitoring and exact hosted schema compatibility. Outbox/queue/inbox records currently retain identifiers without automatic expiry; account deletion must account for these references. No synthetic production writes, hosted migrations, cloud deployment, image-registry push or email occurred.

## Migration review and next boundary

Prepared `20260928000300_community_notifications.sql`; 34 local migrations in total. Before a separately authorized hosted application, inspect actual history and pending SQL, `notifications` grants/legacy consumers, role-name/permission compatibility and function dependencies. The migration narrows browser updates on the existing inbox to `is_read`; existing rows are not changed. Review backup/recovery and apply first to an isolated Supabase project. Worker login/password provisioning is intentionally separate from hosted SQL.

Session 06 requires fresh approval: observability, delivery automation and an isolated Azure plan. This session's Docker runtime and local verification do not authorize registry pushes, Azure resources, main integration or deployment.

References consulted: [PostgreSQL locking clauses](https://www.postgresql.org/docs/current/sql-select.html), [Compose startup dependencies](https://docs.docker.com/compose/how-tos/startup-order/), [node-postgres connections](https://node-postgres.com/features/connecting).
