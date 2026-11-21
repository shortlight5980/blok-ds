import { defineConfig } from 'astro/config';

// CI 中由 actions/configure-pages 注入；本地默认根路径。
const rawBase = process.env.BASE_PATH || '/';
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export default defineConfig({
  site: process.env.SITE || 'http://localhost:4321',
  base,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
