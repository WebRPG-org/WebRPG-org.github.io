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
  // Schema.org developer/publisher require Person or Organization, not generic Thing.
  // Upstream credits contain no identity kind, so keep them in visible HTML rather than inventing one.
  return { "@context": "https://schema.org", "@graph": [webpage, breadcrumbs(bread), gameData] };
}
