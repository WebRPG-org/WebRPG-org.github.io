import type { GameView } from "../data/catalog";
import type { Locale } from "../i18n/ui";
import type { Route } from "../i18n/routes";
import { gameDescription, publishedCopy } from "../data/game-description";
import { langLabel, taxonomyLabel } from "../i18n/ui";

// Descriptions describe verified facts from the catalog; this is search metadata,
// not a replacement for the complete editorial introduction visible in the page.
const MIN_DESCRIPTION = 75;
const MAX_DESCRIPTION = 155;
const MAX_TITLE = 65;
const chars = (value: string) => Array.from(value);
const clean = (value: string) => value.replace(/\s+/g, " ").trim();

export function conciseText(text: string, max = MAX_DESCRIPTION): string {
  const value = clean(text);
  if (chars(value).length <= max) return value;
  const prefix = chars(value).slice(0, max - 1).join("");
  // Prefer ending a coherent phrase/sentence without cutting too much useful information.
  const boundary = Math.max(
    prefix.lastIndexOf("。"), prefix.lastIndexOf("！"), prefix.lastIndexOf("。"),
    prefix.lastIndexOf(". "), prefix.lastIndexOf("! "), prefix.lastIndexOf("? "),
    prefix.lastIndexOf("、"), prefix.lastIndexOf("; "), prefix.lastIndexOf(", "),
    prefix.lastIndexOf(" ")
  );
  const shortened = boundary >= max - 35 ? prefix.slice(0, boundary + 1) : prefix;
  return shortened.replace(/[\s,;:、·，。.!?！?…-]+$/u, "") + "…";
}

function gameFacts(game: GameView, locale: Locale): string {
  const versions = game.instances.length;
  const languages = game.languages.slice(0, 3).map((code) => langLabel(code, locale)).join(
    locale === "en" ? ", " : "、"
  );
  const genres = [...new Set([...game.genres, ...game.themes])].slice(0, 2)
    .map((tag) => taxonomyLabel(tag, locale)).join(locale === "en" ? ", " : "、");
  if (locale === "zh-Hans") {
    return "WebRPG 按作品整理该游戏的 " + versions + " 个版本" +
      (languages ? "，支持的游玩语言包括" + languages : "") +
      (genres ? "，题材涵盖" + genres : "") + "，可查看实际的游戏详情、版本和来源链接。";
  }
  if (locale === "ja") {
    return "WebRPGには" + versions + "件の版が収録されています。" +
      (languages ? "対応言語：" + languages + "。" : "") +
      (genres ? "ジャンル：" + genres + "。" : "") +
      "作品の詳細、プレイ先と出典も確認できます。";
  }
  return "Explore " + versions + " indexed version" + (versions === 1 ? "" : "s") +
    (languages ? "; playable languages include " + languages : "") +
    (genres ? "; genres include " + genres : "") +
    ". Compare game details and verified source links on WebRPG.";
}

export function gameMetaDescription(game: GameView, locale: Locale): string {
  let description = clean(publishedCopy(game.introductions[locale]?.summary) || gameDescription(game, locale));
  if (chars(description).length < MIN_DESCRIPTION) description += " " + gameFacts(game, locale);
  return conciseText(description);
}

export function catalogMetaDescription(
  source: string, locale: Locale, gameCount: number, page: number, totalPages: number
): string {
  const pagePrefix = page > 1
    ? locale === "en" ? "Page " + page + " of " + totalPages + ": "
      : locale === "ja" ? totalPages + "ページ中の第" + page + "ページ：" : "第 " + page + " / " + totalPages + " 页："
    : "";
  let description = clean(source);
  if (chars(description).length < MIN_DESCRIPTION) {
    const more = locale === "en"
      ? "Explore " + gameCount + " browser game works on WebRPG. Browse genres, supported playable languages and available game versions."
      : locale === "ja"
        ? "WebRPGではブラウザで遊べるゲーム" + gameCount + "作品を収録しています。ジャンル、対応言語、ゲーム版と出典を作品ごとに確認できます。"
        : "WebRPG 收录 " + gameCount + " 部浏览器游戏作品，可按类型、游玩语言和年龄分级浏览，查看各作品的游戏版本、来源链接与详细介绍。";
    description += " " + more;
  }
  return conciseText(pagePrefix + description);
}

export function seoPageTitle(title: string, locale: Locale, route: Route): string {
  let result = title.includes("WebRPG") ? title : title + " | WebRPG";
  if (chars(result).length < 22 && route.kind !== "game") {
    const appendix = locale === "en" ? "Browser Game Directory"
      : locale === "zh-Hans" ? "浏览器游戏作品目录" : "ブラウザゲーム作品一覧";
    result = title + " — " + appendix + " | WebRPG";
  }
  if (chars(result).length <= MAX_TITLE) return result;
  // Preserve distinct page titles when truncating two works with a long shared prefix.
  const discriminator = route.kind === "game" && route.slug ? " [" + locale + ":" + route.slug.slice(-6) + "]" : "";
  const suffix = discriminator + " | WebRPG";
  const content = title.replace(/\s*[—–-]\s*(Details|作品详情|作品詳細)\s*$/u, "");
  const available = MAX_TITLE - chars(suffix).length - 1;
  return chars(content).slice(0, available).join("").trimEnd() + "…" + suffix;
}
