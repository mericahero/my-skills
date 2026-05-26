---
name: asdd-rules-review
description: >
  基于 PR/分支变更的工程规范合规性审查。动态扫描 .opencode/rules/ 下的规则文件，
  通过 Profile 或自动检测筛选适用规则，由本 skill 作为 rules-review Lead 将规则裁剪为
  可检查条目，并通过 OpenCode Task tool 调用预定义 cc-review-rules-* subagent 执行并行检查。
  Agents 只负责基于动态传入的规则原文、diff 和文件内容发现候选违规；本 skill 负责规则发现、
  分组、上下文裁剪、去重、严重级别判定、合规率计算、未列出组件追踪和最终报告。
  确保在以下场景触发本 skill：用户提到规范检查、rules review、规则合规、
  检查代码规范、check rules compliance、代码是否符合规范、规范审查、
  rules compliance、engineering standards review、帮我检查规范、
  即使用户只说了"查一下规范"或"代码符不符合规则"，只要存在代码变更，也应触发。
---

# asdd-rules-review

基于 PR/分支变更的工程规范合规性审查。

> **实现方式**：本 skill 是 rules-review Lead，必须通过 OpenCode Task tool 调用预定义
> `cc-review-rules-*` reviewer agent。Reviewer agent 只输出候选违规和检查证据；
> 本 skill 负责最终汇总、分级、合规率、未列出组件追踪和报告。
>
> **上下文原则**：不要让所有 rules agents 共同读取完整 `reviewer-roles.md`、
> `docs/unlisted-components.md` 或报告模板。Lead 先读取规则和项目组件清单，
> 再将每个 agent 需要的规则原文、diff、完整文件和输出 schema 动态传入。

## 审查范围

| 范围 | 是否审查 | 说明 |
|------|---------|------|
| `.opencode/rules/` 工程规范合规 | yes | 代码是否遵循 rules 中定义的编码规范 |
| 组件黑白名单合规 | yes | 依赖是否符合白名单、是否命中黑名单 |
| 未列出组件追踪 | yes | Agent 返回候选条目，Lead 维护 `docs/unlisted-components.md` |
| 安全类规则合规 | yes | 加密、凭据、权限、传输安全、敏感数据等规则条目 |
| 通用/跨领域规则合规 | yes | 不归属于特定领域的通用规则 |
| 代码质量（DRY/SOLID/复杂度等） | no | 由 `asdd-code-review` 负责 |
| 代码与设计一致性 | no | 由 `asdd-code-review` 负责 |

## 定位

本 skill 与 `asdd-code-review` 并行使用，各自聚焦不同审查维度。

```text
asdd-tasks-implement（代码实现）
    |
    v
并行审查：
  - asdd-code-review   ：代码质量 + 设计一致性
  - asdd-rules-review  ：.opencode/rules/ 工程规范合规
```

## 路径约定

| 资源 | 路径 | 使用方 |
|------|------|--------|
| 工程规范目录 | `.opencode/rules/` | Lead 读取、裁剪后传给 agents |
| 规则筛选配置 | `.opencode/rules-review-profile.yml` | Lead |
| 未列出组件追踪 | `docs/unlisted-components.md` | Lead 读取和维护；component agent 只返回候选 |
| 角色分组参考 | `.opencode/skills/asdd-rules-review/references/reviewer-roles.md` | Lead-only 参考，不作为所有 agents 共享输入 |
| 需求级落盘报告模板 | `docs/templates/rules-review-template.md` | Lead 写入 REQ 级 `rules-review.md` |
| Bug 级落盘报告模板 | `docs/templates/bug-rules-review-template.md` | Lead 写入 BUG 级 `rules-review.md` |
| Rules reviewer agents | `opencode/agents/cc-review-rules-*.md` | Task tool 调用 |

## 规则加载策略

OpenCode 原生只自动加载根目录 `AGENTS.md` 和 `opencode.json` 中 `instructions` 指定的文件。
`.opencode/rules/` 是 ASDD 规则目录，不依赖 OpenCode 专用 rules frontmatter。

| 策略 | 规则文件 | 使用方式 |
|------|----------|----------|
| 核心常驻 | `component-policy.md`、`engineering-dev-standards.md` | 已由 `opencode.json.instructions` 加载；rules review 仍读取全文用于条目化和引用原文 |
| Profile 指定 | `.opencode/rules-review-profile.yml` 中的 `active` | 优先按 profile 精确启用 |
| 数据库专项 | `database-*.md` | 按数据库驱动、datasource、SQL 方言或用户确认按需启用 |
| PDFC 专项 | `pdfc-*.md` | 按 PDFC 依赖、配置、代码注解/工具类、变更文件职责按需启用 |
| 未分类专项 | 其他 `.opencode/rules/*.md` | 仅在 profile 指定、变更明显命中 description，或用户确认后启用 |

---

## 阶段 0：审查范围确定

### 0.1 确定对比基准

默认审查当前功能分支上的所有变更，即从分支分叉点到 HEAD 的 diff。

**自动检测父分支（按优先级）**：

```text
1. 检查是否已有 PR：
   gh pr view --json baseRefName -q '.baseRefName' 2>/dev/null

2. 检测远程默认分支：
   git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null

3. 尝试常见主干分支名：
   main -> master -> develop

4. 以上均失败：
   询问用户指定 base branch
```

**生成 diff**：

```bash
FORK_POINT=$(git merge-base {detected-parent} HEAD)
git diff --name-status $FORK_POINT HEAD
git diff $FORK_POINT HEAD
```

**未提交变更检查**：

在生成 diff 前执行 `git status --porcelain`。如果存在未提交变更，提示用户：

```text
检测到未提交的变更（{n} 个文件）

未提交的变更不会包含在默认分支 diff 审查范围内。
  A) 先提交后再审查（推荐）
  B) 仅审查已提交的变更
  C) 显式把工作区 diff 纳入本次审查
```

**用户显式指定时的覆盖规则**：

| 用户输入 | diff 命令 |
|---------|----------|
| 未指定（默认） | `git diff $(git merge-base {base} HEAD) HEAD` |
| PR 编号（如 `#42`） | `gh pr diff 42` |
| 指定 base 分支（如 `vs develop`） | `git diff $(git merge-base develop HEAD) HEAD` |
| commit 范围（如 `abc123..def456`） | `git diff abc123..def456` |
| 工作区审查 | `git diff` + `git diff --cached` |

### 0.2 获取变更文件清单

按文件类型分类变更：

| 分类 | 匹配规则 | 示例 |
|------|---------|------|
| 后端源码 | `src/main/java/**/*.java` | Service, Controller, Entity |
| 后端测试 | `src/test/java/**/*.java` | 单元测试文件 |
| 前端源码 | `src/**/*.{vue,ts,tsx,js}` | 页面、组件、Store、API |
| 前端测试 | `src/**/*.{spec,test}.{ts,tsx,js}` | 前端测试文件 |
| 配置文件 | `*.{yml,yaml,xml,json,properties}` | 应用配置、构建配置 |
| SQL/迁移 | `*.sql`, `**/migration/**` | 数据库迁移脚本 |
| 依赖声明 | `pom.xml`, `build.gradle`, `package.json` | 依赖管理文件 |
| 安全相关 | 认证、授权、凭据、TLS、加密、脱敏、外部调用相关文件 | SecurityConfig、datasource、crypto |
| 中间件相关 | Redis、MQ、Kafka、缓存、分布式锁、注册配置相关文件 | RedisConfig、Consumer |
| 其他 | 不匹配以上规则的文件 | 文档、脚本等 |

### 0.3 追踪直接关联文件

只追踪一层直接上下游，避免全库扩散：

```text
Controller 变更 -> 对应 Service、DTO、请求/响应类
Service 变更    -> Mapper/DAO、被调用 Controller、关联 Entity
Mapper 变更     -> Entity、XML 映射文件、调用方 Service
页面/组件变更   -> Store、Composable/Hook、子组件
Store 变更      -> API 函数、使用方页面/组件
API 函数变更    -> TS 类型定义、调用方 Store、后端 Controller
认证/授权变更   -> Filter/Interceptor、Controller、配置
数据库配置变更  -> datasource、凭据引用位置、连接池配置
```

关联文件纳入 agent 上下文时必须标注为“关联文件”，不要伪装成变更文件。

### 0.4 定位报告归档目标

本 skill 是 PR/分支级规范合规审查，但最终报告默认必须归档到关联 REQ 目录或 Bug 目录；
只有用户明确选择“不归档”时才允许仅输出对话报告：

```text
docs/modules/{module}/specs/{REQ-ID}-{name}/rules-review.md
docs/modules/_bugs/{BUG-ID}-{name}/rules-review.md
```

Lead 在调用 rules reviewer agents 前先定位归档目标。该定位是轻量步骤，只用于落盘；
不要因此把 FRD、spec、tasks、详细设计等过程文档传给 rules reviewer agents。

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
4. 变更代码能定位到唯一模块，且该模块当前只有一个活跃 `specs/{REQ}/` 候选。

**候选扫描范围**：

```text
docs/modules/*/specs/REQ-*/
docs/modules/_bugs/BUG-*/
```

候选目录必须包含 `spec.md` 才视为有效归档目标。

**无法唯一识别时必须询问用户**：

```text
未能从本次 diff 自动识别唯一归档目标。

请选择本次 rules review 归档到哪个目录：
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

### 0.5 确认并维护未列出组件清单

本 skill 使用项目级唯一文件追踪不在白名单和黑名单中的组件：

```text
docs/unlisted-components.md
```

规则：

1. 如果 `docs/unlisted-components.md` 不存在，从
   `docs/templates/unlisted-components-template.md` 创建，并填充当前日期。
2. 如果文件已存在，不允许整文件覆盖；保留已有组件条目和确认状态，只补齐缺失表头或模板来源元数据。
3. 如果 `docs/INDEX.md` 存在，必须确认其中已索引
   `[unlisted-components.md](./unlisted-components.md)`；缺失时追加或创建“组件治理”章节。
4. 如果 `docs/INDEX.md` 不存在，不单独创建全局索引；在最终报告中提示用户先使用
   `asdd-architecture-generate` skill 生成索引。
5. `docs/unlisted-components.md` 只由 Lead 读取和维护；只把与本次 component 检查相关的条目裁剪后传给 `cc-review-rules-component`。
6. 该文件不是合规报告，不记录合规率、严重级别、违规详情或合并建议。

---

## 阶段 1：规则发现与筛选

### 1.1 扫描规则目录

扫描 `.opencode/rules/` 下所有 `.md` 文件，读取 frontmatter 和内容：

```text
扫描 .opencode/rules/*.md
  -> 发现 {n} 个规则文件
  -> 读取 frontmatter（description）
  -> 构建候选规则清单
```

### 1.2 Profile 筛选

如果 `.opencode/rules-review-profile.yml` 存在，优先使用 `active` 列表：

```yaml
active:
  - component-policy
  - engineering-dev-standards
  - database-dameng

deepScan: false
deepScanRules:
  - security-*
```

Profile 存在时仍需检查 rules 目录中是否有 profile 未覆盖的新文件，并提示：

```text
发现新规则 {rule-name} 未加入 profile。
本次默认不启用；如需要，请更新 .opencode/rules-review-profile.yml。
```

### 1.3 自动检测（无 Profile 时）

**核心规则**：`engineering-dev-standards`、`component-policy` 默认适用。

**互斥规则**：如 `database-*`，按项目实际依赖检测：

```text
1. pom.xml / build.gradle 数据库驱动
   dm-jdbc -> database-dameng
   gaussdb/opengauss-jdbc -> database-gaussdb
   highgo-jdbc -> database-higodb
   oceanbase-client -> database-oceanbase

2. application.yml / application.properties datasource
   dm.jdbc.driver -> 达梦
   org.opengauss -> 高斯
   com.highgo -> 翰高
   com.oceanbase -> OceanBase

3. SQL 文件中的方言特征

4. 无法判断时询问用户
```

**PDFC 专项规则**：按依赖和变更目标启用：

| 规则文件 | 启用信号 |
|----------|----------|
| `pdfc-architecture-api.md` | `pdfc-web` / `CrudApi` / `ApiResponse` / Controller / DTO / WebService / API 设计变更 |
| `pdfc-dao-transaction.md` | MyBatis、Mapper XML、DAO、PO、事务、并发更新、防重复提交变更 |
| `pdfc-cross-cutting.md` | 日志、参数校验、异步、审计、权限码、异常处理变更 |
| `pdfc-desensitization-encryption.md` | 敏感字段、脱敏、加密、密钥、密码传输、敏感日志变更 |
| `pdfc-integration.md` | BES/TongWeb、Consul、Apollo、Redis、OpenFeign、JWT、文件上传、邮件等集成变更 |

展示筛选结果后，询问是否保存为 Profile：

```text
扫描到 {n} 个规则文件，{m} 个适用于本项目。

是否保存为 .opencode/rules-review-profile.yml？
  A) 保存（推荐）
  B) 仅本次使用
```

### 1.4 加载 Lead 上下文

Lead 加载以下内容：

- 适用规则文件全文。
- 每个变更文件的 diff。
- 每个变更文件的变更后完整内容。
- 阶段 0.3 追踪到的直接关联文件。
- 技术栈判断所需配置：`pom.xml`、`build.gradle`、`package.json`、`application.yml`、`application.properties` 等。
- `docs/unlisted-components.md`（如存在）。
- Lead-only 参考：`references/reviewer-roles.md`。

**范围澄清**：

- 加载 `.opencode/rules/` 下的适用规则文件。
- 加载项目配置文件用于技术栈判断和规则适用性验证。
- 加载关联文件用于直接上下游合规检查。
- 不加载项目过程文档（constitution、architecture、FRD、spec/tasks 等），那是 `asdd-code-review` 的职责。
- 允许读取 `docs/INDEX.md` 仅用于确认 `docs/unlisted-components.md` 已索引；不要把 `docs/INDEX.md` 传给 agents。
- 只有 `cc-review-rules-component` 可以收到裁剪后的未列出组件上下文；其他 rules agents 不接收该文件内容。

---

## 阶段 2：规则条目化与领域分组

### 2.1 规则条目化

Lead 将适用规则拆成可检查条目。每个条目必须保留：

```yaml
rule_id: {rule-file}#{section-or-seq}
rule_file: {rule-file.md}
section: {heading path or anchor}
rule_text: {规则原文，尽量保留完整句子}
dimension: component|security|backend|frontend|database|middleware|general
target_files: {文件类型或文件清单}
check_hint: {grep|结构分析|配置分析|代码阅读|依赖解析|not_checkable}
severity_hint: critical|major|minor|suggestion|unknown
```

规则原文是违规可追溯性的基准。Agent 输出的每条违规必须引用 `rule_id` 和 `rule_text`。

### 2.2 领域识别

| 领域 | 关键词特征 |
|------|----------|
| component | 组件、白名单、黑名单、依赖、Maven、npm、package、artifact |
| security | 加密、密码、凭据、TLS、SSL、权限、认证、授权、密钥、token、credential、secret、最小权限 |
| backend | Java、Spring、Controller、Service、DAO、Mapper、Maven、MyBatis、JDK、后端、日志、异常 |
| frontend | Vue、React、TypeScript、Component、Store、Pinia、npm、vite、前端、SFC、Composition API |
| database | SQL、DDL、DML、table、index、migration、JDBC、数据库、建表、索引 |
| middleware | Redis、MQ、Kafka、RocketMQ、Consul、Nacos、缓存、消息、分布式锁、中间件 |
| general | 编码规范、UTF-8、通用规则、硬编码、文件结构、跨领域、国际化、日志级别、环境变量 |

新领域不要运行时创建新 agent。Lead 将其暂时归入 `general`，并在最终报告中标注“建议新增专用 rules reviewer agent”。

### 2.3 分组规则

```text
component-policy.md
  -> cc-review-rules-component

engineering-dev-standards.md
  -> 通用规则       -> cc-review-rules-general
  -> 安全条目       -> cc-review-rules-security
  -> 后端规范       -> cc-review-rules-backend
  -> 前端规范       -> cc-review-rules-frontend

database-{name}.md
  -> 数据库规范主体 -> cc-review-rules-database
  -> 安全相关条目   -> cc-review-rules-security

middleware / integration / pdfc-* 等规则
  -> 按规则内容分到 middleware/security/backend/general 等预定义 agent
```

安全条目可以被双重覆盖：领域 reviewer 做基础合规检查，`cc-review-rules-security` 从安全视角专项检查。Lead 在汇总时去重。

### 2.4 Agent 适用性

Lead 根据“规则条目 + 变更文件”决定是否调用 agent：

| Agent | 调用条件 |
|-------|----------|
| `cc-review-rules-component` | 存在 component 规则，且有依赖声明变更或需要检查未列出组件状态 |
| `cc-review-rules-security` | 存在 security 规则，且有代码/配置/SQL 变更；安全规则开启 deepScan 时也调用 |
| `cc-review-rules-backend` | 存在 backend 规则，且有 Java/后端配置/后端测试变更 |
| `cc-review-rules-frontend` | 存在 frontend 规则，且有 Vue/TS/JS/前端测试变更 |
| `cc-review-rules-database` | 存在 database 规则，且有 SQL/MyBatis/XML/datasource/Entity/Mapper 相关变更 |
| `cc-review-rules-middleware` | 存在 middleware 规则，且变更涉及 Redis/MQ/缓存/分布式锁/注册配置等 |
| `cc-review-rules-general` | 存在 general 规则，且有任意可检查变更 |

未调用的 agent 必须在最终报告中记录为 `N/A`，说明没有适用规则或没有目标文件。

---

## 阶段 3：调用 Reviewer Agents

### 3.1 Agent 组成

本 skill 使用 7 个预定义 OpenCode rules reviewer agent：

| Agent | 审查维度 |
|-------|----------|
| `cc-review-rules-component` | 组件白名单/黑名单、依赖基线、未列出组件 |
| `cc-review-rules-security` | 安全类规则合规 |
| `cc-review-rules-backend` | 后端工程规范 |
| `cc-review-rules-frontend` | 前端工程规范 |
| `cc-review-rules-database` | 数据库规范 |
| `cc-review-rules-middleware` | 中间件规范 |
| `cc-review-rules-general` | 通用/跨领域规范 |

这些 agent 必须存在于 `opencode/agents/`，名称符合 `cc-review-*`，可复用 `opencode.json` 中已有 Task 权限。

### 3.2 调用前校验

调用前确认 Task tool 可识别以上 agent。若需要调用的 agent 缺失，中止并提示：

```text
未找到 rules review agent：{missing-agent}
请先更新 OpenCode agent 定义后再执行 rules review。
```

不要降级为当前 agent 单独完成全部审查。缺少 agent 时应失败并要求补齐定义。

### 3.3 动态 Prompt Payload

每个 agent 的 prompt 由 Lead 动态构造，必须包含：

```yaml
review_scope:
  base: {base branch/sha}
  head: {head sha}
  fork_point: {sha}
  diff_source: {git diff command or PR source}

agent_contract:
  agent: {cc-review-rules-*}
  dimension: {component|security|backend|frontend|database|middleware|general}
  responsibility: {本次具体职责}
  boundaries:
    - 只检查传入的规则条目
    - 只输出候选违规和检查证据
    - component agent 可额外输出 unlisted_components
    - 不输出最终报告、合规率、评级、合并建议
    - 不读取 reviewer-roles.md 或 docs/templates/*-review-template.md
    - 不修改文件

rules:
  - rule_id: {stable id}
    rule_file: {rule file}
    section: {section}
    rule_text: {exact rule text}
    check_hint: {how to check}
    severity_hint: {critical|major|minor|suggestion|unknown}

files:
  changed:
    - path: {file}
      diff: {file diff}
      content: {full content after change}
  related:
    - path: {file}
      relation: {why included}
      content: {full content}

project_context:
  configs: {only relevant config snippets}
  unlisted_components_context: {component agent only; relevant rows from docs/unlisted-components.md}
  profile: {rules-review-profile decisions}
  assumptions: {explicit assumptions}

output_schema:
  {schema from section 3.5}
```

### 3.4 调用示例

```text
Task tool:
  agent: cc-review-rules-security
  description: Review rules compliance for security rule entries
  prompt: |
    你是 cc-review-rules-security。请只基于下面传入的 security 规则条目、
    PR diff、完整文件和安全关联文件检查规则合规。

    不要读取 reviewer-roles.md 或 docs/templates/*-review-template.md。
    不要输出最终报告、合规率、评级或合并建议。
    必须逐条规则给出 checked_rules，并对违规引用 rule_id、rule_file、section、rule_text。

    {dynamic-payload}
```

### 3.5 Agent 输出 Schema

所有 rules agents 返回以下结构。只有 `cc-review-rules-component` 额外返回 `unlisted_components`。

```yaml
applicability: applicable|not_applicable
reason: {不适用原因，适用时可省略}
checked_rules:
  - rule_id: {stable id supplied by Lead}
    rule_file: {rule file}
    section: {section}
    rule_text: {exact rule text}
    status: compliant|violated|not_checkable
    evidence: {brief evidence or missing context}
violations:
  - dimension: rules-component|rules-security|rules-backend|rules-frontend|rules-database|rules-middleware|rules-general
    file: {file-path}:{line-number}
    title: {short title}
    rule_id: {rule id}
    rule_file: {rule file}
    section: {section}
    rule_text: {exact rule text}
    evidence: {specific code/config/dependency evidence}
    risk: {why it matters under this rule}
    suggested_fix: {specific fix direction}
    severity_hint: critical|major|minor|suggestion|unknown
    confidence: high|medium|low
unlisted_components:
  - ecosystem: maven|gradle|npm|other
    name: {component/package/artifact}
    group: {groupId if any}
    version: {version if known}
    file: {file-path}:{line-number}
    status: new|tracked_pending|tracked_confirmed|tracked_rejected
    suggested_tracking_action: add|none|review|remove_dependency
    purpose_hint: {usage inferred from supplied context, or unknown}
```

---

## 阶段 4：检查策略

### 4.1 基础检索策略

每个 agent 收到上下文后，按以下层次检查：

1. **规则条目优先**：只检查 Lead 传入的规则条目，不凭空扩展。
2. **diff 过滤**：优先检查变更文件和变更行。
3. **完整文件阅读**：需要理解上下文时阅读变更后完整文件。
4. **直接关联文件**：只检查 Lead 传入的一层关联文件。
5. **规则驱动检索**：对明确 grep/结构匹配规则执行目标搜索。

### 4.2 Deep Scan

默认只审查 PR/分支变更和直接关联文件。Profile 可开启 deep scan：

```yaml
deepScan: false
deepScanRules:
  - security-*
  - component-policy
```

Deep scan 只允许用于规则明确、风险高、检索方式清晰的条目，例如：

| 规则类型 | 主动搜索策略 |
|---------|--------------|
| 禁止 MyBatis `${}` | 搜索 XML/Java 中的 `${` |
| 禁止硬编码凭据 | 搜索 password/secret/credential/token 字面量赋值 |
| 组件黑名单 | 搜索依赖文件和 import |
| TLS/SSL 配置 | 搜索 ssl/tls 配置项 |

Deep scan 发现的违规必须标注为 `scan_scope: deep_scan`，Lead 在报告中区分它不是直接 diff 违规。

### 4.3 组件追踪特殊规则

`cc-review-rules-component` 是只读 agent：

- 不创建或修改 `docs/unlisted-components.md`。
- 只返回 `unlisted_components`。
- Lead 决定是否创建或追加追踪文件。
- 已确认组件不作为违规；已拒绝组件仍在使用应由 Lead 判定为 Major。

Lead 更新 `docs/unlisted-components.md` 的规则：

| 场景 | 操作 |
|------|------|
| 文件不存在 | 创建模板并追加本次新发现组件 |
| 文件已存在 | 仅追加新发现组件，不修改已有条目 |
| 组件已确认 | 不报告为违规，仅标注已追踪已确认 |
| 组件新发现或待确认 | 作为 Suggestion 提醒确认 |
| 组件已拒绝 | 作为 Major 违规要求移除 |

`unlisted_components` 到追踪文件的映射规则：

- `status: new` 且 `suggested_tracking_action: add`：按 `ecosystem` 追加到“后端组件 / 前端组件 / 其他组件”，确认状态写“新发现”，发现来源写返回的 `file`，首次发现写当前日期。
- `status: tracked_pending`：不重复追加，在报告中提示“待确认”。
- `status: tracked_confirmed`：不重复追加，不作为违规。
- `status: tracked_rejected`：不重复追加，作为 Major 违规要求移除或替换。
- 追加时按 `ecosystem + group + name` 或包名去重；不得覆盖已有用途说明、确认状态或备注。

---

## 阶段 5：候选结果收集与归并

### 5.1 等待和失败处理

等待所有已调用 agents 返回。所有 rules agents 的返回结果必须包含：

- `applicability`
- `checked_rules`
- `violations`

`cc-review-rules-component` 可额外返回：

- `unlisted_components`

如某个 agent 调用失败或超时，重试一次。仍失败则标记为：

```yaml
applicability: failed
agent: {agent}
reason: {failure reason}
violations: []
```

最终报告必须显式列出失败 agent，且不能把失败 agent 的领域计为已合规。

### 5.2 去重

Lead 根据以下键去重：

```text
rule_id + file + line + normalized evidence
```

如果 security agent 与领域 agent 报告同一问题：

- 保留更具体、证据更完整的 finding。
- 合并两个来源到 `reported_by`。
- 若一个是安全视角、一个是结构视角，可保留为一个违规，并在描述中说明双重影响。

### 5.3 严重级别判定

Agent 只提供 `severity_hint`。最终严重级别由 Lead 依据规则原文、组件策略和以下内置标准判定：

| 级别 | 典型场景 |
|------|----------|
| Critical | 黑名单组件、SQL 注入写法、硬编码密钥、高权限账户用于应用、规则明确禁止且风险高 |
| Major | 白名单替代未使用、版本低于基线、包路径/分层/结构违规、凭据未加密、已拒绝组件仍在使用 |
| Minor | 命名偏差、轻微格式/结构偏差 |
| Suggestion | 规则中的推荐项、新发现或待确认组件提醒、低风险改进 |

若规则原文没有强制语气，避免升级为阻塞违规。

### 5.4 合规率计算

每个 agent 的 `checked_rules` 参与统计：

```text
检查条目总数 = compliant + violated + not_checkable
基础合规率 = compliant / 检查条目总数
加权违规数 = Critical * 3 + Major * 2 + Minor * 1 + Suggestion * 0
加权合规率 = max(0, 1 - 加权违规数 / (检查条目总数 * 2)) * 100%
```

`not_checkable` 不算合规，需在报告中单独列出缺失上下文。

特殊规则：

- 存在任何 Critical 违规，评级最高为 C。
- 存在 3 个以上 Major 违规，评级最高为 B。
- Agent 失败时，该领域不得显示为完全合规。

---

## 阶段 6：最终报告

最终对话报告由 Lead 输出，按本 skill 的分级和合规率规则组织：

```text
Rules Compliance Report — asdd-rules-review

审查信息：
  分支 / base / head / fork point
  变更文件数量
  适用规则文件
  调用的 rules reviewer agents
  跳过或失败的 agents

合规率与评级：
  加权合规率
  评级
  合并建议

逐规则状态：
  每个规则文件的 checked / violated / not_checkable 数量

逐领域状态：
  component / security / backend / frontend / database / middleware / general

违规详情：
  Critical -> Major -> Minor -> Suggestion
  每条必须包含 file:line、rule_file、section、rule_text、evidence、suggested_fix

未列出组件追踪：
  新发现 / 待确认 / 已确认 / 已拒绝

🔗 后续导航：
  ▶ 如审查通过：
    - 如已通过 code review 和验收，使用 asdd-requirement-close skill 关闭 REQ，或使用 asdd-bug-close skill 关闭 BUG

  🔧 如需修复：
    - 回到对应实现 skill 按 rules-review.md 修复代码
    - 修复后再次使用 asdd-rules-review skill 复审

  🔄 当前阶段可选操作：
    - 如需代码质量审查，使用 asdd-code-review skill 审查同一工作项
```

最终报告不要把 agent 原始输出原样拼接；Lead 必须完成去重、分级、排序和一致化表达。
需求级落盘报告必须在阶段 6.1 按 `docs/templates/rules-review-template.md` 写入。

### 6.1 报告落盘

如果阶段 0.4 已确定归档目标，Lead 按目标类型选择模板并生成最新报告：

```text
REQ 目录：{REQ_DIR}/rules-review.md
BUG 目录：{BUG_DIR}/rules-review.md
```

写入规则：

1. 如果目标目录下的 `rules-review.md` 已存在，先归档旧文件：

   ```text
   {TARGET_DIR}/rules-review-{YYYYMMDD-HHmm}.md
   ```

   如果归档文件名已存在，追加短 hash 或序号，避免覆盖历史报告。

2. 按归档目标选择模板：
   - REQ 目录：使用 `docs/templates/rules-review-template.md`
   - BUG 目录：使用 `docs/templates/bug-rules-review-template.md`
3. 将本次最终报告按选定模板填充后写入新的 `{TARGET_DIR}/rules-review.md`。
4. 如果用户选择多个 REQ / BUG 目录，对每个目录分别执行归档和写入。
5. 落盘报告中必须记录完整 PR/分支审查范围、所有关联 REQ / BUG、base/head、合规率、
   违规列表、未列出组件追踪和 agent 执行摘要。
6. 不修改 `spec.md`、`tasks.md`、`fast-design.md` 或 `docs/INDEX.md` 来索引本次运行时报告；
   通过固定文件名 `rules-review.md` 发现最新报告。
7. 如果用户明确选择“不归档”，仅在对话中输出最终报告，并说明未写入文件是用户选择。

---

## 关键原则

### Lead 控制上下文

Lead 负责读全局规则、裁剪规则原文、选择 agent、准备 diff 和文件内容。Agent 不继承 Lead 的会话历史，也不共享读取完整参考文档。

### 规则即基准

Reviewer 的职责是检查代码是否符合规则文件中的明确条目。不做超出规则范围的主观代码质量判断。

### 引用规则原文

每条违规必须引用 `rule_file`、`section` 和 `rule_text`，让开发者能直接对照规则理解为什么违规。

### 预定义 agent，不运行时动态创建

OpenCode 中使用预定义 `cc-review-rules-*` agents。新增领域先归入 `cc-review-rules-general`，必要时再演进出新的预定义 agent。

### Agent 只读

Rules reviewer agents 不修改代码、不修改 `docs/unlisted-components.md`、不写报告文件。所有写入动作只由 Lead 在当前 skill 中执行，并且必须符合用户授权和当前工作区状态。

### 与其他 skill 的边界

| 操作 | 使用哪个 skill |
|------|---------------|
| 执行代码开发 | `asdd-tasks-implement` |
| 代码质量 + 设计一致性审查 | `asdd-code-review` |
| 工程规范合规审查 | `asdd-rules-review` |
| 审查/修改关键设计 | `asdd-detailed-design-review` |
| 审查/修改 FRD | `asdd-frd-review` |
| 审查/修改任务拆分 | `asdd-tasks-review` |

`asdd-rules-review` 专注于 `.opencode/rules/` 中定义的工程规范合规性。代码质量、设计一致性和需求覆盖由 `asdd-code-review` 负责。
