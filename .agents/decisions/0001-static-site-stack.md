# ADR 0001：静态站点技术栈

- 状态：提议（待维护者确认）
- 日期：2026-11-21
- 决策者：维护者（方向）、agent（初始实现）

## 背景

`blok-ds` 要作为个人博客长期使用，需求是：

- 纯静态页面，能部署在 GitHub Pages；
- 文章数据保存在仓库目录，不接 CMS、数据库或后端；
- 风格简洁美观，解释性文字少；
- 维护成本低，写作与改版都简单。

仓库初始只有一个 README，没有既有技术包袱。

## 决策

采用 **Astro** 作为静态站点生成器：

- 文章使用 Markdown，放在 `src/content/posts/`，由 Content Collections 提供 frontmatter 校验；
- 首页、文章页、RSS、404 在构建时生成，输出纯 HTML/CSS，无客户端 JavaScript；
- 样式使用原生 CSS，不引入 UI 框架与远程字体；
- 包管理使用 pnpm，Node.js 22（>=22.23.4）；
- 部署使用 `gh-pages` 分支托管构建产物，由 GitHub Pages 直接托管；自动部署工作流作为后续能力。

详细设计见 [`../design/initial-design.md`](../design/initial-design.md)。

## 备选方案

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| Astro | Markdown 原生、静态输出、零客户端 JS、生态成熟、与 pnpm/Actions 集成简单 | 需要构建步骤与依赖升级 | 采用 |
| Jekyll | GitHub Pages 原生构建，无需 CI | 主题与布局定制受 Ruby 工具链限制，本地无 Ruby；私有仓库 Pages 仍受计划限制 | 不采用 |
| Hugo | 构建快、单二进制 | 需要额外安装二进制；模板语法与前端工具链割裂 | 不采用 |
| Eleventy | 轻量、灵活 | 布局、集合、feed 需要自行组织，初始成本更高 | 不采用 |
| 手写 HTML | 无构建、完全可控 | 布局与 feed 重复，长期维护差 | 不采用 |

## 后果

- 正面：写作只需新增 Markdown；构建产物小、加载快；改版集中在布局与 CSS。
- 代价：需要维护 Node 依赖与 lockfile；部署依赖 `gh-pages` 分支更新；首次上线需维护者在仓库设置中启用 Pages。自动部署可在后续添加。
- 站点位于项目路径（`/<repo>/`），所有内部链接通过统一工具函数生成；构建时通过 `SITE` / `BASE_PATH` 注入，自动流程中由 `actions/configure-pages` 提供，将来换自定义域名重新构建即可。
- 文内图片管线暂未纳入；后续引入时需解决 base path 与资源优化，另行记录 ADR。
