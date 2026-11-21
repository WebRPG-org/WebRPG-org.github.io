import type { Catalog } from "../data/catalog";
import type { Locale } from "../i18n/ui";
import type { Route } from "../i18n/routes";
import { LOCALES, hasCuratedTagDescription } from "../i18n/ui.ts";

export const SITEMAP_ORIGIN = "https://webrpg.org";
const PAGE_SIZE = 36;
export const SITEMAP_CHILDREN = [
  SITEMAP_ORIGIN + "/sitemap-catalog.xml",
  SITEMAP_ORIGIN + "/sitemap-play.xml",
] as const;

type RouteFormatter = (locale: Locale, route: Route) => string;
export type PlayExclusionReason =
  | "external-instance"
  | "unavailable"
  | "needs-review"
  | "invalid-url"
  | "unsafe-runtime-path"
  | "query-or-fragment"
  | "duplicate-url"
  | "overlaps-catalog";

export type PlayExclusion = {
  gameSlug: string;
  instanceId: string | null;
  instanceOrdinal: number;
  playUrl: string;
  reason: PlayExclusionReason;
};

export type PlaySitemapDiagnostics = {
  urls: string[];
  candidates: number;
  internalCandidates: number;
  excluded: PlayExclusion[];
  excludedByReason: Partial<Record<PlayExclusionReason, number>>;
};

const uniqueSorted = (values: string[]): string[] => [...new Set(values)].sort();

export function getCatalogUrls(data: Catalog, routeUrl: RouteFormatter): string[] {
  const urls: string[] = [];
  const add = (route: Route, locales: readonly Locale[] = LOCALES) => {
    for (const locale of locales) urls.push(SITEMAP_ORIGIN + routeUrl(locale, route));
  };
  add({ kind: "home" });
  for (let page = 2; page <= Math.ceil(data.games.length / PAGE_SIZE); page++) add({ kind: "page", page });
  for (const game of data.games) {
    add({ kind: "game", slug: game.slug }, LOCALES.filter((locale) => game.indexable[locale] === true));
  }
  const tags = uniqueSorted(data.games.flatMap((game) => [...game.genres, ...game.themes]));
  for (const tag of tags) {
    const count = data.games.filter((game) => game.genres.includes(tag) || game.themes.includes(tag)).length;
    if (count < 2 || !hasCuratedTagDescription(tag)) continue;
    for (let page = 1; page <= Math.ceil(count / PAGE_SIZE); page++) add({ kind: "tags", slug: tag, page });
  }
  const languages = uniqueSorted(data.games.flatMap((game) => game.languages));
  for (const language of languages) {
    const count = data.games.filter((game) => game.languages.includes(language)).length;
    if (count < 2) continue;
    for (let page = 1; page <= Math.ceil(count / PAGE_SIZE); page++) {
      add({ kind: "languages", slug: language, page });
    }
  }
  // No / duplicate, no NSFW browse facets, and no draft/description-length eligibility rule.
  return uniqueSorted(urls);
}

function validatedInternalPlayUrl(url: string, forkName: string | null): PlayExclusionReason | null {
  if (!url || !forkName) return "invalid-url";
  let parsed: URL;
  try { parsed = new URL(url); }
  catch { return "invalid-url"; }
  if (parsed.protocol !== "https:" || parsed.origin !== SITEMAP_ORIGIN || parsed.username || parsed.password ||
      parsed.port || parsed.href !== url) return "invalid-url";
  if (parsed.search || parsed.hash) return "query-or-fragment";
  const expectedPrefix = "/" + encodeURIComponent(forkName) + "/";
  if (!parsed.pathname.startsWith(expectedPrefix) || parsed.pathname === "/" ||
      parsed.pathname.startsWith("/en/") || parsed.pathname.startsWith("/zh-Hans/") ||
      parsed.pathname.startsWith("/ja/") || parsed.pathname.startsWith("/_astro/") ||
      parsed.pathname.startsWith("/assets/") || parsed.pathname.startsWith("/images/") ||
      parsed.pathname.startsWith("/fonts/") || parsed.pathname.includes("/../") ||
      parsed.pathname.includes("/./")) return "unsafe-runtime-path";
  // Preserve the complete source URL, including case and explicit entryPath file.
  return null;
}

export function getSitemapDiagnostics(data: Catalog, catalogUrls: readonly string[] = []): PlaySitemapDiagnostics {
  const catalogSet = new Set(catalogUrls);
  const seen = new Set<string>();
  const urls: string[] = [];
  const excluded: PlayExclusion[] = [];
  const excludedByReason: PlaySitemapDiagnostics["excludedByReason"] = {};
  let candidates = 0;
  let internalCandidates = 0;

  for (const game of data.games) {
    for (const [index, instance] of game.instances.entries()) {
      candidates++;
      if (instance.type === "internal") internalCandidates++;
      const reason: PlayExclusionReason | null =
        instance.type !== "internal" ? "external-instance" :
        instance.available !== true ? "unavailable" :
        instance.needsReview ? "needs-review" :
        validatedInternalPlayUrl(instance.playUrl, instance.forkName) ||
        (catalogSet.has(instance.playUrl) ? "overlaps-catalog" : null) ||
        (seen.has(instance.playUrl) ? "duplicate-url" : null);
      if (reason) {
        excluded.push({
          gameSlug: game.slug,
          instanceId: instance.id || null,
          instanceOrdinal: index + 1,
          playUrl: instance.playUrl,
          reason,
        });
        excludedByReason[reason] = (excludedByReason[reason] || 0) + 1;
      } else {
        seen.add(instance.playUrl);
        urls.push(instance.playUrl);
      }
    }
  }
  return { urls: uniqueSorted(urls), candidates, internalCandidates, excluded, excludedByReason };
}

export function getPlayUrls(data: Catalog, catalogUrls: readonly string[] = []): string[] {
  return getSitemapDiagnostics(data, catalogUrls).urls;
}
