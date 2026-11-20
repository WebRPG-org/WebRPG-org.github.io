# WebRPG Astro SSG — Independent Review Round 1 Remediation (2026-11-20)

Review source: /Projects/WebRPG/Plans/SSG-SEO-2026-11-20/Independent-Review-2026-11-20.md (revision 3).
Feature branch: feature/astro-ssg-seo.
Original reviewed commit: 5413a66e6c20065b1e9d06f7506c64b866371427.
Pinned data commit: bef40743be736b339f2f9bf3f0c9772f90e94de8.

## Updated product policy

This revision supersedes the original extra editorial-review requirement. Historical editorial draft, a missing/short intro, description quality flags, or NSFW true/unknown are **not** indexability blockers. Explicit Game seo.indexPolicy=noindex and verified technical unavailability/provenance checks still apply. Both NSFW and unknown-classification covers may appear in the directory. Editorial placeholders are not used as genuine descriptions; derived local-language fallback text uses only Game title, taxonomy, language and instance count.

## Findings, changes and regression evidence

| Finding | Resolution | Evidence |
| --- | --- | --- |
| F1 P0 | Removed hard-coded Narcissu noindex and even fixed Narcissu existence from permanent dist auditor; expected robots and sitemap now derived from every normalized Game locale | verify-dist.mjs; snapshot-driven all-pages check |
| F2 P1 | Explicit boolean mismatch between Game instance NSFW and list.meta.nsfw throws a build-breaking error; absent stays unknown/metadata fallback | catalog-core.mjs; true/false conflict and unknown fixtures |
| F3 lifted | Adult and unknown can be rendered on homepage, not globally excluded. Explicit boolean classification prevents unknown from being mislabeled Adult. Optional search-only safety filter remains | GameCard.tsx, GameDetails.astro, browser class regression |
| F4 P1 | Parses relations[].gameId and keeps relation.type; validates all targets against the catalog, rejects invalid/duplicate/self relations; directed relationship links are localized | 17 real links from 9 games, fixture and dist HTML assertions |
| F5 P0 | Draft and intro contents no longer gate indexability. Noindex only for explicit opt-out or unavailable/provenance-unverified technical instance; indexable details use factual fallback description when summary absent/placeholder | fixture coverage, 1236 indexable Game locale pages, sitemap exact matching |
| F6 P2 | Developer/publisher View credits preserve {name,url|null}; HTTPS verified links render in static HTML and are used without invented Person/Organization identity in schema.org | 299 real games have developer URLs; source URL fixtures and dist checks |
| F7 P2 | Open Graph locale is en_US/zh_CN/ja_JP; HTML lang and hreflang remain en/zh-Hans/ja | generated HTML validator for all pages |
| F8 P2 | Search has 60-record incremental Show more, makes remaining matches accessible, and scopes keyboard Enter/arrow behavior away from native filters; composition/IME Enter does not navigate | browser smoke regression |
| F9 P2 | Setup Chrome action receives id, passes actual steps.setup-chrome.outputs.chrome-path to BROWSER_PATH | both workflow YAML files; official setup-chrome contract. Real GitHub Linux runner still requires independent PR validation |
| F10 P2 | Catalog hash covers complete deterministic normalized game view, including credits, relations, links and dates; noisy checkedAt remains outside projection | build-catalog.mjs and digest unit fixture |

## Local verification

- Snapshot: 414 Game, 451 internal instances, 32 multi-instance Games, 2 unknown NSFW, 17 directed relations.
- Indexability after review-policy change: 1236/1242 game locale HTML pages. The remaining six are three locales each for basicrpg (stale reviewed-source SHA) and bibliogame (reachable=false). They remain valid noindex navigable pages.
- Produced 1469 static HTML pages. 64 noindex. Sitemap contains 1404 canonical URLs, including 1236 Game locales. One duplicate root page canonicalizes to /en/.
- Schema unit and data integrity fixtures: 14 passed, including failure cases, external URL and conditional publishing.
- Strict Astro TypeScript check, ESLint, Astro SSG build and all-output SEO verification passed with zero assertion violations.
- Real browser smoke: 13 of 13 passed, including full search result expansion, select/IME Enter safety, draft/short synopsis and true/unknown NSFW class display, 320px/390px responsive behavior, static navigation without JS, and language toast.
- Browser screenshots in docs/acceptance/screenshots remain available for visual review.

## Live-release limitations / non-claims

- No merge, remote push, GitHub Actions trigger, Pages publication, or index-repo modification was performed.
- setup-chrome output is documented officially but an actual GitHub-hosted Linux PR run cannot be claimed until a separately authorized push/PR.
- Production webrpg.org/<forkName>/ game-engine startup/audio/images, preserved browser saves, Search Console x-default selection, and actual search-engine indexing require separate production checks.
- Read-only old-site URL HTTP 200 tests do not establish future deployed compatibility.

This note is an audit remediation statement, not independent approval to merge or deploy.
