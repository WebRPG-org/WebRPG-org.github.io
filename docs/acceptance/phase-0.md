# Phase 0 — Baseline and non-negotiable compatibility (2026-11-20)

- Frontend `main` baseline: `2a1aedd134751dd42c92f2edd2618d2dc5f5aa58`, clean at worktree creation. Main remains untouched.
- Index `main` read-only remote baseline: `bef40743be736b339f2f9bf3f0c9772f90e94de8`. The unrelated local `E:\webrpg-index` checkout is at `efee507ad9fc6c23f534b86fcc25ec0c91b3d654` and is intentionally not used or modified.
- Registry v1, 414 games, 451 internal instance references, 32 multi-instance games; 414 global editorial draft. Two `list.meta` NSFW values are absent and must remain unknown. External instances have no production examples.
- Existing SPA: React 19 + Vite 8, `src/App.tsx` 624 lines dynamically loads `list.json`, all cards rendered by React. `src/index.css` 635 lines contains Zpix/pixel theme; Pixelact UI in `src/components/ui/pixelact-ui` and `/assets/*` must be preserved.
- GitHub Pages deploy workflow: `.github/workflows/deploy.yml` pushes main to `dist`; `public/CNAME` is webrpg.org. Keep InsightFlare once in Astro layout.
- Root `/` must duplicate full `/en/` home, canonical `/en/`; all real content uses `en`, `zh-Hans`, `ja` prefixes. Existing `/<forkName>/` are distinct GitHub Project Pages and MUST NOT change.
- Representative instance paths for pre-deploy smoke: `/Destiny236-Narcissuweb/`, `/Gamer-Tool-Studio-Gamer-Tool-Studio.github.io/`, `/anglesgirl-Ambrosia/`, `/WataKoro-GameDevProject/`, `/Yesenmidnight-2000sEscape/`, `/lishi19990812-mlsy041/`, `/demostenespedrosa-1889/`, `/HanbitGaram-1ststudio-game/`.
- Compatibility smoke of game startup, assets, save data and Search Console selection requires actual **post-deployment** verification. It must not be marked passed in local branch.
- Route namespaces reserved by main site: `en`, `zh-Hans`, `ja`, `page`, `game`, `tags`, `languages`, `assets`, `data`, `search`, `_astro`, `fonts`. Build must compare case-insensitively to EVERY observed `forkName`.

## Phase 0 review

- [x] Actual Git remote HEAD and branch occupancy checked; isolated feature worktree created.
- [x] Design documents 00–07 resolved and fully read, in order.
- [x] Existing App, CSS, Pixelact component inventory and Actions read before modifying application.
- [x] Registry and existing multi-instance/unknown-NSFW/actual URLs sampled at one remote SHA.
- [ ] Baseline desktop/mobile screenshots require accessible browser; record in later UI check.
