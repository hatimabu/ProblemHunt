# Session 02: activity-first community layout

2026-09-27. User approved Session 02. Work remains local on `feature/community-knowledge-platform`, preserving the planning and Session 01 edits. No migration, production fixture, hosted query, deployment, push or cloud change.

## Delivered

- Home now opens with a compact welcome, search and Latest / Unanswered / Tested fixes feed instead of the large branding hero.
- Home, Browse and domain pages use a wider three-column shell. Left navigation links existing community routes; right context explains author acceptance, shows recent tested fixes from an independent read and offers posting guidance. No fake activity, contributor counts, following or saved-content controls.
- Below 900px the left menu starts collapsed. Supporting content follows the feed; intermediate widths use two columns. The shell preserves existing domain tabs, query/category/tag/state/page URLs and discussion routes.
- Feed tabs and pagination are URL-driven, so direct reload/back navigation works. Loading, empty, service error/retry and stale-response handling are explicit. The sidebar has independent failure/retry behavior. Synthetic examples retain simulated-outcome labels.
- Keyboard feed/domain navigation reuses RouteTabs; main content can receive skip-link focus. Reduced-motion styles remain supported. Existing author acceptance, votes and write APIs are unchanged.

## Read API and limits

Added `communityApi.feed` against existing public tables. Latest orders by creation time then ID; Tested fixes requires Solved plus an accepted solution and orders by solved time then ID. Unanswered uses the existing solutions FK to select public, non-hidden Open/Testing problems with no solutions. All filtering happens before pagination, with 20 rows plus one lookahead row and the existing 501-page cap. The FK is explicitly named to disambiguate it from the accepted-solution relationship.

The query follows PostgREST's documented [empty-embedding anti-join](https://postgrest.org/en/v12/references/api/resource_embedding.html#null-filtering-on-embedded-resources). Client request tests inspect real Supabase-generated HTTP query parameters with a mocked transport; a disposable SQL test verifies the FK and equivalent no-solution predicate under anonymous, author and contributor roles. These do not prove the hosted PostgREST schema cache or version. Verify against isolated full Supabase before release. No hosted migration is needed for the implemented query.

The prior library search keeps its existing relevance/solved-priority ordering. It is not reused for Latest, which would otherwise misleadingly put solved cases first. Sidebar tested fixes fetch a bounded page and display three entries. Performance at production scale remains unmeasured.

## Verification

- 63 frontend tests in 14 files pass: filters, pagination, loading/error recovery, stale responses, example labels, existing navigation and request contracts.
- TypeScript and production build pass. Existing bundle warning remains (~701 kB JS before compression); local Node 25 warnings and Node 22 parity gap remain from Session 01.
- 37 disposable database scenarios pass across 31 migrations, including unanswered privacy/visibility behavior. No migration files changed.
- `scripts/community-feed-review.mjs` launches a compiled loopback preview and a headless browser. Every non-local request is intercepted; Supabase uses placeholder configuration and synthetic responses, other external requests are blocked. It reads no credentials and writes only ignored local evidence.
- Browser review at 1440, 390, 820 and 1024px checks populated/empty/error states, retry, no horizontal overflow, axe, view reload, keyboard tabs, search, domain and back navigation. This is mocked browser evidence, not production integration or screen-reader certification.
- Desktop/mobile screenshots visually inspected. Final screenshots and machine-readable checks are in ignored `supabase/.temp/session-02/`: `home-1440.png`, `home-390.png`, `home-820.png`, `home-1024.png`, `empty-1440.png`, `empty-390.png`, `evidence.json`.

Reproduce: `npm run verify`, then `node scripts/community-feed-review.mjs`. The review requires local Edge on Windows or Playwright Chromium elsewhere and an available port 4173. It starts and stops its own preview/browser. Never replace its placeholders with production fixtures.

## Learning and handoff

An unanswered list must filter in the database before selecting a page. Filtering only the first 20 latest rows in the browser could show an empty page even when unanswered problems exist later. The lookahead row tells the interface whether another page is available without claiming a global total.

The browser recovery exercise deliberately returns a local 500 error, verifies a visible error, restores the mocked service, and clicks Try again. Failed requests do not become empty-community claims.

Session 03 (private followed tags and saved cases) is next, after explicit approval. Do not implement it automatically. Isolated full Supabase readiness and release gates remain open; the site has not been deployed.
