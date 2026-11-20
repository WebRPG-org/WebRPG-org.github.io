import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const catalog = JSON.parse(await readFile(join(root, ".cache", "catalog.json"), "utf8"));
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const hash = (text) => createHash("sha256").update(text).digest("hex");
async function gather(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await gather(full));
    else result.push(full);
  }
  return result;
}
const files = await gather(dist);
const names = new Set(files.map((f) => relative(dist, f).split(sep).join("/")));
const html = new Map();
for (const file of files.filter((f) => f.endsWith(".html"))) {
  const name = relative(dist, file).split(sep).join("/");
  const path = name === "index.html" ? "/" : name === "404.html" ? "/404.html" : "/" + name.replace(/index\.html$/, "");
  html.set(path, await readFile(file, "utf8"));
}
const pageForUrl = (url) => {
  const path = new URL(url, "https://webrpg.org").pathname;
  return html.has(path) ? path : null;
};
const attr = (page, tag, name, value) => {
  const match = [...page.matchAll(new RegExp("<" + tag + "\\b(?:\\\"[^\\\"]*\\\"|[^\\\">])*?>", "gi"))].map((x) => x[0])
    .find((element) => new RegExp("\\b" + name + '="' + value + '"').test(element));
  return match || "";
};
const hrefFrom = (tag) => tag.match(/\bhref="([^"]+)"/)?.[1] || "";
const titleFrom = (page) => page.match(/<title>([^<]+)<\/title>/)?.[1] || "";
const descFrom = (page) => attr(page, "meta", "name", "description").match(/\bcontent="([^"]+)"/)?.[1] || "";
const canonicals = new Map();
const robots = new Map();
let linkCount = 0, ldCount = 0, noindex = 0;
for (const [path, page] of html) {
  const is404 = path === "/404.html";
  const canonical = hrefFrom(attr(page, "link", "rel", "canonical"));
  const robot = attr(page, "meta", "name", "robots").match(/\bcontent="([^"]+)"/)?.[1] || "";
  const expected = "https://webrpg.org" + (path === "/" ? "/en/" : path);
  canonicals.set(path, canonical);
  robots.set(path, robot);
  if (robot.includes("noindex")) noindex++;
  assert(titleFrom(page).length > 5, path + ": missing title");
  assert(descFrom(page).length > 9, path + ": missing description");
  assert(/<h1\b/i.test(page), path + ": missing static H1");
  assert(/<html\b[^>]*\blang="(en|ja|zh-Hans)"/.test(page), path + ": bad html language");
  if (!is404) assert(canonical === expected, path + ": incorrect canonical " + canonical);
  assert(!!robot, path + ": missing robots meta");
  if (!is404) assert(/<main\b/i.test(page), path + ": missing static main");
  if (!is404 && path !== "/") assert(!page.includes("raw.githubusercontent.com/WebRPG-org/index/main/list.json"), path + ": runtime raw source");
  const ldScripts = [...page.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  assert(ldScripts.length === 1, path + ": expected one JSON-LD script");
  for (const match of ldScripts) {
    try {
      const ld = JSON.parse(match[1]);
      assert(ld["@context"] === "https://schema.org", path + ": wrong schema context");
      assert(!JSON.stringify(ld).match(/aggregateRating|popularity|assessmentNote/), path + ": forbidden invented data");
      ldCount++;
    } catch (err) { errors.push(path + ": invalid JSON-LD " + err.message); }
  }
  for (const match of page.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
    linkCount++;
    const target = match[1].replace(/&amp;/g, "&");
    if (!target.startsWith("/") || target.startsWith("//")) continue;
    const normalized = target.split(/[?#]/)[0];
    if (normalized === "/" || html.has(normalized)) continue;
    if (names.has(normalized.replace(/^\//, ""))) continue;
    const first = normalized.split("/").filter(Boolean)[0] || "";
    if (catalog.forkNames.includes(first.toLowerCase())) continue; // Existing independent Project Pages.
    errors.push(path + ": broken static internal link -> " + target);
  }
}
const rootHtml = html.get("/");
const enHtml = html.get("/en/");
assert(!!rootHtml && !!enHtml, "Missing root or English canonical home");
if (rootHtml && enHtml) {
  const main = (value) => value.match(/<main\b[\s\S]*?<\/main>/)?.[0] || "";
  assert(main(rootHtml) === main(enHtml), "Root and /en/ main HTML differ");
  assert(canonicals.get("/") === "https://webrpg.org/en/", "Root canonical not /en/");
}
for (const locale of ["en", "zh-Hans", "ja"]) assert(html.has("/" + locale + "/"), "Missing homepage /" + locale + "/");
assert(!html.has("/en/page/1/"), "Duplicate first page route");
assert(!html.has("/en/game/does-not-exist/"), "Nonexistent game was emitted");
assert(!html.has("/fr/"), "Unsupported language was emitted");
assert(html.has("/en/page/2/"), "Missing page 2");
assert(html.has("/en/game/narcissu/"), "Missing Narcissu detail");
assert(html.has("/ja/game/narcissu/"), "Missing Japanese Narcissu detail");
assert(html.has("/en/languages/ja/"), "Missing actual playable language route");
const narcissu = html.get("/en/game/narcissu/") || "";
assert(narcissu.includes("Narcissu") && narcissu.includes("Destiny236-Narcissuweb"), "Game detail lacks static content or legacy play URL");
assert(robots.get("/en/game/narcissu/")?.includes("noindex"), "Draft Narcissu accidentally indexable");
for (const [path, page] of html) {
  const links = [...page.matchAll(/<link\b[^>]*rel="alternate"[^>]*>/gi)].map((x) => x[0]);
  for (const link of links) {
    const href = hrefFrom(link);
    const target = pageForUrl(href);
    const code = link.match(/hreflang="([^"]+)"/)?.[1];
    assert(!!target, path + ": hreflang target missing " + href);
    if (!target || !code) continue;
    if (code !== "x-default") {
      assert(!robots.get(target)?.includes("noindex"), path + ": hreflang points at noindex " + target);
      assert(canonicals.get(target) === href, path + ": alternate is not self canonical " + target);
      const reverse = html.get(target) || "";
      const expected = '<link rel="alternate" hreflang="' + (path === "/" ? "en" : path.split("/")[1]) + '" href="' + (path === "/" ? "https://webrpg.org/en/" : "https://webrpg.org" + path) + '"';
      assert(reverse.includes(expected), path + ": hreflang not reciprocal with " + target);
    } else assert(target === "/", path + ": unexpected x-default " + href);
  }
}
const xml = await readFile(join(dist, "sitemap.xml"), "utf8");
const sitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
assert(sitemap.length > 0 && new Set(sitemap).size === sitemap.length, "Sitemap empty or duplicate");
for (const url of sitemap) {
  const path = pageForUrl(url);
  assert(!!path, "Sitemap target absent " + url);
  if (!path) continue;
  assert(!robots.get(path)?.includes("noindex"), "Noindex in sitemap " + path);
  assert(canonicals.get(path) === url, "Noncanonical in sitemap " + path);
}
assert(!sitemap.includes("https://webrpg.org/"), "Root duplicate in sitemap");
assert(!sitemap.some((url) => /\/game\//.test(url) && robots.get(new URL(url).pathname)?.includes("noindex")), "Draft in sitemap");
assert((await readFile(join(dist, "CNAME"), "utf8")).trim() === "webrpg.org", "CNAME mismatch");
assert(names.has("robots.txt"), "Missing robots.txt");
assert(!names.has("list.json") && !names.has("games.json"), "Raw upstream JSON leaked into public dist");
const pageCounts = {};
for (const locale of ["en", "zh-Hans", "ja"]) pageCounts[locale] = [...html.keys()].filter((x) => x.startsWith("/" + locale + "/")).length;
const source = catalog.source;
let frontendCommit = catalog.frontendCommit;
try { frontendCommit = execFileSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).trim(); } catch { }
const manifest = {
  generatedAt: new Date().toISOString(), frontendCommit, indexCommit: source.commit, indexFileHashes: source.hashes,
  catalogHash: catalog.catalogHash, adapterVersions: catalog.schemaVersions, stats: catalog.stats,
  pages: {total:html.size, byLocale:pageCounts, noindex, indexable:html.size-noindex,
    sitemap:sitemap.length, jsonLd:ldCount, inspectedInternalAnchors:linkCount},
  routesHash:hash([...html.keys()].sort().join("\n")), searchIndexes:catalog.searchFiles,
  warnings:catalog.warnings.length, violations:errors,
};
await writeFile(join(dist,"build-manifest.json"),JSON.stringify(manifest,null,2));
if (errors.length) {
  console.error("Dist verification failed (" + errors.length + "):");
  for (const message of errors.slice(0, 60)) console.error(" - " + message);
  process.exitCode = 1;
} else console.log("Dist verification passed: " + JSON.stringify(manifest.pages));
