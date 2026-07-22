# Batch 1 — Supabase schema baseline

## Purpose

Make the database the documented source of truth before replacing the Azure
Functions API. This batch deliberately makes no change to the hosted Supabase
project and deletes no Azure resources.

## Current repository facts

- The frontend already uses Supabase Auth through `problem-hunt/lib/supabaseClient.js`.
- The remaining `/api/*` endpoints are Python Azure Functions in
  `problem-hunt/python-function/`.
- `supabase/migrations/20260702120000_add_marketplace_tables_from_cosmos.sql`
  tracks `problems`, `proposals`, `upvotes`, and `tips`.
- The Python API also depends on `profiles`, `wallets`, `notifications`,
  `payments`, and `tip_transactions`; those schemas are not currently tracked
  in `supabase/migrations/`.
- Historical commits show earlier, unversioned `.temp` SQL for `profiles`,
  `wallets`, and `orders`. It must not be copied blindly because its `profiles`
  primary key is `id`, while current frontend and Python code query `user_id`.

## Current API contract to preserve

| Capability | Current endpoint | Target Supabase surface |
| --- | --- | --- |
| Browse/filter posts | `GET /api/problems` | RLS-protected view/query |
| Read a post and proposals | `GET /api/problems/{id}`, `GET .../proposals` | view/query |
| Create/edit/delete a post | `/api/problems` | table insert/update/delete plus RLS or RPC |
| Create proposal | `POST .../proposals` | `create_proposal` RPC |
| Toggle upvote | `POST/DELETE .../upvote` | `toggle_problem_upvote` RPC |
| Job lifecycle | accept, complete, payment routes | three transactional RPCs |
| Dashboard and leaderboard | user routes, leaderboard route | private/public views or RPCs |
| Wallets, tips, notifications | user/wallet and tip routes | RLS tables plus RPCs where needed |

## Required remote-schema check

The local Supabase CLI is not linked to a project, so the repository alone
cannot establish which migrations are already applied or what the hosted schema
contains. Before Batch 2 applies database work, run the following from the
repository with access to the intended Supabase project:

```powershell
supabase login
supabase link --project-ref ajvobbpwgopinxtbpcpu
supabase migration list
supabase db pull baseline_remote_schema
```

Do not run `supabase db push` at this stage. Review the newly pulled migration
before accepting it, and keep credentials out of the repository.

## Batch 1 exit criteria

1. The remote migration history is known.
2. Every table, function, trigger, index, and RLS policy used by the app is
   represented in a reviewed migration.
3. We know whether production data already exists and can establish baseline
   row counts for problems, proposals, upvotes, tips, profiles, and wallets.
4. The target profile contract is settled (`profiles.user_id` is the contract
   currently used by the application).

## Prompt 2 progress

The linked history reported these remote versions: `20260201`, `20260211`,
`20260220120000`, `20260324110000`, `20260324111000`, `20260324112000`,
`20260324113000`, `20260324114000`, `20260326`, `20260418125832`, and
`20260418133000`.

The recoverable migration SQL for the ten known versions has been restored to
`supabase/migrations/`. The repository did not contain the original SQL for
`20260418125832`; it is represented by an explicit no-op history marker and is
not treated as a source of inferred schema. The new
`20260722100000_supabase_only_workflows.sql` migration adds the first set of
transactional RPCs used by the future Supabase-only frontend.

The new migration is intentionally not pushed yet. The frontend still calls
Azure Functions, so deploying the new database-only workflow permissions before
the frontend cutover would create an avoidable compatibility window.
