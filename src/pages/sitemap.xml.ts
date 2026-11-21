import type { APIRoute } from "astro";
import { SITEMAP_CHILDREN } from "../seo/sitemap-data";
import { serializeSitemapIndex } from "../seo/sitemap-xml";

export const GET: APIRoute = () => new Response(serializeSitemapIndex(SITEMAP_CHILDREN), {
  headers: { "Content-Type": "application/xml; charset=utf-8" },
});
