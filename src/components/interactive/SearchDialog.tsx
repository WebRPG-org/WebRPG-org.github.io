import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/pixelact-ui/input";
import { UI, langLabel, taxonomyLabel, type Locale } from "@/i18n/ui";

type SearchEntry = {
  slug: string; href: string; title: string; originalTitle: string; aliases: string[];
  summary: string; genres: string[]; themes: string[]; languages: string[];
  nsfw: boolean | "unknown"; searchText: string; coverUrl: string | null;
};
type Props = {locale: Locale; indexUrl: string; availableLanguages: string[]; availableTags: string[]};
export default function SearchDialog({ locale, indexUrl, availableLanguages, availableTags }: Props) {
  const copy = UI[locale];
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState<SearchEntry[] | null>(null);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [includeUnrated, setIncludeUnrated] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const opener = React.useRef<HTMLButtonElement>(null);
  const composing = React.useRef(false);

  React.useEffect(() => {
    if (!open || index) return;
    const controller = new AbortController();
    fetch(indexUrl, { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    }).then((records: unknown) => {
      if (!Array.isArray(records)) throw new Error("Invalid search index");
      setIndex(records);
      setError("");
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Network error");
    });
    return () => controller.abort();
  }, [open, index, indexUrl]);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
    else opener.current?.focus();
  }, [open]);

  const results = React.useMemo(() => {
    const normalized = query.normalize("NFKC").toLocaleLowerCase().trim();
    return (index || []).filter((item) =>
      (!normalized || item.searchText.includes(normalized)) &&
      (!language || item.languages.includes(language)) &&
      (!tag || item.genres.includes(tag) || item.themes.includes(tag)) &&
      (includeUnrated || item.nsfw === false)
    );
  }, [query, index, language, tag, includeUnrated]);

  const limited = results.slice(0, 60);
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Tab") {
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled]), select:not([disabled]), a[href]')]
        .filter((element) => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (first && last && event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (first && last && !event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.key === "Escape") { setOpen(false); event.preventDefault(); return; }
    if (event.key === "ArrowDown") { setActive((x) => Math.min(x + 1, limited.length - 1)); event.preventDefault(); }
    if (event.key === "ArrowUp") { setActive((x) => Math.max(0, x - 1)); event.preventDefault(); }
    if (event.key === "Enter" && !composing.current && limited[active]) {
      window.location.assign(limited[active].href);
    }
  }

  return <div className="search-interface">
    <button ref={opener} className="search-bar-button" type="button" onClick={() => setOpen(true)}>
      <span><Search size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 12 }} />{copy.searchPlaceholder}</span>
      <span>{copy.search}</span>
    </button>
    {open && <div className="search-dialog" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section className="search-panel" role="dialog" aria-modal="true" aria-label={copy.search} onKeyDown={onKeyDown}>
        <div className="search-head">
          <Input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
            placeholder={copy.searchPlaceholder} aria-label={copy.search} />
          <button type="button" onClick={() => setOpen(false)} aria-label={copy.close}><X size={20}/></button>
        </div>
        <div className="search-filters">
          <label>{copy.genre} <select value={tag} onChange={(e) => { setTag(e.target.value); setActive(0); }}>
            <option value="">{copy.any}</option>
            {availableTags.map((item) => <option value={item} key={item}>{taxonomyLabel(item, locale)}</option>)}
          </select></label>
          <label>{copy.language} <select value={language} onChange={(e) => { setLanguage(e.target.value); setActive(0); }}>
            <option value="">{copy.any}</option>
            {availableLanguages.map((item) => <option value={item} key={item}>{langLabel(item, locale)}</option>)}
          </select></label>
          <label><input type="checkbox" checked={includeUnrated} onChange={(e) => { setIncludeUnrated(e.target.checked); setActive(0); }}/>{copy.includeUnrated}</label>
        </div>
        <div className="search-results" role="listbox" aria-label={copy.search}>
          {!index && !error ? <p>{copy.searchHint}…</p> : null}
          {error && <p role="alert">{error} <button type="button" onClick={() => { setIndex(null); setError(""); setOpen(false); requestAnimationFrame(() => setOpen(true)); }}>{copy.search}</button></p>}
          {index && limited.length === 0 && <p>{copy.noResults}</p>}
          {limited.map((item, i) => <a href={item.href} key={item.slug} data-active={active === i} role="option" aria-selected={active === i} onMouseEnter={() => setActive(i)}>
            <strong>{item.title}</strong> {item.nsfw === "unknown" ? " · " + copy.unknown : item.nsfw ? " · " + copy.adult : ""}
            <small>{item.summary.slice(0, 130) || item.originalTitle}</small>
          </a>)}
          {index && <p className="result-count">{results.length} {copy.gameCount}</p>}
        </div>
      </section>
    </div>}
  </div>;
}
