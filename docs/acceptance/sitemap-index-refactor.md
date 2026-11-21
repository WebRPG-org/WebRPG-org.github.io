# WebRPG Sitemap Index 重构验收记录

## 一、实施来源与 Git 工作环境

权威实施规范：Recalloom /Projects/WebRPG/Plans/SSG-SEO-2026-11-20/Sitemap-Index-Refactor-Plan-2026-11-21.md（已完整读取，136 行）。

- 唯一开发目录：E:\.codex\worktrees\webrpg-astro-ssg-seo。
- 功能分支：feature/sitemap-index；基于 main 稳定 HEAD e63fdb7025210d15df83301fae79a0194dd2106d。
- 根据用户的新指令，已移除额外临时工作树；不再新建工作树。原 feature/astro-ssg-seo 分支历史保留。
- 当前数据来源：WebRPG-org/index @ eeef65a9de8b738ee0e7554cedfa42c956f34f5d。同一个不可变提交的 games.json 和 list.json，同一已有构建快照；未修改 Index。
- 已验证的 Sitemap 实现与测试提交：acd784bcbd9ac507e1c564ed46415a49077741e2。
- 本验收文件所在的最后提交，通过 git rev-parse HEAD 获取完整 SHA；交付回复同时列出最终提交。
- 没有合并 main、推送、部署或操作 Cloudflare；等待独立审计。

## 二、修改范围与模块

| 文件 | 作用 |
|---|---|
| src/seo/sitemap-data.ts | 纯函数计算 Catalog、Play URL、过滤与逐实例排除原因，保证确定性去重。 |
| src/seo/sitemap-xml.ts | 三份 Sitemap 复用的 XML 1.0 序列化、实体转义、HTTPS 域名与重复/非规范 URL 校验、稳定排序。 |
| src/pages/sitemap.xml.ts | 保持路径不变，由旧 URLset 改为包含两个子项的 Sitemap Index。 |
| src/pages/sitemap-catalog.xml.ts | 完整复用既有 Catalog 路由函数、编辑过的标签说明、indexable 和分页规则输出 Catalog URLset。 |
| src/pages/sitemap-play.xml.ts | 从当前构建 Catalog 规范化 instances 输出有效内部实例的原始 playUrl。 |
| scripts/verify-dist.mjs | 真实 XML Parser、三份 XML 校验、Catalog 与 HTML canonical/noindex 校验、Play 完整性/排除原因、Manifest。 |
| tests/sitemap.test.mjs | 真实 Index + Fixture：NSFW、draft、空简介、多实例、外部、失败/待复核、大小写、深层 HTML、XML 转义及源更新。 |
| scripts/browser-smoke.mjs | 真实 HTTP GET 和浏览器 XML DOMParser 检查三份文件及 robots.txt。 |
| scripts/generate-legacy-sitemap-diff.mjs | 从已有 Index 快照导出旧 URL 迁移候选，明确来源及无法确认的记录。 |
| docs/acceptance/legacy-sitemap-diff.md / .json | 历史候选 URL 的统计、逐项实例 ID、来源状态、保留/排除/未决原因。 |
| package.json / package-lock.json | 新增仅用于校验的安全最新版 @xmldom/xmldom 0.9.12 开发依赖。 |
| README.md | 更新 Sitemap Index 与旧游戏路径保留的说明。 |

public/robots.txt 没有更改，仍唯一声明 Sitemap: https://webrpg.org/sitemap.xml。

## 三、真实构建的三份 Sitemap

| 公开文件 | XML 元素 | UTF-8 字节 | 根 |
|---|---:|---:|---|
| https://webrpg.org/sitemap.xml | 2 个子 Sitemap | 261 B | sitemapindex |
| https://webrpg.org/sitemap-catalog.xml | 1,851 个 URL | 133,353 B | urlset |
| https://webrpg.org/sitemap-play.xml | 448 个 URL | 31,504 B | urlset |

- Catalog + Play 共 2,299 个唯一目标 URL，无组内或跨组重复。
- Catalog 细分：3 个语言首页、1,641 个游戏详情、87 个标签分类、75 个可游玩语言分类、45 个分页 = 1,851。
- 构建静态 HTML 1,985 个；indexable 1,852（含根 / 这个非规范副本），noindex 133；Catalog 只收录 1,851 个自我规范的、实际存在的 HTML 页面。
- 165,198 个静态内部链接引用经过校验；HTML 规范 URL、noindex、hreflang 与 Catalog 均保持一致。
- XML 无 lastmod、priority、changefreq，不使用构建时间伪造更新日期；采用固定命名空间、UTF-8、规范化排序。
- Manifest 继续保留 pages.sitemap 代表 Catalog URL 数，同时新增 sitemaps.index/catalog/play 的数量与大小、候选与排除记录，兼容此前的构建监控。

## 四、Play 实例筛选

- 总实例候选 593，其中内部 451、外部 142。
- 自动收录 448：type=internal、available=true、needsReview=false、有效 HTTPS webrpg.org/<forkName>/... 原始路径；无源 URL 的 query/fragment、非规范子路径或重复。
- 排除 145：外部实例 142；技术不可用 2；待技术复核 1。其他当前快照异常原因 0，均有单元 Fixture 覆盖。
- 排除的三个内部实例：
  - avery-pierce-averypierce-me，basicrpg，needs-review；
  - diegoliveros-diegoliveros-github-io，bibliogame，unavailable（原游戏入口是 /DiegOliveros-diegoliveros.github.io/game.html）；
  - apollovy-fear-and-hunger，fear-and-hunger，unavailable。
- 保留源大小写、百分号编码、真实深层 HTML 入口。如 /rex-lam-Anti-FraudX/rpg_game.html、/Brand24376-Brand24376.github.io/game.html、/stuartmrwong-stuartmrwong.github.io/CISA.html；不拼造目录 URL，不添加尾部斜杠。
- 无法仅凭 Index 快照断言所有运行页的 HTML Head 的 robots/canonical；没有批量抓取 448 个线上游戏，发布后应按代表性样本验证。
- Catalog 仍只使用 game.indexable[locale]，并不新增 draft、审核、简介长度、NSFW 限制；成人与未分级 Game 正常遵循原有资格条件，NSFW 分类筛选页依旧 noindex。

## 五、旧约 812 URL 迁移分析

**必须明确：旧版生产 sitemap.xml 原始 XML 在已有 Git 历史与本地文件中不可取得，因此不能声称已完成与原始 812 行 XML 的精确逐条差分。** 最新锁定 Index 的 list.json 中恰好有 812 条 pagesUrl；它是有 provenance 的历史运行 URL 候选集，但“数量相同”不证明与旧 XML 完全相同。

- 候选 812，唯一 URL 812，新 Play 448 都包含在该候选集合。
- 保留 448：属于当前有效可玩内部实例。
- 排除 359：源标记 meta.playable=false。
- 排除 2：当前实例标记 unavailable。
- 排除 1：当前实例需技术复核。
- 未决 2：源状态 verified，但没有足够证据证实真正可玩，留待人工核对。
- 差异 JSON 230,523 B；完整保留每条候选 ID、URL、来源状态、playable 标记、所属 Game、分类与理由。摘要及 JSON 分别是 docs/acceptance/legacy-sitemap-diff.md 和 docs/acceptance/legacy-sitemap-diff.json。
- 未依据旧 Sitemap 的存在批量恢复 812 条、未设置永久例外清单、未修改旧游戏 URL / 资源 / GitHub Pages 或任何存档行为。
- 日后如获得可信的历史 XML（明确日期与校验哈希），应另行生成基于真实 XML 集合的差集，并与本次候选报告并列保存。

## 六、完整本地验证

复现使用固定数据提交 eeef65a9de8b738ee0e7554cedfa42c956f34f5d：

1. 设置 INDEX_REF 为上述 SHA。
2. npm ci --include=dev --no-audit --no-fund
3. npm run prepare:data
4. node scripts/generate-legacy-sitemap-diff.mjs
5. node --test tests/sitemap.test.mjs
6. npm run lint
7. npx astro check
8. npm run ci
9. npm run test:browser

**实际结果：**
- Sitemap 独立单元测试 6/6 通过；全部 Node 单元测试 **30/30 通过**。
- ESLint 通过，Astro TypeScript **44 files / 0 errors / 0 warnings / 0 hints**。
- npm run ci 通过：1985 个静态 HTML 生成、3 份 Sitemap XML 真正解析、Catalog 与 HTML / Canonical / noindex 完全一致；Play 由内部可用实例组成，所有规则通过。
- Edge + Astro 静态 Preview 浏览器测试 **19/19 通过**，包括新增的三个 XML URL 实际 HTTP 200、浏览器 XML 解析、唯一 robots 指令、旧的三语言、搜索、分页、移动端、无 JavaScript 与深层原始 URL。
- HTML/XML 输出确定性来自同一 Catalog；没有额外数据抓取、运行时 SSR、CDN 动态生成或构建时网络扫描所有游戏页面。

**XML 媒体类型限制：** Astro API Route 均显式声明 application/xml; charset=utf-8。但静态 astro preview 根据 .xml 扩展名响应 text/xml；两者均为标准 XML 类型，实际 XML 声明固定 UTF-8，浏览器测试覆盖。GitHub Pages 的最终 Content-Type 由静态宿主决定，需要发布后核验（不能凭代码中的 Response header 保证上线时 MIME 字节完全一致）。

## 七、Cloudflare 缓存建议（只读方案，未执行）

### Cache Rules

1. 优先对以下 4 条**精确请求路径**使用 Bypass Cache，或非常短的 Edge TTL；优先级高于现有 HTML 的 Cache Everything 规则：
   - /sitemap.xml
   - /sitemap-catalog.xml
   - /sitemap-play.xml
   - /robots.txt
2. /build-manifest.json 也建议 Bypass 或短 TTL，确保发布版本检测准确。
3. 游戏详情的旧 404：配置 404 状态码缓存 TTL 为 0 或很短（例如 0–60 秒）。如已有规则无法按状态设置，再针对 /en/game/、/zh-Hans/game/、/ja/game/ 的 HTML 降低 TTL，而非关闭整个游戏资产缓存。
4. 核对 Cloudflare Managed robots / Content Signals 是否覆盖了 robots.txt 的唯一 Sitemap 指令。
5. 本轮**未调用 Cloudflare API、未修改规则、未清缓存、未写入 Secret**。

### 成功部署后的精确清理与顺序

仅在 GitHub Actions 的 build + browser + deploy 均成功，线上 build-manifest.json 对应预期前端和 Index Commit 后，且收到用户上线授权时：

- 针对单个 URL 清理 https://webrpg.org/sitemap.xml
- https://webrpg.org/sitemap-catalog.xml
- https://webrpg.org/sitemap-play.xml
- https://webrpg.org/robots.txt
- https://webrpg.org/build-manifest.json
- 对已证实的旧 404，仅清理相应新游戏介绍页的精确地址 /<locale>/game/<slug>/，必要时考虑同一文件的 /index.html 缓存键；绝不使用全站 Purge Everything。
- 未来如启用自动清理，只在部署成功之后运行，用 GitHub Secrets 保存限定区域且最小 Cache Purge 权限的 API Token；失败部署不能触发缓存清理或泄露凭据。

### 发布后的 HTTP 实证步骤

1. **不加任何查询参数** GET /sitemap.xml，确认 200、是 sitemapindex 根、仅引用两个子表；不能仍是旧 812 URL 的 urlset。
2. 不带查询参数 GET 两份子表，确认 HTTP 200、有效 XML、Loc 数量与新 Manifest 一致、URL 域名正确、无重复或非规范页面。
3. 核对 /robots.txt 只引用 Sitemap Index，并查看真实 Content-Type、CF-Cache-Status、Age、ETag 或 Last-Modified；不同网络/Cloudflare POP 抽查，以排除部分边缘节点仍用旧版本。
4. 仅作为**诊断**比较临时查询参数 URL 与普通 URL；临时参数 URL 不能作为正式 Sitemap 或 Search Console 提交入口。
5. 检查新 Game slug 对应 GitHub Pages artifact 已包含 HTML。若普通 /en/game/<slug>/ 返回旧 404 而附加临时查询参数可返回 200，先保存证据、单 URL purge，再以普通 URL 验证恢复。
6. 有限抽样 Play 子表的运行页（仓库根、rpg_game.html、game.html、大小写混合、NSFW），检查 GET 200、实际 Head 的 noindex/canonical、必要资源与存档；不要运行全 448 页的高频探测。
7. 用户授权后，在 Search Console 提交稳定 https://webrpg.org/sitemap.xml 并观察子表的发现和收录；不能把 sitemap 生成等同于已经被搜索引擎收录。

## 八、剩余待生产验证事项

- 真实 CDN 的三份普通 XML URL、robots.txt、Content-Type、Cloudflare 边缘节点缓存一致性。
- 旧 404 负缓存是否仍影响新 Game 页面、个别旧 Play 页的 meta robots/canonical 与游戏资源。
- 旧约 812 URL 的**原始 XML 基线缺失**；2 条未决历史候选待人工独立审计，不自动加入新 Play。
- 不需要改变 Catalog SEO 规则、游戏源站、Index 或 Cloudflare。本次代码仅在未推送的功能分支交付，等待独立审计。
