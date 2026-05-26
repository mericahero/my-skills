# 分支与会话复用

## Session 选择

优先级：

1. 用户明确给出 `docs/merge-reports/{session}/` 路径。
2. 当前冲突来自已有预检测报告时，复用包含 `metadata.yml` 的最新匹配 session。
3. 用户输入包含 `source -> target` 或“source 分支合并到 target 分支”时，按该输入创建 session。
4. 仍无法确定时，创建 `docs/merge-reports/{YYYYMMDD-HHmm}-{current-branch}-spec-merge/`。

## 分支输入

支持：

- `处理 feature/a 分支合并到 develop 分支后的 Spec 冲突`
- `source=feature/a target=develop`
- `feature/a -> develop`

本 skill 处于 merge/rebase 后阶段，source/target 主要用于报告归档和决策追踪；不得为了“修复”source/target 而切换分支。

## 目录文件

如果 session 下不存在 `metadata.yml`，创建一个最小 metadata：

```yaml
session: "{session}"
created_at: "{YYYY-MM-DD HH:mm}"
source_input: "{source_or_unknown}"
target_input: "{target_or_unknown}"
source_ref: "{source_or_unknown}"
target_ref: "{target_or_unknown}"
worktree_status: "merge-in-progress"
reports:
  spec_conflicts: "spec-conflicts.md"
```
