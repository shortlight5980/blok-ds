import { satteri } from '@astrojs/markdown-satteri';
import { defineConfig } from 'astro/config';

// 高亮会规范化语言并去掉末尾换行，在 Markdown 阶段保留作者的标注和代码。
const codeBlockTools = {
  name: 'code-block-tools',
  code(node, ctx) {
    const language = node.lang ? [{
      type: 'codeBlockLanguage',
      data: { hName: 'span', hProperties: { className: ['code-block-language'] } },
      children: [{ type: 'text', value: node.lang }],
    }] : [];

    ctx.replaceNode(node, {
      type: 'codeBlock',
      data: {
        hProperties: {
          className: ['code-block'],
          // 通过 JSON 保留 HTML 解析时会被标准化的换行符。
          dataCodeSource: JSON.stringify(node.value),
        },
      },
      children: [{
        type: 'codeBlockTools',
        data: { hProperties: { className: ['code-block-tools'] } },
        children: language,
      }, node],
    });
  },
};

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
    processor: satteri({ mdastPlugins: [codeBlockTools] }),
    shikiConfig: {
      themes: {
        light: 'github-light-high-contrast',
        dark: 'github-dark-high-contrast',
      },
    },
  },
});
