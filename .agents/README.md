# .agents

本目录管理 `blok-ds` 开发过程中的文档、设计与 agent 协作约定。根目录的 [`AGENTS.md`](../AGENTS.md) 是入口，本文件是索引。

## 目录

| 路径 | 内容 |
| --- | --- |
| [`collaboration.md`](collaboration.md) | 角色、职责边界、决策权、完成定义 |
| [`communication.md`](communication.md) | 消息类型、格式、状态用词、交接与升级 |
| [`workflow.md`](workflow.md) | 分支、提交、PR、评审、CI、合并与发布 |
| [`design/initial-design.md`](design/initial-design.md) | 初始技术设计，架构与实现的唯一事实源 |
| [`decisions/`](decisions/) | ADR（架构决策记录），一事一文件 |
| [`templates/`](templates/) | 任务简报、交接、决策模板 |

## 使用方式

1. 先读 [`AGENTS.md`](../AGENTS.md)，再读本目录。
2. 接任务前，按 [`templates/task-brief.md`](templates/task-brief.md) 形成任务简报：目标、非目标、验收标准、约束。
3. 需要改架构或技术选型时，先按 [`templates/decision.md`](templates/decision.md) 写 ADR，再改代码，并同步更新 `design/initial-design.md`。
4. 交接时按 [`templates/handoff.md`](templates/handoff.md) 写清已完成、未完成、验证方式与风险。
5. 过程性讨论留在 Issue / PR；只有需要长期保留的结论、设计与约定才写入本目录。

## 更新规则

- 技术栈、目录结构、部署方式变化：新增 ADR，并更新 `design/initial-design.md`。
- 协作或通信方式变化：更新 `collaboration.md` / `communication.md` / `workflow.md`。
- 文档保持短小；过期内容直接删除或改写，不堆叠历史版本（历史看 git）。
