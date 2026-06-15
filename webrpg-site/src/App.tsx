import * as React from "react"
import {
  ExternalLink,
  GitFork,
  Languages,
  Play,
  RefreshCw,
  Search,
} from "lucide-react"

import { Badge } from "@/components/ui/pixelact-ui/badge"
import { Button } from "@/components/ui/pixelact-ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/pixelact-ui/card"
import { Input } from "@/components/ui/pixelact-ui/input"

const LIST_ENDPOINTS = [
  "https://raw.githubusercontent.com/WebRPG-org/index/main/list.json",
  "https://cdn.jsdelivr.net/gh/WebRPG-org/index@main/list.json",
  "/list.json",
]

const EMPTY_BOOK = "/assets/empty-book.png"
const LOGO = "/assets/logo.png"
const SITE_TITLE = "Web RPG"

const I18N = {
  "zh-Hans": {
    tagline: "索引 Github 上的公开 Web RPG 作品",
    search: "搜索",
    searchPlaceholder: "搜索标题、作者或仓库名",
    loading: "正在读取索引...",
    loadError: "索引读取失败。",
    retry: "重试",
    noResults: "没有找到匹配的游戏。",
    play: "开始",
    source: "源码",
    github: "GitHub",
    engine: "引擎",
    coverAlt: "{title} 封面",
    footerBefore: "Made by",
    footerAfter:
      "。各作品项目的版权所有，归其仓库作者所有。本项目代码使用 MIT 协议授权",
  },
  en: {
    tagline: "Indexing public Web RPG works on Github",
    search: "Search",
    searchPlaceholder: "Search title, author, or repository",
    loading: "Loading index...",
    loadError: "Failed to load the index.",
    retry: "Retry",
    noResults: "No matching games found.",
    play: "Play",
    source: "Source",
    github: "GitHub",
    engine: "Engine",
    coverAlt: "Cover for {title}",
    footerBefore: "Made by",
    footerAfter:
      ". Copyright for each game belongs to its repository author. This project's code is licensed under MIT.",
  },
  ja: {
    tagline: "Github 上の公開 Web RPG 作品を索引",
    search: "検索",
    searchPlaceholder: "タイトル、作者、リポジトリを検索",
    loading: "インデックスを読み込み中...",
    loadError: "インデックスの読み込みに失敗しました。",
    retry: "再試行",
    noResults: "一致するゲームが見つかりません。",
    play: "プレイ",
    source: "ソース",
    github: "GitHub",
    engine: "エンジン",
    coverAlt: "{title} のカバー",
    footerBefore: "Made by",
    footerAfter:
      "。各作品の著作権は各リポジトリ作者に帰属します。本プロジェクトのコードは MIT ライセンスです。",
  },
} as const

const LANGUAGE_LABELS = {
  "zh-Hans": "中文",
  en: "EN",
  ja: "日本語",
} as const

const HIDDEN_STATUSES = new Set([
  "invalid_structure",
  "deleted_invalid_structure",
  "duplicate_name",
])

type UiLanguage = keyof typeof I18N

type RawGame = {
  id: string
  title?: string
  repo: string
  owner: string
  name: string
  engine?: string
  language?: string[]
  status?: string
  checkedAt?: string
  forkName?: string
  pagesUrl?: string
  entryPath?: string
  cover?: string
}

type Game = RawGame & {
  displayTitle: string
  forkName: string
  playUrl: string
  coverUrl: string | null
  searchText: string
}

function App() {
  const [language, setLanguage] = React.useState<UiLanguage>(getInitialLanguage)
  const [query, setQuery] = React.useState("")
  const deferredQuery = React.useDeferredValue(query)
  const [games, setGames] = React.useState<Game[]>([])
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading"
  )
  const [errorMessage, setErrorMessage] = React.useState("")
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadGames() {
      setStatus("loading")
      setErrorMessage("")

      try {
        const rawGames = await fetchGameList(controller.signal)
        if (active) {
          setGames(normalizeGames(rawGames))
          setStatus("ready")
        }
      } catch (error) {
        if (!active) {
          return
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        console.error(error)
        setStatus("error")
        setErrorMessage(error instanceof Error ? error.message : "Unknown error")
      }
    }

    void loadGames()

    return () => {
      active = false
      controller.abort()
    }
  }, [reloadKey])

  React.useEffect(() => {
    document.documentElement.lang = language
    document.title = SITE_TITLE
    localStorage.setItem("webrpg-language", language)
  }, [language])

  const sortedGames = React.useMemo(() => {
    const collator = new Intl.Collator(language === "en" ? "en" : "zh", {
      sensitivity: "base",
      usage: "sort",
    })

    return [...games].sort((a, b) =>
      collator.compare(a.displayTitle, b.displayTitle)
    )
  }, [games, language])

  const visibleGames = React.useMemo(() => {
    const trimmed = deferredQuery.trim().toLowerCase()
    if (!trimmed) {
      return sortedGames
    }

    return sortedGames.filter((game) => game.searchText.includes(trimmed))
  }, [deferredQuery, sortedGames])

  const copy = I18N[language]

  return (
    <div className="site-shell">
      <div className="site-scrim">
        <header className="hero-band">
          <div className="brand-lockup">
            <img className="brand-mark" src={LOGO} alt="" aria-hidden="true" />
            <div className="brand-text">
              <h1>{SITE_TITLE}</h1>
              <p>{copy.tagline}</p>
            </div>
          </div>

          <div className="hero-actions">
            <div className="language-switch" role="group" aria-label="language">
              {(Object.keys(I18N) as UiLanguage[]).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={language === item ? "default" : "secondary"}
                  size="sm"
                  className="language-button"
                  onClick={() => setLanguage(item)}
                  aria-pressed={language === item}
                >
                  <Languages className="icon-small" />
                  {LANGUAGE_LABELS[item]}
                </Button>
              ))}
            </div>

            <Button asChild variant="secondary" size="sm" className="github-button">
              <a href="https://github.com/WebRPG-org" target="_blank" rel="noreferrer">
                <GitFork className="icon-small" />
                {copy.github}
                <ExternalLink className="icon-small action-tail" />
              </a>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="reload-button"
              onClick={() => setReloadKey((current) => current + 1)}
              aria-label={copy.retry}
              title={copy.retry}
            >
              <RefreshCw className="icon-small" />
            </Button>
          </div>
        </header>

        <section className="command-band" aria-label={copy.search}>
          <div className="search-row">
            <Search className="search-icon" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="search-input"
              aria-label={copy.search}
            />
          </div>
        </section>

        <main className="catalog-shell">
          {status === "error" ? (
            <StateCard title={copy.loadError} detail={errorMessage}>
              <Button type="button" onClick={() => setReloadKey((n) => n + 1)}>
                <RefreshCw className="icon-small" />
                {copy.retry}
              </Button>
            </StateCard>
          ) : status === "loading" ? (
            <StateCard title={copy.loading}>
              <div className="loading-strip">
                <span />
                <span />
                <span />
              </div>
            </StateCard>
          ) : visibleGames.length === 0 ? (
            <StateCard title={copy.noResults} />
          ) : (
            <div className="catalog-grid">
              {visibleGames.map((game) => (
                <GameCard key={game.id} game={game} language={language} />
              ))}
            </div>
          )}
        </main>

        <Footer language={language} />
      </div>
    </div>
  )
}

function Footer({ language }: { language: UiLanguage }) {
  const copy = I18N[language]

  return (
    <footer className="site-footer">
      <p>
        {copy.footerBefore}{" "}
        <a href="https://ravelloh.com" target="_blank" rel="noreferrer">
          RavelloH
        </a>
        {copy.footerAfter}
      </p>
    </footer>
  )
}

function StateCard({
  title,
  detail,
  children,
}: {
  title: string
  detail?: string
  children?: React.ReactNode
}) {
  return (
    <Card className="state-card">
      <CardContent className="state-content">
        <CardTitle className="state-title">{title}</CardTitle>
        {detail ? <p className="state-detail">{detail}</p> : null}
        {children}
      </CardContent>
    </Card>
  )
}

const GameCard = React.memo(function GameCard({
  game,
  language,
}: {
  game: Game
  language: UiLanguage
}) {
  const copy = I18N[language]

  return (
    <Card className="game-card">
      <CardContent className="game-content">
        <CoverFrame game={game} language={language} />

        <div className="game-body">
          <div className="game-heading">
            <CardTitle className="game-title">{game.displayTitle}</CardTitle>
            <p className="game-repo">
              {game.owner}/{game.name}
            </p>
          </div>

          <div className="game-meta">
            <Badge variant="outline" className="engine-pill">
              {game.engine || "RPG Maker"}
            </Badge>
          </div>

          <div className="game-actions">
            <Button asChild className="action-button">
              <a href={game.playUrl} target="_blank" rel="noreferrer">
                <Play className="icon-small" />
                {copy.play}
              </a>
            </Button>
            <Button asChild variant="secondary" className="action-button">
              <a href={game.repo} target="_blank" rel="noreferrer">
                <GitFork className="icon-small" />
                {copy.source}
                <ExternalLink className="icon-small action-tail" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

const CoverFrame = React.memo(function CoverFrame({
  game,
  language,
}: {
  game: Game
  language: UiLanguage
}) {
  const [loaded, setLoaded] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const copy = I18N[language]

  React.useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [game.coverUrl])

  return (
    <div className="cover-frame">
      <img className="cover-base" src={EMPTY_BOOK} alt="" aria-hidden="true" />
      {game.coverUrl && !failed ? (
        <img
          className={`cover-image${loaded ? " is-loaded" : ""}`}
          src={game.coverUrl}
          alt={copy.coverAlt.replace("{title}", game.displayTitle)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  )
})

async function fetchGameList(signal: AbortSignal): Promise<RawGame[]> {
  let lastError: unknown

  for (const endpoint of LIST_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal,
      })

      if (!response.ok) {
        throw new Error(`${endpoint} returned ${response.status}`)
      }

      const data: unknown = await response.json()
      if (!Array.isArray(data)) {
        throw new Error(`${endpoint} did not return a JSON array`)
      }

      return data as RawGame[]
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to load the catalog")
}

function normalizeGames(list: RawGame[]): Game[] {
  const forkNameMap = buildForkNameMap(list)

  return list
    .filter((game) => !isHiddenGame(game))
    .map((game) => normalizeGame(game, forkNameMap))
}

function isHiddenGame(game: RawGame) {
  if (HIDDEN_STATUSES.has(game.status ?? "")) {
    return true
  }

  const title = game.title?.trim()
  return title === "__template__"
}

function normalizeGame(game: RawGame, forkNameMap: Map<string, string>): Game {
  const sourceKey = `${game.owner}/${game.name}`.toLowerCase()
  const forkName =
    game.forkName || forkNameMap.get(sourceKey) || makeForkName(game.owner, game.name)
  const playUrl = buildPlayUrl(game, forkName)
  const displayTitle = getDisplayTitle(game)
  const coverUrl = getExplicitCoverUrl(game.cover, playUrl)

  return {
    ...game,
    displayTitle,
    forkName,
    playUrl,
    coverUrl,
    searchText: [
      displayTitle,
      game.owner,
      game.name,
      game.repo,
      game.engine,
      forkName,
      ...(game.language ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }
}

function buildForkNameMap(list: RawGame[]) {
  const map = new Map<string, string>()

  for (const game of list) {
    const sourceKey = `${game.owner}/${game.name}`.toLowerCase()
    if (!map.has(sourceKey)) {
      map.set(sourceKey, game.forkName || makeForkName(game.owner, game.name))
    }
  }

  return map
}

function buildPlayUrl(game: RawGame, forkName: string) {
  if (game.pagesUrl) {
    return ensureTrailingSlash(game.pagesUrl)
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname
    if (host === "webrpg.org" || host === "webrpg-org.github.io") {
      return ensureTrailingSlash(
        `${window.location.origin}/${encodeURIComponent(forkName)}`
      )
    }
  }

  return ensureTrailingSlash(`https://webrpg.org/${encodeURIComponent(forkName)}`)
}

function getExplicitCoverUrl(value: string | undefined, base: string) {
  if (!value || isTemplateText(value)) {
    return null
  }

  try {
    return new URL(value, base).toString()
  } catch {
    return null
  }
}

function getDisplayTitle(game: RawGame) {
  const title = game.title?.trim()
  if (title && !isTemplateText(title)) {
    return title
  }

  return game.name || game.id || `${game.owner}/${game.name}`
}

function isTemplateText(value: string) {
  return /\{\{.*\}\}/.test(value)
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`
}

function makeForkName(owner: string, name: string) {
  const raw = `${owner}-${name}`
  let safe = raw
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")

  if (!safe) {
    safe = "repo"
  }

  if (safe.length > 100) {
    safe = safe.slice(0, 100).replace(/[.-]+$/g, "")
  }

  return safe
}

function getInitialLanguage(): UiLanguage {
  try {
    const stored = localStorage.getItem("webrpg-language")
    if (stored && stored in I18N) {
      return stored as UiLanguage
    }
  } catch {
    // ignore storage errors
  }

  const browserLanguage = navigator.language || ""
  if (browserLanguage.startsWith("ja")) {
    return "ja"
  }

  if (browserLanguage.startsWith("zh")) {
    return "zh-Hans"
  }

  return "en"
}

export default App
