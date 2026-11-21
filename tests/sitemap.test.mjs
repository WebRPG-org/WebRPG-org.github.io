import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOMParser } from "@xmldom/xmldom";
import {
  SITEMAP_CHILDREN, getCatalogUrls, getPlayUrls, getSitemapDiagnostics,
} from "../src/seo/sitemap-data.ts";
import { escapeXml, serializeSitemapIndex, serializeUrlSet } from "../src/seo/sitemap-xml.ts";

const catalog = JSON.parse(readFileSync(new URL("../.cache/catalog.json", import.meta.url), "utf8"));
const routes = (locale, route) => {
  if (route.kind === "home" || route.kind === "page" && route.page === 1) return "/" + locale + "/";
  if (route.kind === "page") return "/" + locale + "/page/" + route.page + "/";
  return "/" + locale + "/" + route.kind + "/" + route.slug + "/" +
    (route.page > 1 ? "page/" + route.page + "/" : "");
};
const namespace = "http://www.sitemaps.org/schemas/sitemap/0.9";
function xmlEntries(xml, expectedRoot, itemTag) {
  const parser = new DOMParser({onError: (level,message) => {
    throw Error(level + ": " + message);
  }});
  const doc = parser.parseFromString(xml,"application/xml");
  assert.equal(doc.documentElement.localName,expectedRoot);
  assert.equal(doc.documentElement.namespaceURI,namespace);
  return [...doc.documentElement.childNodes].filter((n) => n.nodeType === 1).map((element) => {
    assert.equal(element.localName,itemTag);
    assert.equal(element.namespaceURI,namespace);
    const children=[...element.childNodes].filter((node) => node.nodeType === 1);
    assert.equal(children.length,1);
    assert.equal(children[0].localName,"loc");
    return children[0].textContent;
  });
}
const game = (slug, instances, overrides={}) => ({
  slug, instances,
  genres:["rpg"], themes:["horror"], languages:["en","ja"],
  nsfw:false, indexable:{"en":true,"zh-Hans":true,"ja":true},
  editorialStatus:"draft",
  introductions:{en:{summary:"",overview:"",story:"",highlights:[]}},
  ...overrides,
});
const internal = (id, forkName, tail="/", overrides={}) => ({
  type:"internal", id, forkName,
  playUrl:"https://webrpg.org/"+forkName+tail,
  available:true,needsReview:false,...overrides,
});
const external = (url, overrides={}) => ({
  type:"external",playUrl:url,available:true,needsReview:false,...overrides,
});

test("real snapshot: catalog indexability mirrors all eligible game locales, not draft/NSFW/introduction",()=>{
  const urls=getCatalogUrls(catalog,routes);
  const count=catalog.games.reduce((n,g)=>n+Object.values(g.indexable).filter(Boolean).length,0);
  const gameUrls=urls.filter((x)=>/\/game\//.test(x));
  assert.equal(gameUrls.length,count);
  assert.equal(new Set(urls).size,urls.length);
  assert.deepEqual(urls,[...urls].sort());
  for(const locale of ["en","zh-Hans","ja"]) assert(urls.includes("https://webrpg.org/"+locale+"/"));
  assert(!urls.includes("https://webrpg.org/"));
  assert(!urls.some((x)=>/\/(?:nsfw\/|page\/1\/)/.test(x)));
  for(const g of catalog.games){
    for(const locale of ["en","zh-Hans","ja"]){
      const url="https://webrpg.org/"+locale+"/game/"+g.slug+"/";
      assert.equal(urls.includes(url),g.indexable[locale]===true,g.slug+"/"+locale);
    }
  }
});

test("real snapshot: Play contains all and only safe internal instances, preserving case and HTML entry paths",()=>{
  const catalogUrls=getCatalogUrls(catalog,routes);
  const d=getSitemapDiagnostics(catalog,catalogUrls);
  const eligible=catalog.games.flatMap(g=>g.instances).filter(x=>x.type==="internal"&&x.available===true&&!x.needsReview);
  assert.deepEqual(d.urls,[...new Set(eligible.map(x=>x.playUrl))].sort());
  assert.equal(d.internalCandidates,catalog.games.flatMap(g=>g.instances).filter(x=>x.type==="internal").length);
  assert.equal(d.candidates,catalog.games.reduce((n,g)=>n+g.instances.length,0));
  assert.equal(d.candidates,d.urls.length+d.excluded.length);
  assert.equal(d.excludedByReason["external-instance"],catalog.games.flatMap(g=>g.instances).filter(x=>x.type==="external").length);
  assert(!d.urls.some(x=>catalogUrls.includes(x)));
  assert(d.urls.includes("https://webrpg.org/rex-lam-Anti-FraudX/rpg_game.html"));
  for(const item of eligible) assert(d.urls.includes(item.playUrl),item.playUrl);
  assert(!d.urls.some(x=>new URL(x).hostname!=="webrpg.org"));
});

test("fixture: multi-version, NSFW, missing intro and external-only Game route stays indexable as directed",()=>{
  const multi=game("mixed",[
    internal("a","Owner-Repo","/"),
    internal("b","Owner-Beta","/game.html"),
    external("https://other.example/rpg/game.html"),
    internal("c","Owner-Broken","/",{available:false}),
    internal("d","Owner-Review","/",{needsReview:true}),
  ],{nsfw:true,editorialStatus:"draft"});
  const outside=game("external-only",[external("https://outside.example/index.html")],{genres:["rpg"],nsfw:"unknown"});
  const nointro=game("no-introduction",[internal("q","Owner-Nointro","/rpg.html")],{editorialStatus:"draft"});
  const data={games:[multi,outside,nointro]};
  const pages=getCatalogUrls(data,routes);
  assert(pages.includes("https://webrpg.org/en/game/mixed/"));
  assert(pages.includes("https://webrpg.org/zh-Hans/game/external-only/"));
  assert(pages.includes("https://webrpg.org/ja/game/no-introduction/"));
  assert(!pages.some(x=>x.includes("/nsfw/")));
  const diag=getSitemapDiagnostics(data,pages);
  assert.deepEqual(diag.urls,[
    "https://webrpg.org/Owner-Beta/game.html",
    "https://webrpg.org/Owner-Nointro/rpg.html",
    "https://webrpg.org/Owner-Repo/",
  ]);
  assert.equal(diag.excludedByReason["external-instance"],2);
  assert.equal(diag.excludedByReason.unavailable,1);
  assert.equal(diag.excludedByReason["needs-review"],1);
  // Disabling only one version must not affect other valid Play URLs or its Game page.
  multi.instances[0].available=false;
  const next=getPlayUrls(data,pages);
  assert(!next.includes("https://webrpg.org/Owner-Repo/"));
  assert(next.includes("https://webrpg.org/Owner-Beta/game.html"));
  assert.deepEqual(getCatalogUrls(data,routes),pages);
});

test("fixture: reject non-WebRPG, catalog, static asset, query/fragment and duplicate runtime URLs",()=>{
  const entries=[
    internal("valid","Owner-Valid","/"),
    internal("duplicate","Owner-Valid","/"),
    internal("q","Owner-Q","/game.html?ref=tracking"),
    internal("frag","Owner-Hash","/game.html#level"),
    internal("foreign","Owner-Foreign","/",{playUrl:"https://outside.example/Owner-Foreign/"}),
    internal("homepage","Owner-Home","/",{playUrl:"https://webrpg.org/"}),
    internal("nested","Owner-Sub","/",{playUrl:"https://webrpg.org/en/game/foo/"}),
    internal("assets","Owner-Asset","/",{playUrl:"https://webrpg.org/assets/cover.png"}),
    internal("overlap","Owner-Overlap","/",{playUrl:"https://webrpg.org/en/game/mixed/"}),
    external("https://webrpg.org/External-Site/"),
    internal("unavailable","Owner-Down","/",{available:"unknown"}),
  ];
  const data={games:[game("mixed",entries)]};
  const catalogUrls=getCatalogUrls(data,routes);
  const diag=getSitemapDiagnostics(data,catalogUrls);
  assert.deepEqual(diag.urls,["https://webrpg.org/Owner-Valid/"]);
  assert.equal(diag.excludedByReason["duplicate-url"],1);
  assert.equal(diag.excludedByReason["query-or-fragment"],2);
  assert.equal(diag.excludedByReason["invalid-url"],1);
  assert.equal(diag.excludedByReason["unsafe-runtime-path"],4);
  const overlap=getSitemapDiagnostics(data,[...catalogUrls,"https://webrpg.org/Owner-Valid/"]);
  assert.equal(overlap.excludedByReason["overlaps-catalog"],2);
  assert.equal(diag.excludedByReason["external-instance"],1);
  assert.equal(diag.excludedByReason.unavailable,1);
  assert(diag.excluded.some(x=>x.instanceId==="q"&&x.playUrl.endsWith("?ref=tracking")));
});

test("XML is namespace-aware and round-trips escaped URLs with no fake lastmod, priority or changefreq",()=>{
  const url="https://webrpg.org/Owner-A&B/game.html";
  const cat=serializeUrlSet([url,"https://webrpg.org/en/"]);
  const children=serializeSitemapIndex(SITEMAP_CHILDREN);
  assert.deepEqual(xmlEntries(cat,"urlset","url"),["https://webrpg.org/en/",url].sort());
  assert.deepEqual(xmlEntries(children,"sitemapindex","sitemap"),[...SITEMAP_CHILDREN].sort());
  assert.match(cat,/Owner-A&amp;B/);
  assert.equal(escapeXml("<>&\"'"),"&lt;&gt;&amp;&quot;&apos;");
  assert(!/lastmod|priority|changefreq/.test(cat+children));
  assert.equal(serializeUrlSet([url,"https://webrpg.org/en/"]),cat);
  assert.equal(serializeSitemapIndex(SITEMAP_CHILDREN),children);
  assert.throws(()=>serializeUrlSet([url,url]),/duplicate/);
  assert.throws(()=>serializeUrlSet(["https://evil.example/"]),/Noncanonical/);
  assert.throws(()=>serializeUrlSet(["https://webrpg.org/en/?t=2"]),/Noncanonical/);
  assert.throws(()=>escapeXml("a\u0001b"),/Invalid XML/);
});

test("catalog+play changes deterministically with the normalized snapshot and never needs a second fetch",()=>{
  const data=structuredClone(catalog);
  const old=getPlayUrls(data),oldCatalog=getCatalogUrls(data,routes);
  const sample=data.games.find(g=>g.instances.some(i=>i.type==="internal"&&i.available===true&&!i.needsReview));
  assert(sample);
  const target=sample.instances.find(i=>i.type==="internal"&&i.available===true&&!i.needsReview);
  target.available=false;
  const updated=getPlayUrls(data);
  assert.equal(updated.length,old.length-1);
  assert(!updated.includes(target.playUrl));
  // Other instances keep the Game indexable (or the Game's indexability is
  // revised in the same source snapshot by normalizeCatalog).
  const still=getCatalogUrls(data,routes);
  assert.deepEqual(still,oldCatalog,"Changing Play instance must not implicitly invent editorial gates");
  assert.equal(serializeUrlSet(getPlayUrls(data)),serializeUrlSet(getPlayUrls(data)));
});
