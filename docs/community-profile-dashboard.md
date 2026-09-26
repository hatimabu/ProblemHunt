# Community profile and dashboard

Implemented on `feature/community-knowledge-platform` after Stage 8. Starting Git status was clean. No merge from `main`, deployment, Azure change or domain change was performed.

## Design comparison with main

Inspected `main`'s `builder-dashboard.tsx`, dashboard rules in `src/app/index.css`, profile data adapter and routes. Its `/profile` route was an alias to the dashboard, not an independent public profile. Reused the useful header/action arrangement, stat cards, identity sidebar, two-column activity layout, panel borders, avatar fallback pattern and mobile stacking. The existing shared dashboard CSS provides the visual foundation; community-specific styles improve count cards and picture controls.

The old dashboard's briefs, payouts, wallets, deadlines and proposal queries are not imported into the active community routes. Existing Supabase authentication and community problem/solution components remain in use. `/builder-dashboard` still redirects to the new dashboard.

## Delivered routes and behavior

- `/dashboard`: own problem/solution/accepted counts, recent problems and answers, identity card and category reputation, with links to all lists.
- `/my-problems`: paginated drafts, Open, Testing, Solved and Closed filters; resume/edit where permitted. Solved evidence has no edit link.
- `/my-solutions`, including `?accepted=1`: paginated submitted answers linking directly to solution anchors. Author acceptance is distinguished from proposed fixes and fictional examples.
- `/profile`: own editable display name, short bio, expertise, public consent and avatar controls. It also previews only public contribution history.
- `/people/:id`: public identity and contribution history only when the contributor opts in. Private or absent profiles show no editing controls. Author/solution links expose this route without disclosing legacy account fields.

Loading, empty, retry/error states, labelled controls, keyboard focus, pagination and mobile navigation are included. Login return paths preserve the new routes and list filters.

## Database and Storage

Inspected hosted history and the exact pending SQL, dry-ran and applied `20260927000100_community_profiles.sql` to the explicitly authorized existing project. All 28 local versions now match hosted history. No existing rows/tables were migrated, deleted or reset.

`community_profiles` is separate from legacy account data and private by default. Only its owner can insert/update editable profile fields. Public SELECT exposes only opted-in identity fields; there are no email, wallet, payment or reputation columns. Avatar paths must belong to the profile owner's folder. Reputation continues to use the trusted existing event ledger.

The `community-avatars` bucket is private. Owners upload/delete their own pictures; other users and anonymous visitors can read only the currently selected picture of a public profile. Restrictive policies also constrain inherited permissive Storage policies. In-place overwrites are denied; replacement uses a new random path. Contribution/count functions use invoker rights and existing content RLS, so passing another user's ID or a false public-only flag does not reveal their drafts or hidden discussions.

The UI accepts PNG/JPEG/WebP up to 5 MB and 4096 pixels per side, decodes them, resizes to at most 512 pixels, and re-encodes a still WebP to remove original metadata. Storage independently enforces WebP MIME, a 2 MB limit and owner paths. Client-side image conversion is not a server malware scanner. Avatar links expire after 60 seconds; previously downloaded copies cannot be recalled. Making a profile private does not hide its author's already-public discussions.

## Evidence

- **Real Supabase API and local production browser, two dedicated accounts:** each edited its own profile; the other account could not read private profiles or update them. Anonymous visitors saw opted-in identity without email data and lost profile access when consent was withdrawn. Both accounts uploaded, replaced and removed pictures. Foreign-folder uploads/overwrites were rejected; foreign deletion did not remove the owner's picture. Private-picture signing was denied to visitors/other accounts. Replaced/removed objects were checked using Storage listings, avoiding cached downloads.
- Malformed image decoding failed visibly before upload. Public profile direct navigation and refresh passed. Own lists/dashboard/profile passed at 390px; desktop and mobile screenshots were visually reviewed. Automated WCAG A/AA scans found no violations on the five new signed-in pages for either account.
- Existing production browser journey passed again: private draft rejection for account B, publish, propose, clarify, test evidence, Testing, author-only acceptance, solved direct links/refresh and unresolved closure.
- **32 PGlite database scenarios** pass across 28 migrations, including new public/private profile, immutable ownership, forged avatar path, draft/count bypass, accepted/hidden answer and Storage read/write/delete checks. Legacy fixtures remain unchanged. PGlite uses a minimal platform bootstrap, not the full Supabase server.
- **51 frontend tests in 11 files**, TypeScript and production build pass. Frontend tests mock APIs; they cover counts/links, draft resume, private public-profile views, consent saving, errors/retry, file validation and login return paths. Production build retains the existing large-bundle warning (~679 kB JavaScript).

## Limits

No physical-device/Safari or manual screen-reader certification; no Azure-hosted verification. The new profile starts empty rather than silently publishing legacy names or pictures. There is no account-directory search or profile deletion feature. Lists omit solutions whose parent discussion is no longer readable. Synthetic profiles/fixtures remain limited to the dedicated test accounts, with original test profiles restored where present. A failed Storage cleanup can leave an unreferenced private object; it is not made publicly readable by the profile policy. Storage MIME checks are not content scanning, and upload quotas/abuse controls would need expansion before a large public launch.
