import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { acquireSnapshot, resolveIndexRef, sha256 } from "./fetch-index.mjs";
import { LOCALES, makeSearchIndex, normalizeCatalog } from "./catalog-core.mjs";
const cwd = process.cwd();
const sha = resolveIndexRef();
const { games, list, source } = await acquireSnapshot(sha);
const catalog = normalizeCatalog(games, list, source);
const generated = join(cwd, "public", "data");
await mkdir(generated, { recursive: true });
for (const name of await readdir(generated)) {
  if (/^search-(en|ja|zh-Hans)\.[a-f0-9]{12}\.json$/.test(name)) await rm(join(generated, name));
}
const searchFiles = {};
for (const locale of LOCALES) {
  const json = JSON.stringify(makeSearchIndex(catalog.games, locale));
  const file = "search-" + locale + "." + sha256(json).slice(0, 12) + ".json";
  await writeFile(join(generated, file), json);
  searchFiles[locale] = "/data/" + file;
}
catalog.searchFiles = searchFiles;
let frontendCommit = "unknown";
try { frontendCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { /* Detached source tarball */ }
catalog.frontendCommit = frontendCommit;
// Only normalized, deterministic public view fields enter this digest. Upstream checkedAt
// and other audit timestamps are deliberately excluded by normalizeCatalog's projection.
catalog.catalogHash = sha256(JSON.stringify(catalog.games));
await mkdir(join(cwd, ".cache"), { recursive: true });
await writeFile(join(cwd, ".cache", "catalog.json"), JSON.stringify(catalog));
console.log("Catalog: " + JSON.stringify({ sourceCommit: source.commit, stats: catalog.stats, schemaVersions: catalog.schemaVersions, searchFiles, catalogHash: catalog.catalogHash, warnings: catalog.warnings.length }));
