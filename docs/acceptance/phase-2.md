# Phase 2 — SSG, indexability, canonical and sitemap

## Implemented
- Root full static English homepage, matching /en/ main content; root canonical -> https://webrpg.org/en/ and never redirect.
- 3 full homes, individual Game detail pages, Game-based stable-title pagination (36/page), genres/themes and playable-language category routes, with no duplicate page/1.
- Real links rendered into initial HTML, direct Game-to-Instance navigation, preserved original run URL even when entryPoint differs from /index.html. Details include breadcrumbs, multi-instance versions, directed typed relations and NSFW classification.
- SEO Head is entirely server static: unique title, meta description, lang, canonical, hreflang, OGP-compliant language territory codes, Twitter card, JSON-LD CollectionPage/ItemList, BreadcrumbList and valid-URL-backed VideoGame.
- Direct publication policy supersedes the former editorial gating: draft, missing/short introductions and NSFW/unknown do not block indexing. Explicit noindex and technically unusable / provenance-invalid instances still block. Missing or placeholder descriptions receive localized factual metadata and prose based only on real game attributes.
- Category pages with only programmatic titles/counts or thin entries stay noindex; curated explanations for key tags, instance-language taxonomy explanations for language pages. Canonical and sitemap derive from the same predicates.
- Build verification examines ALL HTML files, 66K+ anchors, canonical/hreflang mutuality, metadata/JSON-LD, sitemap vs noindex, static home and game content, path uniqueness and protected runtime routes.

## Verified on local build

- Static HTML documents: 1469 (489 each locale, /, /404.html).
- Latest audited fixed-source build: 1469 HTML, 64 noindex, 1405 indexable HTML including the canonicalized root, 1404 canonical Sitemap URLs, and 1469 JSON-LD scripts.
- Exactly 1236 of 1242 Game locale pages are eligible for indexing; 6 remain technically unavailable/provenance-invalid. Actual generated counts always remain authoritative in dist/build-manifest.json.
- JSON-LD scripts checked: 1469; static anchor links checked: 66K+.
- Source SHA: bef40743be736b339f2f9bf3f0c9772f90e94de8.
- Snapshot preserves all 414 historical draft statuses without requiring source-data rewrites; indexability no longer depends on editorial review.
- Checks: npx astro build; node scripts/verify-dist.mjs; npx astro check; npm run ci.

These are local SSG audits only; crawler behavior and production reachability have not been tested.
