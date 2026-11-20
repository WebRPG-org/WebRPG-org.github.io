import { spawn } from "node:child_process";
import { join } from "node:path";

// Astro keeps one preview process per project; reuse an existing healthy preview
// during local development but create and clean our own process on fresh CI runners.
const port = process.env.WEBRPG_BROWSER_TEST_PORT || "4329";
const url = "http://127.0.0.1:" + port;
const cwd = process.cwd();
let preview = null;
let previewLog = "";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ready() {
  try { return (await fetch(url + "/en/", { signal: AbortSignal.timeout(1500) })).status === 200; }
  catch { return false; }
}
let tested = false;
try {
  if (!(await ready())) {
    preview = spawn(process.execPath, [
      join(cwd, "node_modules", "astro", "bin", "astro.mjs"),
      "preview", "--host", "127.0.0.1", "--port", port,
    ], { cwd, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" } });
    preview.stdout.on("data", (buf) => { previewLog += String(buf).slice(-3000); });
    preview.stderr.on("data", (buf) => { previewLog += String(buf).slice(-3000); });
    for (let i = 0; i < 90; i++) {
      if (await ready()) break;
      if (preview.exitCode !== null) throw new Error("Astro preview exited prematurely: " + previewLog);
      if (i === 89) throw new Error("Astro preview startup timeout: " + previewLog);
      await sleep(400);
    }
  } else console.log("Reusing healthy local Astro preview at " + url);
  const child = spawn(process.execPath, [join(cwd,"scripts","browser-smoke.mjs")], {
    cwd, stdio: "inherit", env: {...process.env, WEBRPG_PREVIEW_URL: url },
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.on("error",reject);
    child.on("exit",(code,signal)=>resolve(code ?? (signal ? 1 : 0)));
  });
  tested = true;
  if (exitCode !== 0) process.exitCode = exitCode;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  preview?.kill();
  if (!tested) console.error("Browser suite did not complete.");
}
