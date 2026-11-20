// Source schema is intentionally permissive about upstream audit-only extra fields.
// Every public View object is explicitly projected: no upstream popularity or editorial notes escape.
export const LOCALES = ["en", "zh-Hans", "ja"];
export const PAGE_SIZE = 36;
export const RESERVED = ["en", "zh-hans", "ja", "page", "game", "tags", "languages", "assets", "data", "search", "_astro", "fonts", "nsfw"];
const TITLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Editorial placeholder text must not be published as factual copy; it is not an indexability gate.
const BAD_COPY = /待审核|示例内容|占位|placeholder|lorem ipsum|to be reviewed|sample text|未审核|仮文|ダミー/i;
const safeString = (s) => typeof s === "string" ? s.trim() : "";
const strings = (a) => Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()))] : [];
const boolUnknown = (v) => typeof v === "boolean" ? v : "unknown";
const must = (condition, message) => { if (!condition) throw new Error(message); };
const validUrl = (v) => {
  try { const u = new URL(v); return u.protocol === "https:" && !u.username && !u.password ? u.href : null; } catch { return null; }
};
const safeCover = (s) => validUrl(safeString(s));
const status = (s) => ["draft", "reviewed", "published"].includes(s) ? s : "draft";
const credits = (values) => {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values.flatMap((item) => {
    const name = safeString(item?.name);
    if (!name) return [];
    const url = validUrl(item?.url) || null;
    const key = name.toLowerCase() + "\u0000" + (url || "");
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ name, url }];
  });
};
const validLanguage = (lang) => { try { new Intl.Locale(lang); return true; } catch { return false; } };

export function canIndexGameLocale(game, locale) {
  // An explicit opt-out and factual, technically usable game URLs are the only gates.
  // Draft status, summary length, absent translations and NSFW classification never block indexing.
  return LOCALES.includes(locale) &&
    game.indexPolicy !== "noindex" &&
    !!safeString(game.titleByLocale?.[locale]) &&
    Array.isArray(game.instances) &&
    game.instances.some((instance) =>
      instance.available === true &&
      !instance.needsReview &&
      !!validUrl(instance.playUrl)
    );
}
export function adaptGameV1(key, source) {
  must(source && typeof source === "object" && !Array.isArray(source), "Invalid Game object: " + key);
  must(source.slug === key && TITLE_PATTERN.test(key), "Invalid or mismatched game slug " + key);
  must(typeof source.originalTitle === "string" && source.originalTitle.trim(), "Missing originalTitle for " + key);
  must(source.instances && Array.isArray(source.instances) && source.instances.length > 0, "Missing instances for " + key);
  must(source.introductions && typeof source.introductions === "object", "Missing introductions for " + key);
  const titleByLocale = Object.fromEntries(LOCALES.map((locale) => [locale, safeString(source.translatedTitles?.[locale]) || source.originalTitle.trim()]));
  const introductions = Object.fromEntries(LOCALES.map((locale) => {
    const obj = source.introductions[locale];
    must(obj === undefined || (obj && typeof obj === "object"), "Invalid introduction " + key + " " + locale);
    return [locale, { summary: safeString(obj?.summary), overview: safeString(obj?.overview), story: safeString(obj?.story), highlights: strings(obj?.highlights), editorialStatus: status(obj?.editorialStatus) }];
  }));
  return {
    slug: key, schemaVersion: 1, originalTitle: source.originalTitle.trim(), titleByLocale,
    aliases: Object.values(source.aliases || {}).flatMap((a) => strings(a)),
    introductions, genres: strings(source.taxonomy?.genres), themes: strings(source.taxonomy?.themes),
    contentType: safeString(source.taxonomy?.contentType), developers: credits(source.developers),
    publishers: credits(source.publishers),
    releaseDate: /^\d{4}-\d{2}-\d{2}$/.test(source.release?.date || "") ? source.release.date : null,
    mediaCover: safeCover(source.media?.cover), nsfw: boolUnknown(source.contentAdvisory?.nsfw),
    popularity: Number.isSafeInteger(source.popularity) && source.popularity >= 0 ? source.popularity : null,
    editorialRating: typeof source.rating === "number" && Number.isFinite(source.rating) && source.rating >= 0 && source.rating <= 10 ? source.rating : null,
    editorialStatus: status(source.editorial?.status), qualityFlags: strings(source.editorial?.qualityFlags),
    indexPolicy: source.seo?.indexPolicy === "noindex" ? "noindex" : "auto",
    relations: (Array.isArray(source.relations) ? source.relations : []).map((relation) => ({
      slug: safeString(relation?.gameId), type: safeString(relation?.type) || "related",
    })),
    externalLinks: (Array.isArray(source.externalLinks) ? source.externalLinks : []).filter((x) => validUrl(x.url)).map((x) => ({ url: validUrl(x.url), label: safeString(x.label), type: safeString(x.type) })),
    rawInstances: source.instances,
  };
}
const adapters = new Map([[1, adaptGameV1]]);
export function registerAdapter(version, adapter) {
  must(Number.isInteger(version) && version > 1 && typeof adapter === "function", "Invalid adapter");
  adapters.set(version, adapter);
}
export function normalizeCatalog(registry, list, source = {}) {
  must(registry && typeof registry === "object" && registry.registryVersion === 1 && registry.games && !Array.isArray(registry.games), "Unsupported registryVersion or invalid registry");
  must(Array.isArray(list), "list.json must be an array");
  const listById = new Map();
  const existingForks = new Set();
  for (const raw of list) {
    must(typeof raw?.id === "string" && raw.id, "List contains invalid instance ID");
    must(!listById.has(raw.id.toLowerCase()), "Duplicate list instance ID " + raw.id);
    listById.set(raw.id.toLowerCase(), raw);
    if (raw.forkName) {
      const name = raw.forkName.toLowerCase();
      must(!RESERVED.includes(name), "Game runtime path collides with site namespace: " + raw.forkName);
      existingForks.add(name);
    }
  }
  const ownership = new Set();
  const games = [];
  const slugs = new Set();
  const warnings = [];
  const schemaVersions = new Set();
  for (const [key, raw] of Object.entries(registry.games)) {
    must(!slugs.has(key.toLowerCase()), "Duplicate game slug " + key);
    slugs.add(key.toLowerCase());
    const version = raw?.schemaVersion;
    must(Number.isInteger(version) && version > 0, "Invalid schemaVersion for " + key);
    const adapter = adapters.get(version);
    must(!!adapter, "No Game adapter for schemaVersion=" + version + " game=" + key);
    schemaVersions.add(version);
    const game = adapter(key, raw);
    game.instances = [];
    for (const entry of game.rawInstances) {
      must(entry && ["internal", "external"].includes(entry.type), "Invalid instance type for " + key);
      must(safeString(entry.title), "Instance missing title for " + key);
      const languages = strings(entry.languages);
      must(languages.length && languages.every(validLanguage), "Invalid playable languages for " + key);
      if (entry.type === "internal") {
        const id = safeString(entry.id);
        must(id && !ownership.has(id.toLowerCase()), "Duplicate internal instance assignment: " + id);
        ownership.add(id.toLowerCase());
        const sourceInstance = listById.get(id.toLowerCase());
        must(!!sourceInstance, "Game " + key + " references missing list ID: " + id);
        must(sourceInstance.meta?.gameSlug === key, "Game slug mismatch for " + id);
        must(sourceInstance.meta?.playable === true, "Non-playable linked instance: " + id);
        must(sourceInstance.status === "verified", "Unverified linked instance: " + id);
        const playUrl = validUrl(sourceInstance.pagesUrl);
        must(playUrl && new URL(playUrl).hostname === "webrpg.org" && new URL(playUrl).pathname.startsWith("/" + encodeURIComponent(sourceInstance.forkName) + "/"), "Invalid original runtime URL: " + id);
        const needsReview = !!(sourceInstance.meta.reviewedSourceHeadSha && sourceInstance.sourceHeadSha && sourceInstance.meta.reviewedSourceHeadSha !== sourceInstance.sourceHeadSha);
        if (typeof entry.nsfw === "boolean" && typeof sourceInstance.meta.nsfw === "boolean") {
          must(entry.nsfw === sourceInstance.meta.nsfw, "NSFW classification mismatch for " + id);
        }
        if (needsReview) warnings.push({ code: "source-changed", slug: key, instanceId: id });
        game.instances.push({
          type: "internal", id, title: entry.title, languages, nsfw: boolUnknown(entry.nsfw ?? sourceInstance.meta.nsfw),
          playUrl, coverUrl: safeCover(sourceInstance.cover) || game.mediaCover, available: sourceInstance.reachable === false ? false : true,
          needsReview, sourceRepoUrl: validUrl(sourceInstance.repo), engine: safeString(sourceInstance.engine),
          forkName: sourceInstance.forkName,
        });
      } else {
        const url = validUrl(entry.url);
        must(url, "Invalid external instance URL for " + key);
        const available = entry.available === true || entry.playable === true ? true : entry.available === false || entry.playable === false ? false : "unknown";
        // A valid external HTTPS URL and explicit technical availability are sufficient.
        // Editorial status is not a second approval gate for the public catalog.
        game.instances.push({
          type: "external", title: entry.title, languages, nsfw: boolUnknown(entry.nsfw),
          playUrl: url, coverUrl: safeCover(entry.cover) || game.mediaCover, available,
          needsReview: available !== true, sourceRepoUrl: null, engine: safeString(entry.engine), forkName: null,
        });
      }
    }
    delete game.rawInstances;
    must(game.instances.length, "No instances linked to " + key);
    if (game.nsfw === "unknown" || game.instances.some((i) => i.nsfw === "unknown")) {
      game.nsfw = game.instances.some((i) => i.nsfw === true) ? true : "unknown";
    } else if (game.instances.some((i) => i.nsfw === true)) game.nsfw = true;
    game.coverUrl = game.mediaCover || game.instances.find((i) => i.coverUrl)?.coverUrl || null;
    delete game.mediaCover;
    game.languages = [...new Set(game.instances.flatMap((i) => i.languages))].sort();
    game.indexable = Object.fromEntries(LOCALES.map((locale) => [locale, !!canIndexGameLocale(game, locale)]));
    games.push(game);
  }
  for (const entry of list) {
    if (!entry.meta?.gameSlug) continue;
    must(entry.meta.playable === true, "list.meta.gameSlug exists but is not playable: " + entry.id);
    must(ownership.has(entry.id.toLowerCase()), "Orphan gameSlug in list: " + entry.id);
  }
  for (const game of games) {
    const seen = new Set();
    for (const relation of game.relations) {
      must(relation.slug && relation.slug !== game.slug && slugs.has(relation.slug.toLowerCase()), "Invalid relation target " + game.slug + " -> " + relation.slug);
      must(!seen.has(relation.slug + ":" + relation.type), "Duplicate relation " + game.slug + " -> " + relation.slug);
      seen.add(relation.slug + ":" + relation.type);
    }
  }
  games.sort((a, b) => a.slug.localeCompare(b.slug, "en"));
  return { source, games, schemaVersions: [...schemaVersions].sort(), warnings,
    stats: { games: games.length, instances: ownership.size, external: games.reduce((a, g) => a + g.instances.filter((i) => i.type === "external").length, 0),
      unknownNsfw: games.filter((g) => g.nsfw === "unknown").length, multiInstanceGames: games.filter((g) => g.instances.length > 1).length,
      indexableGameLocales: games.reduce((a, g) => a + LOCALES.filter((l) => g.indexable[l]).length, 0), listEntries: list.length },
    forkNames: [...existingForks].sort() };
}
export function sortedGames(games, locale) {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  return [...games].sort((a, b) => (b.popularity ?? -1) - (a.popularity ?? -1) || collator.compare(a.titleByLocale[locale], b.titleByLocale[locale]) || a.slug.localeCompare(b.slug));
}
export function filterGames(games, kind, value) {
  return games.filter((g) => kind === "tags" ? g.genres.includes(value) || g.themes.includes(value) : g.languages.includes(value));
}
export function normalizeTerm(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase().trim();
}
export function makeSearchIndex(games, locale) {
  // Search relevance and its JSON index do not use popularity, editorial ratings or assessment notes.
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const byTitle = [...games].sort((a,b) => collator.compare(a.titleByLocale[locale], b.titleByLocale[locale]) || a.slug.localeCompare(b.slug));
  return byTitle.map((g) => ({
    slug: g.slug, title: g.titleByLocale[locale], originalTitle: g.originalTitle,
    aliases: [...new Set([...Object.values(g.titleByLocale), ...g.aliases])],
    summary: g.introductions[locale].summary.slice(0, 280),
    genres: g.genres, themes: g.themes, languages: g.languages, nsfw: g.nsfw,
    coverUrl: g.coverUrl, href: "/" + locale + "/game/" + g.slug + "/",
    searchText: normalizeTerm([g.slug, g.originalTitle, ...Object.values(g.titleByLocale), ...g.aliases, ...g.developers.map((c) => c.name), ...g.publishers.map((c) => c.name), ...g.genres, ...g.themes].join(" ")),
  }));
}
export function searchGames(index, query, { language = "", genre = "", nsfw = false } = {}) {
  const normalized = normalizeTerm(query);
  return index.filter((g) => (!normalized || g.searchText.includes(normalized)) &&
    (!language || g.languages.includes(language)) && (!genre || g.genres.includes(genre) || g.themes.includes(genre)) &&
    (nsfw || g.nsfw === false));
}
