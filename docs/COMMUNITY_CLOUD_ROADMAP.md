# Community and cloud learning roadmap

Status: proposal saved at the user's request on 2026-09-27. Implementation requires approval per session. Session prompts: COMMUNITY_CLOUD_SESSIONS.md. Persistent handoff: AGENT_MEMORY.md.

## Outcomes

1. Visitors see useful activity immediately and can find, follow and revisit relevant discussions.
2. Contributors build a library of author-tested fixes, lab write-ups and incident reviews.
3. The owner can explain, deploy, observe, break and recover a useful background service.
4. Kubernetes and AI learning build on measured needs and the same working system.

## Product direction

Desktop: left navigation for domains, followed tags and saved cases; central feed for Latest, Unanswered and Tested fixes; right panel for relevant problems, recent fixes and a weekly challenge when genuine content exists. Keep lime branding but shrink the hero. Collapse side navigation on mobile and place supplementary content after the feed. Do not fabricate contributors, counts, activity or solved cases. Use local fixtures only for visual development.

Start with curated tags within existing domains rather than many empty communities. Preserve the distinction between community votes and author-confirmed acceptance. Lab write-ups and incident reviews need explicit content types; they must not inherit confirmed-fix status automatically. Weekly challenges begin as curated content, not another service. Direct messages, unrestricted community creation, custom model training and payment behavior are outside this roadmap.

## Sequence and exit criteria

| Session | Milestone | Exit evidence |
| --- | --- | --- |
| 01 | Reproducible development/test baseline | Clean setup instructions; local/disposable permission and journey evidence; explicit hosted gaps |
| 02 | Activity-first responsive layout | Existing browsing works; desktop/mobile visual review; honest empty/error/loading states |
| 03 | Follow tags and save cases | Persistence, ownership and visibility tests; relevant feed and saved list |
| 04 | Lab write-ups and incident reviews | Distinct types, search/filter behavior, permissions; no false tested-fix labels |
| 05 | Reliable notification core in Docker | Transactional events, dispatcher/queue/worker, opt-in discussion following; crash/retry/deduplication evidence |
| 06 | Operability and delivery preparation | Observable failures, recovery drills, immutable image build, reviewed infrastructure plan and rollback |
| 07 | Isolated Azure service exercise | Explicitly approved resources only; deployment/recovery evidence and cost/teardown notes, or a clearly blocked handoff |
| 08 | Local Kubernetes exercise | Same image; probes/resources/RBAC, failure diagnosis and rollout/rollback evidence |
| 09 | Optional isolated AKS exercise | Cost and deployment approval first; compare managed cluster operations with Container Apps |
| 10 | Related-case retrieval experiment | Fixed reviewed query set, keyword baseline, retrieval evaluation, visibility/removal tests and recommendation |

Use roughly 12–16 weeks at 6–8 focused learning hours/week as an initial estimate, not a deadline. Sessions are bounded work packages and may take more than one usage window. If a session is too large, finish a coherent slice, document the remaining work and ask approval for continuation. Do not sacrifice verification to fit a reset window.

## Architecture progression

Keep React/Vite on Static Web Apps and Supabase Auth/Postgres/Storage as the community foundation. Avoid a wholesale rewrite.

Notification flow: reply transaction -> durable outbox event -> dispatcher -> queue -> Docker worker -> private in-app notification. Start with discussion followers. Define an event version, recipient authorization, deduplication key, retry limits and failed-message handling. Expect at-least-once delivery; make effects idempotent. Inspect and reuse compatible existing notification structures before adding parallel tables. Test with disposable data. Email/digests are later, separately scoped work.

Use one worker workload to learn Docker locally, then Azure Container Apps, then local Kubernetes. Choose a queue adapter that can be exercised locally and against the selected cloud queue. Do not promise a local emulator reproduces every cloud behavior. Privileged credentials stay server-side; minimize worker access and check visibility when processing delayed events.

Use one infrastructure-as-code tool, preferably consistent with the repository's existing Azure templates. Do not introduce both Terraform and Bicep just for breadth. Record the tradeoff if changing tools. Introduce logs, metrics and correlation IDs before adding a full tracing stack. Useful signals: oldest queued event, failures, retries, processing duration and notification completion. Define initial targets from measurements.

Kubernetes is an explicit learning exercise, not a claim that current traffic requires it. Begin with kind/minikube. Keep the database outside the learning cluster. AKS is optional and subject to budget approval. Budget alerts do not constitute hard spending caps; document deletion/teardown and retained billable resources.

AI begins with related-case retrieval and duplicate suggestions, not generated accepted answers. Build a reviewed set of about 30–50 queries when enough genuine content exists; compare keyword and embedding retrieval using useful-result recall in the first five hits, latency and cost. Exclude private/hidden/deleted content, propagate edits/removals, and apply access checks when returning results. Do not send community content to a model provider without reviewing data use and obtaining required authorization. Sparse content may justify postponing the experiment.

## Learning practice

Each technical milestone includes one short explanation by the owner, a failure/recovery exercise and a small runbook. Candidate authentic posts: duplicate notification diagnosis, failed readiness probe, queue backlog recovery, CI identity failure. Sanitize before publication; drafting does not authorize publishing.

Success measures: time to useful response, returning contributors, saved/followed content usage and confirmed-fix reuse. Do not add invasive analytics by default. For infrastructure: reproducibility, recovery evidence, controlled access, cost visibility and the owner's ability to explain the system.

## Reference documentation

- Azure event-driven jobs: https://learn.microsoft.com/en-us/azure/container-apps/tutorial-event-driven-jobs
- Kubernetes learning environments: https://kubernetes.io/docs/setup/learning-environment/
- OpenTelemetry primer: https://opentelemetry.io/docs/concepts/observability-primer/

Verify current tool/service documentation during implementation. These references guide learning; they do not authorize resource creation.
