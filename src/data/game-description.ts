import type { GameView } from "./catalog";
import type { Locale } from "../i18n/ui";
import { taxonomyLabel, langLabel } from "../i18n/ui";

// Descriptions are display metadata, never a publishing gate. Placeholder editorial
// notes must not masquerade as game content; use only verified catalog attributes.
const placeholder = /待审核|示例内容|占位|placeholder|lorem ipsum|to be reviewed|sample text|未审核|仮文|ダミー/i;
export const publishedCopy = (text?: string): string =>
  typeof text === "string" && !placeholder.test(text) ? text.trim() : "";

export function gameDescription(game: GameView, locale: Locale): string {
  const summary = publishedCopy(game.introductions[locale]?.summary);
  if (summary) return summary;
  const title = game.titleByLocale[locale];
  const genres = [...new Set([...game.genres, ...game.themes])].slice(0, 3).map((tag) => taxonomyLabel(tag, locale));
  const supported = game.languages.slice(0, 4).map((lang) => langLabel(lang, locale));
  const versions = game.instances.length;
  if (locale === "zh-Hans") {
    return "《" + title + "》是 WebRPG 收录的浏览器游戏作品，共有 " + versions + " 个游戏版本。" +
      (genres.length ? "类型与题材：" + genres.join("、") + "。" : "") +
      (supported.length ? "游戏语言：" + supported.join("、") + "。" : "");
  }
  if (locale === "ja") {
    return "「" + title + "」はWebRPGに掲載されているブラウザ向けゲーム作品です。" + versions + "件のゲーム版を収録しています。" +
      (genres.length ? "ジャンル：" + genres.join("、") + "。" : "") +
      (supported.length ? "対応言語：" + supported.join("、") + "。" : "");
  }
  return title + " is a browser game work listed by WebRPG, with " + versions + " indexed game version" + (versions === 1 ? "" : "s") + "." +
    (genres.length ? " Genres and themes: " + genres.join(", ") + "." : "") +
    (supported.length ? " Game languages: " + supported.join(", ") + "." : "");
}
export function relationLabel(type: string, locale: Locale): string {
  const labels: Record<string, Record<Locale, string>> = {
    sequel: { en: "Sequel", "zh-Hans": "续作", ja: "続編" },
    prequel: { en: "Prequel", "zh-Hans": "前作", ja: "前作" },
    "same-series": { en: "Same series", "zh-Hans": "同系列", ja: "同シリーズ" },
    spinOff: { en: "Spin-off", "zh-Hans": "衍生作品", ja: "スピンオフ" },
    remake: { en: "Remake", "zh-Hans": "重制作品", ja: "リメイク" },
    related: { en: "Related", "zh-Hans": "相关作品", ja: "関連作品" },
  };
  return labels[type]?.[locale] || labels.related[locale];
}
