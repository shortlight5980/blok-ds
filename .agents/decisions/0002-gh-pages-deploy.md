# ADR 0002：通过 gh-pages 分支自动部署

- 状态：已接受
- 日期：2026-11-21
- 决策者：维护者 shortlight5980（方案）、agent（实现）

## 背景

站点由 Astro 构建为纯静态产物，GitHub Pages 当前使用 **Deploy from a branch**，分支 `gh-pages`。最初的自动部署尝试使用 `actions/configure-pages` + `actions/deploy-pages`，但部署步骤失败：

- Pages API 的 `build_type` 仍为 `legacy`、`source` 为 `gh-pages`；
- `github-pages` 环境的 deployment branch policy 只允许 `gh-pages` 分支，workflow 从 `main` 部署时被拦下。

维护者要求改为让 workflow 直接把构建产物放到 `gh-pages` 分支，不改 Pages Source。

## 决策

`.github/workflows/main.yml` 在 push 到 `main` 或 `workflow_dispatch` 时：

1. 用 pnpm 安装依赖并执行 `pnpm build`，通过 `SITE=https://<owner>.github.io`、`BASE_PATH=/<repo>` 生成项目站点；
2. fetch `gh-pages`，用临时 worktree + `rsync --delete --exclude=.git` 更新产物；
3. 在 push 前从 worktree 的首页解析实际同站 CSS，确认每个引用文件存在；
4. 以 `github-actions[bot]` 身份提交并 push 到 `gh-pages`，记录本次分支提交 SHA；
5. 用 `pages: read` 查询 `/pages/builds/latest`，等待状态为 `built` 且 commit 与该 SHA 相同，再检查公网首页及其实际 CSS 的状态、MIME 与产物内容。

工作流配置已进入 `main`。本检查器合入后，需要通过下一次真实 Pages 发布完成端到端验收。在此之前，维护者可以按 README 中的命令手动执行发布前与发布后检查。

workflow 使用 `contents: write` 与 `pages: read`，不使用 `actions/configure-pages`、`actions/deploy-pages` 或 `github-pages` environment。Pages Source 保持 **Deploy from a branch → `gh-pages`**。

## 备选方案

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| 推送 `gh-pages`（本方案） | 与现有 Pages 设置一致，无需改仓库设置；产物分支可直接检查 | workflow 需要 `contents: write`；需维护 git/rsync 脚本 | 采用 |
| GitHub Actions Pages（`deploy-pages`） | 官方部署流程，无需自己 push | 需要把 Pages Source 切换为 GitHub Actions；当前环境分支策略会拦截 | 不采用（维护者要求保留 `gh-pages` 分支） |
| `peaceiris/actions-gh-pages` | 配置短 | 引入第三方 action，行为不如原生脚本透明 | 不采用 |
| 手动发布 | 无额外权限 | 每次手动操作，易漏 | 保留为回退方案 |

## 后果

- 正面：不需要修改 Pages Source；构建产物仍集中在 `gh-pages`；README 中的手动流程与自动流程使用同一套 git/rsync 逻辑；错误的首页 CSS 引用会在 push 前阻止发布，旧 Pages 版本不会因短暂返回 200 而通过本次检查。
- 代价与风险：workflow 需要 `contents: write` 与 `pages: read`；部署提交作者为 bot；`SITE`/`BASE_PATH` 按项目站点推导，换自定义域名时需修改 workflow；workflow 不在 PR 上运行，PR 构建仍靠本地检查；Pages API 或公网传播超出有限等待窗口时，发布会失败并保留可诊断日志。
- 验收状态：自动检查步骤已配置到 `main`，但本检查器尚未合入时的发布无法完成脚本步骤。合入后需以一次真实 Pages 发布确认端到端结果。
- 后续需要同步的文档 / 代码：`README.md` 部署一节、`initial-design.md` §11.3 / §16。

## 相关

- 设计文档：[`../design/initial-design.md`](../design/initial-design.md) §11.3
- Issue / PR：#4（请求）、#5（实现）
