# WebRPG legacy Sitemap candidate migration — 2026-11-21

**Evidence limitation:** the historical ~812-URL Sitemap XML is not present in Git history or the available local snapshots. The latest immutable Index `list.json` contains exactly 812 `pagesUrl` records, which offer a useful but **unproven proxy** for the old 812 URLs. This is **not** a verified byte-for-byte historic sitemap diff. The complete reconstructed candidates are preserved in [legacy-sitemap-diff.json](./legacy-sitemap-diff.json).

- Index commit: `eeef65a9de8b738ee0e7554cedfa42c956f34f5d`
- Source file SHA-256: `37cf298f2b5b817de1b22bc338e7d40748a76cb974397d12f1c9fca561276d52`
- Candidate count (including any duplicates): **812**, unique URLs: **812**
- New Play Sitemap URL count: **448**
- Retained candidates: **448**
- Excluded candidates: **362**
- Unresolved (requires human review): **2**
- New Play URLs absent from candidates: **0**
- JSON report size: **230523 bytes**, SHA-256: `629d01002dcf48bb71a6b60c855e57a733d2149befc0ef386ed25baaf9eafc40`

## Classification reasons

- `eligible-internal-instance`: 448
- `explicit-non-playable`: 359
- `unavailable`: 2
- `verified-but-playability-undetermined`: 2
- `needs-review`: 1

## Retained examples
- `https://webrpg.org/00due-rupuauto-game/` — `eligible-internal-instance` (ID: `00due-rupuauto-game`)
- `https://webrpg.org/27klarosa-27klarosa.github.io/` — `eligible-internal-instance` (ID: `27klarosa-27klarosa-github-io`)
- `https://webrpg.org/28Diezel-28Diezel.github.io/` — `eligible-internal-instance` (ID: `28diezel-28diezel-github-io`)
- `https://webrpg.org/28dosei-28dosei.github.io/` — `eligible-internal-instance` (ID: `28dosei-28dosei-github-io`)
- `https://webrpg.org/28hershey-28hershey.github.io/` — `eligible-internal-instance` (ID: `28hershey-28hershey-github-io`)
- `https://webrpg.org/28LPotter-28LPotter.github.io/` — `eligible-internal-instance` (ID: `28lpotter-28lpotter-github-io`)

## Excluded examples
- `https://webrpg.org/0x736f6d657468696e67-new_layers/` — `explicit-non-playable` (ID: `0x736f6d657468696e67-new-layers`)
- `https://webrpg.org/27DAnderson-GameBarPortfolio/` — `explicit-non-playable` (ID: `27danderson-gamebarportfolio`)
- `https://webrpg.org/27DAnderson-MythologyRPGM/` — `explicit-non-playable` (ID: `27danderson-mythologyrpgm`)
- `https://webrpg.org/27DAnderson-PogipediaPortfolio/` — `explicit-non-playable` (ID: `27danderson-pogipediaportfolio`)
- `https://webrpg.org/27DAnderson-Portfolio/` — `explicit-non-playable` (ID: `27danderson-portfolio`)
- `https://webrpg.org/28ashapiro-28ashapiro.github.io/` — `explicit-non-playable` (ID: `28ashapiro-28ashapiro-github-io`)

## Unresolved examples
- `https://webrpg.org/batnow94-All-FNaFb-Locations-MV/` — `verified-but-playability-undetermined` (ID: `batnow94-all-fnafb-locations-mv`)
- `https://webrpg.org/tjsp-lalecrim-Arena/` — `verified-but-playability-undetermined` (ID: `tjsp-lalecrim-arena`)

## Follow-up constraints

- Never restore every historical URL based solely on an old sitemap listing. `meta.playable=false` and unassigned records are not automatically eligible for the Play Sitemap.
- A URL omitted from a sitemap remains routable; no 404, 410, project directory modification, redirects or GitHub Pages asset deletions are performed.
- The unresolved records need source/reachability and canonical inspection before a future explicit legacy allowlist; this review does not turn them into automatic Play entries.
- If an actual archived `sitemap.xml` from the historic deployment becomes available, re-run a **separate** exact-XML comparison and retain its source checksum; do not relabel these inferred candidates as the original XML.
