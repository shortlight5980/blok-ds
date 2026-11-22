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
description: 可选，用于首页摘要、meta 描述与 RSS
tags: []
---

正文。
```

文件名决定文章地址。`my-first-post.md` 对应本地地址 `/posts/my-first-post/`。`draft: true` 的文章只在本地开发时可见。

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

## 部署

这是一个公开仓库，站点已通过 GitHub Pages 上线。访问地址为 [https://shortlight5980.github.io/blok-ds/](https://shortlight5980.github.io/blok-ds/)。

推送到 `main` 后，[发布工作流](.github/workflows/main.yml) 会构建站点并把 `dist/` 中的构建产物推送到 `gh-pages`。GitHub Pages 的发布来源是 **Deploy from a branch**，使用 `gh-pages` 分支的 `/ (root)` 目录。

工作流使用 `SITE=https://shortlight5980.github.io` 和 `BASE_PATH=/blok-ds` 构建，也可在 Actions 页面手动触发。

如需手动发布，维护者可以按以下命令更新 `gh-pages`。

```bash
set -e
SITE=https://shortlight5980.github.io BASE_PATH=/blok-ds pnpm build
git fetch origin gh-pages
git worktree add /tmp/blok-ds-pages origin/gh-pages
rsync -a --delete --exclude=.git dist/ /tmp/blok-ds-pages/
git -C /tmp/blok-ds-pages add -A
git -C /tmp/blok-ds-pages diff --cached --quiet || git -C /tmp/blok-ds-pages commit -m "deploy: 更新站点"
git -C /tmp/blok-ds-pages push origin HEAD:gh-pages
git worktree remove --force /tmp/blok-ds-pages
```

`SITE` / `BASE_PATH` 必须与最终访问地址一致。`rsync` 的 `--exclude=.git` 用于保护 worktree 的 `.git` 文件。`set -e` 会在推送失败时保留 worktree 与发布提交，便于排查后重推。

`public/.nojekyll` 会随构建进入产物，避免 Jekyll 忽略 `_astro/` 资源。

## 文档

- [AGENTS.md](AGENTS.md)：agent 协作入口
- [.agents/README.md](.agents/README.md)：开发文档、协作与通信约定索引
- [.agents/design/initial-design.md](.agents/design/initial-design.md)：初始技术设计
- [.agents/decisions/0001-static-site-stack.md](.agents/decisions/0001-static-site-stack.md)：技术栈决策记录
- [.agents/decisions/0002-gh-pages-deploy.md](.agents/decisions/0002-gh-pages-deploy.md)：自动部署决策记录
