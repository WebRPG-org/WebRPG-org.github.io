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
  nsfw: Nsfw; editorialRating: number | null; editorialStatus: string; qualityFlags: string[]; indexPolicy: string;
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
export const sortedGames = (games: GameView[], locale: Locale): GameView[] => {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  return [...games].sort((a, b) => (b.editorialRating ?? -1) - (a.editorialRating ?? -1) || collator.compare(a.titleByLocale[locale], b.titleByLocale[locale]) || a.slug.localeCompare(b.slug));
};
export const tags = [...new Set(catalog.games.flatMap((g) => [...g.genres, ...g.themes]))].sort();
export const languages = [...new Set(catalog.games.flatMap((g) => g.languages))].sort();
export const filterCatalog = (kind: "tags" | "languages", key: string): GameView[] =>
  catalog.games.filter((g) => kind === "tags" ? g.genres.includes(key) || g.themes.includes(key) : g.languages.includes(key));
export type NsfwGroup = "safe" | "adult" | "unknown";
export const nsfwGroups: NsfwGroup[] = ["safe", "adult", "unknown"];
export const filterNsfw = (group: NsfwGroup): GameView[] => catalog.games.filter((g) => group === "safe" ? g.nsfw === false : group === "adult" ? g.nsfw === true : g.nsfw === "unknown");
export const pageCount = (games: GameView[]) => Math.ceil(games.length / 36);
export const pageSlice = (games: GameView[], page: number) => games.slice((page - 1) * 36, page * 36);
