# Isolated notification cloud exercise — proposal, not deployed

Session 06 prepares ARM JSON to stay consistent with the repository's existing `azureARM.json`. This directory is independent of the public Static Web App template and deployment workflow. Proposed region: Canada Central, subject to the user's selection and SKU availability. Proposed resource group: **rg-problemhunt-notifications-lab** in a subscription the user must identify. Do not reuse a production resource group.

## Resources and boundaries

| Resource | Proposed configuration/name | Purpose |
| --- | --- | --- |
| Container Apps environment | `phnotif-environment`, Consumption workload profile | VNet-integrated worker hosting |
| Worker | `phnotif-worker`, 0.25 vCPU / 0.5 GiB, min/max 1, no ingress | Poll existing PostgreSQL queue; no scale-to-zero claim |
| PostgreSQL Flexible Server | `phnotif-<13-char uniqueString(group id)>`, v17, B1ms, 32 GiB, no HA, seven-day local backup | Isolated durable queue and synthetic discussion/inbox state |
| Database | `problemhunt_notification_lab` | No connection to the public library |
| Registry | `phnotif<suffix>`, Basic, admin disabled | Reviewed runtime image by digest |
| Identity | `phnotif-worker` user-assigned | ACR pull and Key Vault secret reads only |
| Vault | `phnotif-<suffix>`, Standard RBAC, seven-day soft deletion | Restricted SQL worker password |
| VNet | `phnotif-vnet`, 10.84.0.0/16 | Delegated apps /23 and PostgreSQL /28; private database DNS |
| DNS | `phnotif.postgres.database.azure.com` linked to lab VNet | Private PostgreSQL resolution |
| Logs | `phnotif-logs`, 30-day retention, 0.1 GB/day ingestion cap | Sanitized stdout and operational queries |
| Alerts | two five-minute scheduled queries, severity 2 | Failed/delayed work and missing snapshot; visible in Azure, no external messages |

Keep the transactional PostgreSQL queue; adding Service Bus would require a second dispatch/acknowledgement boundary and new failure tests without advancing this operation exercise. The proposed PostgreSQL server is a **standalone lab approximation**, not a hosted Supabase replacement and not real Auth/PostgREST integration.

Database public networking is disabled. Registry and Vault use public TLS endpoints protected by Entra/RBAC, avoiding Premium/private-endpoint cost for this short lab. The worker itself has no public ingress. No NAT gateway, dedicated workload profile, AKS, public website, production DNS or mail service is configured. Validate CIDR conflicts and managed networking costs before provisioning. Managed identities do not automatically confer SQL permission: the runtime uses `notification_worker_login`, only a member of `community_notification_worker`, with a separate 48-lowercase-hex password referenced from Vault. Azure lab config requires its generated hostname, exact lab database/login, and verified TLS. Local/admin bootstrap remains prohibited from connecting to Azure.

## Two deployment stages and unsatisfied prerequisites

1. **Approval review first.** Choose subscription, isolated group, region, currency/budget and end time. Inspect what-if and grant scope. Resolve current HIGH/CRITICAL image findings before publishing an image. No cloud commands have run in Session 06.
2. **Foundation only after explicit resource approval.** `foundation.json` creates network, private PostgreSQL/database, registry, identity, Vault/secret, logs and environment. It accepts secure admin/worker passwords with no defaults or secret outputs. Use new cloud credentials from an approved secret source, never committed parameter files, command-line plaintext or the local lab passwords. No SQL migrations or worker are executed by this template.
3. **Schema/bootstrap gate before worker.** The current disposable `supabase/tests/bootstrap.sql` explicitly forbids hosted use and includes BYPASSRLS, which a managed PostgreSQL administrator cannot be assumed to grant. Do **not** upload/replay it blindly. Session 07 must prepare and rehearse an Azure-compatible minimal lab schema/fixture and restricted login, including extension/role dependencies, under approved isolated-write scope. It also needs an approved short-lived bootstrap job/operator path inside the VNet. The runtime image excludes migrations and admin tooling. No such job/resource is secretly created here; its exact image/commands, cost and cleanup must be reviewed before deployment. Public Supabase migrations require an entirely separate authorization.
4. **Reviewed image publication.** Push only the reviewed runtime artifact to the new ACR under explicit registry authorization. Verify ACR ARM-audience authentication is enabled for managed-identity pull; the template leaves its service default. Record registry manifest digest and scan evidence. Do not publish the `lab` target.
5. **Worker stage.** Validate the `sha256:<64 lowercase hex>` digest and deploy `worker.json` to the same isolated group after identity-role propagation and schema smoke tests. No mutable image tag is accepted in the planned operation. Foundation resource names derive from the same group ID. Verify private DNS, TLS, SQL grants and Key Vault reference resolution; then exercise the approved synthetic workflow.
6. **Monitoring acceptance.** Confirm `ContainerAppConsoleLogs_CL` fields, queue snapshots every 30 seconds, correlated durations and sanitized logs. `operations.kql` supplies investigation queries. Alert queries flag failed work or oldest pending age >120s and no heartbeat for five minutes. These are initial exercise thresholds, not measured production objectives. Test both alerts; no action group/email is configured. Logs can stop at the ingestion cap and alert evaluation can lag. Neither cap nor alerts guarantee a spending ceiling.

Local validation commands:

```text
node infra/notifications/validate.mjs
node infra/notifications/estimate.mjs
```

ARM templates also passed a local decompile/build round trip with Bicep 0.47.16. That is a compiler check, not a cloud validation. Before authorized provisioning, run `az deployment group validate` and `what-if` against the explicitly selected group using secure parameter handling. Review provider registration, B1ms/v17 availability, quota, tenant, resource policies, DNS and role propagation. Do not run `az deployment group create` from a generic session approval.

## Permissions

Provisioner needs resource create/update rights in the **lab group only** plus scoped role-assignment permission (for example Contributor plus Role Based Access Control Administrator with reviewed conditions). Subscription-level group creation/provider registration, if needed, requires separately appropriate rights. Do not request subscription Owner for routine operation.

The worker identity receives `AcrPull` on the lab registry and `Key Vault Secrets User` on the dedicated lab vault. It receives no Contributor, SQL administrator, role-assignment or public-Supabase key. The future publisher needs narrowly scoped ACR push permission; CI in this session has none. SQL initialization uses a separate temporary administrator path; remove that access after rehearsal. Operator recovery permission is separate from the worker. Log readers can see event correlation identifiers: restrict workspace access and retain only the planned 30 days.

## Current pricing inputs and proposal

Checked 2026-09-29 Toronto / 2026-09-30 UTC. `pricing-inputs.json` records USD pay-as-you-go base rates embedded in official Azure pricing pages for Canada Central. The Retail Prices API returned HTTP 429; the official HTML contains the regional amounts even when text extraction shows `$-`. Reconfirm the account's currency, offer and selected region before approval.

| Input | USD rate used |
| --- | ---: |
| Container Apps active vCPU-second | 0.000034 |
| Container Apps active GiB-second | 0.000004 |
| PostgreSQL B1ms hour | 0.0185 |
| PostgreSQL Premium SSD GiB-month | 0.1265 |
| Registry Basic day | 0.1666 |
| Log Analytics ingestion GB | 2.76 |
| Five-minute log alert per month | 1.50 each |
| Vault secret operations /10,000 | 0.03 |
| Private DNS zone /month; million queries | 0.50; 0.40 |
| Conditional managed-network allowance: standard load balancer + public IPv4 /hour | 0.025 + 0.005 |

`estimate.mjs` calculates one always-active worker and 730 hours, 32 GiB PostgreSQL, two alerts, 0.1 GB logs/month, one million DNS queries and 10,000 secret operations. Result: **$68.76/month with all shared Container Apps free allowance remaining, or $76.32 without it**, including the $21.90 conditional networking allowance. Excluding that allowance: $46.86–54.42. Confirm actual managed-resource billing in the target subscription. Container Apps' subscription-wide allowance is 180,000 vCPU-seconds and 360,000 GiB-seconds; don't assume other apps haven't consumed it.

Rough 24-hour proration without free allowance: **$2.51**, excluding taxes, FX, egress, excess backup/IOPS and the temporary bootstrap path. This is planning arithmetic, not a quote, maximum, or guarantee that each meter prorates identically. Suggested first exercise for approval: **24 hours, US$10 planning budget**, with cost review at start/end and deletion of the exact isolated resources afterward. Budget alerts are delayed notifications, not hard spending caps. The user has not approved this budget or any resources.

Rates: [Container Apps](https://azure.microsoft.com/en-us/pricing/details/container-apps/), [PostgreSQL](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/), [Registry](https://azure.microsoft.com/en-us/pricing/details/container-registry/), [Monitor](https://azure.microsoft.com/en-us/pricing/details/monitor/), [Vault](https://azure.microsoft.com/en-us/pricing/details/key-vault/), [DNS](https://azure.microsoft.com/en-us/pricing/details/dns/), [Load balancer](https://azure.microsoft.com/en-us/pricing/details/load-balancer/), [IP addresses](https://azure.microsoft.com/en-us/pricing/details/ip-addresses/).

## Rollback and teardown proposal

Record the last known-good **registry manifest digest**, revision and compatible schema before a rollout. Single-revision mode can overlap old/new processing during replacement; leases and idempotent inbox writes protect effects. Roll back the worker to the prior compatible digest without dropping database tables. After rollback, verify healthy cycles, lease recovery, failed/oldest gauges and one effect per test event. Never use an unreviewed database downgrade or bulk queue replay as rollback.

For an incident, deactivate the worker revision first to stop polling, retaining the queue/database for diagnosis. Deactivation alone leaves PostgreSQL, registry, logs and managed network resources billable. PostgreSQL stop is temporary and storage/backup charges continue; it is not teardown.

At the approved end time, first list **exact** resources in the approved group and any ACA-generated infrastructure group. Confirm tags/IDs, export only approved sanitized evidence, confirm all data is disposable and obtain/use the user's exact deletion authorization. Then remove only those resources/group and verify generated networking is gone. Check retained registry artifacts, Log Analytics soft deletion, PostgreSQL backup behavior and Vault soft-deleted state. Do not purge the vault or remove retained backups without explicit scope. Never delete by wildcard or touch the public website group. The expiresOn tag is only a reminder, not an automated deletion mechanism.

## Session 07 approval packet

Before cloud actions, approval must name: subscription/group/region; budget currency and amount; allowed duration; foundation resources and role grants; exact scanned runtime image publication/deployment; isolated schema/fixture writes and temporary bootstrap path; monitoring recipients if any; and exact teardown/data-removal scope. A Session 07 approval can start preparation, but missing deployment details must be resolved before cloud mutation.

Current blockers: unresolved image scan findings; no chosen subscription/budget; managed PostgreSQL bootstrap compatibility not proven; no provider what-if, cloud identity/network/monitoring tests, full Supabase integration or production migration approval.

References: [managed-identity image pull](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull), [Vault secret references](https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets), [private PostgreSQL networking](https://learn.microsoft.com/en-us/azure/postgresql/network/concepts-networking-private), [Container Apps ARM reference](https://learn.microsoft.com/en-us/azure/templates/microsoft.app/2025-01-01/containerapps), [PostgreSQL ARM reference](https://learn.microsoft.com/en-us/azure/templates/microsoft.dbforpostgresql/2024-08-01/flexibleservers).
