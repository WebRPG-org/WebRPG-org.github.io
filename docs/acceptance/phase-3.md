# Phase 3 — Pixelact UI, search and real browser testing

## UI and interaction
- Retained original src/index.css, Zpix local font, background-desktop.jpg, warm pixel card / button palette, Pixelact Card/Button/Badge/Input and image placeholders. Added only supporting route, responsive and semantic category styles.
- Desktop and mobile use consistent anchor navigation, Game cards with metadata and playable languages, independent Game details and versions.
- Collapsed long genre/language secondary navigation behind native details controls (usable without JavaScript) so a narrow viewport does not show endless category chips before game cards.
- React islands limited to search/dialog and language preference banner; all pages, cards and detail bodies are pre-rendered. Search index is fetched on user interaction, not before; combined filters search all 414 works, with adult/unrated opt-in.
- Browser language banner is bottom-right, never redirects, remembers selected locale, session dismiss and permanent disable; same Game Slug target.
- Desktop/browser image backgrounds have a placeholder fallback; unclassified/adult card cover photos are hidden by default.

## Executed local Edge browser smoke
Command: npm run test:browser. Chromium running via installed Microsoft Edge, headless, Astro preview server.
- Root vs /en/ literal main DOM equivalence.
- 36 game cards, static page 2, /ja/game/narcissu/ and original runtime href.
- zh-Hans and ja homes, horror and actual pt playable-language categories, unsupported route -> real 404.
- Zpix body font and warm gradient card surfaces confirmed via computed styles.
- Search loads full catalog including a work outside the first page, combined filters and adult/rating state changes.
- Mobile viewports 320px and 390px: no overflow, visible language navigation, headings.
- JavaScript-disabled catalog, pagination, language switches, Game/Instance deep-link anchors.
- Browser recommendation, dismiss for this session, manual preference and permanent opt-out.
- No application JavaScript exceptions in inspected pages.

At last recorded run, all 11 browser assertions passed. Screenshots are captured in .cache/ui and compressed review images are retained in docs/acceptance/screenshots/ (legacy production and updated local desktop/mobile, Japanese detail, 320px detail and language prompt).

Actual project-game JavaScript startup, asset fetch, web saves and indexing cannot be certified without separate authorized production smoke.
