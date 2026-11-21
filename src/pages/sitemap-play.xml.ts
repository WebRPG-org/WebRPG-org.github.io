import type { APIRoute } from "astro";
import { catalog } from "../data/catalog";
import { routeUrl } from "../i18n/routes";
import { getCatalogUrls, getPlayUrls } from "../seo/sitemap-data";
import { serializeUrlSet } from "../seo/sitemap-xml";

export const GET: APIRoute = () => {
  const catalogUrls = getCatalogUrls(catalog, routeUrl);
  return new Response(serializeUrlSet(getPlayUrls(catalog, catalogUrls)), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
