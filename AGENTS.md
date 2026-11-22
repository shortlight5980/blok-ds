# AGENTS.md

本文件是 agent 与本仓库协作的入口。开始任何工作前，先读本文件，再读 [`.agents/README.md`](.agents/README.md)。

## 仓库是什么

`blok-ds` 是 shortlight5980 的个人博客：纯静态站点，部署目标为 GitHub Pages（启用后）。风格简洁、留白充足、解释性文字少；文章是仓库里的 Markdown 文件，不接 CMS 或数据库。

## 技术栈

- Astro：静态输出，不使用客户端框架。
- 内容：`src/content/posts/*.md`，由 Astro Content Collections 管理。
- 样式：原生 CSS（`src/styles/global.css`），不引入 UI 框架、CSS-in-JS 或远程字体。
- 部署：构建产物发布到 `gh-pages` 分支，启用 Pages 后由 GitHub Pages 托管；自动部署为后续项，见设计文档 §11.3。
- 包管理：pnpm；Node.js 22（>=22.23.4，见 `package.json` 的 `engines`）。

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 本地开发，http://localhost:4321
pnpm build            # 构建到 dist/
pnpm preview          # 预览构建产物
```

`pnpm build` 必须通过；改动完成前在本地跑一次。发布到 Pages 的构建需要额外注入 `SITE` / `BASE_PATH`，见 README 的部署一节。

## 目录结构

```text
src/
  content/posts/      文章 Markdown
  layouts/            页面布局
  pages/              路由（首页、文章页、RSS、404）
  lib/                路径与格式化等小工具
  styles/global.css   全站样式与设计变量
  consts.ts           站点标题、描述等常量
public/               静态资源（favicon 等）
.agents/              开发文档、协作与通信约定、技术设计、决策记录
```

## 内容约定

- 新文章放在 `src/content/posts/`，文件名即 slug，文章地址为 `/posts/<slug>/`；发布后改文件名会破坏旧链接。正文图片放在 `src/content/posts/_images/<slug>/`，通过 Markdown 相对路径引用，并与文章一起提交。
- frontmatter：`title`、`date` 必填；`updatedDate`、`description`、`tags`、`draft` 可选。`date` 使用 `YYYY-MM-DD`；`updatedDate` 使用带引号的 `"YYYY-MM-DD"`。
- `draft: true` 的文章只在 `pnpm dev` 中出现，生产构建不输出。
- 正文用简洁的书面中文；少用解释性铺垫。代码块标注语言。

## 设计与开发约定

- 保持极简：不新增解释性文案、装饰性模块、营销式区块或组件库。
- 优先语义化 HTML 与原生 CSS；默认不引入客户端 JavaScript，确有必要时先说明理由。
- 颜色、间距、字体从 `global.css` 的 CSS 变量取值，不散落硬编码色值。
- 保证键盘可操作、焦点可见、对比度足够，并支持系统深色模式。
- 不提交 `dist/`、`node_modules/`、`.astro/`；不提交密钥或私人数据。

## 工作流程

- 分支、提交、PR、评审与 CI 规则见 [`.agents/workflow.md`](.agents/workflow.md)。
- 消息与交接格式见 [`.agents/communication.md`](.agents/communication.md)。
- 角色与决策边界见 [`.agents/collaboration.md`](.agents/collaboration.md)。
- UI 改动需在 PR 中附前后对比截图，说明基线版本与视口。
- 目录结构、技术栈、部署方式变化时，更新 [`.agents/design/initial-design.md`](.agents/design/initial-design.md) 并在 `.agents/decisions/` 新增 ADR。

## 仓库设置

GitHub Pages 的启用、仓库可见性、自定义域名等设置由维护者在 GitHub 上操作，agent 不擅自修改。
