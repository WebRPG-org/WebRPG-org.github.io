// One-time migration evidence, not a recreation of the unavailable legacy sitemap.xml.
// The Index list.json pagesUrl field happens to expose 812 historical URL candidates.
// Their count alone does not prove identity with the old published XML.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { getPlayUrls, getSitemapDiagnostics } from "../src/seo/sitemap-data.ts";

const root=process.cwd();
const data=JSON.parse(await readFile(join(root,".cache","catalog.json"),"utf8"));
const sourceFile=join(root,".cache","snapshots",data.source.commit,"list.json");
const list=JSON.parse(await readFile(sourceFile,"utf8"));
const playUrls=getPlayUrls(data);
const included=new Set(playUrls);
const diagnostics=getSitemapDiagnostics(data);
const internalById=new Map(data.games.flatMap(g=>g.instances.filter(i=>i.type==="internal")
  .map(i=>[i.id.toLowerCase(),{gameSlug:g.slug,instance:i}])));
const excludedById=new Map(diagnostics.excluded.filter(x=>x.instanceId)
  .map(x=>[x.instanceId.toLowerCase(),x.reason]));
const records=list.filter(x=>typeof x.pagesUrl==="string"&&x.pagesUrl.length>0).map(x=>{
  const url=x.pagesUrl;
  const matched=internalById.get(x.id.toLowerCase());
  let classification,reason;
  if(included.has(url)){
    classification="retained";reason="eligible-internal-instance";
  }else if(matched) {
    classification="excluded";reason=excludedById.get(x.id.toLowerCase())||"not-in-current-play";
  }else if(x.meta?.playable===false){
    classification="excluded";reason="explicit-non-playable";
  }else if(x.status!=="verified"){
    classification="excluded";reason="not-verified";
  }else if(x.meta?.playable===true){
    classification="unresolved";reason="playable-flag-without-current-game";
  }else{
    classification="unresolved";reason="verified-but-playability-undetermined";
  }
  return {id:x.id,url,classification,reason,status:x.status??null,metaPlayable:x.meta?.playable??null,
    gameSlug:x.meta?.gameSlug??matched?.gameSlug??null};
}).sort((a,b)=>a.url.localeCompare(b.url,"en")||a.id.localeCompare(b.id,"en"));
const counts={retained:0,excluded:0,unresolved:0};
const reasons={};
for(const item of records){counts[item.classification]++;reasons[item.reason]=(reasons[item.reason]||0)+1;}
const absent=playUrls.filter(url=>!records.some(item=>item.url===url));
const payload={
  note:"Reconstructed baseline candidates from the currently pinned Index list.json pagesUrl fields; NOT a verified copy of the historical 812-entry sitemap XML.",
  historicalXmlAvailable:false,
  candidateSource:{repository:"WebRPG-org/index",commit:data.source.commit,file:"list.json",
    sha256:data.source.hashes.list,totalListRecords:list.length,
    candidateCount:records.length,uniqueCandidateUrls:new Set(records.map(x=>x.url)).size},
  currentPlayCount:playUrls.length,
  counts,reasons,newPlayUrlsAbsentFromCandidates:absent,
  records,
};
const report=JSON.stringify(payload,null,2)+"\n";
const bytes=Buffer.byteLength(report);
const digest=createHash("sha256").update(report).digest("hex");
const dest=join(root,"docs","acceptance");
await mkdir(dest,{recursive:true});
await writeFile(join(dest,"legacy-sitemap-diff.json"),report);
const examples=(category,n=6)=>records.filter(x=>x.classification===category).slice(0,n)
  .map(x=>"- \`"+x.url+"\` — \`"+x.reason+"\` (ID: \`"+x.id+"\`)").join("\n");
const md=[
"# WebRPG legacy Sitemap candidate migration — 2026-11-21",
"",
"**Evidence limitation:** the historical ~812-URL Sitemap XML is not present in Git history or the available local snapshots. The latest immutable Index \`list.json\` contains exactly "+records.length+
" \`pagesUrl\` records, which offer a useful but **unproven proxy** for the old 812 URLs. This is **not** a verified byte-for-byte historic sitemap diff. The complete reconstructed candidates are preserved in [legacy-sitemap-diff.json](./legacy-sitemap-diff.json).",
"",
"- Index commit: \`"+data.source.commit+"\`",
"- Source file SHA-256: \`"+data.source.hashes.list+"\`",
"- Candidate count (including any duplicates): **"+records.length+"**, unique URLs: **"+payload.candidateSource.uniqueCandidateUrls+"**",
"- New Play Sitemap URL count: **"+playUrls.length+"**",
"- Retained candidates: **"+counts.retained+"**",
"- Excluded candidates: **"+counts.excluded+"**",
"- Unresolved (requires human review): **"+counts.unresolved+"**",
"- New Play URLs absent from candidates: **"+absent.length+"**",
"- JSON report size: **"+bytes+" bytes**, SHA-256: \`"+digest+"\`",
"",
"## Classification reasons",
"",
...Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([reason,count])=>"- \`"+reason+"\`: "+count),
"",
"## Retained examples",
examples("retained"),
"",
"## Excluded examples",
examples("excluded"),
"",
"## Unresolved examples",
examples("unresolved"),
"",
"## Follow-up constraints",
"",
"- Never restore every historical URL based solely on an old sitemap listing. \`meta.playable=false\` and unassigned records are not automatically eligible for the Play Sitemap.",
"- A URL omitted from a sitemap remains routable; no 404, 410, project directory modification, redirects or GitHub Pages asset deletions are performed.",
"- The unresolved records need source/reachability and canonical inspection before a future explicit legacy allowlist; this review does not turn them into automatic Play entries.",
"- If an actual archived \`sitemap.xml\` from the historic deployment becomes available, re-run a **separate** exact-XML comparison and retain its source checksum; do not relabel these inferred candidates as the original XML.",
""
].join("\n");
await writeFile(join(dest,"legacy-sitemap-diff.md"),md);
console.log(JSON.stringify({indexCommit:data.source.commit,candidates:records.length,counts,reasonCounts:reasons,newPlayUrlsAbsentFromCandidates:absent.length,jsonBytes:bytes,reportSha256:digest}));
