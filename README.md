# blok-ds

**本项目用于测试 DeepSeek Super Agent。**

shortlight5980 的个人博客。纯静态站点，使用 Astro 构建，由 GitHub Pages 托管。

## 本地开发

需要 Node.js >= 22.23.4、pnpm 11。

```bash
pnpm install
pnpm dev              # http://localhost:4321
pnpm build            # 构建到 dist/
pnpm preview          # 预览构建产物
```

`pnpm preview` 预览构建产物；若构建时使用了 `BASE_PATH=/blok-ds`，预览也要带同样变量。

## 写文章

在 `src/content/posts/` 下新建 Markdown 文件：

```markdown
---
title: 标题
date: 2026-11-21
updatedDate: "2026-11-22"
description: 可选，用于首页摘要、meta 描述与 RSS
---

正文。
```

文件名决定文章地址。`my-first-post.md` 对应本地地址 `/posts/my-first-post/`。`draft: true` 的文章只在本地开发时可见。

`updatedDate` 可省略。填写时用引号包住有效的 `YYYY-MM-DD` 日期，文章页会在发布日期旁显示「更新于」。

### 引用本地图片

需要和文章一起管理图片时，可以把图片放在文章内容目录下：

```text
src/content/posts/
├── my-first-post.md
└── _images/
    └── my-first-post/
        └── diagram.png
```

在文章中使用图片文件的相对路径，并直接写出图片语法：

```markdown
![架构示意图](./_images/my-first-post/diagram.png)
```

文章地址仍由 `my-first-post.md` 对应为 `/posts/my-first-post/`。构建时 Astro 会处理本地图片资源，自动生成适配 `BASE_PATH` 的 URL，并在图片元素上写入替代文字与原始宽高属性。宽高属性会在图片加载前保留等比例空间，正文样式会让图片随内容宽度缩放。

### 列表配图

在文章的 frontmatter 中按需添加 `listImage`。`src` 填写相对于该 Markdown 文件的本地图片路径，图片可放在同一个 `_images/<slug>/` 目录中。

```yaml
listImage:
  src: ./_images/my-first-post/diagram.png
  alt: 构建流程示意图
```

有信息的图片用 `alt` 描述要传达的内容，纯装饰图可填写 `alt: ""`。配图在首页对应条目的右侧等比显示。

## 部署

这是一个公开仓库，站点已通过 GitHub Pages 上线。访问地址为 [https://shortlight5980.github.io/blok-ds/](https://shortlight5980.github.io/blok-ds/)。

推送到 `main` 后，[发布工作流](.github/workflows/main.yml) 会构建站点，把 `dist/` 中的构建产物推送到 `gh-pages`，并在推送前校验首页实际引用的 CSS 文件。工作流还会等待 GitHub Pages 报告本次 `gh-pages` 提交已构建，再用公网首页响应及其实际 CSS 响应完成有限重试校验。GitHub Pages 的发布来源是 **Deploy from a branch**，使用 `gh-pages` 分支的 `/ (root)` 目录。

工作流使用 `SITE=https://shortlight5980.github.io` 和 `BASE_PATH=/blok-ds` 构建，也可在 Actions 页面手动触发。校验逻辑位于 [`scripts/check-homepage-css.mjs`](scripts/check-homepage-css.mjs)，本地回归测试使用 `pnpm test:homepage-css`。

如需手动发布，维护者可以按以下命令更新 `gh-pages`。同步产物后，先运行同一个发布前校验，再提交和推送。

```bash
set -e
export SITE=https://shortlight5980.github.io
export BASE_PATH=/blok-ds
pnpm build
git fetch origin gh-pages
git worktree add /tmp/blok-ds-pages origin/gh-pages
rsync -a --delete --exclude=.git dist/ /tmp/blok-ds-pages/
node scripts/check-homepage-css.mjs \
  --root /tmp/blok-ds-pages \
  --base-path "$BASE_PATH" \
  --origin "$SITE"
git -C /tmp/blok-ds-pages add -A
git -C /tmp/blok-ds-pages diff --cached --quiet || git -C /tmp/blok-ds-pages commit -m "deploy: 更新站点"
git -C /tmp/blok-ds-pages push origin HEAD:gh-pages
git worktree remove --force /tmp/blok-ds-pages
```

`SITE` / `BASE_PATH` 必须与最终访问地址一致。`rsync` 的 `--exclude=.git` 用于保护 worktree 的 `.git` 文件。`set -e` 会在校验或推送失败时保留 worktree 与发布提交，便于排查后重推。自动工作流会额外等待目标提交的 Pages 构建，并检查公网首页和 CSS 的状态、类型与内容。

`public/.nojekyll` 会随构建进入产物，避免 Jekyll 忽略 `_astro/` 资源。

## 搜索引擎发现

生产构建会生成 `sitemap.xml` 与 `robots.txt`。使用项目站点配置构建时，它们的地址分别是 `/blok-ds/sitemap.xml` 与 `/blok-ds/robots.txt`，`robots.txt` 中的 `Sitemap` 指向正式绝对地址。

标准爬虫从站点域名根路径 `/robots.txt` 获取规则，当前站点对应 `https://shortlight5980.github.io/robots.txt`。项目产物中的 `/blok-ds/robots.txt` 只能通过 `https://shortlight5980.github.io/blok-ds/robots.txt` 直接访问，其内容不参与域名根 robots 规则发现。若要通过 robots 发现 sitemap，需要在域名根文件声明 `Sitemap: https://shortlight5980.github.io/blok-ds/sitemap.xml`，也可以直接向搜索引擎提交该 sitemap 地址。

## 文档

- [AGENTS.md](AGENTS.md)：agent 协作入口
- [.agents/README.md](.agents/README.md)：开发文档、协作与通信约定索引
- [.agents/design/initial-design.md](.agents/design/initial-design.md)：初始技术设计
- [.agents/decisions/0001-static-site-stack.md](.agents/decisions/0001-static-site-stack.md)：技术栈决策记录
- [.agents/decisions/0002-gh-pages-deploy.md](.agents/decisions/0002-gh-pages-deploy.md)：自动部署决策记录
