# Stage 4: public discovery

Implemented on `feature/community-knowledge-platform`, 2026-09-25 (migration version dated 2026-09-26 UTC). Earlier foundation changes remain untouched and outside this stage.

## Delivered

- Public `/domains/cloud-devops` and `/domains/professional-av` pages and `/browse` search.
- Domain links, category selection, clickable tags, Open/Solved filters, and pagination. Query/filter/page state lives in URLs and survives direct navigation and refresh. Filter changes reset pagination; stale responses cannot replace current results.
- PostgreSQL English full-text search across title, symptom, product/version, tags and confirmed resolution observation. A partial GIN index covers published problems. Results prioritize Solved, then text relevance, recency and ID; pages contain 20 results and use one extra row to detect the next page.
- Readable solved summaries, preserved evidence and solution permalinks on discussion pages. Author acceptance and community upvotes are explicitly different labels; an upvote is not verification. Public vote counts expose no voter identities. This stage displays existing counts; voting controls and reputation awards remain future work.
- Loading, retryable error, unavailable-domain and actionable empty states. Mobile controls and navigation use touch-friendly sizing.

## Database and hosted changes

Inspected hosted history and the complete new SQL, then ran a dry run. Exactly `20260926000100_community_discovery.sql` was pending; it was applied successfully to the existing authorized project. It adds an immutable search-document function, partial GIN index, bounded search RPC and vote-count RPC. No tables or records are removed or converted. Legacy tables remain intact.

Search is SECURITY INVOKER with explicit public visibility in addition to RLS, so even an author's own drafts cannot enter public search. Vote aggregation is a narrow SECURITY DEFINER function with fixed empty search_path, explicit public-parent filtering and count-only output; PUBLIC execute is revoked, with named roles granted access. This is necessary because individual vote rows remain private under RLS. No client-editable reputation totals are introduced.

Risk: creating an index takes a database lock and search performance still needs testing at production scale. Existing rows are not rewritten. Frontend rollback can leave these additive functions/index in place; do not drop community data to roll back this stage. No deployment, Azure configuration, domain change, reset or project deletion occurred.

## Clearly fictional examples

`scripts/community-examples.json` contains three invented training examples, not customer cases or anonymized copies of proprietary records:

1. Solved NGINX 502 caused by a stale upstream port.
2. Solved generic digital mixer clicks/dropouts caused by incompatible clock configuration.
3. Open CI artifact-transfer problem with a proposed, untested answer.

Every title begins `[Example]`, carries the `example` tag, and explains the fictional environment/evidence. There are no customer names, credentials, internal addresses or proprietary work records. Simulated acceptance is explicitly illustrative, not a claim of physical equipment testing. Examples have no fabricated community votes.

`scripts/community-seed-examples.mjs` uses the existing two dedicated accounts and an explicit `--allow-project` gate. It reuses examples by author/title and resumes missing solution/acceptance steps. Credentials and result IDs remain in ignored `supabase/.temp/`. The three public cases are intentionally retained for discovery testing.

## Verification

- **Real hosted Supabase Auth/PostgREST:** seeded all three cases through ordinary authenticated inserts and state/acceptance RPCs; anonymous searches found products and tags for all three and solved cases by `502 Bad Gateway` and `audio dropouts`; nonexistent query returns empty.
- **Real anonymous Edge browser at 390x844:** domain navigation, symptom search, category and Solved filters, preserved filters on direct refresh, solved discussion navigation/refresh, solution permalink refresh, tag navigation/refresh, switching domains, Open filter, empty result, and distinct confirmation/upvote labels. No horizontal overflow; mobile screenshot visually reviewed. Harness: `scripts/community-discovery-smoke.mjs` against local frontend and real hosted API.
- **PGlite:** 22 database scenarios pass, replaying all 23 migrations and preserving seeded legacy data. New cases cover symptom/product/tag search, draft exclusion even for the author, domain/category/status filters, bounded stable pagination, and vote-count privacy after unpublishing. Real SQL/RLS runs locally; these checks are not mocked PostgREST or a hosted concurrency test.
- **Frontend:** 33 tests across eight files, including URL restoration, pagination retaining filters, loading/error/retry/empty states and stale-request suppression. These component tests mock the data adapter.
- TypeScript and production build pass. Vite retains the large-chunk warning (approximately 787 KB before gzip).

Reproduce from the repository root:

```powershell
npm test --prefix supabase/tests
npm test --prefix problem-hunt -- --maxWorkers=1
# In problem-hunt:
npx tsc --noEmit
npm run build
# With ignored account configuration and the local frontend running:
node scripts/community-seed-examples.mjs --allow-project <authorized-ref>
node scripts/community-discovery-smoke.mjs --allow-project <authorized-ref>
```

## Remaining gaps

Search uses English stemming, not typo tolerance, semantic retrieval or arbitrary substring matching. Proposed solution bodies and comments are not indexed. Offset pagination is capped at 10,000 and may shift when new content arrives; scale testing and cursor pagination remain future work. The home feed and private dashboard still show their previous recent-100 listing; public discovery has server pagination.

No vote-casting UI, reputation scoring, contributor profiles, moderation UI, SEO/prerendering, production Azure deep-link test or production deployment is included. Browser checks use one Chromium-based browser, not Safari or physical devices. There is no full hosted permission-matrix/concurrent-load test; SQL permission coverage uses PGlite, while hosted discovery and browsing use real APIs. Configuration is not currently blocking verification. Tips, AI and Docker remain deferred.
