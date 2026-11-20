import test from "node:test";
import assert from "node:assert/strict";
import { shouldBuildSnapshot, shouldPublishBuild, fetchPublishedManifest } from "../scripts/check-index-update.mjs";
const frontend="a".repeat(40);
const source="b".repeat(40);
const next="c".repeat(40);
const catalogHash="d".repeat(64);
const routesHash="e".repeat(64);
const published={frontendCommit:frontend,indexCommit:source,catalogHash,routesHash};
const built={...published,indexCommit:next};

test("F11 skips build only for unchanged frontend and source revisions",()=>{
  assert.equal(shouldBuildSnapshot({sourceCommit:source,frontendCommit:frontend,published}),false);
  assert.equal(shouldBuildSnapshot({sourceCommit:next,frontendCommit:frontend,published}),true);
  assert.equal(shouldBuildSnapshot({sourceCommit:source,frontendCommit:next,published}),true);
  assert.equal(shouldBuildSnapshot({sourceCommit:source,frontendCommit:frontend,published:null}),true);
});

test("F11 compares meaningful HTML inputs, not noisy upstream SHA/timestamp changes",()=>{
  assert.equal(shouldPublishBuild({built,published}),false);
  assert.equal(shouldPublishBuild({built:{...built,catalogHash:"f".repeat(64)},published}),true);
  assert.equal(shouldPublishBuild({built:{...built,routesHash:"f".repeat(64)},published}),true);
  assert.equal(shouldPublishBuild({built:{...built,frontendCommit:next},published}),true);
  assert.equal(shouldPublishBuild({built,published:null}),true);
  assert.throws(()=>shouldPublishBuild({built:{...built,catalogHash:"invalid"},published}),/Invalid/);
});

test("F11 manifest fetch handles deployed 404 by validating rather than assuming no changes",async()=>{
  const miss=await fetchPublishedManifest(async()=>({ok:false,status:404,headers:{get:()=>null}}));
  assert.equal(miss,null);
  const bad=await fetchPublishedManifest(async()=>({
    ok:true,headers:{get:()=>null},arrayBuffer:async()=>Buffer.from("not JSON"),
  }));
  assert.equal(bad,null);
});
test("F11 manifest fetch checks structured HTTPS JSON without redirect",async()=>{
  let checked=false;
  const actual=await fetchPublishedManifest(async(url,options)=>{
    assert(url.startsWith("https://webrpg.org/build-manifest.json?poll="));
    assert.equal(options.redirect,"error");
    checked=true;
    return {ok:true,headers:{get:()=>null},
      arrayBuffer:async()=>Buffer.from(JSON.stringify(published))};
  });
  assert(checked);
  assert.equal(actual.catalogHash,catalogHash);
});
