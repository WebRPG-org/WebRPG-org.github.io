# WebRPG — Astro Static Game Directory

WebRPG organizes **games (works)**, not GitHub repositories. Each work has a localized details page and one or more playable versions. Site languages are `en`, `zh-Hans`, `ja`; a game can independently support Portuguese, Korean, Traditional Chinese and other playable languages.

## Architecture

- Astro 7 SSG renders full static HTML: three homes, Game details, tags/themes, actual playable languages, 36-games/page pagination, canonical/hreflang, OG, structured data, sitemap and robots.
- React 19 hydrates only the search/combined filters and optional browser-language suggestion. Static game cards are rendered via existing Pixelact React UI on the server without client hydration.
- Original Zpix font, site background, warm Pixelact UI and CSS are preserved. Covers retain original Index URLs for SEO but render through `i.ravelloh.com` at browser-selected widths (native `srcset`/`sizes`, AVIF/WebP negotiation). Directory heading, rating legend and content-rating filters are grouped in a header-style pixel card, with refined responsive game details and aligned action buttons.
- Stable default order: the existing numeric `games.json` popularity indicator descending (1–9 in the pinned snapshot), with localized work names and slugs as tie breakers. In the latest fetched snapshot, all 549 works have a source popularity value; it is an editorial popularity estimate, not live traffic or user reviews. The separate source `rating` remains an optional display-only editorial score for 78 of 549 works. Never fabricate aggregate user ratings or feed popularity into search relevance or structured rating data.
- Data source: WebRPG-org/index, one exact Git Commit SHA for both games.json and list.json, loaded **at build time**, validated and joined by explicit per-Game schemaVersion adapter. Browser never downloads the full upstream JSON. Search uses smaller separate content-hashed locale JSON indexes.
- Indexability is determined by explicit `seo.indexPolicy=noindex` and technically valid, available game instance URLs. Historical draft editorial statuses, description length/absence and adult/unrated classification do not prevent publication. Factual metadata is used when an introduction is missing; missing NSFW remains `unknown`. Popularity affects directory ordering only, not search weighting or invented Schema.org user ratings.

## Project directories

    src/pages/             Astro homes, game details, taxonomies, pagination, sitemap, 404
    src/layouts/           BaseLayout and CatalogLayout
    src/components/game/   Pixelact server GameCard and Astro details
    src/components/interactive/  search and language suggestion React Islands
    src/components/layout/       header/footer
    src/components/catalog/      static pagination
    src/components/ui/pixelact-ui/  original UI library
    src/data/              normalized build-time catalog
    src/i18n/              three locale messages, route contracts
    src/seo/               schema.org builders
    src/styles/            responsive pixel-theme additions
    src/lib/cover-image.ts  responsive image-proxy URLs, card/detail sizes, origin allowlist
    scripts/               immutable source, schema validation, build, SEO and browser gates
    tests/                 data/NSFW/external/search/language unit fixtures
    docs/acceptance/       phased QA, screenshots, deployment and rollback notes

## Development

Node 24 is recommended.

    npm ci
    npm run dev

Each build resolves WebRPG-org/index main to a **40-character immutable SHA** and downloads both files from that exact revision. To reproduce a release, set INDEX_REF to that SHA before running npm run build. For example:

    INDEX_REF=2861ccff78f4a61c4c74a0a6e75550ee614f75f6 npm run build

In PowerShell: `$env:INDEX_REF = '<sha>'`, then `npm run build`. With `INDEX_OFFLINE=1`, the snapshot must already be cached with valid SHA256 provenance.

Checks:

    npm run lint            # ESLint
    npm run typecheck       # Astro + TypeScript
    npm test                # schema, game-instance integrity, NSFW, external fixture
    npm run build           # Astro static build + all HTML/SEO/links/sitemap audit
    npm run ci              # full static release gates
    npm run test:browser    # real Edge/Chrome desktop, 320/390px mobile, no JS smoke

Build report: `dist/build-manifest.json` with frontend and source commits, upstream file hashes, catalog hash, routes hash, schema adapters and noindex/sitemap totals. Screenshot evidence: `docs/acceptance/screenshots/`.

### Responsive covers

- `src/lib/cover-image.ts` generates only the strict `webrpg.org/<forkName>/cover.png` or `/images/<slug>.<png|jpg|jpeg|webp>` paths accepted by image-proxy policy v3. Unknown origins keep their original source (safe fallback).
- Game cards offer `384/640/750/1080/1200` pixel widths with native HTML `sizes` matching the 1–4-column CSS grid. Details offer `640/750/1080/1200/1920` for the larger hero and high-DPR mobile screens. The browser selects by slot width and device pixel ratio; no client resizing code or extra island.
- Images continue to use `object-fit: cover`, fixed aspect ratios and the original placeholder; cards remain lazy, and main detail artwork loads with high priority. Cloudflare and Cloudinary cache immutable derivatives.
- `GameView.coverUrl`, OG and JSON-LD `image` retain the original `webrpg.org` source for provenance and crawler compatibility. See `docs/acceptance/cover-image-proxy-2026-11-21.md`.

## Public URL contract

- `/` is the **full English homepage**, not a language selector or redirect. Its canonical is `https://webrpg.org/en/`; canonical locales are `/en/`, `/zh-Hans/`, `/ja/`.
- Pages after page 1: `/<locale>/page/2/`; no duplicate `/page/1/`.
- Works: `/<locale>/game/<gameSlug>/`.
- Tags and playable languages: `/<locale>/tags/<tag>/` and `/<locale>/languages/<lang>/`. Category pagination uses an additional `page/<N>/` segment.
- Optional content rating filter: `/<locale>/nsfw/safe/`, `/<locale>/nsfw/adult/`, `/<locale>/nsfw/unknown/`, with static `page/<N>/` pagination. These are browseable but deliberately `noindex` and excluded from Sitemap to prevent duplicate taxonomy search results. Adult and unknown works remain present on the unfiltered homepage.
- Existing independent GitHub Project Pages such as `https://webrpg.org/<forkName>/...` are **not moved, redirected or changed**. Original deep `pagesUrl` entries are preserved. Reserved-path collisions fail the build.

CI never deploys from pull requests. The GitHub Pages workflow responds to main pushes, manual dispatch, and index-update dispatch. To cover the index repository's missing dispatch sender, it also performs a read-only scheduled Index check every six hours after this workflow reaches the default branch. Unchanged Index/front-end SHAs skip builds; changed SHAs trigger full validation, and only a changed normalized catalog, route set, or frontend commit authorizes publication. Manual dispatch supports pinned frontend_ref and index_ref for rollback. See `docs/acceptance/deployment.md` and `docs/acceptance/f11-index-update.md`. Actual scheduled GitHub runner behavior, game assets/saves and Search Console canonical behavior still require live acceptance.
