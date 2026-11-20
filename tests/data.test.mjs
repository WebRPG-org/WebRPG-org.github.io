import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeCatalog, canIndexGameLocale, registerAdapter, adaptGameV1, makeSearchIndex, searchGames, LOCALES, PAGE_SIZE } from "../scripts/catalog-core.mjs";
const snapshot = JSON.parse(readFileSync(new URL("../.cache/catalog.json", import.meta.url), "utf8"));
const rawGames = JSON.parse(readFileSync(new URL("../.cache/snapshots/" + snapshot.source.commit + "/games.json", import.meta.url), "utf8"));
const rawList = JSON.parse(readFileSync(new URL("../.cache/snapshots/" + snapshot.source.commit + "/list.json", import.meta.url), "utf8"));
const fixtureGame = (slug, instances, extra={}) => ({
  schemaVersion: 1, slug, originalTitle: "Fixture " + slug,
  introductions: {en:{summary:"A detailed original synopsis with enough meaningful words to describe this independently reviewed playable game in depth.",editorialStatus:"published"}},
  editorial: {status:"published"}, contentAdvisory: {nsfw:false}, seo:{indexPolicy:"auto"},
  taxonomy:{genres:["rpg"],themes:["fantasy"]}, instances, ...extra,
});
const inner = {type:"internal",id:"one",title:"Playable",languages:["pt","zh-Hant"]};
const listEntry = {id:"one",status:"verified",forkName:"Creator-One",pagesUrl:"https://webrpg.org/Creator-One/alt-entry.html",
  meta:{gameSlug:"fixture",playable:true},sourceHeadSha:"sha"};
const fixture = () => ({registryVersion:1,games:{fixture:fixtureGame("fixture",[inner])}});
test("consistent remote data, 414 class catalog, multi-instance and real NSFW unknown", () => {
  const normalized = normalizeCatalog(rawGames,rawList,snapshot.source);
  assert.equal(normalized.stats.games,snapshot.games.length);
  assert.equal(normalized.stats.instances,snapshot.stats.instances);
  assert.equal(normalized.stats.unknownNsfw,snapshot.stats.unknownNsfw);
  assert(normalized.stats.multiInstanceGames>=1);
  assert.equal(normalized.stats.indexableGameLocales,0);
  assert(normalized.games.every(g=>LOCALES.every(l=>g.indexable[l]===false)));
  assert(normalized.games.some(g=>g.instances.length>1));
  assert(!JSON.stringify(makeSearchIndex(normalized.games,"en")).match(/popularity|rating|assessmentNote/));
});
test("per-game source version adapter, unknown future version fails closed", () => {
  const x=fixture();x.games.fixture.schemaVersion=2;
  assert.throws(()=>normalizeCatalog(x,[listEntry]),/No Game adapter/);
  registerAdapter(2,(key,src)=>({...adaptGameV1(key,{...src,schemaVersion:1}),schemaVersion:2}));
  assert.equal(normalizeCatalog(x,[listEntry]).games[0].schemaVersion,2);
});
test("bidirectional linked instance IDs, playable and duplicate assignment enforce integrity", () => {
  const x=fixture();
  assert.throws(()=>normalizeCatalog(x,[]),/missing list ID/);
  assert.throws(()=>normalizeCatalog(x,[{...listEntry,meta:{gameSlug:"other",playable:true}}]),/mismatch/);
  assert.throws(()=>normalizeCatalog(x,[{...listEntry,meta:{gameSlug:"fixture",playable:false}}]),/Non-playable/);
  assert.throws(()=>normalizeCatalog({registryVersion:1,games:{fixture:x.games.fixture,other:fixtureGame("other",[inner])}},[listEntry]),/Duplicate internal/);
  assert.throws(()=>normalizeCatalog({registryVersion:1,games:{"../bad":fixtureGame("../bad",[inner])}},[listEntry]),/slug/);
  assert.throws(()=>normalizeCatalog(x,[{...listEntry,forkName:"assets"}]),/collides/);
});
test("unknown NSFW stays unknown; original deep game URLs stay unchanged", () => {
  const x=fixture();x.games.fixture.contentAdvisory={nsfw:"unknown"};
  const view=normalizeCatalog(x,[listEntry]).games[0];
  assert.equal(view.nsfw,"unknown"); assert.equal(view.instances[0].nsfw,"unknown");
  assert.equal(view.instances[0].playUrl,listEntry.pagesUrl);
  assert.deepEqual(view.instances[0].languages,["pt","zh-Hant"]);
});
test("an independently reviewed external instance has its own URL; not a fork path", () => {
  const x={registryVersion:1,games:{external:fixtureGame("external",[{type:"external",title:"Play elsewhere",url:"https://example.org/run/index.html",cover:"https://example.org/cover.png",languages:["ko"],available:true,editorialStatus:"reviewed",nsfw:false}])}};
  const view=normalizeCatalog(x,[]).games[0];
  assert.equal(view.instances[0].playUrl,"https://example.org/run/index.html");
  assert.equal(view.instances[0].coverUrl,"https://example.org/cover.png");
  assert.equal(view.instances[0].available,true);
  assert(view.languages.includes("ko"));
  assert.equal(view.instances[0].type,"external");
});
test("changed upstream game code invalidates a prior review until re-reviewed",()=>{
  const x=fixture();
  const altered={...listEntry,meta:{...listEntry.meta,nsfw:false,reviewedSourceHeadSha:"older-revision"},sourceHeadSha:"newer-revision"};
  const view=normalizeCatalog(x,[altered]).games[0];
  assert.equal(view.instances[0].needsReview,true);
  assert.equal(view.indexable.en,false);
});
test("indexability requires global and per-language review, real synopsis, and valid instances", () => {
  const x=fixture();x.games.fixture.editorial={status:"published"};x.games.fixture.introductions.en.editorialStatus="published";
  const view=normalizeCatalog(x,[{...listEntry,meta:{...listEntry.meta,nsfw:false}}]).games[0];
  assert.equal(canIndexGameLocale(view,"en"),true);
  assert.equal(canIndexGameLocale(view,"ja"),false);
  view.indexPolicy="noindex";assert.equal(canIndexGameLocale(view,"en"),false);
  view.indexPolicy="auto";view.introductions.en.overview="待审核的作品介绍（示例内容，不应发布）";
  assert.equal(canIndexGameLocale(view,"en"),false);
});
test("search index covers every game, including beyond first 36, no popularity", () => {
  for(const locale of LOCALES){
    const index=makeSearchIndex(snapshot.games,locale);
    assert.equal(index.length,snapshot.stats.games);
    assert(index.length>PAGE_SIZE);
    const beyond=index.at(-1);
    assert(searchGames(index,beyond.slug,{nsfw:true}).some(x=>x.slug===beyond.slug));
    assert(index.some(x=>x.languages.includes("zh-Hant")));
    assert(!index.some(x=>Object.hasOwn(x,"popularity") || Object.hasOwn(x,"rating")));
  }
});
