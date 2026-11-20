# WebRPG visual follow-up — popularity sort and work detail, 2026-11-21

## Scope

This follows the initial Astro SSG migration and second independent review, reusing the same feature worktree. Based on live desktop and mobile screenshots supplied by the user, without introducing a different theme or changing original game runtime paths.

## Data semantics

- The existing numeric games.json rating field (0–10) is kept as optional GameView.editorialRating. In the pinned Index snapshot 17/414 works have a valid rating. Missing or invalid values remain null. No synthetic/user aggregate or popularity rating is generated in Schema.org.
- Updated source-driven directory, category and static pagination order: popularity descending (the immutable snapshot has values 1–9 for all 414 works), then localized title and slug for ties. Editorial rating does not affect ordering. The search projection continues to exclude ratings, popularity and source assessment notes.
- All three locales display an explicit "editorial rating" legend. Game cards show a numerical ★ X/10 only when the game has a source rating; work details likewise show the score or an explicit "not rated".

## Content rating filter

- A full static SSR (no-JavaScript) filter for safe/adult/unknown. Counts in current Index snapshot: 369, 43, 2; full directory remains 414 works including NSFW.
- Paths: /<locale>/nsfw/<safe|adult|unknown>/, plus /page/N/ only for valid N >= 2; static cards are paginated by 36. Direct game content-rating chips link to the corresponding facet.
- Facet pages use explicit noindex and are excluded from sitemap and indexed hreflang to avoid competing with canonical work listings. Existing game detail pages, site language prefixes, page/1 exclusivity and child-game runtime paths are unchanged.
- nsfw is added to the reserved root namespace to detect future Project Pages collisions.

## Layout and interaction

- A cream-and-pixel-border card wraps the main catalog heading, description, true work count, popularity order, content-rating filters and the preexisting expandable genres/languages navigation, visually aligned with existing Header.
- Mobile content rating uses one accessible horizontally scrollable line, with first game card remaining within the initial 390px viewport.
- Work cards display editorial scores when present. Both actions have equal columns and a consistent shadow, and the card/content/body wrappers stretch vertically to keep action rows pinned to the bottom across the entire grid row, regardless of summary or tag length.
- Details: balanced cover/metadata grid, original title, distinct metadata definition list including source attribution and languages, clear version count and primary play action, responsive version cards, prose sections and deduplicated bottom source links. Source next to Play was removed. No extra game URL was changed.

## Acceptance

- npx astro check, ESLint and node unit tests pass, including popularity sorting, localized tie-breaks, optional editorial ratings and invalid popularity fixtures.
- npm run ci passes with complete statically generated HTML, canonical/hreflang/sitemap/JSON-LD, static links, per-locale NSFW facets noindex and filtering checks.
- Real Edge browser acceptance checks first-page source popularity ordering, optional editorial-rating badges, NSFW filter pagination, bottom-edge button alignment across a full desktop row, details source removal, 320/390px overflow and no-JS navigation. Keep run logs under ignored .cache.
- This is local feature-branch work only. The next independent audit, live deployment, GitHub Linux CI, gameplay/saves and Search Console observations remain outside the present task.
