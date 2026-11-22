# blok-ds 初始技术设计

- 版本：v0.1
- 日期：2026-11-21
- 状态：初始骨架已实现，视觉方向待维护者确认
- 相关决策：[ADR 0001](../decisions/0001-static-site-stack.md)

## 1. 摘要

`blok-ds` 是维护者的个人博客。站点由 Astro 在构建时生成纯静态文件：文章是仓库里的 Markdown，首页、文章页、RSS 与 404 预渲染为 HTML，产物发布到 `gh-pages` 分支；启用 Pages 后由 GitHub Pages 托管。正文和代码在禁用 JavaScript 时仍可阅读，视觉上以排版、留白与克制的颜色为主。

本次初始化提供可运行的骨架：一篇示例文章、首页列表、文章详情、RSS、404、全站样式、`gh-pages` 初始产物，以及 `.agents/` 下的协作与设计文档。

## 2. 目标与非目标

### 2.1 目标

- 作为长期个人博客使用，写作与改版的维护成本低。
- 文章数据保存在仓库目录，可版本化、可离线备份。
- 简洁美观、阅读优先：移动端可读、支持系统深色模式、无干扰元素。
- 可构建为纯静态产物并发布到 GitHub Pages，无自建服务器、无运行时依赖。
- 架构简单到一个人可以长期维护。

### 2.2 非目标

- 初版不提供后台、在线编辑器、多作者、评论、数据库。
- 不做客户端应用、搜索、推荐、个性化。
- 不做多语言、营销页、SEO 增长工程。
- 初版不引入复杂图片处理管线（见 §14）。

## 3. 需求与约束

| 类别 | 要求 |
| --- | --- |
| 内容 | Markdown 文章存放在仓库；无外部内容源 |
| 展示 | 简洁、留白、解释性文字少；桌面与移动端都可读 |
| 部署 | 构建产物发布到 `gh-pages` 分支；启用 Pages 后由 GitHub Pages 托管 |
| 运行环境 | 静态 HTML/CSS；仅文章页加载代码块复制脚本 |
| 路径 | 项目站点可能位于 `/<repo>/` 子路径，链接与资源必须适配 base path |
| 可访问性 | 语义化结构、键盘可操作、焦点可见、对比度足够 |
| 隐私 | 不集成统计/评论等外部脚本；不把私有数据写入仓库 |
| 维护 | Node.js 22（>=22.23.4）+ pnpm；依赖尽量少，lockfile 入库 |

已知外部约束：

- 仓库当前是私有仓库。GitHub Pages 对私有仓库的可用性取决于账户计划，需要维护者在仓库设置中启用。
- 站点默认是项目页面（`https://<user>.github.io/blok-ds/`），不是用户主页；是否使用自定义域名待定。

## 4. 总体架构

```text
作者
  │ 写 Markdown
  ▼
src/content/posts/*.md
  │ Astro Content Collections 校验 frontmatter
  ▼
astro build
  ├─ 首页：文章列表
  ├─ /posts/<slug>/：文章详情
  ├─ /rss.xml
  ├─ /404.html
  └─ dist/：静态 HTML、CSS、SVG
  │ 发布到 gh-pages 分支（手动或 Actions）
  ▼
GitHub Pages
```

- 没有运行时服务、API、数据库或边缘函数。
- 所有页面在构建时生成；浏览器只请求静态文件。
- 站内链接统一通过 `src/lib/site.ts` 生成，注入构建时的 base path。

## 5. 技术选型

### 5.1 结论

| 层 | 选择 | 理由 |
| --- | --- | --- |
| 站点生成 | Astro 7.x | Markdown 原生、默认静态输出、生态成熟、可扩展 |
| 内容 | Content Collections + glob loader | frontmatter schema 校验、类型提示、按集合查询 |
| 样式 | 原生 CSS + CSS 变量 | 无构建期样式依赖，产物小，改版直接 |
| 字体 | 系统字体栈 | 无远程请求、无 FOUT、无隐私问题 |
| RSS | `@astrojs/rss` | 与 Astro 构建集成，几行代码即可 |
| 包管理 | pnpm | 快速、lockfile 严格 |
| 部署 | GitHub Pages（`gh-pages` 分支） | 与仓库同源，无额外服务 |

### 5.2 备选方案

完整对比见 [ADR 0001](../decisions/0001-static-site-stack.md)。要点：

- **Jekyll**：Pages 原生构建，但主题定制受 Ruby 工具链限制，且私有仓库 Pages 仍受计划限制。
- **Hugo**：构建快，但需要额外二进制，模板语法与前端工具链割裂。
- **Eleventy**：轻量灵活，但布局、集合、feed 需要更多手工组织。
- **手写 HTML**：无构建，但布局与 feed 重复，长期维护差。

### 5.3 明确不引入

- 客户端框架（React/Vue/Svelte 等）、UI 组件库、CSS-in-JS。
- 远程字体、图标库、动画库。
- 评论、统计、广告、第三方脚本。
- 服务端渲染或数据库。

## 6. 目录结构与模块职责

```text
.
├── AGENTS.md                      agent 协作入口
├── README.md                      面向维护者的使用说明
├── astro.config.mjs               site/base、构建与路由配置
├── package.json / pnpm-lock.yaml  依赖与 lockfile
├── public/
│   ├── favicon.svg                静态资源，原样复制
│   └── .nojekyll                  阻止 Pages 的 Jekyll 处理 _astro/
├── src/
│   ├── consts.ts                  站点标题、描述、语言、作者
│   ├── content.config.ts          文章集合与 frontmatter schema
│   ├── lib/site.ts                base path、文章路径、日期格式化
│   ├── content/posts/             文章 Markdown
│   │   └── _images/<slug>/        文章正文图片
│   ├── layouts/BaseLayout.astro   全站 HTML 壳、meta、页头页脚
│   ├── pages/
│   │   ├── index.astro            文章列表
│   │   ├── posts/[...slug].astro  文章详情（getStaticPaths）
│   │   ├── rss.xml.js             RSS 2.0
│   │   └── 404.astro              404 页面
│   └── styles/global.css          设计变量、布局、正文排版
├── .github/assets/                PR 视觉证据截图
└── .agents/                       协作文档、设计、ADR、模板
```

模块边界：

- `consts.ts` 只放展示文案与站点身份，不放逻辑。
- `lib/site.ts` 是全站路径与日期的唯一工具入口；新增链接一律经过 `url()` / `postPath()`。
- `BaseLayout.astro` 负责 `<head>`、页头页脚；页面只负责内容。
- `global.css` 是设计变量的唯一来源；页面不写散落色值。
- 内容集合 schema 负责文章元数据校验，构建失败即暴露错误。

## 7. 内容模型

文章文件位于 `src/content/posts/`，一个文件一篇文章。

### 7.1 frontmatter

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `title` | string | 是 | — | 文章标题 |
| `date` | date (`YYYY-MM-DD`) | 是 | — | 发布/展示日期 |
| `description` | string | 否 | — | 首页摘要、meta description 与 RSS 摘要 |
| `tags` | string[] | 否 | `[]` | 预留，初版不展示标签页 |
| `draft` | boolean | 否 | `false` | `true` 时生产构建不输出 |

### 7.2 标识与 URL

- slug 即文件名（不含扩展名），例如 `hello-world.md` → `/posts/hello-world/`。
- 文章发布后不修改文件名；需要改地址时保留旧文件或增加重定向（后续能力）。
- 日期按 UTC 格式化，避免不同构建机时区导致显示差异。

### 7.3 草稿

- `draft: true` 的文章在 `pnpm dev` 中可见，便于预览。
- 生产构建（`pnpm build`）过滤草稿：不生成页面、不出现在列表与 RSS。

### 7.4 Markdown 能力

初版依赖 Astro 内置 Markdown 渲染，支持标题、列表、引用、代码块、表格、链接等标准语法。正文图片使用直接内联的 Markdown 图片语法，资源放在 `src/content/posts/_images/<slug>/`，文章通过相对路径引用，例如 `![架构示意图](./_images/my-first-post/diagram.png)`。Astro 在构建时解析本地资源，生成带站点 base path 的 URL，并写入图片的替代文字、原始宽高、懒加载与异步解码属性。正文 CSS 让图片按内容宽度缩放。

Markdown 代码块在构建时显示作者标注的语言，省略未标注块的语言标签。复制使用 Markdown 解析出的代码原文，保留缩进、空格和换行。

## 8. 页面与路由

| 路由 | 内容 | 生成方式 |
| --- | --- | --- |
| `/` | 文章列表（标题、日期、可选摘要，按日期倒序） | `index.astro` |
| `/posts/<slug>/` | 文章正文 | `getStaticPaths` 预渲染 |
| `/rss.xml` | RSS 2.0 | 构建时生成 |
| `/404.html` | 404 | 静态页 |

视觉结构：

- 页头：目录页（首页）与 404 显示站点名、站点简介与「文章 / RSS」；文章页不显示站点页头。
- 首页：文章标题与日期，按日期倒序，条目之间用 1px `--rule` 分隔线隔开。非空 `description` 在标题与日期下方显示为摘要，最多两行，超出截断；缺少摘要时保持原有条目间距。无卡片、无分页（文章量增长后再评估）。
- 文章页在正文前显示标题、日期、作者署名、「返回首页」链接和一句话定位。正文至少有三个二级 Markdown 标题时，在作者区与正文之间按原顺序显示目录，链接复用 Markdown 渲染生成的锚点。正文末尾保留返回列表入口。
- 页脚：版权年份 + RSS。
- 初版不设「关于」页；需要时按维护者提供的内容新增。

URL 规范：构建配置 `trailingSlash: 'always'`，页面地址以 `/` 结尾。base path 在构建时由 `BASE_PATH` 注入（项目站点为 `/blok-ds`）；本地开发默认根路径。

## 9. 视觉与交互规范

设计原则：**排版优先、留白、低对比装饰、无多余解释性文字**。

### 9.1 排版

- 内容宽度：`42rem`；移动端左右留白 1.25rem。
- 正文字号 1.0625rem（17px），行高 1.8，适合中文长文阅读。
- 标题使用衬线栈（Noto Serif SC / Noto Serif CJK SC / Songti SC / SimSun / Georgia），正文使用系统无衬线栈，日期与代码使用等宽栈。
- 不使用远程字体，避免闪烁、隐私与额外请求。

### 9.2 颜色与主题

通过 CSS 变量定义，支持浅色与深色两套；深色跟随 `prefers-color-scheme`，无手动切换。

| 变量 | 浅色 | 深色 | 用途 |
| --- | --- | --- | --- |
| `--bg` | `#fcfbf8` | `#171614` | 背景 |
| `--fg` | `#23211e` | `#e6e1d8` | 正文 |
| `--muted` | `#726c62` | `#a39c91` | 次要文字 |
| `--faint` | `#746e64` | `#8a8379` | 日期、页脚（对比度 ≥ 4.5:1） |
| `--rule` | `#e8e3da` | `#2d2a26` | 分隔线 |
| `--accent` | `#a8502d` | `#d98b6a` | 链接、焦点 |
| `--code-bg` | `#f6f3ec` | `#201e1b` | 行内代码与代码块 |

日期与页脚使用 `--faint`；浅色/深色主题下对背景的对比度分别约为 4.88:1 与 4.83:1，满足 WCAG AA（小字号 4.5:1）。代码高亮使用 `github-light-high-contrast` / `github-dark-high-contrast`，浅色代码背景为 `#f6f3ec`，代表性 token 在代码背景上的对比度均 ≥ 4.5:1。

### 9.3 交互与动效

- 仅保留链接颜色过渡；`prefers-reduced-motion` 下关闭。
- 焦点环使用 accent 色，`outline-offset` 3px。
- 复制入口由文章页脚本生成，用剪贴板 API 写入文本，并通过状态消息反馈成功或失败。关闭 JavaScript 后，页面显示正文、代码及 Markdown 语言标签。

### 9.4 响应式

- 单列布局，断点 520px，仅调整留白、字号与列表间距。
- 正文、代码块、表格在窄屏可读；代码块横向滚动，不撑破页面。

### 9.5 避免的模式

- 大 hero、渐变、玻璃拟态、卡片阴影、装饰性图标。
- 解释站点是什么、如何使用的引导文案。
- 自动播放、滚动动画、鼠标跟随等效果。

## 10. 构建与配置

### 10.1 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `SITE` | `http://localhost:4321` | 站点 origin，用于 canonical、RSS、OG |
| `BASE_PATH` | `/` | 站点子路径；发布构建时注入（例如 `/blok-ds`） |

`astro.config.mjs` 将 `BASE_PATH` 规范化为以 `/` 结尾的 base；`site` 与 `base` 共同决定构建出的绝对链接。

### 10.2 本地命令

```bash
pnpm install
pnpm dev       # 开发服务器
pnpm build     # 产物写入 dist/
pnpm preview   # 预览 dist/
```

发布构建使用 `BASE_PATH=/blok-ds`；预览构建产物时同样需要该变量：`BASE_PATH=/blok-ds pnpm preview`。

### 10.3 产物

- `dist/` 为纯静态文件，不提交到 `main`；发布时提交到 `gh-pages` 分支。
- 依赖目录 `node_modules/`、Astro 缓存 `.astro/` 同样不提交。

## 11. 部署

### 11.1 初始方案：`gh-pages` 分支

站点产物发布到独立的 `gh-pages` 分支；启用 Pages 后由 GitHub Pages 直接托管，不需要服务器：

- 源分支保持 `main` 干净，`dist/` 不进入 `main`。
- `gh-pages` 分支只包含构建产物（HTML、`_astro/` 资源、`rss.xml`、`favicon.svg`、`.nojekyll`）。
- `public/.nojekyll` 随构建复制到产物根目录，阻止 Pages 的 Jekyll 处理，确保 `_astro/` 不被忽略。
- 发布流程（手动）：`SITE=https://shortlight5980.github.io BASE_PATH=/blok-ds pnpm build` → 用 `rsync -a --delete --exclude=.git dist/ <worktree>/` 更新 `gh-pages` 分支 → push。`--exclude=.git` 用于保留 worktree 的 `.git` 文件。自动部署见 §11.3。

### 11.2 首次启用（维护者操作）

1. 仓库 **Settings → Pages**。
2. Source 选择 **Deploy from a branch**，分支 `gh-pages`，目录 `/ (root)`。
3. 如私有仓库不可用 Pages，需要调整账户计划或仓库可见性；这是仓库设置决定，agent 不擅自修改。
4. 站点默认为 `https://<user>.github.io/blok-ds/`，项目路径由构建时的 `BASE_PATH` 决定。

### 11.3 自动部署（gh-pages）

推送 `main` 或手动触发时，`.github/workflows/main.yml` 构建站点并把 `dist/` 更新到 `gh-pages` 分支；Pages 继续使用 **Deploy from a branch**（`gh-pages`），不需要切换为 GitHub Actions。

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11.7.0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          SITE: https://${{ github.repository_owner }}.github.io
          BASE_PATH: /${{ github.event.repository.name }}
      - name: Publish to gh-pages
        run: |
          set -euo pipefail
          git fetch origin gh-pages
          git worktree add /tmp/gh-pages FETCH_HEAD
          rsync -a --delete --exclude=.git dist/ /tmp/gh-pages/
          git -C /tmp/gh-pages add -A
          if git -C /tmp/gh-pages diff --cached --quiet; then
            echo "No changes to deploy."
          else
            git -C /tmp/gh-pages \
              -c user.name='github-actions[bot]' \
              -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
              commit -m 'deploy: 更新站点'
            git -C /tmp/gh-pages push origin HEAD:gh-pages
          fi
          git worktree remove --force /tmp/gh-pages
```

workflow 使用 `SITE=https://<owner>.github.io` 与 `BASE_PATH=/<repo>` 构建；换成用户主页或自定义域名时修改这两项。部署提交由 `github-actions[bot]` 创建，`gh-pages` 分支只保留构建产物。PR 构建检查可以另加一个只执行 `pnpm build` 的工作流；当前 workflow 只在 `main` 或手动触发时运行。

### 11.4 回滚

- 页面内容问题：revert 对应源提交，重新运行 workflow（或按 §11.1 手动更新 `gh-pages`）。
- 部署失败：检查 workflow 日志；修复后重新运行，必要时手动更新 `gh-pages`。
- 不在失败状态下继续叠加改动。

## 12. 质量保障

| 项目 | 方式 |
| --- | --- |
| 构建 | 提交前本地执行 `pnpm install --frozen-lockfile && pnpm build`；部署 workflow 在 `main` 上再次构建 |
| 内容校验 | frontmatter schema 在构建时校验，缺字段即失败 |
| 链接 | 构建后抽查站内路径与 base path；后续可加自动链接检查 |
| 可访问性 | 语义化标签、`lang`、焦点可见、对比度（含 `--faint` 日期/页脚）、键盘走查 |
| 响应式 | 320px / 520px / 桌面视口检查 |
| 主题 | 浅色、深色、系统偏好分别检查 |
| 视觉回归 | UI 改动附前后对比截图（基线、视口、主题写明） |

初版没有单元测试：站点逻辑极少，构建成功 + 人工走查是当前足够的质量门槛。引入非平凡逻辑（如分页、标签或自定义图片管线）时再补测试。

## 13. SEO 与 RSS

- 站点名称、`og:site_name` 和 RSS 标题统一使用作者的公开展示名。
- 每页输出 `<title>`、`description`、`og:*`、`twitter:card`；404 输出 `noindex`，不输出 canonical 与 `og:url`（仍保留 `og:type` / `og:title` / `og:description` / `og:site_name`）。
- `html lang="zh-CN"`。
- RSS 输出全部已发布文章，包含标题、链接、日期、可选描述；`<language>zh-CN</language>`。
- 默认不引入统计脚本；访问分析如有需要由维护者决定并单独评估隐私影响。
- sitemap、OG 图片生成列为后续项。

## 14. 扩展路线

按优先级排列，每项在实施前评估是否值得增加复杂度：

1. **图片处理增强**：在现有本地图片支持上评估构建期压缩与更精细的响应式资源策略。
2. **标签页**：`tags` 已预留；增加 `/tags/<tag>/` 与标签索引。
3. **关于页**：维护者提供内容后新增，保持同一排版体系。
4. **自定义域名**：启用后调整 workflow / 构建命令中的 `SITE`/`BASE_PATH`，补充 CNAME 与 HTTPS 检查。
5. **sitemap / OG 图片**：提升分享与索引质量。
6. **评论**：只考虑无账号、低脚本的方案，并明确隐私与维护成本；默认不做。
7. **搜索**：文章量明显增长后再考虑静态索引，不提前引入。
8. **分页**：列表超过一屏很多时再评估。

## 15. 风险与待定

| 风险 / 待定项 | 影响 | 处理 |
| --- | --- | --- |
| 私有仓库能否使用 Pages | 无法上线 | 维护者确认计划并启用 Pages；必要时调整仓库可见性 |
| 视觉方向未最终确认 | 可能返工 | 先以克制的排版方案落地，按反馈调整 |
| 项目子路径与自定义域名 | 链接错误 | 统一走 `url()`，构建时注入 `SITE`/`BASE_PATH`；切换域名需重新构建 |
| 图片处理缺少专门压缩管线 | 大图影响产物体积 | 在扩展路线中评估构建期压缩与响应式资源策略 |
| 依赖升级 | 安全与兼容 | lockfile 入库；升级时以 `pnpm build` 与页面走查验证 |

## 16. 本次初始化范围

已完成：

- 仓库文档体系：`AGENTS.md`、`.agents/`（协作、通信、流程、模板、设计、ADR）。
- 可构建的 Astro 骨架：首页、文章页、RSS、404、示例文章、全站样式与 favicon。
- `gh-pages` 初始构建产物、README、`.gitignore`、lockfile。
- 本地 `pnpm build`、base path 构建与产物检查；发布命令、日期/页脚对比度与 RSS 可复现性已按 review 修正。
- 文章 Markdown 支持仓库内相对图片，构建时适配站点 base path 并输出替代文字、宽高和懒加载属性；正文样式支持窄屏缩放。
- 自动部署 workflow：推送 `main` 或手动触发时构建并更新 `gh-pages`。

待维护者完成 / 确认：

- 在仓库设置中启用 GitHub Pages（Deploy from a branch → `gh-pages` / root）。
- 确认自动部署 workflow：推送 `main` 后会自动构建并更新 `gh-pages`，不需要把 Pages Source 切换为 GitHub Actions。
- 确认视觉方向，必要时调整 `global.css`。
- 决定是否使用自定义域名、评论、统计等外部能力。
