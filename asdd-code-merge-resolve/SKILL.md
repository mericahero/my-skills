---
name: asdd-code-merge-resolve
description: >
  代码合并冲突分析与用户确认处理 skill。用于 merge/rebase 后分析源码、测试、
  配置、迁移脚本等代码冲突，结合 git 三方内容、合并历史、ASDD FRD/设计/tasks/module 文档
  给出解决建议。代码修改必须由用户明确确认；用户选择自行处理的部分不得修改。
  最终必须在 docs/merge-reports/{session}/code-conflicts.md 记录冲突内容、建议选项、
  用户决策、已修改项、自行处理项、未处理项和验证建议。确保在以下场景触发：处理代码冲突、
  解决源码 merge conflict、分析 git conflict、code merge resolve、合并代码冲突建议、
  分析 A 分支合并到 B 分支后的代码冲突、source=feature/a target=develop。
---

# asdd-code-merge-resolve

分析代码冲突，提出方案，并只按用户确认执行修改。

## 定位

本 skill 处理非 Spec 文档的代码冲突，包括源码、测试、迁移脚本、配置、构建文件和锁文件。

它可以修改代码，但必须满足两个条件：

1. 已向用户展示冲突摘要、证据和建议选项。
2. 用户明确确认该文件或对象的处理方案。

用户选择自行处理时，不修改对应文件，只记录到报告。

## 报告路径

优先复用已有合并会话目录：

```text
docs/merge-reports/{session}/code-conflicts.md
```

如果没有已有 session，创建：

```text
docs/merge-reports/{YYYYMMDD-HHmm}-{current-branch}-code-merge/code-conflicts.md
```

如果用户输入了 source/target，按 [branch-session.md](references/branch-session.md) 创建 `{source-safe}-to-{target-safe}` 形式的 session。不得写死目标分支。

## 策略与模板

执行时先读取：

- [branch-session.md](references/branch-session.md)：session 复用、source/target 记录和 metadata 规则
- [code-merge-strategy.md](references/code-merge-strategy.md)：证据来源、风险分级、建议格式和修改边界
- [code-conflicts-report.md](references/templates/code-conflicts-report.md)：代码冲突处理报告模板

## 阶段 0：识别冲突

读取：

```bash
git status --porcelain --branch
git diff --name-only --diff-filter=U
git diff --cc
```

对每个冲突文件按需读取三方内容：

```bash
git show :1:{path}   # base
git show :2:{path}   # ours
git show :3:{path}   # theirs
```

如果某个 stage 不存在，说明是 add/add、delete/modify 或 rename 类冲突，报告中明确标注。

## 阶段 1：加载 ASDD 上下文

根据分支名、冲突文件路径、diff、提交信息和文档引用，定位相关工作项：

- `docs/functional-requirements/**/REQ-*.md`
- `docs/modules/*/specs/REQ-*`
- `docs/modules/_bugs/BUG-*`
- `docs/modules/{module}/module-api.md`
- `docs/modules/{module}/module-database.md`
- `docs/modules/{module}/module-backend.md`
- `docs/modules/{module}/module-frontend.md`
- `docs/constitution.md`、`docs/architecture.md`、`docs/domains/*.md`

只加载与冲突文件相关的文档。找不到关联文档时，仍可基于代码和 git 历史分析，但必须标注“缺少 Spec 依据”。

## 阶段 2：代码风险分级

按 [code-merge-strategy.md](references/code-merge-strategy.md) 分级。摘要如下。

低风险，可建议处理，但仍需用户确认：

- import、export、注册表、路由表、枚举值的纯追加。
- 测试名称或 mock 数据的非重叠追加。
- 注释、格式、局部样式的明显非语义冲突。

中风险，必须逐项确认：

- 同一文件不同函数或不同 UI 区块的业务逻辑变更。
- 同一 API handler / service / component 的相邻逻辑变更。
- package、构建、lint、格式化配置冲突。

高风险，默认只建议；执行前必须用户确认：

- API 契约、DTO、数据库迁移、schema、权限、安全、审计、事务、状态机、资金、外部接口。
- 同一函数、同一 SQL、同一校验规则、同一数据流的语义冲突。
- 删除/重命名与修改并存、锁文件、迁移编号顺序冲突。

## 阶段 3：生成建议

每个冲突对象输出：

```text
文件：{path}
对象：{function/api/table/component/config}
风险：低 / 中 / 高

证据：
- base：{基线行为摘要}
- ours：{当前分支行为摘要，对应 REQ/BUG}
- theirs：{目标分支行为摘要，对应 REQ/BUG}
- Spec 依据：{FRD/设计/tasks/module 文档路径和要点}
- git 历史依据：{相关提交或变更摘要}

建议选项：
A) 采用 ours：{影响}
B) 采用 theirs：{影响}
C) 合并两侧：{具体合并方式、验证要求、风险}
D) 用户自行处理：skill 不修改该项，只记录报告
E) 暂不处理：skill 不修改该项，记录为未处理

推荐：{A/B/C/D/E}，理由：{简要理由}
```

用户没有明确选择时，不修改文件，并在报告中标记为未处理。

## 阶段 4：按用户决策修改

执行规则：

- 只修改用户明确确认的文件或对象。
- 不跨越用户确认范围批量处理。
- 修改后保留双方需要的测试、验证或兼容逻辑。
- 如果处理涉及 Spec 文档补充，提示用户后续使用对应 ASDD skill 或 `asdd-spec-merge-resolve`，本 skill 不直接改 Spec 冲突。
- 锁文件冲突必须优先建议使用项目包管理器重新生成；未获得用户确认前不手写锁文件。
- 迁移脚本冲突必须确认顺序、幂等性和回滚策略。

用户选择自行处理：

- 不修改对应文件。
- 在报告中记录“用户自行处理”。
- 给出验证建议和风险提示。

用户选择暂不处理或未给出决策：

- 不修改对应文件。
- 在报告中记录“未处理”。
- 给出建议、风险提示和后续动作。

## 阶段 5：校验

修改后检查：

```bash
rg -n "<<<<<<<|=======|>>>>>>>" .
git diff --name-only --diff-filter=U
```

根据项目类型建议运行最小验证命令，但不要臆造已运行结果。命令未运行时，报告写“建议运行，未执行”。

## 阶段 6：报告模板

必须按 [code-conflicts-report.md](references/templates/code-conflicts-report.md) 写入报告。

报告要求：

- 冲突分析必须包含 base、ours、theirs 摘要。
- 建议必须引用设计、tasks、模块当前态或 git 历史；没有依据时标注“缺少 Spec 依据”。
- 用户决策记录必须区分“已按决策修改”和“用户自行处理”。
- 未处理项必须单独列出，说明未处理原因、建议和后续动作。
- 验证命令必须区分“已执行”和“建议但未执行”。

## 输出给用户

每次完成后必须在对话中说明：

- 当前还有哪些代码冲突。
- 每个冲突的推荐方案和需要用户确认的点。
- 已按用户决策修改了哪些内容。
- 哪些项未处理，为什么未处理。
- 报告路径、剩余风险、验证建议和下一步可复制的 skill 调用。
