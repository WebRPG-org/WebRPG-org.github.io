import type { APIRoute } from "astro";
import { catalog } from "../data/catalog";
import { routeUrl } from "../i18n/routes";
import { getCatalogUrls } from "../seo/sitemap-data";
import { serializeUrlSet } from "../seo/sitemap-xml";

export const GET: APIRoute = () => new Response(serializeUrlSet(getCatalogUrls(catalog, routeUrl)), {
  headers: { "Content-Type": "application/xml; charset=utf-8" },
});
