import type { Locale } from "./ui";
import { LOCALES } from "./ui";
import { catalog, filterCatalog, gameBySlug, pageCount } from "../data/catalog";
export type RouteKind = "home" | "page" | "game" | "tags" | "languages";
export type Route = { kind: RouteKind; slug?: string; page?: number };
export const homeUrl = (locale: Locale) => "/" + locale + "/";
export function routeUrl(locale: Locale, route: Route): string {
  const prefix = "/" + locale + "/";
  if (route.kind === "home" || (route.kind === "page" && route.page === 1)) return prefix;
  if (route.kind === "page") return prefix + "page/" + route.page + "/";
  if (route.kind === "game") return prefix + "game/" + route.slug + "/";
  if (route.kind === "tags" || route.kind === "languages") return prefix + route.kind + "/" + route.slug + "/" + (route.page && route.page > 1 ? "page/" + route.page + "/" : "");
  return prefix;
}
export function routeExists(locale: Locale, route: Route): boolean {
  if (!LOCALES.includes(locale)) return false;
  if (route.kind === "home") return true;
  if (route.kind === "game") return gameBySlug.has(route.slug || "");
  if (route.kind === "page") return Number.isInteger(route.page) && (route.page || 0) >= 2 && (route.page || 0) <= pageCount(catalog.games);
  if (!route.slug) return false;
  const games = filterCatalog(route.kind, route.slug);
  return games.length > 0 && (!route.page || route.page === 1 || (route.page >= 2 && route.page <= pageCount(games)));
}
export function safeRouteUrl(locale: Locale, route: Route): string {
  if (routeExists(locale, route)) return routeUrl(locale, route);
  if ((route.kind === "tags" || route.kind === "languages") && routeExists(locale, { ...route, page: 1 })) return routeUrl(locale, { ...route, page: 1 });
  return homeUrl(locale);
}
export function urlAlternates(route: Route, indexable: boolean): Partial<Record<Locale | "x-default", string>> {
  if (!indexable) return {};
  const locales = LOCALES.filter((locale) => routeExists(locale, route) &&
    (route.kind !== "game" || !!gameBySlug.get(route.slug || "")?.indexable[locale]));
  const alternates: Partial<Record<Locale | "x-default", string>> = {};
  for (const locale of locales) alternates[locale] = "https://webrpg.org" + routeUrl(locale, route);
  if (route.kind === "home") alternates["x-default"] = "https://webrpg.org/";
  return alternates;
}
export function routeFromPath(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length && LOCALES.includes(parts[0] as Locale)) parts.shift();
  if (parts[0] === "game" && parts[1]) return { kind: "game", slug: parts[1] };
  if (parts[0] === "tags" && parts[1]) return { kind: "tags", slug: parts[1], page: parts[2] === "page" ? Number(parts[3]) : 1 };
  if (parts[0] === "languages" && parts[1]) return { kind: "languages", slug: parts[1], page: parts[2] === "page" ? Number(parts[3]) : 1 };
  if (parts[0] === "page") return { kind: "page", page: Number(parts[1]) };
  return { kind: "home" };
}
