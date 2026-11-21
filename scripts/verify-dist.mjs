import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { getSitemapDiagnostics, SITEMAP_CHILDREN, SITEMAP_ORIGIN } from "../src/seo/sitemap-data.ts";

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
const uniqueCanonicalTitles = new Map();
let linkCount = 0, ldCount = 0, noindex = 0;
for (const [path, page] of html) {
  const is404 = path === "/404.html";
  const canonical = hrefFrom(attr(page, "link", "rel", "canonical"));
  const robot = attr(page, "meta", "name", "robots").match(/\bcontent="([^"]+)"/)?.[1] || "";
  const expected = "https://webrpg.org" + (path === "/" ? "/en/" : path);
  canonicals.set(path, canonical);
  robots.set(path, robot);
  if (robot.includes("noindex")) noindex++;
  const renderedTitle = titleFrom(page);
  assert(renderedTitle.length > 5, path + ": missing title");
  // The only intentional duplicate content path is / (canonicalized to /en/).
  if (path !== "/" && !is404 && renderedTitle) {
    const duplicate = uniqueCanonicalTitles.get(renderedTitle);
    assert(!duplicate, path + ": duplicate HTML Title with " + duplicate);
    uniqueCanonicalTitles.set(renderedTitle, path);
  }
  const metaDescription = descFrom(page).replace(/&(?:amp|quot|#39|lt|gt);/g, "X");
  assert(metaDescription.length > 9, path + ": missing description");
  if (!is404 && !robot.includes("noindex")) {
    assert(metaDescription.length >= 70 && metaDescription.length <= 155,
      path + ": poor meta description length " + metaDescription.length);
    const decodedTitle = renderedTitle.replace(/&(?:amp|quot|#39|lt|gt);/g, "X");
    assert(Array.from(decodedTitle).length <= 65, path + ": overly long HTML title");
  }
  assert(!!attr(page,"meta","property","og:image"), path + ": missing OG image");
  assert(!!attr(page,"meta","property","og:site_name"), path + ": missing OG site name");
  assert(!!attr(page,"meta","name","twitter:image"), path + ": missing Twitter image");
  const locale = path === "/" || path === "/404.html" ? "en" : path.split("/")[1];
  const ogLocale = {en: "en_US", "zh-Hans": "zh_CN", ja: "ja_JP"}[locale];
  assert(!!attr(page, "meta", "property", "og:locale").match(new RegExp('content="' + ogLocale + '"')), path + ": invalid Open Graph locale");
  assert(/<h1\b/i.test(page), path + ": missing static H1");
  assert(/<html\b[^>]*\blang="(en|ja|zh-Hans)"/.test(page), path + ": bad html language");
  if (!is404) assert(canonical === expected, path + ": incorrect canonical " + canonical);
  if (is404) assert(!canonical, "404 page must not canonicalize to a live homepage");
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
      // Person vs Organization cannot be inferred from the catalog; untyped Thing is invalid here.
      assert(!JSON.stringify(ld).includes('"@type":"Thing"'),path + ": ambiguous developer/publisher type");
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
assert(html.has("/en/languages/ja/"), "Missing actual playable language route");
// Never encode an individual game's historical draft/noindex status into the auditor.
// Snapshot-driven assertions follow the product's direct-publication policy for every locale.
for (const game of catalog.games) {
  for (const locale of ["en", "zh-Hans", "ja"]) {
    const path = "/" + locale + "/game/" + game.slug + "/";
    const page = html.get(path) || "";
    const indexed = game.indexable[locale] === true;
    assert(!!page, path + ": missing game detail");
    assert(robots.get(path) === (indexed ? "index,follow" : "noindex,follow"), path + ": wrong index decision");
    assert(page.includes("<h1"), path + ": missing factual game heading");
    assert(!page.includes("作品介绍尚未审核") && !page.includes("Editorial preview") && !page.includes("審査されていません"), path + ": stale draft preview notice");
    for (const relation of game.relations) {
      assert(page.includes('href="/' + locale + '/game/' + relation.slug + '/"'), path + ": missing directed relation to " + relation.slug);
    }
    for (const credit of [...game.developers, ...game.publishers]) {
      if (credit.url) assert(page.includes('href="' + credit.url.replace(/&/g,"&amp;") + '"'), path + ": missing credited source URL " + credit.name);
    }
  }
}
for (const [path, page] of html) {
  const links = [...page.matchAll(/<link\b[^>]*rel="alternate"[^>]*>/gi)].map((x) => x[0]);
  if (!robots.get(path)?.includes("noindex")) {
    const defaults=links.filter((link) => link.includes('hreflang="x-default"'));
    assert(defaults.length === 1,path + ": every indexable page requires exactly one x-default");
  }
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
    } else {
      assert(target?.startsWith("/en/"), path + ": x-default must target the English canonical counterpart " + href);
      assert(canonicals.get(target) === href, path + ": x-default points to noncanonical URL " + href);
      assert(!robots.get(target)?.includes("noindex"), path + ": x-default points to noindex");
    }
  }
}
// Parse XML with a real namespace-aware parser; regex cannot verify well-formed XML.
const NS = "http://www.sitemaps.org/schemas/sitemap/0.9";
const sitemapFiles = ["sitemap.xml", "sitemap-catalog.xml", "sitemap-play.xml"];
const sitemapXmls = Object.fromEntries(await Promise.all(sitemapFiles.map(async (name) => [name,
  await readFile(join(dist, name), "utf8")])));
function parseSitemapXml(filename, rootName, entryName) {
  const xml = sitemapXmls[filename];
  const parser = new DOMParser({ onError: (level, message) => {
    throw new Error(filename + ": XML " + level + ": " + message);
  }});
  const doc = parser.parseFromString(xml, "application/xml");
  const rootElement = doc.documentElement;
  assert(rootElement?.localName === rootName && rootElement.namespaceURI === NS,
    filename + ": wrong XML root/namespace");
  assert(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
    filename + ": expected UTF-8 XML declaration");
  assert(!/<(?:lastmod|changefreq|priority)\b/.test(xml),
    filename + ": fabricated date or unsupported priority/changefreq");
  const elements = [...rootElement.childNodes].filter((node) => node.nodeType === 1);
  const urls = [];
  for (const element of elements) {
    assert(element.localName === entryName && element.namespaceURI === NS,
      filename + ": invalid item tag/namespace");
    const children = [...element.childNodes].filter((node) => node.nodeType === 1);
    assert(children.length === 1 && children[0].localName === "loc" &&
      children[0].namespaceURI === NS, filename + ": each item must contain exactly one loc");
    const url = children[0]?.textContent || "";
    let parsed;
    try { parsed = new URL(url); } catch { assert(false, filename + ": invalid loc " + url); continue; }
    assert(parsed.origin === SITEMAP_ORIGIN && parsed.protocol === "https:" &&
      !parsed.search && !parsed.hash && parsed.href === url,
      filename + ": foreign or noncanonical loc " + url);
    urls.push(url);
  }
  assert(new Set(urls).size === urls.length, filename + ": duplicate URL");
  assert(urls.every((url, i) => !i || urls[i-1] < url),
    filename + ": URLs must be deterministically sorted");
  return urls;
}
const sitemapIndex = parseSitemapXml("sitemap.xml", "sitemapindex", "sitemap");
const sitemap = parseSitemapXml("sitemap-catalog.xml", "urlset", "url");
const playSitemap = parseSitemapXml("sitemap-play.xml", "urlset", "url");
assert(JSON.stringify(sitemapIndex) === JSON.stringify([...SITEMAP_CHILDREN].sort()),
  "Sitemap Index must list exactly the two expected children");
assert(sitemap.length > 0, "Catalog Sitemap must not be empty");
const sitemapSet = new Set(sitemap);
const expectedCatalog = [...html.keys()].filter((path) =>
  path !== "/" && path !== "/404.html" && robots.get(path) === "index,follow" &&
  canonicals.get(path) === SITEMAP_ORIGIN + path).map((path) => SITEMAP_ORIGIN + path).sort();
assert(sitemap.length === expectedCatalog.length &&
  sitemap.every((url, i) => url === expectedCatalog[i]),
  "Catalog sitemap must be exactly the set of self-canonical indexable generated pages");
for (const url of sitemap) {
  const path = pageForUrl(url);
  assert(!!path, "Catalog target absent " + url);
  if (!path) continue;
  assert(!robots.get(path)?.includes("noindex"), "Noindex in Catalog Sitemap " + path);
  assert(canonicals.get(path) === url, "Noncanonical Catalog URL " + path);
}
assert(!sitemapSet.has(SITEMAP_ORIGIN + "/"), "Root duplicate in Catalog Sitemap");
const playDiagnostics = getSitemapDiagnostics(catalog, sitemap);
const internalEligible = catalog.games.flatMap((game) => game.instances).filter((instance) =>
  instance.type === "internal" && instance.available === true && !instance.needsReview);
const eligibleUrls = [...new Set(internalEligible.map((instance) => instance.playUrl))].sort();
assert(playSitemap.length === eligibleUrls.length &&
  playSitemap.every((url, i) => url === eligibleUrls[i]),
  "Play Sitemap must include all and only the technically eligible internal game URLs");
assert(playDiagnostics.urls.length === playSitemap.length &&
  playDiagnostics.urls.every((url, i) => url === playSitemap[i]),
  "Play Sitemap differs from source-catalog diagnostics");
const playSet = new Set(playSitemap);
for (const url of playSitemap) {
  assert(!sitemapSet.has(url), "Catalog/Play duplicate " + url);
  assert(internalEligible.some((instance) => instance.playUrl === url), "Play URL not backed by a valid internal instance: " + url);
  assert(!/\/(?:en|zh-Hans|ja|assets|_astro|images|fonts)\//.test(new URL(url).pathname.slice(0, 14)),
    "Play Sitemap unexpectedly contains a website asset or catalog path " + url);
}
assert(playDiagnostics.candidates === catalog.games.reduce((sum, game) => sum + game.instances.length, 0),
  "Instance diagnostics did not inspect all catalog entries");
// Content-rating facets are browseable static HTML, but deliberately noindex to avoid
// duplicating the canonical work directory. Their pagination must remain valid without JS.
for (const locale of ["en", "zh-Hans", "ja"]) {
  for (const [group, expectedState] of [["safe",false],["adult",true],["unknown","unknown"]]) {
    const works=catalog.games.filter((game)=>game.nsfw===expectedState);
    const last=Math.ceil(works.length/36);
    for (let number=1;number<=last;number++) {
      const path="/"+locale+"/nsfw/"+group+"/"+(number>1?"page/"+number+"/":"");
      assert(html.has(path),path+": missing static content rating page");
      assert(robots.get(path)?.includes("noindex"),path+": filter page must noindex");
      assert(!sitemapSet.has("https://webrpg.org"+path),path+": filtered facet leaked into sitemap");
    }
    assert(!html.has("/"+locale+"/nsfw/"+group+"/page/1/"),locale+": duplicate first facet page");
  }
}
assert(!html.has("/en/nsfw/invalid/"),"Invalid content rating group must not render");
for (const game of catalog.games) {
  for (const locale of ["en", "zh-Hans", "ja"]) {
    const path = "/" + locale + "/game/" + game.slug + "/";
    const listed = sitemapSet.has("https://webrpg.org" + path);
    assert(listed === (game.indexable[locale] === true), path + ": sitemap/indexability mismatch");
  }
}
assert(!sitemap.some((url) => /\/game\//.test(url) && robots.get(new URL(url).pathname)?.includes("noindex")), "Noindex game appears in sitemap");
assert((await readFile(join(dist, "CNAME"), "utf8")).trim() === "webrpg.org", "CNAME mismatch");
assert(names.has("robots.txt"), "Missing robots.txt");
const robotsTxt = await readFile(join(dist, "robots.txt"), "utf8");
assert(robotsTxt.match(/^Sitemap: .*$/gm)?.length === 1 &&
  robotsTxt.includes("Sitemap: https://webrpg.org/sitemap.xml"),
  "robots.txt must only reference the stable Sitemap Index");
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
  sitemaps: {
    index: {url: SITEMAP_ORIGIN + "/sitemap.xml", count: sitemapIndex.length, bytes: Buffer.byteLength(sitemapXmls["sitemap.xml"])},
    catalog: {url: SITEMAP_CHILDREN[0], count: sitemap.length, bytes: Buffer.byteLength(sitemapXmls["sitemap-catalog.xml"])},
    play: {url: SITEMAP_CHILDREN[1], count: playSitemap.length, bytes: Buffer.byteLength(sitemapXmls["sitemap-play.xml"])},
    candidates: playDiagnostics.candidates, internalCandidates: playDiagnostics.internalCandidates,
    excludedByReason: playDiagnostics.excludedByReason, excludedRecords: playDiagnostics.excluded,
  },
  routesHash:hash([...html.keys()].sort().join("\n")), searchIndexes:catalog.searchFiles,
  warnings:catalog.warnings.length, violations:errors,
};
await writeFile(join(dist,"build-manifest.json"),JSON.stringify(manifest,null,2));
if (errors.length) {
  console.error("Dist verification failed (" + errors.length + "):");
  for (const message of errors.slice(0, 60)) console.error(" - " + message);
  process.exitCode = 1;
} else console.log("Dist verification passed: " + JSON.stringify(manifest.pages));
