# Guide 2 — A short Azure operations exercise

Do this **after** [the local Docker guide](LOCAL_LEARNING_GUIDE.md). The goal is to run the same notification workload briefly in managed infrastructure, observe it, recover it and remove the isolated lab. It is not a migration of the public website and not a permanent hosting recommendation.

Written 2026-09-30. This is a tutorial and approval plan, **not an instruction to deploy today**. The image scan and managed-database bootstrap prerequisites below are unresolved. Sections after those gates describe the future exercise; no cloud success is claimed.

## 1. Know what you are paying to learn

| Local concept | Azure equivalent in this proposal | What you learn |
| --- | --- | --- |
| Worker container | Container Apps, one 0.25-vCPU/0.5-GiB replica | Revisions, probes and restart behavior |
| Local image | Container Registry Basic | Image publication and deployment by immutable digest |
| Local PostgreSQL volume | Separate PostgreSQL Flexible Server, B1ms/32 GiB | Managed persistence and private connections |
| Compose network | Virtual network plus private database DNS | Network boundaries and name resolution |
| Local secret file | Key Vault plus managed identity | Secret retrieval without registry passwords in application code |
| Console logs | Log Analytics and two alerts | Cloud diagnosis and missing-heartbeat detection |

The queue remains a PostgreSQL table; there is no separate paid message broker. The worker has no public ingress. Registry/Vault endpoints use TLS and access controls; PostgreSQL is private. The isolated database contains synthetic lab records, not a copy of production data. It does not replace Supabase Auth/Storage/PostgREST.

Existing templates: [foundation.json](../infra/notifications/foundation.json) and [worker.json](../infra/notifications/worker.json). These are ARM infrastructure-as-code files: they describe desired resources so deployment is reviewable and repeatable.

## 2. Costs before commands

Saved Canada Central, USD pay-as-you-go planning inputs were retrieved on 2026-09-30 UTC. Recheck region, account offer, currency and rates before spending. These estimates assume an always-active worker; actual activity and billing can differ.

| Component | If retained for a 730-hour month |
| --- | ---: |
| Container Apps worker | $20.03–27.59, depending on remaining shared free allowance |
| PostgreSQL compute and 32 GiB storage | $17.55 |
| Registry Basic | $5.07 |
| Logs, alerts, DNS and secrets under stated light usage | About $4.20 |
| Conditional managed-network allowance | $21.90 |
| **Total including the networking allowance** | **$68.76–76.32** |

The saved arithmetic gives about **$2.51 for 24 hours** without a free allowance. This is not a maximum or a promise that every meter prorates identically. Taxes, currency conversion, egress, excess backups/IOPS and the still-unprepared temporary bootstrap path are excluded. Review actual managed-network charges before provisioning. Reproduce the calculation with `node infra/notifications/estimate.mjs`; assumptions are in [pricing-inputs.json](../infra/notifications/pricing-inputs.json).

Prefer one supervised afternoon and teardown before you finish. A **US$10 planning budget** is a proposal, not approved spending and not a hard cap. Budget alerts can lag; an expiry tag does not delete resources. Stopping only the worker does not stop database, storage, registry or all monitoring/network charges.

Official pricing: [Container Apps](https://azure.microsoft.com/en-us/pricing/details/container-apps/), [PostgreSQL](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/), [Registry](https://azure.microsoft.com/en-us/pricing/details/container-registry/), [Monitor](https://azure.microsoft.com/en-us/pricing/details/monitor/). The [detailed proposal](../infra/notifications/README.md) links remaining meters. Free usage allowances are not an assurance that this whole stack is free.

## 3. Complete prerequisites without starting the paid clock

Do not create resources until all four conditions are satisfied:

1. Complete the local recovery exercises and identify the exact source commit/image to deploy.
2. Resolve the saved **52 HIGH/four CRITICAL OS findings**, rebuild, rescan and retain the report/SBOM. There is no approved exception. The briefly built Alpine candidate was reverted and is not a verified replacement. Use only a reviewed image; do not weaken the CI gate to get a green result.
3. Prepare and locally rehearse an **Azure-compatible lab bootstrap**, restricted SQL worker login, deterministic synthetic fixture and recovery commands under a non-superuser administrator. This is missing implementation, not a command you can run from the current repo. The existing `supabase/tests/bootstrap.sql` explicitly forbids hosted use and assumes privileges Azure may not allow. Likewise, `lab/init.mjs`, `verify.mjs` and `observe.mjs` accept local targets only—do not bypass their guards for Azure. A reviewed temporary operator job or other private-VNet operator path is also needed; its image, credentials, cost and removal must be planned first.
4. Confirm the exact approval packet below, including cleanup. Ordinary website deployment permission is not lab-resource permission.

These gates make this guide usable as a staged tutorial without pretending the missing operator tooling already exists. Stop here if any condition is unresolved; finish preparation locally before paying for an idle foundation.

## 4. Choose the target and agree on the exercise

Read-only checks, using PowerShell with Azure CLI installed:

```powershell
az version
az account list --query "[].{name:name,id:id,state:state}" -o table
node infra/notifications/validate.mjs
node infra/notifications/estimate.mjs
```

If authentication is needed, use your own `az login` session; never paste tokens into chat. Choose a subscription explicitly rather than assuming the CLI default is correct.

Fill in this approval packet before billable actions:

| Decision | Proposed value / required selection |
| --- | --- |
| Subscription | Your explicitly selected subscription name and ID |
| Isolated resource group | `rg-problemhunt-notifications-lab`, confirmed unused |
| Region | `canadacentral`, subject to SKU/quota availability |
| Budget/currency | Your approved amount; proposal US$10 planning budget |
| Time | Specific start/end time and timezone; teardown in the same supervised exercise |
| Resources | Foundation template, worker, reviewed temporary operator path and narrow role grants |
| Image | Exact reviewed runtime artifact; permission to publish only it to the new registry |
| Data | Synthetic writes only in the new lab database |
| Cleanup | Delete the identified lab resources and disposable lab data after evidence capture; no production resources or wildcard deletion |

Provisioning needs create/update permissions and appropriate scoped role-assignment permission. Runtime identity needs only ACR pull and secret reads; SQL grants are separate. See the [permissions section](../infra/notifications/README.md#permissions). Do not request broad subscription Owner access merely to run the worker.

## 5. Review and deploy the foundation — only after the gates

**Billable stage begins when resources are created.** Commands here are examples for your future approved exercise, not commands executed while writing this guide.

Set non-secret variables, replacing the placeholder deliberately:

```powershell
$labSubscription = '<APPROVED-SUBSCRIPTION-ID>'
$labGroup = 'rg-problemhunt-notifications-lab'
$labRegion = 'canadacentral'
az group exists --subscription $labSubscription --name $labGroup
```

If the group already exists, inspect it and stop if it is not the approved empty/dedicated lab. Never deploy over an unknown group. Once approved:

```powershell
az group create --subscription $labSubscription --name $labGroup --location $labRegion --tags project=problemhunt-notification-lab environment=isolated-learning
```

Review the foundation template's parameters: `location`, `owner`, `expiresOn`, `databaseAdminPassword` and `workerPassword`. Generate new cloud passwords using a cryptographic generator: admin at least 24 characters; worker exactly 48 lowercase hexadecimal characters. Do not reuse local lab passwords or put secrets in Git, terminal history, screenshots or chat.

For CLI use, prepare a protected, ignored ARM parameter file at `services/notifications/.local/cloud.parameters.json` through the reviewed secret-handling setup. Each parameter uses ARM's `{ "value": ... }` structure under `parameters`; include the standard deploymentParameters schema. The file does **not** exist yet and is not supplied with real secrets by this guide. Verify it is ignored with `git check-ignore services/notifications/.local/cloud.parameters.json`.

```powershell
az deployment group validate --subscription $labSubscription --resource-group $labGroup --template-file infra/notifications/foundation.json --parameters '@services/notifications/.local/cloud.parameters.json'
az deployment group what-if --subscription $labSubscription --resource-group $labGroup --template-file infra/notifications/foundation.json --parameters '@services/notifications/.local/cloud.parameters.json'
```

Inspect the proposed resource list and costs. No deletes or unrelated website changes should appear. Confirm provider registration, permissions, regional PostgreSQL v17/B1ms availability and CIDR compatibility. If the reviewed plan differs, stop and revise it before creating anything further.

```powershell
az deployment group create --subscription $labSubscription --resource-group $labGroup --name notifications-foundation --template-file infra/notifications/foundation.json --parameters '@services/notifications/.local/cloud.parameters.json'
az deployment group show --subscription $labSubscription --resource-group $labGroup --name notifications-foundation --query properties.outputs -o json
```

Expected outputs include database hostname, registry hostname and secret URL—not secret values. Allow provisioning and role propagation to finish. Do not paste raw error dumps containing configuration into public issues.

## 6. Initialize the isolated database and publish the image

Use **only the approved operator path prepared in step 3** to connect inside the VNet, install the rehearsed lab schema and create `notification_worker_login` with narrow worker-role membership. Record the schema version and test that the login cannot read arbitrary application tables or invoke operator replay. Remove temporary admin access afterward. Do not open PostgreSQL publicly to work around private connectivity.

Publish the exact reviewed runtime artifact from a shell with Docker and Azure CLI connected to the intended engine/registry. A typical sequence is `az acr login`, `docker tag` and `docker push`, followed by `az acr repository show --query digest` to obtain the registry manifest digest. Use the actual registry output and reviewed image ID; do not publish the `lab` target or rebuild a different artifact without rescanning. Preserve the scan report, SBOM and image digest.

The template pulls through managed identity, not a registry administrator password. Verify ACR ARM-audience authentication and role assignment propagation. This guide does not grant publishing permission by itself.

## 7. Deploy and observe the worker

Set `$labImageDigest` to the reviewed registry digest (`sha256:` plus 64 lowercase hexadecimal characters). A local image config ID or archive checksum is not the registry manifest digest.

```powershell
az deployment group what-if --subscription $labSubscription --resource-group $labGroup --template-file infra/notifications/worker.json --parameters location=$labRegion imageDigest=$labImageDigest
az deployment group create --subscription $labSubscription --resource-group $labGroup --name notifications-worker --template-file infra/notifications/worker.json --parameters location=$labRegion imageDigest=$labImageDigest
az containerapp revision list --subscription $labSubscription --resource-group $labGroup --name phnotif-worker -o table
az containerapp logs show --subscription $labSubscription --resource-group $labGroup --name phnotif-worker --type console --follow
```

Expect one healthy revision and regular `queue_snapshot` records. There is no website URL to open: the worker has no ingress. Inspect probes in the Container App revision view or use approved container exec access. Confirm database TLS, secret resolution and restricted login; do not treat “deployment succeeded” alone as proof of delivery.

Run the prepared Azure fixture through the approved operator path: one follower, one reply, one notification. Use its event correlation ID with [operations.kql](../infra/notifications/operations.kql). That file contains separate investigation queries; run them separately in Log Analytics. Verify actual table/column names before relying on alerts.

## 8. Perform three short operations exercises

| Exercise | Action within the isolated lab | Evidence to capture |
| --- | --- | --- |
| Restart recovery | Queue a fixture event, restart the reviewed worker revision, then let processing resume | Same event recovered; one inbox row, healthy revision |
| Dependency failure | Under the approved scope, briefly stop only the lab PostgreSQL server; restore it promptly | Failure logs/readiness change, then recovery without rewriting the event |
| Failed job and operator repair | Use the prepared fixture tool to introduce an unsupported version, observe bounded attempts, correct/requeue through operator credentials | Failed gauge rises then clears; worker cannot perform operator replay |

Record the good revision/digest before any update. For a rollback exercise, deploy a separately reviewed compatible candidate, then restore the prior good digest using `worker.json`. Verify recovery and unique effects again. Do not roll back by dropping tables or replaying every failed event blindly.

Confirm the backlog/failure alert and missing-heartbeat alert in Azure. They evaluate over five-minute windows and can lag; no external email/action group is configured. Log ingestion caps can also interrupt telemetry. If operator tools or time are unavailable, record the exercise as unfinished and proceed to approved cleanup; do not invent successful results.

## 9. Clean up before ending the paid session

Capture sanitized observations, not secrets or database dumps. Inventory the exact resource group:

```powershell
az resource list --subscription $labSubscription --resource-group $labGroup --query "[].{name:name,type:type,id:id}" -o table
```

Inspect the Container Apps environment for its generated infrastructure resource group and confirm its ownership/IDs. Verify the lab group contains only the resources and disposable data covered by your deletion approval. Then, **only under that explicit deletion scope**, delete the isolated lab group through Azure Portal or `az group delete --subscription $labSubscription --name $labGroup` and wait for completion. Do not delete any group by wildcard or infer that a similarly named group is disposable.

```powershell
az group exists --subscription $labSubscription --name $labGroup
```

Expected result: `false`. Confirm generated networking has also been removed and inspect retained/soft-deleted resources. Vault purge and backup removal need their own explicit scope. Review Cost Analysis again after billing catches up. Merely stopping the worker or closing your terminal is not cleanup.

## 10. What success means

You can explain how the image reaches Container Apps, how identity retrieves the secret, why PostgreSQL is private, why retries do not duplicate inbox rows, and which resources keep charging when the worker stops. You have evidence of delivery/recovery, a recorded cost estimate versus observed charges, and verified cleanup. Cloud execution is still unperformed as of this guide's creation.

Resources: [Container Apps overview](https://learn.microsoft.com/en-us/azure/container-apps/overview), [ARM group deployment commands](https://learn.microsoft.com/en-us/cli/azure/deployment/group?view=azure-cli-latest), [managed-identity image pull](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull), [revision management](https://learn.microsoft.com/en-us/azure/container-apps/revisions-manage), [Log Analytics monitoring](https://learn.microsoft.com/en-us/azure/container-apps/log-monitoring). Read them in that order as you reach the corresponding steps.
