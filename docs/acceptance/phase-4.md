# Phase 4 — Quality gates, release workflow, rollback and outstanding checks

## CI / deployment plan (configured, NOT triggered)
- CI workflow on pull requests and non-main push: Node 24 npm ci, schema build + ESLint + Astro check + unit fixtures + SSG + dist SEO validator, then real browser smoke. The browser binary path uses setup-chrome output rather than assuming /usr/bin/chromium. Produces build-manifest audit artifact.
- Existing GitHub Pages deployment kept: only main pushes, workflow_dispatch and repository_dispatch index-updated can publish. Node 24 npm ci, same build gates plus browser smoke must pass before upload-pages-artifact and deploy-pages.
- Manual dispatch accepts optional pinned frontend_ref and index_ref for rollback. The deployment path remains dist/CNAME=webrpg.org; there is no Cloudflare Pages cutover.
- Build manifest includes frontend Commit SHA, data Commit SHA, raw games/list SHA256, normalized catalog hash, schema versions, route hash, totals, sitemap, noindex counts and warnings.
- Path protection checks existing forks against en/zh-Hans/ja/assets/data/game/page/tags/languages/_astro and other reserved segments case-insensitively. Dist never creates any child-game runtime directories.

## Required pre-publish checks (not claimed passed)
1. Second independent code review/PR audit of the revised direct-publication index policy, NSFW consistency, relation graph, and browser keyboard behavior.
2. Production project-page path smoke for representative games, including deeper entryPath URLs and images/audio/JavaScript startup.
3. Browser storage survival for existing game saves on the real origin (localStorage, IndexedDB and game-specific save paths); no origin-wide clearing.
4. Google Search Console / sitemap/canonical/hreflang follow-up, real mobile LCP/CLS/INP performance and crawler validation.
5. Visual comparison screenshots of old and new desktop/mobile UI are captured under docs/acceptance/screenshots/. Human independent design approval and any polishing requested before production remain pending.
6. Review npm audit dependency advisories before release as appropriate.

No push, merge, main mutation, index repository modification or deployment occurred in this feature branch.
