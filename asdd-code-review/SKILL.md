---
name: asdd-code-review
description: >
  基于 PR/分支变更的多维度代码审查。通过 git diff 分析变更代码及其上下游关联，
  使用 OpenCode 预定义 subagent 并行发现候选问题：代码质量、注释准确性、
  单元测试覆盖与质量、代码安全、前后端 API 数据结构一致性、代码简化、类型设计、
  代码与 FRD、需求级 spec/tasks、详细设计、fast-design、顶层/领域约束的一致性。
  不审查代码与 .opencode/rules/ 工程规范的合规性（由 asdd-rules-review 负责）。
  最终输出综合评分报告，包含分级问题列表和修改建议。
  本 skill 必须通过 OpenCode Task tool 调用预定义 review subagent，不可降级为单 agent 审查。
  确保在以下场景触发本 skill：用户提到代码审查、code review、review 代码、
  PR review、审查变更、review changes、帮我 review、看看代码有没有问题、
  代码质量检查、review this PR、审查这个分支、review branch、
  团队审查、team review、多维度审查、全面审查代码、
  即使用户只说了"review 一下"或"帮我看看代码"，只要上下文中存在代码变更，也应触发。
---

# asdd-code-review

基于 PR/分支变更的多维度代码审查。

> **实现方式**：本 skill 必须通过 OpenCode Task tool 调用预定义 reviewer agent。
> reviewer agent 只负责发现候选问题；本 skill 负责 PR 上下文收集、并行调用、
> 候选问题去重、严重程度判定、维度评分、综合评分和是否建议合并。
> 不允许只由当前 agent 单独完成全部审查。
>
> **上下文原则**：本 skill 是 code-review Lead。Lead 读取过程文档和本 skill references，
> 再为每个 reviewer agent 动态传入精确裁剪后的 diff、完整文件、设计上下文、
> 维度检查清单和输出 schema。不要让 reviewer agents 自行读取完整 `reviewer-roles.md`
> 或 `scoring-rubric.md` 作为共享上下文。

## 审查范围

| 范围 | 是否审查 | 说明 |
|------|---------|------|
| 代码质量 | ✅ 审查 | 结构、命名、复杂度、DRY/SOLID 等 |
| 代码安全 | ✅ 审查 | OWASP Top 10、注入、认证、敏感数据 |
| 单元测试 | ✅ 审查 | 覆盖率、质量、与 spec 测试场景一致性、tasks.md 或 fast-design.md TDD 证据完整性 |
| 前后端一致性 | ✅ 审查 | DTO↔TS 类型、接口契约 |
| 设计一致性 | ✅ 审查 | 标准需求检查 FRD、spec、tasks、详细设计；fast 需求检查 spec.md 和 fast-design.md；系统需求仅作可选上游背景 |
| 注释 / 简化 / 类型设计 | ✅ 审查 | 代码层面的质量维度 |
| `.opencode/rules/` 合规性 | ❌ 不审查 | 工程规范合规由 asdd-rules-review 负责 |

## 定位

本 skill 是 asdd-tasks-implement 和 asdd-requirement-implement-fast 的下游工具，在代码实现完成后使用。
通过 OpenCode subagent 并行多维度审查，替代传统的单人串行 review。

```
asdd-tasks-implement / asdd-requirement-implement-fast（代码实现）
    |
    v
asdd-code-review（本 skill：多维度并行审查）
    |
    v
审查报告 + 评分 + 修改建议
    |
    v
开发者修复 → 再次 review（可选）
```

## 路径约定

| 资源 | 路径 | 使用方 |
|------|------|--------|
| 文档索引 | `docs/INDEX.md` | Lead 读取并路由 |
| 全局约束 | `docs/constitution.md` | Lead 裁剪后传给相关 agents |
| 架构蓝图 | `docs/architecture.md` | Lead 裁剪后传给相关 agents |
| 领域设计 | `docs/domains/{NN}-{name}.md` | Lead 裁剪后传给相关 agents |
| 可选系统需求总览 | `docs/requirements/overview.md` | Lead 作为可选上游背景 |
| 可选模块级需求 | `docs/requirements/req-modules/{module}.md` | Lead 作为可选上游背景 |
| FRD 索引 | `docs/functional-requirements/INDEX.md` | Lead 读取并定位 |
| FRD 文件 | `docs/functional-requirements/{module}/REQ-{YYYYMMDD}-{NNN}-{name}.md` | Lead 裁剪后传给相关 agents |
| 模块主规格 | `docs/modules/{module}/spec.md` | Lead 裁剪后传给相关 agents |
| 模块当前态索引 | `docs/modules/{module}/overview.md`、`docs/modules/{module}/module-*.md` | Lead 裁剪后传给相关 agents |
| 需求级 spec | `docs/modules/{module}/specs/{REQ-ID}-{name}/spec.md` | Lead 裁剪后传给相关 agents |
| Fast 需求执行文档 | `docs/modules/{module}/specs/{REQ-ID}-fast-{name}/fast-design.md` | `flow: fast` 时作为轻量设计、任务和 TDD 证据来源 |
| 任务文件 | `docs/modules/{module}/specs/{REQ-ID}-{name}/tasks.md` | Lead 裁剪后传给相关 agents |
| API 设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/api-design.md` | Lead 裁剪后传给相关 agents |
| 数据库设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/backend-database-design.md` | Lead 裁剪后传给相关 agents |
| 后端详细设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/backend-detailed-design.md` | Lead 裁剪后传给相关 agents |
| 前端页面设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/frontend-page-design.md` | Lead 裁剪后传给相关 agents |
| 前端详细设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/frontend-detailed-design.md` | Lead 裁剪后传给相关 agents |
| Bug 过程文档 | `docs/modules/_bugs/{BUG-ID}-{name}/diagnosis.md`、`spec.md`、`fix-design.md`、`tasks.md` | Lead 裁剪后传给相关 agents |
| 审查角色定义 | `references/reviewer-roles.md` | Lead-only 维度检查清单来源 |
| 评分体系 | `references/scoring-rubric.md` | Lead-only 评分规则和对话报告结构参考；不是落盘模板 |
| 需求级落盘报告模板 | `docs/templates/code-review-template.md` | Lead 写入 REQ 级 `code-review.md` |
| Bug 级落盘报告模板 | `docs/templates/bug-code-review-template.md` | Lead 写入 BUG 级 `code-review.md` |
| Reviewer agents | `opencode/agents/cc-review-*.md` | Task tool 调用 |

---

## 阶段 0：审查范围确定

### 0.1 确定对比基准

默认审查当前功能分支上的所有变更 — 即从分支分叉点（fork point）到 HEAD 的全部 diff。
核心命令：`git diff $(git merge-base {parent-branch} HEAD) HEAD`。

**自动检测父分支（按优先级）**：

```
步骤 1：检查是否已有 PR
  gh pr view --json baseRefName -q '.baseRefName' 2>/dev/null
  → 如果成功，直接使用 PR 的 base branch（最可靠）

步骤 2：检测远程默认分支
  git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null
  → 提取分支名（如 refs/remotes/origin/main → main）

步骤 3：尝试常见主干分支名
  依次检查 main → master → develop 是否存在：
  git rev-parse --verify {branch} 2>/dev/null
  → 使用第一个存在的分支

步骤 4：以上均失败 → 调用 OpenCode `question` tool 让用户指定
```

**计算分叉点并生成 diff**：

```bash
# 找到分叉点
FORK_POINT=$(git merge-base {detected-parent} HEAD)

# 获取变更文件清单
git diff --name-status $FORK_POINT HEAD

# 获取完整 diff
git diff $FORK_POINT HEAD
```

**未提交变更检查**：

在生成 diff 前，先执行 `git status --porcelain` 检查是否有未提交的变更。
如果存在未提交变更，提示用户：

```
⚠️ 检测到未提交的变更（{n} 个文件）

未提交的变更不会包含在本次审查范围内。
  A) 先提交后再审查（推荐）
  B) 仅审查已提交的变更，忽略未提交部分
```

**用户显式指定时的覆盖规则**：

| 用户输入 | diff 命令 |
|---------|----------|
| 未指定（默认） | `git diff $(git merge-base {auto-detected-parent} HEAD) HEAD` |
| PR 编号（如 `#42`） | `gh pr diff 42` |
| 指定 base 分支（如 `vs develop`） | `git diff $(git merge-base develop HEAD) HEAD` |
| commit 范围（如 `abc123..def456`） | `git diff abc123..def456` |

### 0.2 获取变更文件清单

执行 `git diff --name-status {base}...{head}` 获取变更文件列表，按类型分类：

| 分类 | 匹配规则 | 示例 |
|------|---------|------|
| 后端源码 | `src/main/java/**/*.java` | Service, Controller, Entity |
| 后端测试 | `src/test/java/**/*.java` | 单元测试文件 |
| 前端源码 | `src/**/*.{vue,ts,tsx,js}` | 页面、组件、Store、API |
| 前端测试 | `src/**/*.{spec,test}.{ts,tsx,js}` | 前端测试文件 |
| 配置文件 | `*.{yml,yaml,xml,json,properties}` | 应用配置、构建配置 |
| SQL/迁移 | `*.sql`, `**/migration/**` | 数据库迁移脚本 |
| 其他 | 不匹配以上规则的文件 | 文档、脚本等 |

显示变更概览：

```
📋 变更概览

分支：{current-branch} → {base-branch}
变更文件：{total} 个
  后端源码：{n} 个（+{added} -{deleted} ~{modified}）
  后端测试：{n} 个
  前端源码：{n} 个
  前端测试：{n} 个
  配置文件：{n} 个
  SQL/迁移：{n} 个
```

### 0.3 追踪上下游关联

对每个变更文件，追踪其直接上下游依赖（不递归展开，仅一层）：

**后端关联追踪**：
```
Controller 变更 → 追踪：对应 Service、DTO、请求/响应类
Service 变更   → 追踪：调用的 Mapper/DAO、被调用的 Controller、关联 Entity
Mapper 变更    → 追踪：对应 Entity、XML 映射文件、调用方 Service
Entity 变更    → 追踪：对应 Mapper、数据库迁移脚本
```

**前端关联追踪**：
```
页面/组件变更 → 追踪：引用的 Store、Composable、子组件
Store 变更    → 追踪：调用的 API 函数、使用方页面/组件
API 函数变更  → 追踪：对应 TS 类型定义、调用方 Store
TS 类型变更   → 追踪：使用方 API 函数、Store、组件
```

**跨端关联追踪**：
```
后端 DTO 变更      → 追踪：前端对应 TS 类型定义
后端 Controller 变更 → 追踪：前端对应 API 调用函数
前端 API 函数变更   → 追踪：后端对应 Controller 接口
```

将关联文件加入审查上下文（即使它们本身未变更），标记为"关联文件"以区分。

---

## 阶段 1：上下文加载

### 1.1 加载变更内容

对每个变更文件：
- 获取完整 diff（`git diff {base}...{head} -- {file}`）
- 读取变更后的完整文件内容
- 读取阶段 0.3 追踪到的关联文件内容

### 1.2 加载项目过程文档

根据变更文件所属模块、当前分支涉及的 REQ/BUG、以及 `docs/INDEX.md` 的导航信息，加载对应的过程文档。
加载应按需、可追溯，不做无边界的全量文档扫描。

**加载顺序**：

1. 读取 `docs/INDEX.md`（如存在），用它确认模块目录、跨模块依赖和任务路由。
2. 从以下来源识别涉及的模块、REQ-ID 和 BUG-ID：
   - 用户显式输入的 `REQ-*`、`BUG-*` 或过程目录路径
   - 变更文件路径：`docs/modules/{module}/...`、`docs/functional-requirements/{module}/...`、`docs/modules/_bugs/...`
   - 代码路径：后端包路径、前端 `src/modules/{module}`、API/DTO/Store 命名
   - 分支名、commit message、PR 标题或 diff 中出现的 `REQ-*`、`BUG-*`
   - `docs/functional-requirements/INDEX.md`、`docs/modules/{module}/spec.md` 中的需求映射
3. 加载顶层设计：
   - `docs/constitution.md`
   - `docs/architecture.md`
   - 与变更模块、实体、业务领域匹配的 `docs/domains/*.md`
4. 加载需求主依据与可选上游背景：
   - `docs/functional-requirements/INDEX.md`
   - 与 REQ-ID 或模块匹配的 `docs/functional-requirements/{module}/REQ-*.md`
   - `docs/requirements/overview.md`（如存在，仅作大型项目上游背景和追溯线索）
   - 涉及模块的 `docs/requirements/req-modules/{module}.md`（如存在，仅作大型项目上游背景和追溯线索）
5. 加载模块当前态：
   - `docs/modules/{module}/spec.md`
   - `docs/modules/{module}/overview.md`
   - `docs/modules/{module}/module-api.md`
   - `docs/modules/{module}/module-database.md`
   - `docs/modules/{module}/module-backend.md`
   - `docs/modules/{module}/module-frontend.md`
   - 以上模块根目录文件只作为索引、代码位置导航和当前态同步依据，不作为详细设计来源
6. 加载需求级过程文档：
   - `docs/modules/{module}/specs/{REQ-ID}-{name}/spec.md`
   - 如果目录名包含 `-fast-` 或 `spec.md` frontmatter `flow: fast`：
     - 同目录下的 `fast-design.md`
     - 不强制要求 FRD、完整详细设计或 `tasks.md`
   - 否则按标准需求加载：
     - 同目录下的 `api-design.md`
     - 同目录下的 `backend-database-design.md`
     - 同目录下的 `backend-detailed-design.md`
     - 同目录下的 `frontend-page-design.md`
     - 同目录下的 `frontend-detailed-design.md`
     - 同目录下的 `tasks.md`
7. 如果是 Bug 修复，加载：
   - `docs/modules/_bugs/{BUG-ID}-{name}/diagnosis.md`
   - `docs/modules/_bugs/{BUG-ID}-{name}/spec.md`
   - `docs/modules/_bugs/{BUG-ID}-{name}/fix-design.md`
   - `docs/modules/_bugs/{BUG-ID}-{name}/tasks.md`
   - Bug 文档中引用的相关模块当前态索引、REQ 设计和 FRD

**一致性判定优先级**：

1. 标准需求的强判定依据：FRD、`docs/modules/{module}/specs/{REQ}/spec.md`、同目录详细设计、`tasks.md`、顶层/领域约束和 Bug 过程文档。
2. Fast 需求的强判定依据：`spec.md`、`fast-design.md`、顶层/领域约束和模块当前态索引；不得因为缺少 FRD、完整详细设计或 `tasks.md` 判定 fast 需求错误。
3. `docs/modules/{module}/module-*.md` 只用于定位、影响面判断和“当前态是否同步”检查；不得用它替代 `specs/{REQ}/` 下的详细设计或 fast-design。
4. `docs/requirements/` 是大型项目拆解时的可选上游背景。缺失时不影响 code review；与 FRD/spec 不一致时，不应直接判定代码错误，只能作为文档链路风险提示，并建议转入 asdd-frd-review 或 asdd-requirements-review。

如果无法推断模块或 REQ，不应直接跳过全部设计文档。至少加载 `docs/INDEX.md`、顶层设计、变更中直接修改的文档，并在最终报告中说明未能定位需求级上下文带来的残余风险。

### 1.3 加载 Lead 审查参考

Lead 读取本 skill 的 references 目录：
- `references/reviewer-roles.md` — Lead-only 维度检查清单来源
- `references/scoring-rubric.md` — Lead-only 评分标准和对话报告结构参考；不是落盘模板

Lead 使用这些 reference 裁剪出每个 reviewer agent 需要的 `dimension_checklist`
和评分边界说明。不要把完整 reference 文件作为所有 agents 的共享上下文传入。

> **范围澄清**：
> - ✅ 加载项目过程文档（`docs/INDEX.md`、顶层设计、领域设计、FRD、模块当前态索引、标准需求的 spec/design/tasks、fast 需求的 spec/fast-design、Bug 过程文档；`docs/requirements/` 如存在则作为可选上游背景）用于审查代码与需求/设计的一致性
> - ❌ 不加载 `.opencode/rules/`（engineering-dev-standards、component-policy、database-* 等）
> - 工程规范合规性由 asdd-rules-review 负责，本 skill 不做 rules 校验

### 1.4 定位报告归档目标

本 skill 是 PR/分支级审查，但最终报告默认必须归档到关联 REQ 目录或 Bug 目录；
只有用户明确选择“不归档”时才允许仅输出对话报告：

```text
docs/modules/{module}/specs/{REQ-ID}-{name}/code-review.md
docs/modules/_bugs/{BUG-ID}-{name}/code-review.md
```

Lead 在调用 reviewer agents 前先定位归档目标，避免审查完成后才发现无法落盘。

**自动识别优先级**：

1. 用户显式指定的 REQ ID、BUG ID 或目录路径：
   - `REQ-20260426-001`
   - `BUG-20260426-001`
   - `docs/modules/order/specs/REQ-20260426-001-create-order`
   - `docs/modules/_bugs/BUG-20260426-001-order-status-stuck`
2. 变更文件路径直接位于以下目录之一：
   - `docs/modules/{module}/specs/{REQ-ID}-{name}/`
   - `docs/modules/_bugs/{BUG-ID}-{name}/`
3. 分支名、PR 标题、commit message、diff 文本中出现的 `REQ-YYYYMMDD-NNN` 或 `BUG-YYYYMMDD-NNN`。
4. `docs/INDEX.md`、FRD、module-*.md、`specs/{REQ}/tasks.md`、fast 需求 `fast-design.md`、Bug 过程文档路由结果指向唯一目标。
5. 变更代码能定位到唯一模块，且该模块当前只有一个活跃 `specs/{REQ}/` 候选。

**候选扫描范围**：

```text
docs/modules/*/specs/REQ-*/
docs/modules/_bugs/BUG-*/
```

候选目录必须包含 `spec.md` 才视为有效归档目标。

**无法唯一识别时必须询问用户**：

```text
未能从本次 diff 自动识别唯一归档目标。

请选择本次 code review 归档到哪个目录：
1. docs/modules/{module}/specs/{REQ-ID}-{name}
2. docs/modules/_bugs/{BUG-ID}-{name}
3. 手动输入 REQ ID、BUG ID 或目录路径
4. 本次不归档，仅输出报告
```

规则：

- 自动识别 1 个 REQ 或 BUG：直接作为归档目标。
- 自动识别多个目标：询问用户选择一个或多个目标；按用户选择分别落盘。
- 自动识别 0 个目标：询问用户指定 REQ ID、BUG ID 或目录路径。
- 只有用户明确选择“不归档”时，才允许只输出对话报告。
- 用户输入 REQ ID 时，Lead 在 `docs/modules/*/specs/` 下查找匹配目录；用户输入 BUG ID 时，在 `docs/modules/_bugs/` 下查找匹配目录；多匹配时继续询问。
- 当 diff 明确落在 `_bugs/BUG-*` 目录下时，默认优先归档到该 Bug 目录；不要自动改写为 REQ 目录。

---

## 阶段 2：调用 Reviewer Agents

> **强制要求**：本阶段必须使用 OpenCode Task tool 调用预定义 reviewer agent。
> 不要在对话中临时"创建团队"或发明未定义 agent。Reviewer agent 只输出候选问题，
> 不负责最终报告、严重程度、评分或合并建议。

### 2.1 Agent 组成

本 skill 使用 8 个 OpenCode reviewer agent：

| Agent | 审查维度 |
|-------|---------|
| `cc-review-code-quality` | 代码质量 |
| `cc-review-comment-accuracy` | 注释准确性 |
| `cc-review-test-coverage` | 单元测试覆盖与质量 |
| `cc-review-security` | 代码安全 |
| `cc-review-api-consistency` | 前后端 API 数据结构一致性 |
| `cc-review-code-simplification` | 代码简化 |
| `cc-review-type-design` | 类型设计 |
| `cc-review-design-consistency` | 代码与 FRD/spec/tasks/详细设计/fast-design/架构一致性 |

### 2.2 调用前校验

调用前确认 Task tool 可识别以上 8 个 agent。若任一 agent 不可用，中止并提示：

```
⚠️ 未找到 review agent：{missing-agent}
请先更新 OpenCode agent 定义后再执行 PR 级审查。
```

### 2.3 并行调用 Reviewer

通过 Task tool 并行调用 8 个 Reviewer agent。每个 Reviewer 都必须独立判断适用性；
不适用时返回 `applicability: not_applicable`，不要跳过调用。

Lead 为每个 Reviewer 构造动态 prompt。Prompt 由 `common_payload` 和
`dimension_payload` 组成，不要求 reviewer 自行读取共享 reference 文件。

**common_payload**：

1. 审查范围：base/head、分叉点、diff 命令来源、变更文件清单
2. 变更内容：每个变更文件的 diff、变更后完整内容、直接关联文件内容
3. 设计上下文：`docs/INDEX.md` 路由结果、顶层/领域设计、FRD、模块当前态索引、命中的 `specs/{REQ}/` 过程文档、fast 需求的 `fast-design.md`、Bug 过程文档（如适用）、可选上游系统需求背景（如存在）
4. 边界说明：不审查 `.opencode/rules/` 工程规范合规性
5. 输出 schema：`applicability`、`reason`、`candidate_findings`

**dimension_payload**：

| Reviewer | 接收的上下文 |
|----------|------------|
| `cc-review-code-quality` | code-quality 检查清单 + 所有变更文件 diff + 完整内容 + 关联文件 + 顶层/领域约束 |
| `cc-review-comment-accuracy` | comment-accuracy 检查清单 + 所有变更文件 diff + 完整内容 + 关联公共 API/文档 |
| `cc-review-test-coverage` | test-coverage 检查清单 + 测试文件 diff + 对应源码文件 + 标准需求的 FRD/spec/tasks 测试场景与 TDD 证据；fast 需求的 spec/fast-design 验收与执行证据 |
| `cc-review-security` | security 检查清单 + 所有变更文件 diff + 完整内容 + constitution.md 安全约束 + architecture/domains 中的安全边界 |
| `cc-review-api-consistency` | api-consistency 检查清单 + 后端 DTO/Controller diff + 前端 TS 类型/API diff + FRD/API 要求 + api-design.md + module-api.md |
| `cc-review-code-simplification` | code-simplification 检查清单 + 所有变更文件 diff + 完整内容 + 关联文件 + architecture.md 公共能力 + module-*.md 当前态索引 |
| `cc-review-type-design` | type-design 检查清单 + 所有变更文件 diff + 完整内容 + FRD 数据要求 + api-design.md + 前后端详细设计 |
| `cc-review-design-consistency` | design-consistency 检查清单 + 所有变更文件 diff + 标准需求的 FRD 与 `docs/modules/{module}/specs/{REQ}/` 全量过程文档；fast 需求的 spec.md 与 fast-design.md + module-*.md 当前态同步检查 + constitution.md + architecture.md + domains/*.md + Bug 过程文档（如适用） + 可选上游系统需求背景 |

动态 prompt 必须包含：

```yaml
review_scope:
  base: {base branch/sha}
  head: {head sha}
  fork_point: {sha}
  diff_source: {git diff command or PR source}

agent_contract:
  agent: {cc-review-*}
  dimension: {review dimension}
  responsibility: {本次具体职责}
  boundaries:
    - 只基于传入的 PR diff、完整文件和设计上下文审查
    - 只输出 candidate_findings
    - 不输出严重级别、评分、评级、合并建议或最终报告
    - 不读取 reviewer-roles.md 或 scoring-rubric.md 作为共享上下文
    - 不审查 .opencode/rules/ 工程规范合规性
    - 不修改文件

dimension_checklist:
  source: references/reviewer-roles.md#{dimension}
  checklist: {Lead 裁剪后的该维度检查清单}

files:
  changed:
    - path: {file}
      diff: {file diff}
      content: {full content after change}
  related:
    - path: {file}
      relation: {why included}
      content: {full content}

design_context:
  documents:
    - path: {doc}
      excerpt: {relevant excerpt}
      relevance: {why included}
  assumptions: {explicit assumptions}

output_schema:
  applicability: applicable|not_applicable
  reason: {not applicable reason}
  candidate_findings:
    - dimension: {review-dimension}
      file: {file-path}:{line-number}
      title: {short issue title}
      evidence: {specific evidence}
      risk: {why this may matter}
      suggested_fix: {specific fix direction}
      confidence: high|medium|low
      related_context: {optional design/file reference}
```

调用示例（语义要求，不要求逐字照抄）：

```
Task tool:
  agent: cc-review-security
  description: Review PR security risks
  prompt:
    你是 cc-review-security。请只基于下面传入的 security 检查清单、
    PR diff、完整文件和安全相关设计上下文审查安全风险。
    只输出候选问题 candidate_findings，不要打分、不要判定严重程度、不要输出最终报告。
    不要读取 reviewer-roles.md 或 scoring-rubric.md。
    {common_payload}
    {dimension_payload}
```

---

## 阶段 3：候选问题收集

### 3.1 等待所有 Reviewer 完成

等待 8 个 Reviewer agent 返回候选问题。每个返回结果必须包含：

- `applicability`: `applicable` 或 `not_applicable`
- `reason`: 不适用原因（如适用可省略）
- `candidate_findings`: 候选问题数组

如某个 Reviewer 调用失败或超时，重试一次。仍失败则标记为：

```
dimension: {dimension}
applicability: failed
failure_reason: {failure-reason}
candidate_findings: []
```

### 3.2 候选问题格式

每个 Reviewer 的每条候选问题必须包含以下字段。缺失字段时，当前 skill 在汇总前补齐或丢弃无效候选项：

```
dimension: {review-dimension}
file: {file-path}:{line-number}
title: {short issue title}
evidence: {specific evidence from diff/code/design}
risk: {why this may matter}
suggested_fix: {specific fix direction}
confidence: high|medium|low
related_context: {optional design/file reference}
```

> Reviewer 不输出严重级别、评分、是否阻塞合并或最终报告。这些判断全部由当前 skill 在阶段 4 统一完成。

---

## 阶段 4：Skill 汇总、分级与评分

### 4.1 候选问题规范化与去重

当前 skill 汇总 8 个 Reviewer 的候选问题，并执行规范化：

- 丢弃没有文件位置、没有证据或与本 PR 无关的候选项
- 将 `confidence: low` 且证据不足的候选项降为观察项，不计入阻塞问题
- 补齐候选项的维度、文件位置、问题标题、建议修改和影响说明
- 保留 Reviewer 原始证据，最终报告中的每个问题都必须可追溯

不同 Reviewer 可能发现同一问题（如 code-quality 和 code-simplification 都发现冗余代码）。
按以下规则去重：

- 同一文件同一行的问题 → 合并候选项，记录涉及维度，后续统一判定严重程度
- 同一文件不同行的相似问题 → 保留，但标注关联
- 不同文件的同类问题 → 可归为同一模式，但保留每个文件位置

### 4.2 严重程度判定

当前 skill 统一判定严重程度：

| 级别 | 判定标准 |
|------|----------|
| Critical | 明确安全漏洞、数据丢失、权限绕过、生产崩溃、核心流程不可用、破坏兼容且无降级 |
| Major | 功能正确性问题、设计/需求明显不一致、测试缺口覆盖关键流程、API 契约不一致、重要错误处理缺失 |
| Minor | 可维护性、局部边界场景、注释误导、轻微类型/简化问题，不直接阻塞主流程 |
| Suggestion | 可选优化、可读性提升、非必要简化或未来可改进项 |

严重程度必须基于候选问题的 `evidence`、`risk`、变更范围和设计上下文综合判断。
Reviewer 给出的措辞不能直接作为最终严重程度。

### 4.3 维度评分

按 `references/scoring-rubric.md` 中的评分标准计算每个维度的 0-10 分：

- 各维度独立评分：0-10 分
- 不适用维度标记为 N/A，不参与总分
- 调用失败维度标记为未完成，不参与总分，并在总结中说明残余风险
- 分数由最终严重程度和问题数量决定，而不是 Reviewer 自评分

### 4.4 综合评分与合并建议

- 综合评分 = 适用维度的加权平均（权重见 scoring-rubric.md）
- 评级：A（9-10）/ B（7-8）/ C（5-6）/ D（3-4）/ F（0-2）
- 合并建议由当前 skill 根据最终问题分级输出：
  - 无 Critical 且无 Major → 可合并
  - 无 Critical 且 Major ≤ 2 → 修复 Major 后可合并
  - 无 Critical 且 Major ≤ 5 → 修复后复审
  - 存在 Critical 或 Major > 5 → 不建议合并，需要修复后复审

当前 skill 负责输出最终报告，不再调用额外汇总 agent。

---

## 阶段 5：最终报告输出

### 5.1 报告结构

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Code Review 报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

分支：{branch} → {base}
变更文件：{total} 个
审查时间：{timestamp}

┌─────────────────────────────────────────────┐
│  综合评分：{score}/10  评级：{grade}          │
└─────────────────────────────────────────────┘

维度评分：
  代码质量        {score}/10  {bar}
  注释准确性      {score}/10  {bar}
  单元测试        {score}/10  {bar}
  代码安全        {score}/10  {bar}
  API 一致性      {score}/10  {bar}  （或 N/A）
  代码简化        {score}/10  {bar}
  类型设计        {score}/10  {bar}
  设计一致性      {score}/10  {bar}

问题统计：
  🔴 Critical：{n} 个
  🟠 Major：{n} 个
  🟡 Minor：{n} 个
  🔵 Suggestion：{n} 个

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 Critical 问题（必须修复）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{按文件分组列出所有 Critical 问题}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟠 Major 问题（强烈建议修复）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{按文件分组列出所有 Major 问题}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 Minor 问题（建议修复）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{按文件分组列出所有 Minor 问题}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 Suggestions（可选优化）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{按文件分组列出所有 Suggestion}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 审查总结
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{2-5 句话总结本次审查的整体情况、主要风险点和改进方向}

🔗 后续导航：
  ▶ 如审查通过：
    - 继续使用 asdd-rules-review skill 检查同一工作项的规范合规
    - 如已通过 rules review 和验收，使用 asdd-requirement-close skill 关闭 REQ，或使用 asdd-bug-close skill 关闭 BUG

  🔧 如需修复：
    - 使用 asdd-tasks-implement skill 根据 code-review.md 修复 REQ-...
    - 使用 asdd-requirement-implement-fast skill 根据 code-review.md 修复 fast REQ-...
    - 使用 asdd-bug-fix-fast skill 根据 code-review.md 修复 BUG-...
    - 修复后再次使用 asdd-code-review skill 复审

  ⏪ 回溯操作：
    - 如发现设计层面问题，使用 asdd-detailed-design-review skill 修正设计
```

### 5.2 审查通过标准

| 评级 | 条件 | 结论 |
|------|------|------|
| A（9-10） | 无 Critical/Major，Minor ≤ 3 | ✅ 可合并 |
| B（7-8） | 无 Critical，Major ≤ 2 | ⚠️ 修复 Major 后可合并 |
| C（5-6） | 无 Critical，Major ≤ 5 | ⚠️ 需要修复后复审 |
| D（3-4） | Critical ≤ 2 或 Major > 5 | ❌ 需要较大修改后复审 |
| F（0-2） | Critical > 2 | ❌ 需要重新实现 |

### 5.3 报告落盘

如果阶段 1.4 已确定归档目标，Lead 按目标类型选择模板并生成最新报告：

```text
REQ 目录：{REQ_DIR}/code-review.md
BUG 目录：{BUG_DIR}/code-review.md
```

写入规则：

1. 如果目标目录下的 `code-review.md` 已存在，先归档旧文件：

   ```text
   {TARGET_DIR}/code-review-{YYYYMMDD-HHmm}.md
   ```

   如果归档文件名已存在，追加短 hash 或序号，避免覆盖历史报告。

2. 按归档目标选择模板：
   - REQ 目录：使用 `docs/templates/code-review-template.md`
   - BUG 目录：使用 `docs/templates/bug-code-review-template.md`
3. 将本次最终报告按选定模板填充后写入新的 `{TARGET_DIR}/code-review.md`。
4. 如果用户选择多个 REQ / BUG 目录，对每个目录分别执行归档和写入。
5. 落盘报告中必须记录完整 PR/分支审查范围、所有关联 REQ / BUG、base/head、评分、
   问题列表和 agent 执行摘要。
6. 不修改 `spec.md`、`tasks.md`、`fast-design.md` 或 `docs/INDEX.md` 来索引本次运行时报告；
   通过固定文件名 `code-review.md` 发现最新报告。
7. 如果用户明确选择“不归档”，仅在对话中输出最终报告，并说明未写入文件是用户选择。

---

## 关键原则

### 基于变更审查，不做全量扫描

审查范围严格限定在 git diff 涉及的变更文件及其直接关联文件。
不对整个代码库做全量扫描 — 那是 lint 工具的职责。

### 关联分析是核心价值

单纯看 diff 只能发现表面问题。追踪上下游关联才能发现：
- 接口变更但调用方未同步更新
- DTO 字段变更但前端类型未对齐
- Service 逻辑变更但测试未覆盖新分支

### 并行审查，独立判断

8 个 Reviewer 独立工作，互不干扰。这避免了锚定效应。
一个 Reviewer 的判断不会影响其他人。当前 skill 负责去重、分级、评分和仲裁。

### Lead 控制上下文

当前 skill 是 code-review Lead，负责读取过程文档、裁剪维度检查清单、准备 diff 和文件内容、
构造动态 prompt、收集候选问题并输出最终报告。Reviewer agents 不继承 Lead 的会话历史，
也不自行读取完整 `reviewer-roles.md` 或 `scoring-rubric.md`。

### 评分客观，建议具体

每个问题必须给出具体的代码位置、问题描述和修改建议。
不接受"代码质量一般"这样的模糊评价 — 必须指出具体哪里有问题、为什么、怎么改。

### 适用性自动判断

不是所有维度都适用于每次审查：
- 纯后端变更 → api-consistency 可能不适用
- 无测试文件变更 → test-coverage 仍然适用（检查是否缺少测试）
- 纯配置变更 → 大部分维度不适用

当前 skill 仍调用所有 8 个 Reviewer，确保报告结构稳定；适用性由各 Reviewer 独立判断。
不适用的维度返回 `N/A`，当前 skill 在汇总评分时排除这些维度。

### 与其他 skill 的边界

| 操作 | 使用哪个 skill |
|------|---------------|
| 执行标准需求代码开发 | asdd-tasks-implement |
| 执行极小需求 fast 开发 | asdd-requirement-implement-fast |
| **代码 + 设计审查** | **asdd-code-review（本 skill）** |
| **代码规范合规审查** | **asdd-rules-review（不在本 skill 范围内）** |
| 审查/修改关键设计 | asdd-detailed-design-review |
| 审查/修改 FRD | asdd-frd-review |
| 审查/修改任务拆分 | asdd-tasks-review |

> 本 skill 审查代码质量和设计一致性，但不检查代码是否遵循 `.opencode/rules/` 中的工程规范。
> 规范合规性（命名规则、包路径、分层约束、数据库规范等）由 asdd-rules-review 负责。
