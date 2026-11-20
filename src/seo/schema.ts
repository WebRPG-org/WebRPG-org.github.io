import type { GameView } from "../data/catalog";
import type { Locale } from "../i18n/ui";
import { taxonomyLabel } from "../i18n/ui";
import { gameDescription } from "../data/game-description";
const origin = "https://webrpg.org";
export const absolute = (url: string) => url.startsWith("http") ? url : origin + url;
export function breadcrumbs(entries: { title: string; href: string }[]) {
  return { "@type": "BreadcrumbList", itemListElement: entries.map((entry, index) => ({
    "@type": "ListItem", position: index + 1, name: entry.title, item: absolute(entry.href),
  })) };
}
export function collectionSchema(title: string, description: string, canonical: string, locale: Locale,
  games: GameView[], bread: { title: string; href: string }[]) {
  return { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": canonical + "#page", url: canonical, name: title, description, inLanguage: locale,
      mainEntity: { "@type": "ItemList", itemListElement: games.map((g, i) => ({
        "@type": "ListItem", position: i + 1, name: g.titleByLocale[locale], url: absolute("/" + locale + "/game/" + g.slug + "/"),
      })) } },
    breadcrumbs(bread),
  ] };
}
export function gameSchema(game: GameView, locale: Locale, canonical: string, bread: { title: string; href: string }[]) {
  const webpage = { "@type": "WebPage", "@id": canonical + "#page", url: canonical, inLanguage: locale, name: game.titleByLocale[locale],
    description: gameDescription(game, locale) };
  if (!game.indexable[locale]) return { "@context": "https://schema.org", "@graph": [webpage, breadcrumbs(bread)] };
  const gameData: Record<string, unknown> = {
    "@type": "VideoGame", "@id": canonical + "#game", name: game.titleByLocale[locale],
    description: gameDescription(game, locale), genre: [...game.genres, ...game.themes].map((t) => taxonomyLabel(t, locale)),
    inLanguage: game.languages, url: canonical,
  };
  if (game.coverUrl) gameData.image = game.coverUrl;
  if (game.releaseDate) gameData.datePublished = game.releaseDate;
  // Upstream credits do not assert individual vs organization; avoid inventing their identity.
  if (game.developers.length) gameData.developer = game.developers.map((credit) => ({ "@type": "Thing", name: credit.name, ...(credit.url ? {url: credit.url} : {}) }));
  if (game.publishers.length) gameData.publisher = game.publishers.map((credit) => ({ "@type": "Thing", name: credit.name, ...(credit.url ? {url: credit.url} : {}) }));
  return { "@context": "https://schema.org", "@graph": [webpage, breadcrumbs(bread), gameData] };
}
