export const LANGUAGES = ["en", "zh-Hans", "ja"];
export function matchBrowserLanguage(languages) {
  for (const value of Array.isArray(languages) ? languages : []) {
    const lang = String(value).toLowerCase();
    if (lang === "en" || lang.startsWith("en-")) return "en";
    if (lang === "ja" || lang.startsWith("ja-")) return "ja";
    if (lang === "zh-hans" || lang.startsWith("zh-hans-") || lang === "zh-cn" || lang.startsWith("zh-cn-") || lang === "zh-sg" || lang.startsWith("zh-sg-")) return "zh-Hans";
    // Traditional Chinese must not be silently conflated with Simplified.
  }
  return null;
}
export function selectSuggestion({ current, browserLanguages, manualLocale, dismissed, never, available }) {
  if (never || dismissed || LANGUAGES.includes(manualLocale)) return null;
  const desired = matchBrowserLanguage(browserLanguages);
  if (!desired || desired === current || available?.[desired] !== true) return null;
  return desired;
}
