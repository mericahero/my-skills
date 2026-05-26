---
name: asdd-merge-preflight
description: >
  合并前预检测 skill。用于在 merge/rebase/PR 前评估 source 分支合并到 target 分支的
  代码冲突风险和 ASDD Spec 文档冲突风险，输出按低/中/高风险分级的预检测报告。
  本 skill 只读分析 git diff、ASDD 文档目录、REQ/BUG 编号、模块当前态文件和代码变更，
  不解决冲突、不修改业务代码。确保在以下场景触发：合并前检查、预检测冲突、
  merge preflight、PR 前风险评估、多人协同冲突评估、检查 A 分支合并到 B 分支的风险、
  source=feature/a target=develop、feature/a -> release/2026-05。
---

# asdd-merge-preflight

合并前风险预检测，覆盖代码和 Spec 两类冲突。

## 定位

本 skill 在实际 merge/rebase 之前使用：

```text
使用 asdd-merge-preflight skill 检查 feature/REQ-20260429-001 分支合并到 develop 分支的风险
使用 asdd-merge-preflight skill source=feature/a target=release/2026-05
使用 asdd-merge-preflight skill feature/a -> develop
```

它只生成报告，不解决冲突、不执行 merge、不修改业务文件。唯一允许写入的是预检测报告。

## 策略与模板

执行时先读取：

- [branch-session.md](references/branch-session.md)：source/target 输入解析、ref 校验和 session 目录规则
- [risk-model.md](references/risk-model.md)：代码与 Spec 风险分级模型
- [metadata.yml](references/templates/metadata.yml)：会话元数据模板
- [preflight-report.md](references/templates/preflight-report.md)：预检测报告模板

## 输入

- 支持用户显式输入 source 和 target，例如“`feature/a` 分支合并到 `develop` 分支”。
- 用户只给出 target 时，source 使用当前分支。
- 用户只给出 source 时，必须询问 target。
- 用户未给出 target 时，按 [branch-session.md](references/branch-session.md) 尝试从 upstream 或 `origin/HEAD` 推断；无法确定时询问用户，不得写死默认分支。
- 可选输入：`REQ-ID`、`BUG-ID`、PR 编号、目标模块。

目标 ref 不存在时，提示用户先同步本地引用或提供可用目标分支，不得猜测。

## 报告路径

创建或复用会话目录：

```text
docs/merge-reports/{YYYYMMDD-HHmm}-{source-branch}-to-{target-branch}/preflight.md
docs/merge-reports/{YYYYMMDD-HHmm}-{source-branch}-to-{target-branch}/metadata.yml
```

分支名安全化：将 `/`、空格和特殊字符替换为 `-`。

## 阶段 0：工作区安全检查

读取：

```bash
git status --porcelain --branch
git branch --show-current
git rev-parse --verify {source_ref}^{commit}
git rev-parse --verify {target_ref}^{commit}
```

规则：

- 如果存在未提交变更，仍可分析，但必须在报告中标注“工作区未清洁”。
- 如果当前正在 merge/rebase/cherry-pick，提示这不是预检测场景，建议改用 `asdd-spec-merge-resolve` 或 `asdd-code-merge-resolve`。
- 不执行 `git merge`、`git rebase`、`git reset`、`git checkout` 等改变状态的命令。

## 阶段 1：计算变更集

确定 merge base：

```bash
git merge-base {source_ref} {target_ref}
```

读取两侧变更：

```bash
git diff --name-status {merge-base}..{source_ref}
git diff --name-status {merge-base}..{target_ref}
git diff --stat {merge-base}..{source_ref}
git diff --stat {merge-base}..{target_ref}
```

对比：

- source 与 target 同时修改的文件。
- source 新增但 target 也新增同名文件的文件。
- 同一模块、同一 REQ/BUG、同一 API/table/service/page 的交叉变更。
- 迁移脚本、包管理文件、配置文件、权限/安全/审计相关文件。

## 阶段 2：识别工作项

从以下位置识别 source 分支相关工作项：

- 分支名中的 `REQ-YYYYMMDD-NNN` 或 `BUG-YYYYMMDD-NNN`
- `docs/functional-requirements/**/REQ-*.md`
- `docs/modules/*/specs/REQ-*`
- `docs/modules/_bugs/BUG-*`
- 代码 diff 中引用的工作项编号

并检查：

- 是否出现多个主要 REQ/BUG。
- 是否与 target 分支已有同编号工作项冲突。
- `asdd-frd-generate` 支持显式指定 `REQ-ID`；若 source 分支使用自动编号且 target 分支出现相同编号，标记高风险。

## 阶段 3：Spec 风险分级

低风险：

- `docs/INDEX.md`
- `docs/functional-requirements/INDEX.md`
- `docs/unlisted-components.md`
- 不同 REQ/BUG 独立目录新增

中风险：

- `docs/modules/{module}/spec.md`
- `docs/modules/{module}/overview.md`
- `docs/modules/{module}/module-api.md`
- `docs/modules/{module}/module-database.md`
- `docs/modules/{module}/module-backend.md`
- `docs/modules/{module}/module-frontend.md`

高风险：

- `docs/constitution.md`
- `docs/architecture.md`
- `docs/domains/*.md`
- `docs/requirements/**`
- 同一 `REQ-ID` 或 `BUG-ID` 目录被两侧同时修改
- 同一 API、表、字段、权限规则、状态机或验收标准被两侧修改

## 阶段 4：代码风险分级

低风险：

- 测试、文档、样式或局部常量的非重叠新增。
- import、导出清单、路由注册等明显追加型变更。

中风险：

- 同一模块不同文件的业务逻辑变更。
- 同一页面、Service、Controller、Mapper、Composable 的不同方法变更。
- package、构建、lint、格式化配置变更。

高风险：

- 同一代码文件两侧同时修改。
- API 契约、DTO、数据库迁移、权限、安全、审计、事务、状态机、资金或外部集成变更。
- 删除、重命名、迁移脚本顺序、锁文件冲突。

## 阶段 5：输出报告

按 [metadata.yml](references/templates/metadata.yml) 写入会话元数据，按 [preflight-report.md](references/templates/preflight-report.md) 写入预检测报告。

报告要求：

- 同时包含代码级和 Spec 级风险。
- 按高 / 中 / 低分组，不能只给总体结论。
- 每个风险项必须包含 source 变化、target 变化、证据和建议。
- 如果没有发现某类风险，对应章节写“未发现”。
- 后续建议必须使用 `使用 <skill-name> skill ...` 形式。

## 输出给用户

每次完成后必须在对话中简要说明：

- 最高风险等级。
- 报告路径。
- 是否存在高风险阻塞项。
- 后续建议、风险提示和下一步可复制的 skill 调用。
