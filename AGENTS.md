# Working on ProblemHunt

Before substantial changes, read `docs/PROJECT_STATE.md`, `docs/RELEASE_CHECKLIST.md`, the product PDF and `docs/community-platform-audit.md`, then inspect Git status and the relevant stage runbook. Preserve existing work.

Update PROJECT_STATE and RELEASE_CHECKLIST after each milestone with actual test evidence and remaining gaps. Historical runbooks describe their commit, not necessarily current hosted state.

Keep community development on `feature/community-knowledge-platform`. Do not merge main, deploy, or change Azure/domain configuration without explicit authorization. Never reset the hosted Supabase project. Review hosted history and exact pending SQL before any authorized migration; require explicit approval for data removal.

Keep credentials and backups ignored. Synthetic write tests belong in a disposable database or isolated Supabase test project, never the public production library. Use the read-only navigation harness for the existing project. Do not reintroduce marketplace, wallet or payment behavior.
