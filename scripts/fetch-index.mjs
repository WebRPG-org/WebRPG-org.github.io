import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export function resolveIndexRef() {
  const explicit = process.env.INDEX_REF?.trim();
  const sha = explicit || execFileSync("git", ["ls-remote", "https://github.com/WebRPG-org/index.git", "refs/heads/main"], { encoding: "utf8", timeout: 30000 }).split(/\s+/)[0];
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error("INDEX_REF must resolve to an exact 40-character commit SHA");
  return sha.toLowerCase();
}
async function download(sha, filename) {
  const url = "https://raw.githubusercontent.com/WebRPG-org/index/" + sha + "/" + filename;
  const response = await fetch(url, { signal: AbortSignal.timeout(45000), redirect: "error" });
  if (!response.ok) throw new Error("Snapshot request failed: " + filename + " HTTP " + response.status);
  const maxSize = 20 * 1024 * 1024;
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > maxSize) throw new Error("Snapshot file too large: " + filename);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > maxSize) throw new Error("Snapshot exceeded maximum size: " + filename);
  JSON.parse(bytes.toString("utf8"));
  return bytes;
}
export async function acquireSnapshot(sha = resolveIndexRef()) {
  const dir = join(process.cwd(), ".cache", "snapshots", sha);
  await mkdir(dir, { recursive: true });
  const paths = ["games.json", "list.json"].map((name) => join(dir, name));
  let bytes;
  try {
    bytes = await Promise.all(paths.map((path) => readFile(path)));
    bytes.forEach((b) => JSON.parse(b.toString("utf8")));
    const provenance = JSON.parse(await readFile(join(dir, "source.json"), "utf8"));
    if (provenance.commit !== sha || provenance.hashes?.games !== sha256(bytes[0]) || provenance.hashes?.list !== sha256(bytes[1])) throw new Error("Cached snapshot provenance does not match immutable source");
  } catch {
    if (process.env.INDEX_OFFLINE === "1") throw new Error("Offline snapshot unavailable for INDEX_REF=" + sha);
    // Fetch both objects at this ONE immutable SHA; never follow main per file.
    bytes = await Promise.all(["games.json", "list.json"].map((file) => download(sha, file)));
    for (let i = 0; i < paths.length; i++) {
      const tmp = paths[i] + ".tmp-" + process.pid;
      await writeFile(tmp, bytes[i]);
      await rename(tmp, paths[i]);
    }
  }
  const hashes = { games: sha256(bytes[0]), list: sha256(bytes[1]) };
  const source = { source: "WebRPG-org/index", commit: sha, hashes, bytes: bytes.map((b) => b.byteLength) };
  await writeFile(join(dir, "source.json"), JSON.stringify(source, null, 2));
  return { games: JSON.parse(bytes[0].toString("utf8")), list: JSON.parse(bytes[1].toString("utf8")), source };
}
if (process.argv[1] && import.meta.url === new URL("file:///" + process.argv[1].replace(/\\/g, "/")).href) {
  acquireSnapshot().then(({ source }) => console.log("Index snapshot: " + JSON.stringify(source))).catch((error) => { console.error(error); process.exitCode = 1; });
}
