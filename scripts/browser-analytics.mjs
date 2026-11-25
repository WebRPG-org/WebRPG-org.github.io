import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const base = "http://127.0.0.1:4338";
const browserPath = process.env.BROWSER_PATH || (process.platform === "win32"
  ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  : (existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : "/usr/bin/chromium"));
const catalog = JSON.parse(readFileSync(".cache/catalog.json", "utf8"));
const sample = catalog.games.find(g => g.slug === "narcissu") || catalog.games.find(g => g.instances.some(i => i.available === true && !i.needsReview));
const server = spawn(process.execPath, [join("node_modules", "astro", "bin", "astro.mjs"), "preview", "--host", "127.0.0.1", "--port", "4338"], { stdio: "ignore" });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base + "/en/", { signal: AbortSignal.timeout(1500) })).ok) { ready = true; break; } } catch { /* warm up */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, "preview not ready");
  browser = await chromium.launch({ executablePath: browserPath, headless: true });
  const context = await browser.newContext({ locale: "en-US" });
  const events = [];
  await context.exposeBinding("recordAnalytics", (_source, name, data) => events.push({ name, data }));
  await context.route("https://insight.ravelloh.com/**", async route => {
    if (!new URL(route.request().url()).pathname.endsWith("script.js")) return route.abort();
    await route.fulfill({ contentType: "application/javascript", body: `
      window.insightflare = {track: (name, data) => window.recordAnalytics(name, data)};
      document.addEventListener("click", e => {
        const target = e.target.closest("[data-insightflare-event]");
        if (target) window.insightflare.track(target.dataset.insightflareEvent, JSON.parse(target.dataset.insightflareEventData || "{}"));
      }, true);
    ` });
  });
  const page = await context.newPage();
  page.on("pageerror", error => console.error(error.message));
  async function openSearch() {
    await page.waitForFunction(() => {
      const island = document.querySelector(".search-interface")?.closest("astro-island");
      return island && !island.hasAttribute("ssr");
    }, { timeout: 20000 });
    await page.locator(".search-bar-button").click();
  }
  await page.goto(base + "/en/", { waitUntil: "domcontentloaded" });
  const card = page.locator('.game-card [data-insightflare-event="game_detail_click"]').first();
  assert.equal(JSON.parse(await card.getAttribute("data-insightflare-event-data")).source, "catalog");
  await openSearch();
  const input = page.locator(".search-head input");
  await input.fill(sample.slug);
  const result = page.locator('.search-results a[href="/en/game/' + sample.slug + '/"]');
  await result.waitFor();
  await page.waitForTimeout(1100);
  await result.click();
  await page.waitForURL("**/en/game/" + sample.slug + "/");
  assert(events.some(e => e.name === "game_search_open"));
  const queryEvent = events.find(e => e.name === "game_search");
  assert(queryEvent && queryEvent.data.resultCount >= 1 && queryEvent.data.queryLength > 0);
  assert(!("query" in queryEvent.data));
  assert(events.some(e => e.name === "game_search_result_click" && e.data.gameSlug === sample.slug));
  const play = page.locator('[data-insightflare-event="game_play_click"]').first();
  const playData = JSON.parse(await play.getAttribute("data-insightflare-event-data"));
  assert.equal(playData.gameSlug, sample.slug);
  assert.equal(playData.source, "detail");
  await page.goto(base + "/en/", { waitUntil: "domcontentloaded" });
  await openSearch();
  await page.locator(".search-head input").fill(sample.slug);
  await page.locator('.search-results a[href="/en/game/' + sample.slug + '/"]').waitFor();
  await page.locator(".search-head input").press("Enter");
  await page.waitForURL("**/en/game/**");
  assert.equal(events.filter(e => e.name === "game_search_result_click").length, 2);
  console.log("PASS static analytics attributes, search debounce/privacy, mouse and keyboard result events");
} finally {
  await browser?.close();
  server.kill();
}
