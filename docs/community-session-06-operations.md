# Session 06 — Notification operations and cloud preparation

Approved by “session 06 approved” on 2026-09-29 (Toronto). Scope: local implementation, failure drills, CI preparation and reviewable isolated Azure infrastructure. No commit/push, registry publication, cloud provisioning, hosted migration, production data access or Session 07 execution was authorized or performed.

## What changed

The worker emits JSON records with fixed event names, timestamps, outcome, bounded attempt number and per-job duration. The outbox event UUID is the correlation ID across retries. No recipient/actor IDs, reply content, credentials, raw errors or connection strings are logged. IDs are not metric labels. `claimed` and `completed` locate an interrupted attempt; `cycle_failed` captures connection-level failures without leaking exception details. Four retry outcomes followed by a fifth `failed` outcome distinguish scheduled retries from exhausted work; losing a failure-recording lease reports `lease_lost`.

`/metrics` exposes process-local counters by bounded outcome and a cycle-duration histogram, plus cached aggregate database gauges: undispatched events, ready/processing/failed work, expired leases and oldest pending age. Counters reset on process restart; queue gauges survive via PostgreSQL. Idle polls are included in the cycle histogram; use completed-job duration logs for processing latency. Neither duration includes queue waiting time; use oldest pending age for backlog. A delivered counter counts acknowledged processing attempts, not unique notifications; SQL uniqueness is the authoritative effect count.

`20260929000100_notification_observability.sql` adds a worker-only aggregate SECURITY DEFINER function with fixed search_path and no identifiers. Browser and service roles cannot execute it. It is migration 35 in local replay, not a hosted migration. Aggregation runs every 30 seconds, not on each HTTP scrape. Snapshot availability becomes zero after 90 seconds without success; cached values remain explicitly stale. Full aggregate queries are suitable for this small lab; measure their cost and plan retention/indexing before a larger deployment.

`/live` tests process responsiveness independently of PostgreSQL. `/health` tests a successful worker cycle within 30 seconds and shutdown state. Both return unavailable during shutdown. Database loss does not induce a liveness restart loop. Compose exposes no host ports; the Azure worker template has no ingress, so these endpoints are not public. Use local container exec or future approved operator access. Azure receives JSON stdout via Log Analytics; it does **not** automatically scrape `/metrics` in this plan.

Tracing is deferred: one process and one database are diagnosable with the durable correlation ID, timestamps and durations. No tracing collector or external telemetry account is needed.

## Verified evidence

- 60 disposable database scenarios replay 35 migrations; legacy rows unchanged. New coverage proves the aggregate's permissions and pending/failed/expired/age semantics.
- Five worker tests pass on Windows Node 25 and in the final Node 22 Docker runtime: sanitized logs, low-cardinality metrics, stale snapshots, lease-loss reporting, local/Azure lab config and TLS validation.
- Real PostgreSQL drill passes both child-process crash boundaries, lease fencing, duplicate suppression, independent concurrent connections, hidden-content suppression and restricted grants.
- Observability drill: unsupported event version produces four scheduled retries and one exhausted failure; twelve claim/completion records share one correlation ID across five failures and recovery. Failed gauge rises then returns to baseline. Worker replay is denied; operator repair/requeue yields exactly one inbox row. Six measured local cycles completed under 50 ms each (93 ms total on the final run); this small local exercise is not a throughput benchmark or cloud SLO.
- Actual database outage: `/live` 200, `/health` 503, healthy gauge 0 and error counter increase. Starting only the database restores `/health` 200, healthy gauge 1 and fresh snapshots, without restarting the worker.
- Runtime image is non-root and excludes lab/bootstrap/migrations. Base and scanner are digest-pinned. Unused npm/corepack/yarn runtime files are removed. Scanner runs with networking disabled after downloading only public vulnerability data into a separate cache.
- Offline Trivy 0.74.0 scan **fails the release gate**: 52 HIGH + 4 CRITICAL Debian package findings; zero Node-package vulnerability findings after package-manager removal. Database updated 2026-09-29T19:09Z. No fixed versions are listed for those OS findings; that does not establish exploitability or safety. No ignores, severity downgrades or exceptions were added. See `infra/notifications/scan-summary.json` for image/archive evidence; raw report/SBOM remain ignored locally.
- Both ARM templates decompile/build locally with official Bicep 0.47.16 after correcting a registry property/version mismatch and dependency expressions. No compiler errors/resource-type warnings remain; decompiler style/environment warnings remain. Offline structural/isolation checks pass. This is not Azure provider validation, what-if, SKU/quota/RBAC verification or deployment evidence.
- No frontend code changed. Previous 91 frontend tests/build evidence is historical Session 05 evidence; it was not rerun or represented as a new Session 06 result. New GitHub workflow is prepared but has not run remotely.

## Reproduce local checks

```powershell
npm test --prefix services/notifications
npm test --prefix supabase/tests
node infra/notifications/validate.mjs
node infra/notifications/estimate.mjs
npm run lab:prepare --prefix services/notifications
wsl -d Ubuntu --cd /mnt/a/REPO/ProblemHunt -- docker compose -f services/notifications/compose.yml up --build
```

Keep the attached Compose terminal open for WSL. In a second terminal, stop only the worker before deterministic fixtures:

```powershell
wsl -d Ubuntu --cd /mnt/a/REPO/ProblemHunt -- docker compose -f services/notifications/compose.yml stop worker
wsl -d Ubuntu --cd /mnt/a/REPO/ProblemHunt -- docker compose -f services/notifications/compose.yml run --rm --no-deps init node lab/verify.mjs
wsl -d Ubuntu --cd /mnt/a/REPO/ProblemHunt -- docker compose -f services/notifications/compose.yml run --rm --no-deps init node lab/observe.mjs
```

The retained Session 05 volume receives only the explicit additive local metrics migration and an atomic marker update. It is not reset. The initializer is still local-only; neither its bootstrap nor synthetic fixtures may target a hosted database. `observe.mjs` deliberately advances retry availability to avoid waiting during the exercise; production backoff remains unchanged. It leaves labelled synthetic records only in the isolated lab.

For the outage exercise, start the worker, stop only `db`, inspect all three HTTP endpoints using `docker compose exec -T worker node`, then start `db` and check recovery. Finish with `docker compose ... stop`; preserve the volume/password files. Do not use `down -v` for routine shutdown.

## CI and image identity

`.github/workflows/notification-checks.yml` uses Node 22, focused SQL/worker tests, infrastructure guardrails, local runtime/Compose builds and real crash/observability drills. It builds the `runtime` target with the Git commit label/tag, saves the image archive/config ID/checksum, scans HIGH/CRITICAL findings with exit 1, and exports a CycloneDX SBOM. Seven-day GitHub artifacts retain image/evidence even on scan failure. Artifacts contain only the scan directory; credentials and build context are excluded. No registry credentials, Azure login, push or deployment steps exist. Existing frontend checks remain separate.

The build is pinned by base digest and package-lock integrity, but a Git tag is not itself immutable. Preserve the artifact SHA-256 and image identity; after a separately authorized registry push, use the **registry manifest digest** in `worker.json`. A Docker config ID or archive checksum is not interchangeable with that digest. Do not claim byte-identical rebuilds from BuildKit provenance. Review base/scanner digest updates periodically and rerun scans. CI intentionally remains red while the documented findings exceed policy; cloud publication requires remediation or an explicit, time-bounded reviewed exception.

## Learn and explain

Logs answer “what happened to this event?” Metrics answer “is the service falling behind?” An empty failed queue alone cannot prove health: the worker or its monitoring might be offline. That is why the plan includes both queue thresholds and missing-heartbeat detection. Explain why a process can be alive while unable to deliver, and why retrying the same event must not create a second notification.

## Next boundary

Cloud architecture, costs, permissions, rollback/teardown and approval checklist are in `../infra/notifications/README.md`. Session 06 local preparation is complete with an explicit failing scan gate; no claim of deployment readiness. Next prompt is Session 07 from `COMMUNITY_CLOUD_SESSIONS.md`, only after fresh approval. Before cloud mutation: resolve the image findings, confirm exact subscription/group/region/budget/expiry, rehearse a managed-PostgreSQL-compatible schema fixture and narrow login, review infrastructure what-if, and obtain explicit resource/image/isolated-write/teardown authorization. Public Supabase remains untouched.
