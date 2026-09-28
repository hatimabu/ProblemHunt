# Local draft: deployment stopped during static app selection

Type: Incident review. Status: unpublished local draft. This file has not been inserted into the community database.

## Impact and symptoms

The historical “Deployment behavior” checkpoint in `docs/PROJECT_STATE.md` records a supplied failed workflow run: Azure authentication succeeded, but app selection stopped because the repository variable `AZURE_STATIC_WEB_APP_NAME` was empty. The deployment job did not complete in that reported run. The checkpoint does not establish a public-site outage, its duration or affected users.

## Environment

ProblemHunt's GitHub Actions deployment workflow, React/Vite frontend and existing Azure Static Web App. This review uses repository evidence; it does not include private logs, credentials or a new cloud inspection.

## Expected and actual result

Expected: select the intended existing app and retrieve its deployment token before uploading a tested build. Reported actual result: authentication completed, then the missing app-name setting prevented selection. The exact run URL and raw failure log are not attached to this draft, so the historical account is attributed rather than independently reproduced.

## Steps and observations

1. Review the recorded failure in PROJECT_STATE. Observation: the absent repository variable was identified as the selection failure; it was not described as an authentication failure.
2. Inspect local commit `1b99e85` (`azure static name fix`) and `.github/workflows/deploy-azure.yml`. Observation: the workflow now defines `STATIC_WEB_APP_NAME` directly and passes it to `az staticwebapp secrets list`, alongside the configured resource group.
3. Review the historical validation checkpoint. Observation: YAML parsing and a diff check were recorded as passing while triggers, release gates, token lookup and build/upload settings were preserved. These are configuration checks, not evidence of a successful cloud deployment.

## Verification evidence and limitations

Session 04 read the current workflow and local Git history to confirm the configuration and commit above. No GitHub run, token retrieval, Azure upload or public endpoint was exercised. The older checkpoint's statement that the fix was not yet pushed describes that checkpoint only; this draft makes no claim about later remote history. Deployment recovery remains unverified by this review.

## Lessons learned

Distinguish authentication, target selection, token retrieval, build and upload failures. A successful login alone does not validate the rest of the pipeline. Make required target configuration visible and reviewable, then verify the full deployment separately when authorized.

## Proposed follow-up exercise (not executed)

In an isolated local configuration test, omit a required target value and check that validation fails before invoking cloud commands. Restore the value and repeat the validation. A later approved deployment should attach its run and endpoint evidence before claiming recovery. This is a proposed exercise, not an observed incident outcome.

Before publication: the owner should verify the historical run, sanitize any additional evidence and decide whether recovery is now known. Do not label this review as a confirmed community fix.
