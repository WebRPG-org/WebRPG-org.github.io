import snapshot from "../../.cache/catalog.json";
import type { Locale } from "../i18n/ui";
export type Nsfw = boolean | "unknown";
export type InstanceView = {
  type: "internal" | "external";
  id?: string;
  title: string; languages: string[]; nsfw: Nsfw; playUrl: string;
  coverUrl: string | null; available: boolean | "unknown";
  needsReview: boolean; sourceRepoUrl: string | null; engine: string; forkName: string | null;
};
export type Introduction = { summary: string; overview: string; story: string; highlights: string[]; editorialStatus: string };
export type GameView = {
  slug: string; schemaVersion: number; originalTitle: string;
  titleByLocale: Record<Locale, string>; introductions: Record<Locale, Introduction>;
  aliases: string[]; genres: string[]; themes: string[]; contentType: string;
  developers: {name: string; url: string | null}[]; publishers: {name: string; url: string | null}[]; releaseDate: string | null;
  nsfw: Nsfw; popularity: number | null; editorialRating: number | null; editorialStatus: string; qualityFlags: string[]; indexPolicy: string;
  relations: {slug: string; type: string}[]; externalLinks: {url: string; label: string; type: string}[];
  instances: InstanceView[]; languages: string[]; coverUrl: string | null; indexable: Record<Locale, boolean>;
};
export type Catalog = {
  source: { source: string; commit: string; hashes: { games: string; list: string }; bytes: number[] };
  games: GameView[]; schemaVersions: number[]; warnings: {code: string; slug: string; instanceId: string}[];
  stats: {games: number; instances: number; external: number; unknownNsfw: number; multiInstanceGames: number; indexableGameLocales: number; listEntries: number};
  forkNames: string[]; searchFiles: Record<Locale, string>; frontendCommit: string; catalogHash: string;
};
export const catalog = snapshot as Catalog;
export const gameBySlug = new Map(catalog.games.map((g) => [g.slug, g]));
// The ordering must remain identical across en/zh-Hans/ja: popularity first, English title as the universal tie breaker.
const englishCollator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
export const compareGames = (a: GameView, b: GameView): number =>
  (b.popularity ?? -1) - (a.popularity ?? -1) ||
  englishCollator.compare(a.titleByLocale.en, b.titleByLocale.en) ||
  a.slug.localeCompare(b.slug, "en");
export const sortedGames = (games: GameView[]): GameView[] => [...games].sort(compareGames);
export const tags = [...new Set(catalog.games.flatMap((g) => [...g.genres, ...g.themes]))].sort();
export const languages = [...new Set(catalog.games.flatMap((g) => g.languages))].sort();
export const filterCatalog = (kind: "tags" | "languages", key: string): GameView[] =>
  catalog.games.filter((g) => kind === "tags" ? g.genres.includes(key) || g.themes.includes(key) : g.languages.includes(key));
export type NsfwGroup = "safe" | "adult" | "unknown";
export const nsfwGroups: NsfwGroup[] = ["safe", "adult", "unknown"];
export const filterNsfw = (group: NsfwGroup): GameView[] => catalog.games.filter((g) => group === "safe" ? g.nsfw === false : group === "adult" ? g.nsfw === true : g.nsfw === "unknown");
export const pageCount = (games: GameView[]) => Math.ceil(games.length / 36);
export const pageSlice = (games: GameView[], page: number) => games.slice((page - 1) * 36, page * 36);


/** Same-age, shared-tag recommendations. Deterministic and entirely based on existing Game fields. */
export const similarGames = (game: GameView, limit = 4): GameView[] => {
  const genres = new Set(game.genres), themes = new Set(game.themes);
  return catalog.games
    .filter((other) => other.slug !== game.slug && other.nsfw === game.nsfw)
    .map((other) => ({
      game: other,
      genreMatches: other.genres.filter((tag) => genres.has(tag)).length,
      themeMatches: other.themes.filter((tag) => themes.has(tag)).length,
    }))
    .filter((item) => item.genreMatches + item.themeMatches > 0)
    .sort((a,b) =>
      (b.genreMatches * 4 + b.themeMatches * 2) - (a.genreMatches * 4 + a.themeMatches * 2) ||
      compareGames(a.game, b.game)
    ).slice(0,limit).map((item) => item.game);
};
