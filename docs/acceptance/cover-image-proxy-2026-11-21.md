# WebRPG optimized cover integration — 2026-11-21

## Source and scope

- Index snapshot: 2861ccff78f4a61c4c74a0a6e75550ee614f75f6.
- 549 works, including 539 WebRPG-owned covers and 10 placeholder-only works.
- 399 covers are at /<owner>-<repository>/cover.png; 140 at /images/<slug>.(png|jpg|jpeg|webp).
- All current sources are public HTTPS URLs without query strings, and all 539 match the image-proxy v3 allowlist.
- No game runtime path, asset, source image, or Index record is modified.

## Image proxy prerequisite

- Independent repository: RavelloH/image-proxy; production host: https://i.ravelloh.com.
- Policy version 3 adds a strictly path-restricted WebRPG origin. The rest of webrpg.org is NOT allowed.
- Cloudflare Workers Caching and Cloudinary Fetch offer modern image formats and immutable long-lived caching.
- Production was verified separately: /healthz policy 3; 384px project cover returned AVIF HTTP 200, library cover returned WebP HTTP 200; non-image path returned 403.

## Native responsive sizes

- Source/original GameView.coverUrl remains unchanged, as do canonical OpenGraph and JSON-LD image values.
- Cards: src w=384, srcset width descriptors 384, 640, 750, 1080 and 1200. HTML sizes approximates the actual 1-to-4-column CSS auto-fill grid.
- Detail hero: src w=750, srcset 640, 750, 1080, 1200 and 1920. HTML sizes approximates the 36% desktop column and capped 500px mobile column.
- Browser selects a candidate from CSS slot width and device DPR. No ResizeObserver or extra React hydration; native source selection responds to viewport changes.
- Card covers retain lazy loading and established placeholders. The main detail cover has high fetch priority.
- Unrecognized/malformed cover sources fall back to direct originals, not a proxy 403. Missing covers retain local placeholder.

## Acceptance and operations

- Run typecheck, lint, Node image mapping tests for all current covers, Astro SSG, full static HTML/SEO verifier and Edge/Chrome browser tests.
- Check actual currentSrc width against device pixel ratio and DOM sizes, not simply the presence of srcset markup.
- Run GitHub Pages workflow from main, inspect published build manifest and online image Content-Type. Keep independent rollbacks for frontend and proxy.
- If Cloudflare HTML caching serves old SSR pages after deployment, invalidate only affected catalog/detail HTML URLs; avoid a whole-zone purge that invalidates game assets.
- Image-proxy has its own independent Git integration and CI, and was deployed and verified before WebRPG integration.
