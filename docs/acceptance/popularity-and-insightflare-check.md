# WebRPG — popularity sorting, card alignment and InsightFlare inspection

Feature branch: feature/astro-ssg-seo
Read-only source commit: bef40743be736b339f2f9bf3f0c9772f90e94de8

## Popularity semantics

- All 414 Game objects carry numeric popularity, currently ranging from 1 to 9.
- Directory, category and static pagination order is popularity descending; ties use localized title then stable slug.
- Source rating is a distinct optional editorial score (17 works), displayed as such but not used for ordering.
- Search index deliberately excludes popularity, editorial rating and assessment notes. JSON-LD does not invent aggregate ratings.
- Deterministic Catalog View hash includes popularity changes, without raw noisy processing metadata.

## Card layout

- The directory grid stretches cards to equal row height.
- The card/content/body wrappers are flexible vertical columns; the button row uses automatic top margin, staying at the card bottom.
- Real browser regression verifies exact first 36 sorted hrefs and aligned button coordinates across a desktop row.

## InsightFlare browser installation audit (read only)

- The Astro BaseLayout and the read-only Index fork processing source both use https://insight.ravelloh.com/script.js?siteId=5ace6623-f51b-4571-8f60-e0473ea3317b.
- Script GET returned HTTP 200 with a JavaScript content type and the expected site identifier.
- Production https://webrpg.org/: one deferred script, GET script.js HTTP 200, POST /collect HTTP 204.
- Production https://webrpg.org/Destiny236-Narcissuweb/: one deferred script, GET script.js HTTP 200, POST /collect HTTP 204.
- One unrelated game resource returned 404; it did not prevent successful analytics reporting.
- The local Astro dev page contains the script, but the browser observed an external script network timeout on one test. Production behavior was verified independently.
- HTTP 204 confirms the collector accepted the browser request, but cannot on its own prove storage or dashboard reporting.
- No production analytics settings were modified.

## Public Game detail fields still unrendered

- Popularity: present for 414 works; used only to order catalogs, not displayed numerically in details.
- Taxonomy content type: present for 414 works, unlike the genre/theme tags already rendered.
- Alternate titles (aliases): nonempty for 59 works; details show the selected translated title and original title, not all aliases.
- Original release platforms: present in 24 works; release date is displayed, platform names are not. Original platforms must not be confused with browser compatibility or instance language support.
- Editorial assessment date, sources and notes: present for 414 works, not surfaced. Internal notes should not be published verbatim; curated external references could be useful.
- Editorial evidence links: present for 408 works, not surfaced as a separate section.
- Internal instance processing, sizes, validation scores, source hashes and synchronization data from list.json are not kept in the public GameView; the detail page already shows playable instance URL, title, language, engine, NSFW and source links.

## Release boundary

No changes to WebRPG-org/index, the production site, InsightFlare settings, other worktrees or main. All implementation remains on feature/astro-ssg-seo.
