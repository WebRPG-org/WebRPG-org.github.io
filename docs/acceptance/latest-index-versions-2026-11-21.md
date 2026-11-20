# WebRPG latest Index snapshot and UI follow-up — 2026-11-21

## Pinned reproducible source

- Remote repository: WebRPG-org/index, refs/heads/main.
- Confirmed current HEAD: ff6486bd3452ff7a8e07b4d38318e4dea8af6813.
- Acquired exactly matching games.json and list.json into ignored .cache/snapshots/<SHA>/ with SHA-256 provenance verification. Regenerated .cache/catalog.json and hashed locale search indexes. The separate local E:/webrpg-index checkout was not changed.
- Previous snapshot: 414 works, 451 internal instances, no external production entries.
- Current snapshot: 549 works, 451 internal instances, 142 external instances; 37 multi-version works, 15 unknown NSFW, 78 works with editor ratings, 27 directed relation links. No new schema adapter version required; schema versions [1].
- Reproduce: set INDEX_REF=ff6486bd3452ff7a8e07b4d38318e4dea8af6813 and run npm run ci.

## Exact UI requirements delivered

- Keep complete "Playable versions" section below the hero, with every game instance, language, engine, content rating, true availability and direct Play URL. Remove only the old "Playable versions" jump button in hero.
- A separate "Back to home" button is above the cover, not overlapping it. Main direct Play stays in the hero when an available instance exists.
- For a work with more than one version, change the catalog card's Play action to "Choose version" and use the actual localized detail-page URL + #versions. A single playable instance retains its original direct playable URL.
- Keep source repositories, non-source external links, directed game relations and similar-work recommendations in distinct sections. Multi-version URLs remain unchanged.
- Genre/type browser lists all tags (no "more genres" disclosure). Language browser begins with an "All languages" reset to the localized catalog and lists every actual playable language (no "more languages" disclosure). Preserve previous Pixelact style and age-classification browser.
- From the previous user turn, the directory sort icon, three switch buttons, header/search/catalog widths, full mobile tag wrapping, improved pagination, default adult-inclusive search with pixel-style checkbox, and similar-work recommendations are retained.

## Verification

- npm run ci on the current Index SHA passed ESLint, Astro typecheck, all unit tests, SSG and static SEO verifier.
- Generated 1,985 HTML pages: 661 per locale plus root and 404; 1,852 indexable, 133 noindex, 1,851 sitemap URLs, 166,825 verified internal anchor refs, no violations.
- npm run test:browser passed 15/15 actual Edge checks: multi-version CTA -> #versions, full instance count, home button entirely above the cover, all genres and languages, all-language reset, nonoverlapping source/external links, similarity constraints, page 2 and no-JS paths, 320px/390px no overflow, and search all current works.
- Development server reloaded against the confirmed SHA and serves the 549-work catalog on http://localhost:4321/.
- No changes to main, other worktrees or the Index repository. No push or production deployment. Production gameplay/saved-game compatibility and actual GitHub Linux Actions execution are separate remaining live verifications.
