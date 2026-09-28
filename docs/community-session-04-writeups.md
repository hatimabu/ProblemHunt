# Session 04 — Typed knowledge posts

Approved 2026-09-28 with a request to commit to `feature/community-knowledge-platform`. Scope includes the previously uncommitted planning and Sessions 01–03 work. No push, merge, deployment or hosted migration is authorized by that request. Session 05 remains gated.

## Model and behavior

One existing `community_problems` table continues to store community posts. `post_type` is `problem` (the default for all existing records and old inserts), `lab`, or `incident`. A separate bounded `lessons` field is added. Reuse environment, expected/actual results, product/version, tags, observations and ordered `attempted_tests` records. The editor labels those records as steps/observations for write-ups and labels symptom as lab objective or incident impact/symptoms. Verification must describe evidence and limitations, not promise an outcome.

Publication of a lab or incident review requires the existing common context plus at least one complete step/observation, verification and lessons. Incomplete private drafts remain possible; partial step records still require both fields. Content type is fixed at first save, including drafts. This avoids converting existing discussions or acceptance evidence. Authors can edit their write-ups under the existing ownership policies.

Write-ups are publications with no solution/acceptance workflow or separate comment system in this milestone. Database checks hold their internal state at `open`; presentation displays the content type instead of a problem state. The solution guard and restrictive insert policy reject proposals on write-ups. Existing acceptance and reputation rules are retained. Content typing also reaches workspace/public contribution cards; active problem filters exclude write-ups. Contribution totals under the historical `problems` API key count all authored posts.

Latest, followed tags and saved cases include visible write-ups. Unanswered and Tested fixes explicitly select only problems. Browse/domain routes filter `?type=problem|lab|incident` before pagination and retain query, category and tags. Selecting a write-up clears problem status and page. Problem-state filters apply only to problems. Existing full-text search fields remain unchanged; this milestone does not add full-body search of steps or lessons.

## Migration and compatibility review

Prepared `supabase/migrations/20260928000200_community_post_types.sql`; not applied to hosted Supabase. Local replay now includes 33 migrations. The preceding author-state and personal-library migrations require a fresh hosted-history check; no assumptions about remote application are made here.

- Additive fields/checks preserve existing records. Existing insert/update fields and ownership/visibility rules remain. Clients receive INSERT on type and lessons, UPDATE on lessons; no type UPDATE grant. An immutable-type trigger also protects privileged edits.
- Replace the search function's six-argument signature with one seven-argument function whose final `p_post_type` defaults to empty. Old six-argument SQL calls and named requests are compatible with default resolution; no ambiguous overload remains.
- Replace the contributions function with the same arguments and a return row extended by `post_type`. Reapply explicit grants. Old consumers may ignore the added field; the new UI uses it for accurate labels. External consumers relying on an exact positional return shape need review.
- New browser code selects the new columns and uses the extended RPC. Apply the reviewed schema to an isolated service before testing/deploying that browser build. A database that lacks it returns an explicit service-not-ready error. Refresh/check PostgREST schema cache as part of a separately authorized migration, then verify real RPC resolution.
- An older UI is not a complete rollback once write-ups exist: it would mislabel their internal `open` state and lacks their editor fields. Retain a compatible typed frontend artifact or disable new write-up entry during rollback preparation. Do not drop columns or recast types as a rollback; that would lose content and require explicit data-change review.

Before any hosted action: inspect current migration history and exact pending SQL, dependencies and grants; obtain scoped approval; rehearse in an isolated project with backup/recovery arrangements. No hosted resets or synthetic public-library writes.

## Evidence and reproducibility

Run `npm run verify` for TypeScript, component/API tests, disposable PGlite and a build configured with placeholder public credentials. Run `node scripts/community-post-review.mjs` after that build for intercepted Auth/REST browser journeys at 1440px and 390px. This harness never sends requests to hosted services and writes screenshots/evidence only to ignored `supabase/.temp/session-04/`.

Checks cover structured publish validation and recovery, draft/edit/publish/reload for both types, immutable type, cross-account denial, private/hidden exclusion, filtered pagination, personal-feed fields, workspace type propagation, prohibited solution/state/acceptance operations and existing problem acceptance regressions. Browser review includes axe, horizontal overflow and page errors. Final counts/results are recorded in PROJECT_STATE and RELEASE_CHECKLIST after execution.

Limitations: disposable SQL and mocked transport do not establish real Auth/PostgREST integration, concurrent behavior or cloud deployment. Node 25 locally differs from CI Node 22. Existing large-bundle warning remains. Manual assistive-technology/device testing is still a release gate.

## Learning and local example

Database constraints are invariants: rules that must hold even if someone bypasses your UI and calls the database API directly. Here, removing a Testing button improves the interface, while the database constraint actually prevents a write-up from becoming a tested fix.

Failure/recovery exercise: choose Lab write-up, fill basic context and attempt publication without steps/verification/lessons. Publication must fail while preserving input. Add complete evidence, save a private draft, reopen it and publish only in the mocked harness or a separately configured disposable service. SQL tests separately attempt a forbidden Testing transition and confirm rejection.

The unpublished [deployment incident draft](examples/incident-deployment-app-selection.md) attributes the historical report and cites local commit `1b99e85`. It distinguishes repository configuration evidence from unverified hosted recovery. Nothing was published or inserted into the community library.

## Next session

Stop here. Present Session 05 from COMMUNITY_CLOUD_SESSIONS.md for explicit approval: discussion following, durable reply events and a Docker notification worker with retry/idempotency/recovery checks. Docker was unavailable at the Session 01 checkpoint; recheck availability before promising container execution. No usage reset automatically authorizes this work.
