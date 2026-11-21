# blok-ds

**本项目用于测试 DeepSeek Super Agent。**

shortlight5980 的个人博客。纯静态站点，使用 Astro 构建，部署目标为 GitHub Pages。

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
description: 可选，用于 meta 描述与 RSS
tags: []
---

正文。
```

文件名即文章地址：`hello-world.md` → `/posts/hello-world/`。`draft: true` 的文章只在本地开发时可见。

## 部署

站点是纯静态产物，发布到 `gh-pages` 分支；启用 Pages 后由 GitHub Pages 直接托管。

推送 `main` 后，[`.github/workflows/main.yml`](.github/workflows/main.yml) 会自动构建并把 `dist/` 更新到 `gh-pages`；也可以在 Actions 页面手动触发 `workflow_dispatch`。workflow 使用 `SITE=https://<owner>.github.io` 与 `BASE_PATH=/<repo>` 构建，提交作者为 `github-actions[bot]`，不需要把 Pages Source 切换为 **GitHub Actions**。

1. 维护者在仓库 **Settings → Pages** 选择 **Deploy from a branch**，分支 `gh-pages`，目录 `/ (root)`。
2. 等 workflow 完成；站点地址默认为 `https://<user>.github.io/blok-ds/`。
3. 如需手动发布（例如调整构建参数），按下面的命令更新 `gh-pages`：

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

   `SITE` / `BASE_PATH` 必须与最终访问地址一致；换成用户主页或自定义域名时修改后重新构建。`rsync` 的 `--exclude=.git` 不能省略，否则会删掉 worktree 的 `.git` 文件；worktree 用完请移除，避免下次 `git worktree add` 失败。`set -e` 会在 push 失败时保留 worktree 与发布提交，便于排查后重推。

`public/.nojekyll` 会随构建进入产物，避免 Jekyll 忽略 `_astro/` 资源。

仓库是私有仓库，Pages 是否可用取决于账户计划。

## 文档

- [AGENTS.md](AGENTS.md)：agent 协作入口
- [.agents/README.md](.agents/README.md)：开发文档、协作与通信约定索引
- [.agents/design/initial-design.md](.agents/design/initial-design.md)：初始技术设计
- [.agents/decisions/0001-static-site-stack.md](.agents/decisions/0001-static-site-stack.md)：技术栈决策记录
- [.agents/decisions/0002-gh-pages-deploy.md](.agents/decisions/0002-gh-pages-deploy.md)：自动部署决策记录
