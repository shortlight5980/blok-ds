# blok-ds

shortlight5980 的个人博客。纯静态站点，使用 Astro 构建，部署在 GitHub Pages。

## 本地开发

需要 Node.js >= 22.23.4、pnpm 11。

```bash
pnpm install
pnpm dev              # http://localhost:4321
pnpm build            # 构建到 dist/
pnpm preview          # 预览构建产物
```

## 写文章

在 `src/content/posts/` 下新建 Markdown 文件：

```markdown
---
title: 标题
date: 2026-11-21
description: 可选，用于 meta 描述与 RSS
tags: []
---

正文。
```

文件名即文章地址：`hello-world.md` → `/posts/hello-world/`。`draft: true` 的文章只在本地开发时可见。

## 部署

站点是纯静态产物，发布到 `gh-pages` 分支，由 GitHub Pages 直接托管。

1. 维护者在仓库 **Settings → Pages** 选择 **Deploy from a branch**，分支 `gh-pages`，目录 `/ (root)`。
2. 构建并更新发布分支：

   ```bash
   pnpm build
   git fetch origin gh-pages
   git worktree add /tmp/blok-ds-pages origin/gh-pages
   rsync -a --delete dist/ /tmp/blok-ds-pages/
   git -C /tmp/blok-ds-pages add -A
   git -C /tmp/blok-ds-pages commit -m "deploy: 更新站点"
   git -C /tmp/blok-ds-pages push origin HEAD:gh-pages
   ```

3. 站点地址默认为 `https://<user>.github.io/blok-ds/`。

`public/.nojekyll` 会随构建进入产物，避免 Jekyll 忽略 `_astro/` 资源。如果希望在推送 `main` 后自动部署，可按 [设计文档 §11](.agents/design/initial-design.md#11-部署) 添加 GitHub Actions 工作流，并把 Pages Source 切换为 **GitHub Actions**。

仓库是私有仓库，Pages 是否可用取决于账户计划。

## 文档

- [AGENTS.md](AGENTS.md)：agent 协作入口
- [.agents/README.md](.agents/README.md)：开发文档、协作与通信约定索引
- [.agents/design/initial-design.md](.agents/design/initial-design.md)：初始技术设计
- [.agents/decisions/0001-static-site-stack.md](.agents/decisions/0001-static-site-stack.md)：技术栈决策记录
