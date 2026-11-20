# Deployment readiness, compatibility and rollback

No deployment, push or merge is authorized by this feature branch.

## Build and source fidelity

- npm ci && npm run ci is the only release gate: it resolves one exact WebRPG-org/index SHA, reads both JSON files from that SHA, validates cross-file relationships and reserved paths, generates the static HTML, audits noindex/hreflang/canonical/links/sitemap, and writes dist/build-manifest.json.
- INDEX_REF=<40-hex-index-sha> npm run ci reproduces a pinned content snapshot. Files in .cache can be reused only for that immutable SHA; network failure without a matching cache fails the build.
- The manifest records both repository commits, source file SHA-256 hashes, catalog-derived hash (excluding noisy upstream checkedAt), route hash, schema versions and counts.
- The CI workflow never deploys a pull request. The deployment workflow retains GitHub Pages as the only production deployment target; publish waits for the entire build gate.

## Pre-deployment smoke (REQUIRED, not yet passed)

1. Save old desktop and mobile home screenshots and check current site's game launches.
2. With a temporary preview serving built dist, inspect /, /en/, /zh-Hans/, /ja/, page 2, /en/game/narcissu/, /en/tags/horror/, /en/languages/ja/. Verify HTML content without JavaScript.
3. After a separately authorized live deployment, load /Destiny236-Narcissuweb/, /Gamer-Tool-Studio-Gamer-Tool-Studio.github.io/, /anglesgirl-Ambrosia/, /WataKoro-GameDevProject/, /Yesenmidnight-2000sEscape/, /rex-lam-Anti-FraudX/rpg_game.html and other sampled games. Inspect JS, img, audio, data requests and original entry-path routing.
4. Back up and verify preexisting game localStorage / IndexedDB save data in the SAME origin, including refresh and resume. Never clear whole-origin storage.
5. Inspect Search Console canonical selection and home x-default semantics, real Googlebot crawl outcomes and Lighthouse/Core Web Vitals. These cannot be certified by a local SSG build.

## Rollback

- Obtain the previous production dist/build-manifest.json containing frontendCommit and indexCommit.
- In the manual GitHub Pages workflow, select the previous frontend commit and set frontend_ref and index_ref accordingly.
- Only after build gate succeeds, re-publish the previous verified artifact to the organization GitHub Pages site. Never modify child-game repositories to roll back the main site.
- Ensure GitHub Pages project routing still owns all existing /<forkName>/ URLs; never flip DNS to Cloudflare Pages as part of this work.
