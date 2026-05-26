---
name: asdd-spec-merge-resolve
description: >
  ASDD Spec 文档冲突处理 skill。用于 merge/rebase 后处理 docs/ 下的 Spec 冲突，
  按低/中/高风险分级：所有风险等级都必须先获得用户确认后才能修改；
  低风险可建议批量处理，中风险和高风险必须给出逐项建议并等待用户决策。最终必须在 docs/merge-reports/{session}/spec-conflicts.md
  记录低/中/高风险处理项、用户决策、用户自行处理项和未处理项。
  确保在以下场景触发：处理 spec 冲突、解决 docs 冲突、合并文档冲突、
  ASDD 文档 merge conflict、spec merge resolve、索引冲突合并、module 文档冲突合并、
  处理 A 分支合并到 B 分支后的 Spec 冲突、source=feature/a target=develop。
---

# asdd-spec-merge-resolve

处理 ASDD Spec 文档冲突，并生成可审计报告。

## 定位

本 skill 只处理 `docs/` 下的 ASDD Spec 文档冲突。不得修改源码、测试、配置、迁移脚本等代码文件。

典型调用：

```text
使用 asdd-spec-merge-resolve skill 处理当前合并中的 Spec 文档冲突
使用 asdd-spec-merge-resolve skill 处理 feature/a 分支合并到 develop 分支后的 Spec 冲突
```

## 策略与模板

执行时先读取：

- [branch-session.md](references/branch-session.md)：session 复用、source/target 记录和 metadata 规则
- [spec-merge-strategy.md](references/spec-merge-strategy.md)：低/中/高风险处理策略、稳定键和校验规则
- [spec-conflicts-report.md](references/templates/spec-conflicts-report.md)：Spec 冲突处理报告模板

## 报告路径

优先复用已有合并会话目录：

```text
docs/merge-reports/{session}/spec-conflicts.md
```

如果没有已有 session，创建：

```text
docs/merge-reports/{YYYYMMDD-HHmm}-{current-branch}-spec-merge/spec-conflicts.md
```

如果用户输入了 source/target，按 [branch-session.md](references/branch-session.md) 创建 `{source-safe}-to-{target-safe}` 形式的 session。不得写死目标分支。

## 阶段 0：识别冲突

读取：

```bash
git status --porcelain --branch
git diff --name-only --diff-filter=U
```

分类：

- `docs/**`：本 skill 处理范围。
- 非 `docs/**`：不处理，只在报告中列为“非 Spec 冲突，交给 asdd-code-merge-resolve 或人工处理”。

如果没有未合并文件，但用户要求整理文档冲突报告，可以读取最近预检测报告和当前 diff，生成“未发现未合并 Spec 冲突”的报告。

## 阶段 1：风险分级

按 [spec-merge-strategy.md](references/spec-merge-strategy.md) 分级。摘要如下。

低风险，可建议批量处理，但必须用户确认：

- `docs/INDEX.md`
- `docs/functional-requirements/INDEX.md`
- `docs/unlisted-components.md`
- 只涉及新增不同 REQ/BUG 目录的导航项

处理规则：

- 索引和导航类文件优先从真实文件系统扫描重建，去重并稳定排序。
- `unlisted-components.md` 按组件或包名去重，保留来源、说明和首次发现记录；同名不同含义升级为中风险。
- 不得简单拼接两侧冲突块。

中风险，必须用户确认后处理：

- `docs/modules/{module}/spec.md`
- `docs/modules/{module}/overview.md`
- `docs/modules/{module}/module-api.md`
- `docs/modules/{module}/module-database.md`
- `docs/modules/{module}/module-backend.md`
- `docs/modules/{module}/module-frontend.md`

处理规则：

- 按稳定键合并表格或条目，例如 API `METHOD + PATH`、表名/字段名、Service/Job/Consumer 名、页面路由、组件名。
- 不同稳定键的追加项可建议合并。
- 同一稳定键出现摘要、状态、最近变更、相关变更、代码位置不一致时，展示选项并等待用户确认。
- 模块当前态以合并后的代码事实和已确认设计为准。

高风险，默认只建议，不确认不处理：

- `docs/constitution.md`
- `docs/architecture.md`
- `docs/domains/*.md`
- `docs/requirements/**`
- 同一 `REQ-ID` 或 `BUG-ID` 目录下的 `spec.md`、`tasks.md`、`fast-design.md`、`diagnosis.md`、`fix-design.md`
- 同一需求级 `api-design.md`、`backend-database-design.md`、`backend-detailed-design.md`、`frontend-page-design.md`、`frontend-detailed-design.md`

处理规则：

- 必须展示冲突摘要、两侧意图、相关 REQ/BUG、受影响模块和建议选项。
- 用户明确选择方案后才修改。
- 用户选择自行处理时，不修改该文件，只记录为“用户自行处理”。

## 阶段 2：决策交互

对低风险、中风险和高风险项都必须向用户输出决策选项。允许用户按风险等级批量确认，例如“低风险全部处理”；中风险和高风险建议逐项确认，除非用户明确给出批量范围。

```text
文件：{path}
对象：{API/table/service/page/section}
风险：低 / 中 / 高

冲突摘要：
- ours：{当前分支意图}
- theirs：{目标分支意图}

建议选项：
A) 采用 ours：{影响}
B) 采用 theirs：{影响}
C) 合并两侧：{合并方式和风险}
D) 暂不处理：skill 不修改该项，记录为未处理
E) 用户自行处理：skill 不修改该项，只记录报告

请确认选择：
```

不得把用户对一个对象的选择自动套用到其他对象，除非用户明确说明批量适用范围，例如“低风险全部按推荐处理”或“module-api.md 中不同稳定键追加项全部合并”。

## 阶段 3：执行修改

修改前先读取完整文件，确认冲突标记范围：

- `<<<<<<<`
- `=======`
- `>>>>>>>`

处理后必须检查：

```bash
rg -n "<<<<<<<|=======|>>>>>>>" docs
git diff --name-only --diff-filter=U
```

如果仍有未处理 Spec 冲突，报告中标记为 pending。不要为了清空冲突而丢失语义。

没有用户确认的项不得修改；必须写入“未处理项”或“用户自行处理项”。

## 阶段 4：报告模板

必须按 [spec-conflicts-report.md](references/templates/spec-conflicts-report.md) 写入报告。

报告要求：

- 低风险项必须写清楚建议、用户确认内容、处理方式和依据；不得写成未确认自动处理。
- 中风险项必须写清楚建议选项、用户决策和是否已修改。
- 高风险项必须写清楚推荐方案、用户决策、是否已修改和剩余风险。
- 未处理项必须单独列出，说明未处理原因、建议和后续动作。
- 用户自行处理项必须单独列出，不得混入“已处理”。
- 非 Spec 冲突必须列出并建议使用 `asdd-code-merge-resolve` skill 或人工处理。

## 输出给用户

每次完成后必须在对话中说明：

- 已按用户确认处理了哪些低/中/高风险项。
- 哪些项未处理，为什么未处理。
- 哪些项由用户自行处理。
- 报告路径。
- 后续建议、风险提示和下一步可复制的 skill 调用。
