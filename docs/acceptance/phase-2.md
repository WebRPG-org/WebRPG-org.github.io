# Phase 2 — SSG, indexability, canonical and sitemap

## Implemented
- Root full static English homepage, matching /en/ main content; root canonical -> https://webrpg.org/en/ and never redirect.
- 3 full homes, individual Game detail pages, Game-based stable-title pagination (36/page), genres/themes and playable-language category routes, with no duplicate page/1.
- Real links rendered into initial HTML, direct Game-to-Instance navigation, preserved original run URL even when entryPoint differs from /index.html. Detail has breadcrumbs, multi-instance version rows, unknown NSFW and content approval gating.
- SEO Head is entirely server static: unique title, meta description, lang, canonical, hreflang, OG, Twitter card, JSON-LD CollectionPage/ItemList, BreadcrumbList and (only if approved) VideoGame.
- Game-level and per-locale content review plus source SHA provenance and adult/unrated gating. All current draft game descriptions are noindex,follow, are absent from sitemap and never receive a spurious indexed hreflang to drafts.
- Category pages with only programmatic titles/counts or thin entries stay noindex; curated explanations for key tags, instance-language taxonomy explanations for language pages. Canonical and sitemap derive from the same predicates.
- Build verification examines ALL HTML files, 66K+ anchors, canonical/hreflang mutuality, metadata/JSON-LD, sitemap vs noindex, static home and game content, path uniqueness and protected runtime routes.

## Verified on local build

- Static HTML documents: 1469 (489 each locale, /, /404.html).
- Noindex pages: 1300 (all 1242 draft Game locales and 58 other non-indexable/404 pages).
- Indexable HTML: 169 (including duplicate root, excluded from sitemap).
- Sitemap canonical URLs: 168.
- JSON-LD scripts checked: 1469; static anchor links checked: 66K+.
- Source SHA: bef40743be736b339f2f9bf3f0c9772f90e94de8.
- Snapshot has 0 indexed Game locales, reflecting existing editorial review status.
- Checks: npx astro build; node scripts/verify-dist.mjs; npx astro check; npm run ci.

These are local SSG audits only; crawler behavior and production reachability have not been tested.
