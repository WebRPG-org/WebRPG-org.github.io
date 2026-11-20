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
    const detail=await page.goto(http("/ja/game/narcissu/"),{waitUntil:"domcontentloaded"});
    assert.equal(detail.status(),200);
    assert.equal(await page.locator('html').getAttribute('lang'),"ja");
    assert(await page.locator('.instance-card a[href="https://webrpg.org/Destiny236-Narcissuweb/"]').count()>0);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),"noindex,follow");
    assert.equal(await page.locator('.language-switch a[data-webrpg-language="en"]').getAttribute('href'),"/en/game/narcissu/");
    await page.screenshot({path:join(images,"desktop-detail-ja.png"),fullPage:false});
  });
  await check("All three languages, tags, playable languages, and exact 404 (no SPA catch-all)",async()=>{
    for(const path of ["/zh-Hans/","/ja/","/en/tags/horror/","/en/languages/pt/"]){
      const response=await page.goto(http(path),{waitUntil:"domcontentloaded"});
      assert.equal(response.status(),200,path);
      assert(await page.locator("h1").count()>0,path);
    }
    const invalid=await page.goto(http("/fr/game/narcissu/"),{waitUntil:"domcontentloaded"});
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
  await check("Mobile 320/390px pages avoid horizontal overflow and keep readable nav",async()=>{
    for(const width of [320,390]){
      await page.setViewportSize({width,height:740});
      for(const path of ["/en/","/zh-Hans/game/narcissu/"]){
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
    res=await p.goto(http("/en/game/narcissu/"),{waitUntil:"domcontentloaded"});
    assert.equal(res.status(),200);
    assert(await p.locator('.instance-card a[href="https://webrpg.org/Destiny236-Narcissuweb/"]').count()>0);
    await nojs.close();
  });
  await ctx.close();
  await check("Language recommendation follows navigator.languages, dismisses session and respects manual language",async()=>{
    const ja=await browser.newContext({viewport:{width:390,height:760},locale:"ja-JP"});
    const p=await ja.newPage();
    await p.goto(http("/en/game/narcissu/"),{waitUntil:"domcontentloaded"});
    const suggest=p.locator(".language-suggestion");
    await suggest.waitFor({state:"visible",timeout:20000});
    assert.equal(await suggest.locator("a").getAttribute("href"),"/ja/game/narcissu/");
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
