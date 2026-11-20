import test from "node:test";
import assert from "node:assert/strict";
import { matchBrowserLanguage, selectSuggestion } from "../scripts/locale-preference.mjs";
test("BCP-47 first supported match and no forced traditional-to-simplified",()=>{
  assert.equal(matchBrowserLanguage(["fr-FR","ja-JP","en-US"]),"ja");
  assert.equal(matchBrowserLanguage(["zh-CN"]),"zh-Hans");
  assert.equal(matchBrowserLanguage(["zh-SG"]),"zh-Hans");
  assert.equal(matchBrowserLanguage(["zh-Hans-CN"]),"zh-Hans");
  assert.equal(matchBrowserLanguage(["zh-TW","zh-HK","zh-Hant"]),null);
  assert.equal(matchBrowserLanguage(["zh-TW","en-GB"]),"en");
});
test("never automatically redirect, manual preference always wins; safe unavailable locales",()=>{
  const base={current:"en",browserLanguages:["ja-JP"],manualLocale:null,dismissed:false,never:false,available:{en:true,ja:true,"zh-Hans":true}};
  assert.equal(selectSuggestion(base),"ja");
  assert.equal(selectSuggestion({...base,manualLocale:"en"}),null);
  assert.equal(selectSuggestion({...base,dismissed:true}),null);
  assert.equal(selectSuggestion({...base,never:true}),null);
  assert.equal(selectSuggestion({...base,available:{...base.available,ja:false}}),null);
  assert.equal(selectSuggestion({...base,current:"ja"}),null);
});
