// F11: read-only, scheduled Index polling and meaningful-content release gate.
// This code runs only in the site workflow; it never mutates WebRPG-org/index.
import { execFileSync } from "node:child_process";
import { readFile, appendFile } from "node:fs/promises";

export const SHA = /^[0-9a-f]{40}$/i;
export const isSha = (value) => typeof value === "string" && SHA.test(value);
export function shouldBuildSnapshot({ sourceCommit, frontendCommit, published }) {
  if (!isSha(sourceCommit) || !isSha(frontendCommit)) throw new Error("Expected immutable 40-char frontend and Index SHAs");
  // Never fail shut on a missing/corrupt production manifest: build and verify instead.
  return !(published?.indexCommit === sourceCommit && published?.frontendCommit === frontendCommit);
}
export function shouldPublishBuild({ built, published }) {
  if (!built || !isSha(built.frontendCommit) || !isSha(built.indexCommit) ||
      !/^[0-9a-f]{64}$/i.test(built.catalogHash || "") || !/^[0-9a-f]{64}$/i.test(built.routesHash || "")) {
    throw new Error("Invalid generated build manifest; cannot decide publication");
  }
  if (!published || !isSha(published.frontendCommit) || !/^[0-9a-f]{64}$/i.test(published.catalogHash || "") ||
      !/^[0-9a-f]{64}$/i.test(published.routesHash || "")) return true;
  return published.frontendCommit !== built.frontendCommit ||
    published.catalogHash !== built.catalogHash ||
    published.routesHash !== built.routesHash;
}

export function lookupIndexMainSha() {
  const response = execFileSync("git", [
    "ls-remote", "https://github.com/WebRPG-org/index.git", "refs/heads/main",
  ], { encoding: "utf8", timeout: 30000 }).trim();
  const [sha, ref] = response.split(/\s+/);
  if (!isSha(sha) || ref !== "refs/heads/main") throw new Error("Index remote HEAD cannot be verified");
  return sha.toLowerCase();
}

export async function fetchPublishedManifest(fetchFn = fetch) {
  const manifestUrl = "https://webrpg.org/build-manifest.json";
  try {
    // The SHA query bypasses a stale CDN response when the source has changed.
    const url = new URL(manifestUrl);
    url.searchParams.set("poll", String(Date.now()));
    const response = await fetchFn(url.href, {
      redirect: "error", headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const length = Number(response.headers.get("content-length") || "0");
    if (length > 65536) throw new Error("manifest too large");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 65536) throw new Error("manifest exceeds size limit");
    const manifest = JSON.parse(Buffer.from(bytes).toString("utf8"));
    if (!manifest || typeof manifest !== "object") throw new Error("invalid manifest JSON");
    return manifest;
  } catch (error) {
    console.log("Deployed manifest unavailable; fail open to full build: " + String(error));
    return null;
  }
}

async function writeOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, name + "=" + value + "\n");
  }
  console.log(name + "=" + value);
}

export async function cli(args = process.argv.slice(2)) {
  if (!["preflight", "postbuild"].includes(args[0]) || args.length !== 1) throw new Error("Usage: node scripts/check-index-update.mjs preflight|postbuild");
  if (args[0] === "preflight") {
    const sourceCommit = lookupIndexMainSha();
    const frontendCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const published = await fetchPublishedManifest();
    const shouldBuild = shouldBuildSnapshot({ sourceCommit, frontendCommit, published });
    await writeOutput("index_sha", sourceCommit);
    await writeOutput("should_build", String(shouldBuild));
    console.log(shouldBuild ? "Source or frontend revision changed; run full SSG validation." : "Both revisions match deployed manifest; skip heavy work.");
    return;
  }
  const built = JSON.parse(await readFile("dist/build-manifest.json", "utf8"));
  const published = await fetchPublishedManifest();
  const shouldDeploy = shouldPublishBuild({ built, published });
  await writeOutput("should_deploy", String(shouldDeploy));
  console.log(shouldDeploy ? "Meaningful content or frontend changed; publish after browser gate." : "Only Index audit noise changed; do not publish identical HTML.");
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/check-index-update.mjs")) {
  cli().catch((error) => { console.error(error); process.exitCode = 1; });
}
