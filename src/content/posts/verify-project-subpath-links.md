---
title: "项目子路径下的链接怎么验：从 /blok-ds/ 到文章页"
date: 2026-11-21
description: "用 blok-ds 的 BASE_PATH 和站内路径工具说明项目子路径部署的检查方法，帮助确认首页、文章页、资源和 RSS 都指向同一个根路径。"
tags: [Astro, 链接检查]
---

站点部署到 `https://shortlight5980.github.io/blok-ds/` 时，`/` 代表域名根路径，`/blok-ds/` 才是博客的根路径。链接检查的重点，是确认页面中的每个站内地址都从后者开始生成。

## 先把 origin 和 base path 分开

仓库的 `astro.config.mjs` 从 `BASE_PATH` 读取项目路径，并把它规范化为带结尾斜杠的值。默认开发环境使用 `/`，GitHub Pages 构建使用 `/blok-ds/`。这两个环境可以共享文章和页面代码，因为路径前缀由构建配置提供。

页面链接统一经过 `src/lib/site.ts`。其中的核心逻辑如下：

```ts
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function url(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalized}` || '/';
}

export function postPath(id: string): string {
  return url(`/posts/${id}/`);
}
```

首页使用 `postPath(post.id)` 生成文章地址，RSS 也使用同一个函数生成链接。这样，文章列表和 feed 不会各自维护一套路径规则。

## 用项目路径构建一次

检查链接时要使用和 Pages 相同的 `BASE_PATH`。先构建，再从产物中找项目路径和文章路径：

```bash
set -eu

SITE=https://shortlight5980.github.io BASE_PATH=/blok-ds pnpm build

test -f dist/index.html
grep -q '/blok-ds/posts/' dist/index.html
grep -q '/blok-ds/rss.xml' dist/index.html
test -f dist/posts/publish-static-blog-to-github-pages/index.html
test ! -e dist/posts/hello-world/index.html
```

`dist/` 仍然是发布目录的根，`BASE_PATH` 会出现在 HTML 中的链接和资源地址里。检查 HTML 里的前缀，比只在本地根路径打开首页更接近真实发布环境。

### 再做一次 HTTP 检查

需要验证服务器返回值时，可以先用相同的环境变量启动预览：

```bash
BASE_PATH=/blok-ds pnpm build
BASE_PATH=/blok-ds pnpm preview --host 127.0.0.1 --port 4321
```

在另一个终端检查首页、文章页和旧地址：

```bash
curl -I http://127.0.0.1:4321/blok-ds/
curl -I http://127.0.0.1:4321/blok-ds/posts/publish-static-blog-to-github-pages/
curl -I http://127.0.0.1:4321/blok-ds/posts/hello-world/
```

首页和新文章页应返回成功状态，旧地址应返回 404。若链接少了 `/blok-ds/`，优先检查调用方是否绕过了 `url()` 或 `postPath()`，以及构建时是否传入了正确的 `BASE_PATH`。

## 把检查留在可重复的地方

一次手工点击只能说明一个浏览器场景。构建参数、产物文件和 HTTP 状态一起检查，才能覆盖项目站点最容易出错的边界。以后新增页面时，只需把它的预期路径加入同一组检查，就能继续验证子路径规则。
