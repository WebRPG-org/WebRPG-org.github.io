import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  normalizeCatalog, canIndexGameLocale, registerAdapter, adaptGameV1,
  makeSearchIndex, searchGames, sortedGames, LOCALES, PAGE_SIZE,
} from "../scripts/catalog-core.mjs";
const snapshot = JSON.parse(readFileSync(new URL("../.cache/catalog.json", import.meta.url), "utf8"));
const rawGames = JSON.parse(readFileSync(new URL("../.cache/snapshots/" + snapshot.source.commit + "/games.json", import.meta.url), "utf8"));
const rawList = JSON.parse(readFileSync(new URL("../.cache/snapshots/" + snapshot.source.commit + "/list.json", import.meta.url), "utf8"));
const fixtureGame = (slug, instances, extra={}) => ({
  schemaVersion: 1, slug, originalTitle: "Fixture " + slug,
  introductions: {en:{summary:"A factual introduction for a playable browser game.",editorialStatus:"draft"}},
  editorial: {status:"draft",qualityFlags:["description-unverified"]},
  contentAdvisory: {nsfw:false}, seo:{indexPolicy:"auto"},
  taxonomy:{genres:["rpg"],themes:["fantasy"]}, instances, ...extra,
});
const inner = {type:"internal",id:"one",title:"Playable",languages:["pt","zh-Hant"]};
const listEntry = {id:"one",status:"verified",forkName:"Creator-One",pagesUrl:"https://webrpg.org/Creator-One/alt-entry.html",
  meta:{gameSlug:"fixture",playable:true},sourceHeadSha:"sha"};
const fixture = () => ({registryVersion:1,games:{fixture:fixtureGame("fixture",[{...inner}])}});
const normalize = (registry=fixture(), list=[listEntry]) => normalizeCatalog(registry,list);
const digest = (games) => createHash("sha256").update(JSON.stringify(games)).digest("hex");

test("real immutable snapshot: all works and draft game locales remain indexable when technically valid", () => {
  const normalized = normalizeCatalog(rawGames,rawList,snapshot.source);
  assert.equal(normalized.stats.games,snapshot.games.length);
  assert.equal(normalized.stats.instances,snapshot.stats.instances);
  assert.equal(normalized.stats.unknownNsfw,normalized.games.filter(g=>g.nsfw==="unknown").length);
  assert(normalized.stats.unknownNsfw>0);
  assert(normalized.stats.multiInstanceGames>=1);
  assert(normalized.stats.indexableGameLocales > 1200);
  assert.equal(normalized.stats.indexableGameLocales,snapshot.stats.indexableGameLocales);
  assert(normalized.games.some(g=>g.editorialStatus==="draft" && g.indexable.en === true));
  assert(normalized.games.some(g=>g.nsfw === "unknown" && g.indexable.en === true));
  assert(normalized.games.some(g=>g.nsfw === true && g.indexable.en === true));
  assert(makeSearchIndex(normalized.games,"en").every(row => !["popularity","rating","assessmentNote","editorialRating"].some(key => Object.hasOwn(row,key))));
});

test("per-game schema adapter accepts known revisions, rejects unknown revisions", () => {
  const x=fixture();x.games.fixture.schemaVersion=2;
  assert.throws(()=>normalize(x),/No Game adapter/);
  registerAdapter(2,(key,src)=>({...adaptGameV1(key,{...src,schemaVersion:1}),schemaVersion:2}));
  assert.equal(normalize(x).games[0].schemaVersion,2);
});

test("bidirectional linkage, playable state, ID ownership and path reservation fail closed", () => {
  const x=fixture();
  assert.throws(()=>normalize(x,[]),/missing list ID/);
  assert.throws(()=>normalize(x,[{...listEntry,meta:{gameSlug:"other",playable:true}}]),/mismatch/);
  assert.throws(()=>normalize(x,[{...listEntry,meta:{gameSlug:"fixture",playable:false}}]),/Non-playable/);
  assert.throws(()=>normalize({registryVersion:1,games:{fixture:x.games.fixture,other:fixtureGame("other",[inner])}}),/Duplicate internal/);
  assert.throws(()=>normalize({registryVersion:1,games:{"../bad":fixtureGame("../bad",[inner])}}),/slug/);
  assert.throws(()=>normalize(x,[{...listEntry,forkName:"assets"}]),/collides/);
});

test("explicit boolean NSFW differences between games and list must stop the build", () => {
  const x=fixture();
  x.games.fixture.instances[0].nsfw=true;
  assert.throws(()=>normalize(x,[{...listEntry,meta:{...listEntry.meta,nsfw:false}}]),/NSFW classification mismatch/);
  x.games.fixture.instances[0].nsfw=false;
  assert.throws(()=>normalize(x,[{...listEntry,meta:{...listEntry.meta,nsfw:true}}]),/NSFW classification mismatch/);
});

test("unknown and absent NSFW remain tri-state; nested original URLs and playable languages are preserved", () => {
  const x=fixture();x.games.fixture.contentAdvisory={nsfw:"unknown"};
  const view=normalize(x).games[0];
  assert.equal(view.nsfw,"unknown"); assert.equal(view.instances[0].nsfw,"unknown");
  assert.equal(view.instances[0].playUrl,listEntry.pagesUrl);
  assert.deepEqual(view.instances[0].languages,["pt","zh-Hant"]);
  assert.equal(view.indexable.en,true);
  const fallback=normalize(x,[{...listEntry,meta:{...listEntry.meta,nsfw:true}}]).games[0];
  assert.equal(fallback.instances[0].nsfw,true);
});

test("known, available external URLs need no second editorial stage", () => {
  const x={registryVersion:1,games:{external:fixtureGame("external",[{type:"external",title:"Play elsewhere",url:"https://example.org/run/index.html",cover:"https://example.org/cover.png",languages:["ko"],available:true,nsfw:false}])}};
  const view=normalize(x,[]).games[0];
  assert.equal(view.instances[0].playUrl,"https://example.org/run/index.html");
  assert.equal(view.instances[0].coverUrl,"https://example.org/cover.png");
  assert.equal(view.instances[0].available,true);
  assert.equal(view.indexable.ja,true);
  assert(view.languages.includes("ko"));
  assert.equal(view.instances[0].type,"external");
  x.games.external.instances[0].available=false;
  assert.equal(normalize(x,[]).games[0].indexable.en,false);
});

test("changed internal source provenance invalidates a previously pinned source version", () => {
  const x=fixture();
  const altered={...listEntry,meta:{...listEntry.meta,reviewedSourceHeadSha:"older-revision"},sourceHeadSha:"newer-revision"};
  const view=normalize(x,[altered]).games[0];
  assert.equal(view.instances[0].needsReview,true);
  assert.equal(view.indexable.en,false);
});

test("draft, empty, short and placeholder intros never affect page indexability", () => {
  const x=fixture();x.games.fixture.introductions={};
  const g=normalize(x).games[0];
  for(const locale of LOCALES)assert.equal(g.indexable[locale],true);
  const variants=["", "Hi", "待审核的作品介绍（示例内容，不应发布）", "lorem ipsum placeholder"];
  for(const summary of variants) {
    const entry=fixture();entry.games.fixture.introductions.en={summary,editorialStatus:"draft"};
    entry.games.fixture.contentAdvisory={nsfw:"unknown"};
    const game=normalize(entry).games[0];
    assert.equal(canIndexGameLocale(game,"en"),true,summary);
  }
  const blocked=fixture();blocked.games.fixture.seo={indexPolicy:"noindex"};
  assert(LOCALES.every(l=>normalize(blocked).games[0].indexable[l]===false));
  assert.equal(normalize(fixture(),[{...listEntry,reachable:false}]).games[0].indexable.en,false);
});

test("relations use gameId, keep directed type, reject broken references, and retain real snapshot associations", () => {
  const two={registryVersion:1,games:{
    fixture:{...fixtureGame("fixture",[inner]),relations:[{gameId:"followup",type:"sequel"}]},
    followup:{...fixtureGame("followup",[{type:"external",title:"Other",url:"https://example.com/game",languages:["ja"],available:true}]),relations:[{gameId:"fixture",type:"prequel"}]},
  }};
  const catalog=normalize(two);
  assert.deepEqual(catalog.games.find(g=>g.slug==="fixture").relations,[{slug:"followup",type:"sequel"}]);
  assert.deepEqual(catalog.games.find(g=>g.slug==="followup").relations,[{slug:"fixture",type:"prequel"}]);
  two.games.fixture.relations[0].gameId="nonexistent";
  assert.throws(()=>normalize(two),/Invalid relation target/);
  const real=normalizeCatalog(rawGames,rawList,snapshot.source);
  assert(real.games.reduce((sum,g)=>sum+g.relations.length,0)>0);
  assert.deepEqual(real.games.find(g=>g.slug==="fairy-maze").relations,[{slug:"fairy-maze-2",type:"sequel"}]);
});

test("source credits retain validated URLs, without inventing author identities", () => {
  const input=fixture();
  input.games.fixture.developers=[{name:"Creator",url:"https://github.com/creator"}, {name:"Bad",url:"javascript:alert(1)"}];
  input.games.fixture.publishers=[{name:"Publisher",url:"https://example.com/credits"}];
  const result=normalize(input).games[0];
  assert.deepEqual(result.developers,[{name:"Creator",url:"https://github.com/creator"},{name:"Bad",url:null}]);
  assert.deepEqual(result.publishers,[{name:"Publisher",url:"https://example.com/credits"}]);
  const real=normalizeCatalog(rawGames,rawList,snapshot.source);
  assert(real.games.some(g=>g.developers.some(x=>x.url)));
});

test("deterministic digest includes relationships, credits, links and release date", () => {
  const game=normalize().games[0];
  const old=digest([game]);
  assert.equal(typeof old,"string");
  assert.notEqual(digest([{...game,relations:[{slug:"else",type:"sequel"}]}]),old);
  assert.notEqual(digest([{...game,developers:[{name:"Changed",url:"https://example.org"}]}]),old);
  assert.notEqual(digest([{...game,releaseDate:"2026-01-01"}]),old);
  assert.notEqual(digest([{...game,externalLinks:[{url:"https://example.org",label:"Official",type:"home"}]}]),old);
});

test("search index covers all Game records, beyond the first 36, without popularity", () => {
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


test("catalog sorts by genuine source popularity, then localized name; editorial ratings remain display-only", () => {
  const real=normalizeCatalog(rawGames,rawList,snapshot.source);
  const scored=real.games.filter(g=>g.editorialRating!==null);
  assert(scored.length>0);
  assert.equal(real.games.filter(g=>g.popularity!==null).length,real.games.length);
  assert.equal(real.games.find(g=>g.slug==="narcissu").editorialRating,8);
  assert.equal(real.games.find(g=>g.slug==="narcissu").popularity,8);
  for (const locale of LOCALES) {
    const sorted=sortedGames(real.games,locale);
    assert.equal(sorted.length,real.games.length);
    for (let i=1;i<sorted.length;i++) assert(sorted[i-1].popularity>=sorted[i].popularity);
    const ties=sorted.filter(g=>g.popularity===8);
    const collator=new Intl.Collator(locale,{sensitivity:"base",numeric:true});
    assert.deepEqual(ties.map(g=>g.slug),[...ties].sort((a,b)=>collator.compare(a.titleByLocale[locale],b.titleByLocale[locale])||a.slug.localeCompare(b.slug)).map(g=>g.slug));
    const index=makeSearchIndex(real.games,locale);
    assert(index.every(g=>!Object.hasOwn(g,"popularity")&&!Object.hasOwn(g,"editorialRating")&&!Object.hasOwn(g,"aggregateRating")));
  }
  const popularUnrated={...real.games.find(g=>g.slug==="narcissu"),editorialRating:null,popularity:9};
  const lowerRated={...real.games.find(g=>g.slug==="cold-front"),editorialRating:10,popularity:1};
  assert.equal(sortedGames([lowerRated,popularUnrated],"en")[0].slug,"narcissu");
});

test("ratings must stay optional and reject invalid or out-of-range sources",()=>{
  const x=fixture();
  x.games.fixture.rating=9;
  assert.equal(normalize(x).games[0].editorialRating,9);
  x.games.fixture.rating=100;
  assert.equal(normalize(x).games[0].editorialRating,null);
  x.games.fixture.rating="9";
  assert.equal(normalize(x).games[0].editorialRating,null);
});


test("optional popularity is strictly numeric and deterministic, without fabricating a default",()=>{
  const x=fixture();
  x.games.fixture.popularity=7;
  assert.equal(normalize(x).games[0].popularity,7);
  x.games.fixture.popularity="7";
  assert.equal(normalize(x).games[0].popularity,null);
  x.games.fixture.popularity=-1;
  assert.equal(normalize(x).games[0].popularity,null);
  delete x.games.fixture.popularity;
  assert.equal(normalize(x).games[0].popularity,null);
  const unscored=normalize(x).games[0];
  const withRank={...unscored,slug:"ranked",popularity:1};
  assert.equal(sortedGames([unscored,withRank],"en")[0].slug,"ranked");
});