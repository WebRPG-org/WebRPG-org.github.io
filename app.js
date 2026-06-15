const LIST_ENDPOINTS = [
  "https://raw.githubusercontent.com/WebRPG-org/index/main/list.json",
  "https://cdn.jsdelivr.net/gh/WebRPG-org/index@main/list.json",
  "./list.json",
];

const I18N = {
  "zh-Hans": {
    subtitle: "GitHub 上的 Web RPG 目录",
    eyebrow: "RPG Maker Web Archive",
    title: "可直接游玩的 RPG Maker 目录",
    searchLabel: "搜索",
    searchPlaceholder: "输入标题、作者或仓库名",
    visibleGames: "显示",
    totalGames: "总数",
    engine: "引擎",
    loading: "正在读取目录...",
    loadError: "目录读取失败，请稍后重试。",
    noResults: "没有找到匹配的游戏。",
    play: "开始",
    source: "源码",
    coverAlt: "{title} 封面",
  },
  en: {
    subtitle: "A GitHub catalog of web RPGs",
    eyebrow: "RPG Maker Web Archive",
    title: "Playable RPG Maker Catalog",
    searchLabel: "Search",
    searchPlaceholder: "Title, author, or repository",
    visibleGames: "shown",
    totalGames: "total",
    engine: "engine",
    loading: "Loading catalog...",
    loadError: "Could not load the catalog. Try again later.",
    noResults: "No matching games found.",
    play: "Play",
    source: "Source",
    coverAlt: "Cover for {title}",
  },
  ja: {
    subtitle: "GitHub の Web RPG カタログ",
    eyebrow: "RPG Maker Web Archive",
    title: "ブラウザで遊べる RPG Maker カタログ",
    searchLabel: "検索",
    searchPlaceholder: "タイトル、作者、リポジトリ",
    visibleGames: "表示",
    totalGames: "総数",
    engine: "エンジン",
    loading: "カタログを読み込み中...",
    loadError: "カタログを読み込めませんでした。",
    noResults: "一致するゲームがありません。",
    play: "プレイ",
    source: "ソース",
    coverAlt: "{title} のカバー",
  },
};

const state = {
  games: [],
  query: "",
  language: getInitialLanguage(),
  coverCache: new Map(),
  observer: null,
};

const HIDDEN_STATUSES = new Set([
  "invalid_structure",
  "deleted_invalid_structure",
]);

const elements = {
  grid: document.querySelector("#game-grid"),
  status: document.querySelector("#status-line"),
  search: document.querySelector("#game-search"),
  visibleCount: document.querySelector("#visible-count"),
  totalCount: document.querySelector("#total-count"),
  template: document.querySelector("#game-card-template"),
  langButtons: [...document.querySelectorAll(".lang-button")],
};

init();

async function init() {
  applyLanguage();
  bindEvents();
  setStatus(t("loading"));

  try {
    const list = await fetchGameList();
    const forkNames = buildForkNameMap(list);
    state.games = list
      .filter((game) => !HIDDEN_STATUSES.has(game.status))
      .map((game) => normalizeGame(game, forkNames));
    elements.totalCount.textContent = String(state.games.length);
    render();
  } catch (error) {
    console.error(error);
    setStatus(t("loadError"));
  }
}

function bindEvents() {
  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    render();
  });

  for (const button of elements.langButtons) {
    button.addEventListener("click", () => {
      state.language = button.dataset.lang;
      localStorage.setItem("webrpg-language", state.language);
      applyLanguage();
      render();
    });
  }
}

async function fetchGameList() {
  let lastError;

  for (const endpoint of LIST_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`${endpoint} returned ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error(`${endpoint} did not return a JSON array`);
      }

      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function normalizeGame(game, forkNames) {
  const sourceKey = `${game.owner}/${game.name}`.toLowerCase();
  const forkName = forkNames.get(sourceKey) || makeForkName(game.owner, game.name);
  const playUrl = `${getPagesOrigin()}/${encodeURIComponent(forkName)}/`;

  return {
    ...game,
    forkName,
    playUrl,
    searchText: [
      game.title,
      game.owner,
      game.name,
      game.repo,
      game.engine,
      forkName,
    ].join(" ").toLowerCase(),
  };
}

function render() {
  const games = filterGames();
  elements.visibleCount.textContent = String(games.length);
  elements.totalCount.textContent = String(state.games.length);
  elements.grid.replaceChildren();

  if (state.games.length === 0) {
    return;
  }

  if (games.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = t("noResults");
    elements.grid.append(empty);
    setStatus("");
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const game of games) {
    fragment.append(createGameCard(game));
  }

  elements.grid.append(fragment);
  setStatus("");
  observeCovers();
}

function filterGames() {
  if (!state.query) {
    return state.games;
  }

  return state.games.filter((game) => game.searchText.includes(state.query));
}

function createGameCard(game) {
  const node = elements.template.content.firstElementChild.cloneNode(true);
  const title = node.querySelector(".game-title");
  const repoLine = node.querySelector(".repo-line");
  const engine = node.querySelector(".engine-pill");
  const repo = node.querySelector(".repo-pill");
  const source = node.querySelector(".source-button");
  const image = node.querySelector(".cover-image");
  const playLinks = [...node.querySelectorAll('[data-role="play-link"]')];

  node.dataset.cover = "pending";
  node.dataset.forkName = game.forkName;
  title.textContent = game.title;
  repoLine.textContent = `${game.owner}/${game.name}`;
  engine.textContent = game.engine || "RPG Maker";
  repo.textContent = game.forkName;
  source.href = game.repo;
  image.alt = t("coverAlt").replace("{title}", game.title);

  for (const link of playLinks) {
    link.href = game.playUrl;
  }

  translateWithin(node);
  node.__game = game;
  return node;
}

function observeCovers() {
  if (state.observer) {
    state.observer.disconnect();
  }

  state.observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        state.observer.unobserve(entry.target);
        loadCover(entry.target, entry.target.__game);
      }
    }
  }, { rootMargin: "320px 0px" });

  for (const card of document.querySelectorAll(".game-card[data-cover='pending']")) {
    state.observer.observe(card);
  }
}

async function loadCover(card, game) {
  const image = card.querySelector(".cover-image");

  if (state.coverCache.has(game.forkName)) {
    const cached = state.coverCache.get(game.forkName);
    if (cached) {
      image.src = cached;
      card.dataset.cover = "ready";
    } else {
      card.dataset.cover = "missing";
    }
    return;
  }

  const cover = await findFirstImage(getCoverCandidates(game));
  state.coverCache.set(game.forkName, cover);

  if (cover) {
    image.src = cover;
    card.dataset.cover = "ready";
  } else {
    card.dataset.cover = "missing";
  }
}

function getCoverCandidates(game) {
  const base = game.playUrl;
  const explicit = game.cover ? [new URL(game.cover, base).toString()] : [];
  const common = [
    "icon/icon.png",
    "www/icon/icon.png",
    "img/titles1/Title.png",
    "img/titles1/title.png",
    "www/img/titles1/Title.png",
    "www/img/titles1/title.png",
    "img/pictures/Title.png",
    "www/img/pictures/Title.png",
  ];

  return [
    ...explicit,
    ...common.map((path) => new URL(path, base).toString()),
  ];
}

function findFirstImage(urls) {
  return urls.reduce((promise, url) => {
    return promise.then((found) => found || testImage(url));
  }, Promise.resolve(null));
}

function testImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = window.setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      resolve(null);
    }, 2800);

    image.onload = () => {
      window.clearTimeout(timer);
      resolve(url);
    };

    image.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };

    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.src = url;
  });
}

function buildForkNameMap(list) {
  const bySource = new Map();

  for (const game of list) {
    const sourceKey = `${game.owner}/${game.name}`.toLowerCase();
    if (!bySource.has(sourceKey)) {
      bySource.set(sourceKey, {
        source: `${game.owner}/${game.name}`,
        owner: game.owner,
        name: game.name,
        forkName: makeForkName(game.owner, game.name),
      });
    }
  }

  return new Map([...bySource.values()].map((item) => [item.source.toLowerCase(), item.forkName]));
}

function makeForkName(owner, name) {
  const raw = `${owner}-${name}`;
  let safe = raw
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");

  if (!safe) {
    safe = "repo";
  }

  if (safe.length <= 100) {
    return safe;
  }

  return safe.slice(0, 100).replace(/[.-]+$/g, "");
}

function getPagesOrigin() {
  if (["webrpg.org", "webrpg-org.github.io"].includes(window.location.hostname)) {
    return window.location.origin;
  }

  return "https://webrpg.org";
}

function applyLanguage() {
  document.documentElement.lang = state.language;

  for (const button of elements.langButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.lang === state.language));
  }

  translateWithin(document);
}

function translateWithin(root) {
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }

  for (const node of root.querySelectorAll("[data-i18n-placeholder]")) {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  }
}

function setStatus(message) {
  elements.status.textContent = message;
}

function t(key) {
  return I18N[state.language]?.[key] || I18N.en[key] || key;
}

function getInitialLanguage() {
  const saved = localStorage.getItem("webrpg-language");
  if (saved && I18N[saved]) {
    return saved;
  }

  const browserLanguage = navigator.language || "";
  if (browserLanguage.startsWith("ja")) {
    return "ja";
  }

  if (browserLanguage.startsWith("zh")) {
    return "zh-Hans";
  }

  return "en";
}
