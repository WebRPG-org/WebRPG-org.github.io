import { eventAttrs } from "../../lib/analytics";
import * as React from "react";
import { LABEL, UI, type Locale } from "../../i18n/ui";
import { selectSuggestion } from "../../../scripts/locale-preference.mjs";

type Props = {locale: Locale; path: string; targets: Record<Locale, string>; available: Record<Locale, boolean>};
export default function LanguageSuggestion({ locale, targets, available }: Props) {
  const [suggestion, setSuggestion] = React.useState<Locale | null>(null);
  const availableEn = available.en;
  const availableZh = available['zh-Hans'];
  const availableJa = available.ja;
  React.useEffect(() => {
    let cancelled = false;
    try {
      const preferred = selectSuggestion({
        current: locale,
        browserLanguages: navigator.languages?.length ? navigator.languages : [navigator.language],
        manualLocale: localStorage.getItem("webrpg:locale"),
        dismissed: sessionStorage.getItem("webrpg:locale-dismissed") === "1",
        never: localStorage.getItem("webrpg:locale-never") === "1",
        available: { en: availableEn, 'zh-Hans': availableZh, ja: availableJa },
      });
      queueMicrotask(() => { if (!cancelled) setSuggestion(preferred); });
    } catch { queueMicrotask(() => { if (!cancelled) setSuggestion(null); }); }
    return () => { cancelled = true; };
  }, [locale, availableEn, availableJa, availableZh]);

  function dismiss(permanent = false) {
    try {
      sessionStorage.setItem("webrpg:locale-dismissed", "1");
      if (permanent) localStorage.setItem("webrpg:locale-never", "1");
    } catch { /* Storage may be unavailable */ }
    setSuggestion(null);
  }
  function remember(language: Locale) {
    try {
      localStorage.setItem("webrpg:locale", language);
      sessionStorage.setItem("webrpg:locale-dismissed", "1");
    } catch { /* Storage may be unavailable */ }
  }
  if (!suggestion) return null;
  const copy = UI[locale];
  return <aside className="language-suggestion" role="region" aria-label={copy.switch}>
    <p>{copy.browser} {copy.suggest} <strong>{LABEL[suggestion]}</strong>?</p>
    <div className="suggestion-actions">
      <a href={targets[suggestion]} {...eventAttrs("catalog_language_suggestion", { locale, targetLocale: suggestion, action: "accept" })} onClick={() => remember(suggestion)}>{copy.switch}</a>
      <button type="button" onClick={() => dismiss()} {...eventAttrs("catalog_language_suggestion", { locale, targetLocale: suggestion, action: "dismiss" })}>{copy.dismiss}</button>
      <button type="button" onClick={() => dismiss(true)} {...eventAttrs("catalog_language_suggestion", { locale, targetLocale: suggestion, action: "never" })}>{copy.never}</button>
    </div>
  </aside>;
}
