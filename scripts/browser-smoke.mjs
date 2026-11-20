import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { chromium } from "playwright-core";

const root = process.cwd();
const base = process.env.WEBRPG_PREVIEW_URL || "http://127.0.0.1:4329";
const edgePath = process.env.BROWSER_PATH || (process.platform === "win32"
  ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  : (existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : "/usr/bin/chromium"));
const images = join(root, ".cache", "ui");
mkdirSync(images, {recursive:true});
const gameCatalog = JSON.parse(readFileSync(join(root, ".cache", "catalog.json"), "utf8"));
const sampleGame = gameCatalog.games.find((g) => g.slug === "narcissu") || gameCatalog.games.find((g) => g.instances.some((i) => i.available === true && !i.needsReview));
const sampleRunUrl = sampleGame.instances.find((instance) => instance.available === true && !instance.needsReview)?.playUrl;
const preview = process.env.WEBRPG_PREVIEW_URL ? null : spawn(process.execPath, [join(root, "node_modules", "astro", "bin", "astro.mjs"), "preview", "--host", "127.0.0.1", "--port", "4329"], {
  cwd: root, stdio: "ignore", windowsHide: true, env: {...process.env, ASTRO_TELEMETRY_DISABLED:"1"},
});
let ready = false;
for (let attempt = 0; attempt < 40; attempt++) {
  try { const response = await fetch(base + "/en/", {signal:AbortSignal.timeout(2000)}); if (response.ok) {ready=true;break;} }
  catch { /* Preview server warming up */ }
  await new Promise((resolve)=>setTimeout(resolve,250));
}
if (!ready) { preview?.kill(); throw new Error("Local Astro preview did not become ready at " + base); }
const browser = await chromium.launch({executablePath:edgePath,headless:true,args:["--no-sandbox"]});
const failures = [];
let tests = 0;
const check = async (name, fn) => {
  try { await fn(); console.log("PASS " + name); tests++; }
  catch (error) { console.error("FAIL " + name + ": " + error.message); failures.push({name,error:String(error)}); }
};
const http = (path) => base + path;
const waitForImage = (page) => page.locator("img.brand-mark").first().waitFor({state:"visible",timeout:20000});
try {
  const ctx = await browser.newContext({viewport:{width:1440,height:900},locale:"en-US"});
  const page = await ctx.newPage();
  const errors=[];
  page.on("pageerror", (error)=>errors.push(error.message));
  await check("Root and English home return real 200 HTML, no client redirect",async()=>{
    const rootResponse=await page.goto(http("/"),{waitUntil:"domcontentloaded",timeout:35000});
    assert.equal(rootResponse.status(),200);
    assert.equal(new URL(page.url()).pathname,"/");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"),"https://webrpg.org/en/");
    assert(await page.locator("main .game-card").count()>0);
    const rootMain=await page.locator("main").innerHTML();
    const englishResponse=await page.goto(http("/en/"),{waitUntil:"domcontentloaded",timeout:35000});
    assert.equal(englishResponse.status(),200);
    assert.equal(await page.locator("main").innerHTML(),rootMain);
    assert.equal(await page.locator('html').getAttribute("lang"),"en");
    await waitForImage(page);
    await page.screenshot({path:join(images,"desktop-en.png"),fullPage:false});
  });
  await check("Native links, 36 cards per first page, second page and direct game detail",async()=>{
    assert.equal(await page.locator(".game-card").count(),36);
    assert.equal(await page.locator('.pager a[href="/en/page/2/"]').count()>0,true);
    const r=await page.goto(http("/en/page/2/"),{waitUntil:"domcontentloaded"});
    assert.equal(r.status(),200);
    assert.equal(await page.locator(".game-card").count(),36);
    const detail=await page.goto(http("/ja/game/" + sampleGame.slug + "/"),{waitUntil:"domcontentloaded"});
    assert.equal(detail.status(),200);
    assert.equal(await page.locator('html').getAttribute('lang'),"ja");
    assert(await page.locator(".instance-card a[href]").evaluateAll((nodes, url) => nodes.some((element) => element.getAttribute("href") === url), sampleRunUrl));
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),sampleGame.indexable.ja ? "index,follow" : "noindex,follow");
    assert.equal(await page.locator('.language-switch a[data-webrpg-language="en"]').getAttribute('href'),"/en/game/" + sampleGame.slug + "/");
    await page.screenshot({path:join(images,"desktop-detail-ja.png"),fullPage:false});
  });
  await check("All three languages, tags, playable languages, and exact 404 (no SPA catch-all)",async()=>{
    for(const path of ["/zh-Hans/","/ja/","/en/tags/horror/","/en/languages/pt/"]){
      const response=await page.goto(http(path),{waitUntil:"domcontentloaded"});
      assert.equal(response.status(),200,path);
      assert(await page.locator("h1").count()>0,path);
    }
    const invalid=await page.goto(http("/fr/game/" + sampleGame.slug + "/"),{waitUntil:"domcontentloaded"});
    assert.equal(invalid.status(),404);
    const invalidSlug=await page.goto(http("/en/game/definitely-not-a-real-game/"),{waitUntil:"domcontentloaded"});
    assert.equal(invalidSlug.status(),404);
  });
  await check("Desktop theme loads exact pixel font and warm card backgrounds",async()=>{
    await page.goto(http("/en/"),{waitUntil:"domcontentloaded"});
    const s=await page.locator(".game-card").first().evaluate((element)=>{
      const css=getComputedStyle(element);
      return {background:css.backgroundImage,color:css.color,font:getComputedStyle(document.body).fontFamily, width:element.getBoundingClientRect().width};
    });
    assert(s.font.toLowerCase().includes("zpix"),s.font);
    assert(s.background.includes("gradient"),s.background);
    assert(s.width>290,s.width);
  });
  await check("React search island lazy-loads full catalog, including last paginated game",async()=>{
    await page.goto(http("/en/"),{waitUntil:"domcontentloaded"});
    await page.locator(".search-bar-button").click();
    await page.locator(".search-panel .search-head input").waitFor({state:"visible",timeout:20000});
    await page.waitForFunction(()=>document.querySelector(".result-count")!==null,{timeout:25000});
    const last=[...gameCatalog.games].sort((a,b)=>a.titleByLocale.en.localeCompare(b.titleByLocale.en,"en",{sensitivity:"base",numeric:true})||a.slug.localeCompare(b.slug)).at(-1);
    await page.locator('.search-head input').fill(last.slug);
    const target=page.locator('.search-results a[href="/en/game/'+last.slug+'/"]');
    await target.waitFor({state:"visible",timeout:10000});
    await page.locator(".search-head button").click();
    assert.equal(await page.locator(".search-panel").count(),0);
  });
  await check("Search combined language / genre filters and adult classification opt-in",async()=>{
    await page.locator(".search-bar-button").click();
    await page.waitForFunction(()=>!!document.querySelector(".result-count"),{timeout:20000});
    const selects=page.locator(".search-filters select");
    await selects.nth(1).selectOption("pt");
    const text=await page.locator(".result-count").innerText();
    assert(text.match(/\d+/),text);
    const safeCount=Number(text.match(/\d+/)[0]);
    await page.locator('.search-filters input[type="checkbox"]').check();
    const widened=Number((await page.locator(".result-count").innerText()).match(/\d+/)[0]);
    assert(widened>=safeCount);
    await page.locator(".search-head button").click();
  });
  await check("Search has reachable results beyond first 60 and never hijacks select or IME Enter", async()=>{
    await page.goto(http("/en/"),{waitUntil:"domcontentloaded"});
    await page.locator(".search-bar-button").click();
    await page.locator(".result-count").waitFor({state:"visible",timeout:20000});
    const count=Number((await page.locator(".result-count").innerText()).match(/\d+/)[0]);
    assert(count>60);
    while (await page.locator(".search-more").count()) await page.locator(".search-more").click();
    assert.equal(await page.locator('.search-results a[role="option"]').count(),count);
    const path=new URL(page.url()).pathname;
    const selector=page.locator(".search-filters select").first();
    await selector.focus();
    await page.keyboard.press("Enter");
    assert.equal(new URL(page.url()).pathname,path);
    const input=page.locator(".search-head input");
    await input.fill(sampleGame.slug);
    await page.locator(".search-results a[role=option]").first().waitFor({state:"visible"});
    await input.dispatchEvent("compositionstart");
    await input.press("Enter");
    assert.equal(new URL(page.url()).pathname,path);
    await input.dispatchEvent("compositionend");
    await page.locator(".search-head button").click();
  });
  await check("Draft, short synopsis and NSFW/unknown classification follow direct-publication rules",async()=>{
    const collator = new Intl.Collator("en",{sensitivity:"base",numeric:true});
    const ordered = [...gameCatalog.games].sort((a,b)=>collator.compare(a.titleByLocale.en,b.titleByLocale.en)||a.slug.localeCompare(b.slug));
    for (const [state,label] of [[true,"Adult"],["unknown","Unrated"]]) {
      const game=gameCatalog.games.find((item)=>item.nsfw===state && item.indexable.en);
      assert(game,"Missing class sample for " + state);
      const index=ordered.findIndex((item)=>item.slug===game.slug);
      const pageNumber=Math.floor(index/36)+1;
      await page.goto(http(pageNumber===1?"/en/":"/en/page/"+pageNumber+"/"),{waitUntil:"domcontentloaded"});
      const card=page.locator('.game-card').filter({has:page.locator('a[href="/en/game/'+game.slug+'/"]')}).first();
      assert.equal(await card.count(),1);
      assert(await card.locator(".size-pill").filter({hasText:label}).count()>=1,"Wrong card classification for "+game.slug);
      await page.goto(http("/en/game/"+game.slug+"/"),{waitUntil:"domcontentloaded"});
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),"index,follow");
      assert.equal((await page.locator('.detail-tags .taxonomy-pill.caution').first().innerText()).trim(),label);
    }
    const short=gameCatalog.games.find((game)=>game.indexable["zh-Hans"] && game.introductions["zh-Hans"].summary.length<60);
    assert(short,"Missing short-description sample");
    await page.goto(http("/zh-Hans/game/"+short.slug+"/"),{waitUntil:"domcontentloaded"});
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),"index,follow");
    assert((await page.locator('.detail-summary').first().innerText()).length>0);
    for(const game of gameCatalog.games.filter((g)=>!g.indexable.en)) {
      await page.goto(http("/en/game/"+game.slug+"/"),{waitUntil:"domcontentloaded"});
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),"noindex,follow");
    }
  });
  await check("Mobile 320/390px pages avoid horizontal overflow and keep readable nav",async()=>{
    for(const width of [320,390]){
      await page.setViewportSize({width,height:740});
      for(const path of ["/en/","/zh-Hans/game/" + sampleGame.slug + "/"]){
        await page.goto(http(path),{waitUntil:"domcontentloaded"});
        const dim=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth}));
        assert(dim.scrollWidth<=dim.innerWidth+1,JSON.stringify({width,path,...dim}));
        assert(await page.locator("nav.language-switch").isVisible());
        assert(await page.locator("main h1").isVisible());
        if(width===390&&path==="/en/") {
          const firstCardTop = await page.locator(".game-card").first().evaluate((element)=>element.getBoundingClientRect().top);
          assert(firstCardTop < 740,"First game card should begin within initial mobile viewport: "+firstCardTop);
          await page.screenshot({path:join(images,"mobile-en-390.png"),fullPage:false});
        }
        if(width===320&&path.includes("narcissu")) await page.screenshot({path:join(images,"mobile-detail-320.png"),fullPage:false});
      }
    }
  });
  await check("No-JavaScript catalog, page link, language switch, game detail and original game URL",async()=>{
    const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:760}});
    const p=await nojs.newPage();
    let res=await p.goto(http("/en/"),{waitUntil:"domcontentloaded"});
    assert.equal(res.status(),200);
    assert(await p.locator('.game-card a[href^="/en/game/"]').count()>=36);
    assert(await p.locator('.pager a[href="/en/page/2/"]').count()>0);
    await p.locator(".catalog-directory > summary").click();
    assert(await p.locator('a[href="/en/tags/horror/"]').first().isVisible());
    await p.locator('.language-switch a[href="/ja/"]').click();
    assert.equal(new URL(p.url()).pathname,"/ja/");
    res=await p.goto(http("/en/game/" + sampleGame.slug + "/"),{waitUntil:"domcontentloaded"});
    assert.equal(res.status(),200);
    assert(await p.locator(".instance-card a[href]").evaluateAll((nodes, url) => nodes.some((element) => element.getAttribute("href") === url), sampleRunUrl));
    await nojs.close();
  });
  await ctx.close();
  await check("Language recommendation follows navigator.languages, dismisses session and respects manual language",async()=>{
    const ja=await browser.newContext({viewport:{width:390,height:760},locale:"ja-JP"});
    const p=await ja.newPage();
    await p.goto(http("/en/game/" + sampleGame.slug + "/"),{waitUntil:"domcontentloaded"});
    const suggest=p.locator(".language-suggestion");
    await suggest.waitFor({state:"visible",timeout:20000});
    assert.equal(await suggest.locator("a").getAttribute("href"),"/ja/game/" + sampleGame.slug + "/");
    await p.screenshot({path:join(images,"mobile-language-suggestion.png"),fullPage:false});
    await suggest.locator("button").first().click();
    await p.goto(http("/en/"),{waitUntil:"domcontentloaded"});
    assert.equal(await p.locator(".language-suggestion").count(),0);
    await p.locator('.language-switch a[data-webrpg-language="ja"]').click();
    assert.equal(new URL(p.url()).pathname,"/ja/");
    await p.goto(http("/en/"),{waitUntil:"domcontentloaded"});
    assert.equal(await p.locator(".language-suggestion").count(),0);
    await ja.close();
  });
  await check("Permanent decline persists between pages and tabs",async()=>{
    const ja=await browser.newContext({locale:"ja-JP"});
    const p=await ja.newPage();
    await p.goto(http("/en/"),{waitUntil:"domcontentloaded"});
    await p.locator(".language-suggestion").waitFor({state:"visible",timeout:20000});
    await p.locator(".language-suggestion button").last().click();
    const other=await ja.newPage();
    await other.goto(http("/en/"),{waitUntil:"domcontentloaded"});
    await other.waitForTimeout(700);
    assert.equal(await other.locator(".language-suggestion").count(),0);
    await ja.close();
  });
  await check("No actual application-level JS page exceptions",async()=>{
    assert.equal(errors.length,0,errors.join("; "));
  });
} finally { await browser.close(); preview?.kill(); }
console.log(JSON.stringify({tests,failed:failures.length,screenshots:images,failures},null,2));
if (failures.length) process.exitCode=1;
