---
title: "静态博客发布到 GitHub Pages：从构建到上线"
date: 2026-11-22
description: "以 blok-ds 的 Astro 与 GitHub Actions 配置为例，梳理构建、项目子路径和 gh-pages 发布之间的关系，并给出一套可重复的检查步骤。"
tags: [GitHub Pages, Astro]
---

静态博客的发布过程可以拆成三个动作：把 Markdown 构建成静态文件，把站点放到正确的项目子路径，再把产物交给 GitHub Pages。拆开之后，每一步都有明确的输入和检查结果。

## 先确认发布模型

`blok-ds` 使用 Astro 构建静态页面，文章保存在 `src/content/posts/`。仓库的发布工作流在 `main` 更新时执行 `pnpm install --frozen-lockfile` 和 `pnpm build`，然后把 `dist/` 的内容同步到 `gh-pages` 分支。README 中约定 GitHub Pages 使用这个分支的根目录作为发布源。

因此，文章源文件、构建产物和 Pages 发布分支各自承担一件事。源文件负责内容，`dist/` 负责本次构建结果，`gh-pages` 负责被 Pages 读取的静态文件。

## 把项目路径交给构建

项目站点的访问地址包含仓库名 `/blok-ds/`。构建时需要同时给出站点 origin 和项目路径。仓库现有工作流使用下面的配置：

```yaml
- run: pnpm build
  env:
    SITE: https://${{ github.repository_owner }}.github.io
    BASE_PATH: /${{ github.event.repository.name }}
```

对这个仓库来说，最终值就是 `SITE=https://shortlight5980.github.io` 和 `BASE_PATH=/blok-ds`。Astro 会用它们生成 canonical、RSS 地址和页面中的站内链接。只设置 origin 而遗漏项目路径，首页可能能打开，文章页和样式资源却会请求错误的位置。

## 发布前做一次本地检查

下面的命令与仓库的部署参数一致。构建完成后，先确认首页和 RSS 存在，再确认旧的示例地址没有重新生成：

```bash
set -eu

pnpm install --frozen-lockfile
SITE=https://shortlight5980.github.io BASE_PATH=/blok-ds pnpm build

test -f dist/index.html
test -f dist/rss.xml
test ! -e dist/posts/hello-world/index.html
```

需要检查具体文章时，可以继续确认对应的 `dist/posts/<slug>/index.html` 文件。检查通过表示构建产物具备首页、feed 和文章路由，之后再由工作流发布到 `gh-pages`。

### 上线后的判断

打开项目地址后，首页应列出文章，文章链接应保留 `/blok-ds/` 前缀，RSS 应能读到每篇文章。旧的 `hello-world` 路径没有对应静态文件，GitHub Pages 会按站点的 404 规则处理它。

静态博客发布得是否可靠，可以用“参数明确、产物存在、旧地址仍为空”这三个检查结果来判断。这个标准也适用于之后新增文章或更换仓库名的发布。
