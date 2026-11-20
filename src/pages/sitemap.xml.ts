import type { APIRoute } from "astro";
import { catalog, filterCatalog, languages, pageCount, tags } from "../data/catalog";
import { LOCALES, hasCuratedTagDescription } from "../i18n/ui";
import { routeUrl, type Route } from "../i18n/routes";
const origin = "https://webrpg.org";
const entries: string[] = [];
const add = (route: Route, locales: readonly (typeof LOCALES)[number][]=LOCALES) => {
  for (const locale of locales) entries.push(origin + routeUrl(locale,route));
};
add({kind:"home"});
for (let page = 2; page <= pageCount(catalog.games); page++) add({kind:"page",page});
for (const game of catalog.games) add({kind:"game",slug:game.slug},LOCALES.filter((locale) => game.indexable[locale]));
for (const tag of tags) {
  const count = filterCatalog("tags", tag).length;
  if (count < 2 || !hasCuratedTagDescription(tag)) continue;
  for (let page = 1; page <= Math.ceil(count/36); page++) add({kind:"tags",slug:tag,page});
}
for (const language of languages) {
  const count = filterCatalog("languages", language).length;
  if (count < 2) continue;
  for (let page=1;page<=Math.ceil(count/36);page++) add({kind:"languages",slug:language,page});
}
export const GET: APIRoute = () => new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  entries.map((entry) => "<url><loc>" + entry.replace(/&/g, "&amp;") + "</loc></url>").join("\n") + "\n</urlset>",
  {headers: {"Content-Type":"application/xml; charset=utf-8"}});
