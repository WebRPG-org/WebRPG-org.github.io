import { SITEMAP_ORIGIN } from "./sitemap-data.ts";

const NS = "http://www.sitemaps.org/schemas/sitemap/0.9";
// XML 1.0 has explicit restrictions for control code points; this regex is intentional.
// eslint-disable-next-line no-control-regex
const XML_INVALID = /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u;

export function escapeXml(value: string): string {
  if (XML_INVALID.test(value)) throw new Error("Invalid XML code point");
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function normalizedEntries(urls: readonly string[]): string[] {
  if (new Set(urls).size !== urls.length) throw new Error("Sitemap contains duplicate URLs");
  for (const url of urls) {
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error("Invalid Sitemap URL: " + url); }
    if (parsed.origin !== SITEMAP_ORIGIN || parsed.protocol !== "https:" ||
        parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash ||
        parsed.href !== url) throw new Error("Noncanonical Sitemap URL: " + url);
  }
  return [...urls].sort();
}

export function serializeUrlSet(urls: readonly string[]): string {
  const entries = normalizedEntries(urls);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="' + NS + '">\n' +
    entries.map((url) => "  <url><loc>" + escapeXml(url) + "</loc></url>").join("\n") +
    '\n</urlset>\n';
}

export function serializeSitemapIndex(urls: readonly string[]): string {
  const entries = normalizedEntries(urls);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="' + NS + '">\n' +
    entries.map((url) => "  <sitemap><loc>" + escapeXml(url) + "</loc></sitemap>").join("\n") +
    '\n</sitemapindex>\n';
}
