export const LOCALES = ["en", "zh-Hans", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const isLocale = (value: string): value is Locale => LOCALES.includes(value as Locale);
export const LABEL: Record<Locale, string> = { en: "English", "zh-Hans": "简体中文", ja: "日本語" };
export const UI = {
  en: {
    tagline: "Indexing public Web RPG works on GitHub",
    search: "Search all games", searchPlaceholder: "Search titles, developers, tags…", searchHint: "Search the complete game catalog",
    filters: "Filters", genre: "Genre / theme", language: "Playable language", any: "Any", safeOnly: "Hide adult & unrated",
    includeUnrated: "Show adult & unrated", close: "Close", noResults: "No matching games", moreResults: "Show more results",
    play: "Play", source: "Source", details: "Details", versions: "Playable versions",
    browse: "Browse games", more: "Browse catalog", page: "Page", of: "of", next: "Next", previous: "Previous",
    catalog: "Game catalog", genres: "Genres & themes", languages: "Playable languages", moreGenres: "More genres", moreLanguages: "More languages", browseCategories: "Browse genres & languages", editions: "versions",
    unknown: "Unrated", adult: "Adult", safe: "All ages", editorialScore: "Editorial rating", sortPopularity: "Popularity: high to low · ties sorted by game title", popularityRecords: "works with popularity data", sortRating: "Editorial rating: high to low · unrated games sorted by name", ratingMissing: "Not rated", ratingLegend: "Ratings reflect editorial scores, not user reviews", nsfwFilter: "Content rating", nsfwAll: "All ratings", draft: "Editorial preview — not yet reviewed", unavailable: "Currently unavailable",
    all: "All games", original: "Original title", developers: "Developers", publishers: "Publishers",
    release: "Release date", narrative: "About this game", noIntro: "No reviewed introduction is available in this language.",
    related: "Related games", suggest: "Browse in", switch: "Switch language", dismiss: "Not now",
    never: "Don't suggest again", browser: "Your browser prefers another language.",
    footer: "Copyright for each game belongs to its creators. WebRPG directory code is MIT licensed.",
    gameCount: "games", curated: "A directory of browser-playable game works",
  },
  "zh-Hans": {
    tagline: "索引 GitHub 上公开的 Web RPG 作品",
    search: "搜索全部作品", searchPlaceholder: "搜索标题、开发者、标签…", searchHint: "从整个游戏目录中搜索",
    filters: "组合筛选", genre: "类型／题材", language: "实际游戏语言", any: "不限", safeOnly: "隐藏成人与未分级",
    includeUnrated: "包含成人与未分级", close: "关闭", noResults: "没有找到匹配的作品", moreResults: "显示更多结果",
    play: "开始", source: "源码", details: "作品详情", versions: "可游玩的版本",
    browse: "浏览游戏", more: "浏览目录", page: "第", of: "页，共", next: "下一页", previous: "上一页",
    catalog: "作品目录", genres: "类型与题材", languages: "游戏语言", moreGenres: "更多类型", moreLanguages: "更多语言", browseCategories: "按类型与语言浏览", editions: "个版本",
    unknown: "未分级", adult: "成人内容", safe: "全年龄", editorialScore: "编辑评分", sortPopularity: "按流行度从高到低 · 同分按作品名排序", popularityRecords: "部作品有流行度数据", sortRating: "按编辑评分从高到低 · 未评分按名称排序", ratingMissing: "暂无评分", ratingLegend: "这是编辑评分，不是用户综合评分", nsfwFilter: "内容分级", nsfwAll: "全部分级", draft: "作品介绍尚未审核（预览）", unavailable: "当前不可游玩",
    all: "全部游戏", original: "原始标题", developers: "开发者", publishers: "发行者",
    release: "发行时间", narrative: "作品介绍", noIntro: "当前语言尚无已审核的介绍内容。",
    related: "相关作品", suggest: "切换至", switch: "切换语言", dismiss: "暂不切换",
    never: "不再提醒", browser: "你的浏览器偏好另一种语言。",
    footer: "游戏作品版权归原作者所有；WebRPG 目录代码采用 MIT 协议。",
    gameCount: "部作品", curated: "可在浏览器中游玩的游戏作品目录",
  },
  ja: {
    tagline: "GitHub の公開 Web RPG 作品を収録",
    search: "全作品を検索", searchPlaceholder: "作品名・開発者・タグを検索…", searchHint: "全作品から検索します",
    filters: "絞り込み", genre: "ジャンル／テーマ", language: "プレイ可能な言語", any: "すべて", safeOnly: "成人向け・未分類を除外",
    includeUnrated: "成人向け・未分類を表示", close: "閉じる", noResults: "一致する作品はありません", moreResults: "さらに表示",
    play: "プレイ", source: "ソース", details: "作品詳細", versions: "プレイ可能なバージョン",
    browse: "ゲームを探す", more: "作品一覧", page: "ページ", of: "/", next: "次へ", previous: "前へ",
    catalog: "作品一覧", genres: "ジャンル・テーマ", languages: "プレイ可能な言語", moreGenres: "ほかのジャンル", moreLanguages: "ほかの言語", browseCategories: "ジャンル・言語で探す", editions: "バージョン",
    unknown: "未分類", adult: "成人向け", safe: "全年齢", editorialScore: "編集評価", sortPopularity: "人気度の高い順 · 同点は作品名順", popularityRecords: "作品の人気度データ", sortRating: "編集評価の高い順 · 未評価は名前順", ratingMissing: "評価なし", ratingLegend: "編集評価でありユーザーの平均点ではありません", nsfwFilter: "対象年齢", nsfwAll: "すべて", draft: "紹介文はまだ審査されていません（プレビュー）", unavailable: "現在プレイできません",
    all: "すべてのゲーム", original: "原題", developers: "開発者", publishers: "販売元",
    release: "発売日", narrative: "作品について", noIntro: "この言語で審査済みの紹介文はありません。",
    related: "関連作品", suggest: "表示言語を変更：", switch: "言語を変更", dismiss: "今はしない",
    never: "今後表示しない", browser: "ブラウザの優先言語とは異なります。",
    footer: "作品の著作権は各制作者に帰属します。WebRPG のコードは MIT ライセンスです。",
    gameCount: "作品", curated: "ブラウザで遊べるゲーム作品の一覧",
  },
} as const;

const TOPIC_DESCRIPTIONS: Record<string, Record<Locale, string>> = {
  "rpg": {
    en: "Role-playing adventures with characters, exploration, quests and progression. The works in this category offer different settings, gameplay systems and browser-playable versions.",
    "zh-Hans": "收录以角色成长、探索、任务及冒险为核心的角色扮演作品。这里可以查看每部游戏的主题、介绍和不同语言的浏览器可玩版本。",
    ja: "キャラクターの成長、探索、クエストなどを楽しめるロールプレイング作品。作品ごとの世界観やブラウザで遊べるバージョンを確認できます。",
  },
  "visual-novel": {
    en: "Narrative-focused games that tell stories through dialogue, scenes and character choices. Explore the works and compare available editions and the languages each version supports.",
    "zh-Hans": "以剧情、人物对话和场景演出为中心的视觉小说作品。通过独立作品介绍，可以了解故事主题并比较可玩的版本与游戏语言。",
    ja: "文章や会話、場面演出を中心に物語を描くビジュアルノベル。各作品のあらすじや、実際に遊べるバージョンと言語を探せます。",
  },
  "horror": {
    en: "Games featuring eerie atmospheres, unsettling stories, suspense and frightening encounters. Browse horror-themed works alongside their available online versions and language support.",
    "zh-Hans": "收录具有诡异氛围、悬疑叙事和惊悚体验的恐怖题材游戏。可以从作品详情了解主题，并找到对应的在线游玩版本及支持语言。",
    ja: "不気味な雰囲気や緊張感のある物語、恐怖演出を扱うゲームを収録。作品の内容とブラウザで遊べる各バージョンの言語を確認できます。",
  },
  "fantasy": {
    en: "Journey through imagined kingdoms, magical worlds and mythical adventures. These fantasy-themed games span different genres, with individual pages for each work and its playable versions.",
    "zh-Hans": "探索魔法世界、虚构王国与神话冒险题材的游戏作品。此分类跨越不同游戏类型，并按作品展示简介和可用实例，而非仅按仓库区分。",
    ja: "魔法の世界や架空の王国、神話的な冒険を舞台にした作品。ゲームジャンルを横断して作品とブラウザ向けバージョンを一覧できます。",
  },
  "adventure": {
    en: "Discover adventure games built around exploration, encounters and discovery. Compare story themes, creators and playable editions without confusing each game with its individual repositories.",
    "zh-Hans": "浏览侧重探索、经历与发现的冒险游戏。每个作品都有独立目录入口，可进一步了解主题、作者和不同的在线游玩实例。",
    ja: "探索や出会い、発見を楽しむアドベンチャーゲーム。個別のリポジトリではなく作品ごとに内容や制作者、プレイできるバージョンを探せます。",
  },
  "puzzle": {
    en: "Explore games centered on puzzles, logic, observation and problem-solving. Each entry links to an individual game description and its available playable browser versions.",
    "zh-Hans": "收录需要解谜、逻辑思考、观察和寻找线索的作品。可以在对应的详情页查看游戏特点、实例以及实际支持的游玩语言。",
    ja: "謎解きや論理的な思考、観察力を使うゲームを収録。各作品の内容とブラウザでプレイできるバージョンを詳しく確認できます。",
  },
  "drama": {
    en: "Find games with character-driven plots, relationships and emotionally focused storytelling. Each work retains its own identity and links to the playable versions available in the index.",
    "zh-Hans": "关注人物关系、情感发展与剧情表达的游戏作品。这里按作品整理故事主题，并链接到收录的浏览器可玩实例。",
    ja: "人物の関係や感情、物語の展開に重点を置いた作品を集めています。作品単位で内容を知り、対応するプレイ可能なバージョンを探せます。",
  },
};
export const hasCuratedTagDescription = (tag: string) => Object.prototype.hasOwnProperty.call(TOPIC_DESCRIPTIONS, tag);
export function tagDescription(tag: string, locale: Locale, gameCount: number): string | null {
  const main = TOPIC_DESCRIPTIONS[tag]?.[locale];
  if (!main) return null;
  const detail = locale === "en" ? " " + gameCount + " works are currently listed."
    : locale === "ja" ? " 現在、" + gameCount + "作品を収録しています。" : " 当前收录 " + gameCount + " 部作品。";
  return main + detail;
}
export function playableLanguageDescription(code: string, locale: Locale, count: number) {
  const name = langLabel(code, locale);
  if (locale === "en") return "Browse " + count + " browser-playable game works with an instance that supports " + name + ". Playable languages are taken from each game version, independently of the WebRPG interface language.";
  if (locale === "ja") return name + "に対応するブラウザ向けバージョンを持つゲーム" + count + "作品を探せます。ここでの言語はサイトの表示言語ではなく、実際のゲーム内で対応する言語を示します。";
  return "浏览实际游玩实例支持" + name + "的 " + count + " 部游戏作品。这里按照游戏版本的真实语言进行分类，与 WebRPG 网站的界面语言相互独立。";
}

const TAXONOMY: Record<string, Partial<Record<Locale, string>>> = {
  "rpg": { en: "RPG", "zh-Hans": "角色扮演", ja: "RPG" },
  "visual-novel": { en: "Visual novel", "zh-Hans": "视觉小说", ja: "ビジュアルノベル" },
  "horror": { en: "Horror", "zh-Hans": "恐怖", ja: "ホラー" },
  "fantasy": { en: "Fantasy", "zh-Hans": "奇幻", ja: "ファンタジー" },
  "adventure": { en: "Adventure", "zh-Hans": "冒险", ja: "アドベンチャー" },
  "puzzle": { en: "Puzzle", "zh-Hans": "解谜", ja: "パズル" },
  "drama": { en: "Drama", "zh-Hans": "剧情", ja: "ドラマ" },
  "comedy": { en: "Comedy", "zh-Hans": "喜剧", ja: "コメディ" },
  "romance": { en: "Romance", "zh-Hans": "恋爱", ja: "恋愛" },
  "mystery": { en: "Mystery", "zh-Hans": "悬疑", ja: "ミステリー" },
  "action": { en: "Action", "zh-Hans": "动作", ja: "アクション" },
  "full-game": { en: "Full game", "zh-Hans": "完整游戏", ja: "ゲーム本編" },
};
export const taxonomyLabel = (key: string, locale: Locale) => TAXONOMY[key]?.[locale] || key.replace(/-/g, " ");
export const langLabel = (code: string, locale: Locale) => {
  try { return new Intl.DisplayNames([locale], { type: "language" }).of(code) || code; }
  catch { return code; }
};
