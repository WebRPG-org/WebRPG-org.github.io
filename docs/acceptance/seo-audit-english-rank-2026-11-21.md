# WebRPG SEO site-audit correction and cross-language rank — 2026-11-21

## Supplied audit and verification scope

- User-supplied Ahrefs Site Audit project ID: 10499036; original crawl 2026-11-20T19:09:27Z, preceding crawl 2026-11-20T19:05:19Z.
- The reported 29 issue categories overlap, include informational notices and were captured before later frontend/Index/CDN releases. They are not 29 independent code defects.
- Ahrefs Site Audit API cannot provide affected URL examples under the connected plan (insufficient plan), so code-level conclusions are based on the current repository, local 1,985 HTML outputs and independent validators, not speculative Ahrefs per-URL diagnostics.
- Reproduce with INDEX_REF=eeef65a9de8b738ee0e7554cedfa42c956f34f5d (current remote main). The newer list.json changed fork-validation records only; all 549 Game objects, normalized catalog hash b5cbbfccb6e1503a43989867f005c3da3d2ff5b198f943b571836730a39203ef and rendered routes remain unchanged from 2861ccff. Do not edit WebRPG-org/index or retroactively infer crawl failures have cleared without a new Ahrefs crawl.

## Corrections

- Default directory, category, language, age-filter, page navigation, related works and zero-query search browse order: true source popularity descending, ties by English title via `Intl.Collator('en',{sensitivity:'base',numeric:true})`, then slug as stable final tie. The identical slug sequence appears in all three interface locales; only translated labels change.
- Canonical and hreflang: every indexable HTML locale route has the reciprocal en, zh-Hans and ja links, plus one x-default targeting that route's canonical English URL. / remains a complete English page canonicalized to /en/; never use the noncanonical / as an alternate target.
- Separate SEO meta descriptions from full editorial summaries. For every indexable page, factual source data supplements exceptionally short snippets and excessively long snippets are concise; pages after page 1 explicitly prefix their page number, avoiding duplicate metadata when trimming. No invented ratings, description text or developer identities.
- Long SEO titles are trimmed and uniquely disambiguated with a short locale-qualified slug when needed. Original displayed H1/title text remains unchanged.
- OG/Twitter: canonical image when present; absolute site logo fallback when no game cover. Include og:site_name, og:image:alt, twitter:image, twitter:title and twitter:description.
- Schema.org: remove wrongly typed developer/publisher Thing nodes because upstream credits do not distinguish Person vs Organization. Keep verified credits and links visible in HTML.
- Static verification rejects missing/wrong x-default, noncanonical alternate targets, missing OG/Twitter images, title collisions, too-short/too-long metadata on indexable pages, invalid JSON-LD and forbidden invented ratings.

## Non-code/intentional notices

- Only one public Sitemap is generated: /sitemap.xml; it contains only canonical indexable URLs, not the duplicate / or noindex age facets. Ahrefs `multiple sitemaps` requires source-URL/crawl-configuration evidence before action.
- IndexNow is optional and does not affect Google's indexing; submitting data would be a separate publishing/integration decision. No new external notification endpoint was added.
- Expected HTTP to HTTPS and canonical redirects should not be suppressed. A noindex 404 or a redirect does not need artificial outbound links or text padding to satisfy site-audit heuristics.
- AI crawler slowness/slow-page warnings require exact affected URLs and response timing measurements; source code alone cannot establish they have been eliminated.
- A new Ahrefs crawl is required to confirm changes and to inspect any remaining URL-specific warnings.

## Acceptance

- npm run ci with the pinned latest Index SHA; validate 1,985 generated HTML pages, reciprocal hreflang, OG/Twitter tags, metadata bounds and unique titles, structured JSON-LD and all internal hrefs.
- npm run test:browser checks identical game IDs across locales and page numbers, x-default canonical English target, regular catalog/search, mobile 320/390px, no-JS navigation and version-specific game links.
- After GitHub Pages deploy, verify live build-manifest.json frontend and Index commit, root/en/zh-Hans/ja and representative detail pages, and retain legacy game project paths.
- Purge Cloudflare only for language catalog HTML prefixes, root, sitemap.xml and build-manifest.json to avoid stale content in the next audit. Do not clear legacy game asset caches.
