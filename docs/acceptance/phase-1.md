# Phase 1 — Astro skeleton and immutable data pipeline

Source of truth: eight complete Recalloom docs under /Projects/WebRPG/Plans/SSG-SEO-2026-11-20/ (00 through 07).

## Implemented
- Astro 7 SSG, React 19 render support with client-only hydration for interactive islands, TypeScript strict check and Tailwind CSS 4 Vite integration; retained Zpix, original artwork, Pixelact components and previous CSS tokens.
- Fixed-source acquisition via git ls-remote to get the current WebRPG-org/index main SHA, followed by the SAME immutable SHA for both raw games.json and list.json; cache identified by SHA and validated by source SHA-256 manifest. Optional INDEX_REF pins a release.
- Registry schemaVersion=1 and per-Game integer schemaVersion=1 adapters; rejects unsupported versions and invalid/missing ID, mismatched gameSlug, non-playable entry, duplicate assignment and invalid or colliding path. Future versions require explicit adapter.
- One Game aggregates multiple internal instances; external instances are supported with separate URL, cover and verified playable status; fixture tests cover external types absent from production.
- NSFW is three-state, retaining unknown for missing values; distinct UI locale vs playable version languages (including pt, ko, zh-Hant).
- Client JSON search indexes are generated separately for en/zh-Hans/ja, are content-hashed and include all works but not popularity, assessments or rating. Raw upstream JSON is never published.

## Verified source snapshot

- Index SHA: bef40743be736b339f2f9bf3f0c9772f90e94de8.
- Upstream registry version / per-Game adapter: 1 / 1.
- Works: 414; internal instance references: 451; multi-instance works: 32; external production instances: 0; unknown NSFW: 2; source-changed review warnings: 1.
- All 414 historical editorial statuses are draft; under the updated direct-publication policy, 1236 technically usable Game locale pages qualify for indexing, while 6 remain noindex due to unavailable or changed-source instances. No migration of upstream status is required.
- Search index count: 414 entries per locale; later entries are included in search, not only first 36 cards.
- Run checks: npm run prepare:data; node --test tests/*.test.mjs; npm run typecheck.

## Data source containment

Local E:/webrpg-index (a separate checkout) and WebRPG-org/index remote were read-only. No code writes to the data repository.
