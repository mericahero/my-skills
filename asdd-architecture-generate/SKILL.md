---
name: asdd-architecture-generate
description: >
  生成顶层设计文档（constitution.md、architecture.md、领域设计文件）。
  支持两种模式：存量项目通过代码扫描逆向提取约束；新建项目从系统需求（docs/requirements/）
  自动提取信息并交互补充缺失部分。生成过程强制参考 .opencode/rules/ 下的规范约束。
  确保在以下场景触发本 skill：用户提到生成顶层设计、提取约束、创建架构文档、
  scan project for design docs、generate top-level design、fill design templates、
  从代码生成文档、自动填充模板、扫描项目生成设计文档、新建项目初始化约束、
  初始化项目架构、生成 constitution、generate architecture，
  即使用户没有明确说"顶层设计"。
---

# asdd-architecture-generate

生成顶层设计文档。支持存量项目（代码扫描）和新建项目（需求驱动 + 交互补充）两种模式。

## 前提

- 模板文件已放置到 `{项目根}/docs/templates/` 目录
- 顶层实例文件不存在时，从 `docs/templates/` 对应模板复制生成
- 本 skill 纯指令驱动，使用 OpenCode 原生文件读写能力完成所有操作

## 路径约定

- **SKILL_DIR**：本 skill 所在目录，即 `.opencode/skills/asdd-architecture-generate/`
- 后续提到的 `references/xxx.md` 均指 `{SKILL_DIR}/references/xxx.md`
- 读取 reference 文件时，使用完整路径：`.opencode/skills/asdd-architecture-generate/references/xxx.md`

## 输出文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 全局约束 | `docs/constitution.md` | 项目的"宪法"，所有约束规则 |
| 架构蓝图 | `docs/architecture.md` | 技术选型、服务拓扑、架构决策 |
| 未列出组件清单 | `docs/unlisted-components.md` | 不在白名单和黑名单中的组件、包或依赖 |
| 领域文件 | `docs/domains/{NN}-{name}.md` | 跨模块的领域级设计（按需） |
| 全局索引 | `docs/INDEX.md` | 全局导航、任务路由和依赖注册 |

## 模板来源

| 输出文件 | 模板 |
|----------|------|
| `docs/INDEX.md` | `docs/templates/index-template.md` |
| `docs/constitution.md` | `docs/templates/constitution-template.md` |
| `docs/architecture.md` | `docs/templates/architecture-template.md` |
| `docs/unlisted-components.md` | `docs/templates/unlisted-components-template.md` |
| `docs/domains/{NN}-{name}.md` | `docs/templates/domain-template.md` |

生成文件必须保留模板 frontmatter 中的 `template_id`、`template_version`、`target_path`。

---

## 阶段 0：强制加载规范约束

**本阶段必须在所有其他阶段之前执行，不可跳过。**

### 0.1 加载 .opencode/rules/

扫描 `.opencode/rules/` 目录下的**所有文件**，读取全部内容。这些规范定义了项目的包名、命名规范、代码结构、技术约束等硬性规则。

**后续所有阶段的约束提取、架构决策、模板填充都必须遵循这些规范。** 具体来说：
- 阶段 1（新建项目交互）：展示规范中已有的约束，避免重复询问
- 阶段 2（代码扫描）：用规范验证扫描结果的一致性
- 阶段 3（分析综合）：将规范内容融入约束条目
- 阶段 4（模板填充）：确保填充内容不违反规范

如果 `.opencode/rules/` 不存在或为空，向用户提示：

```
⚠️ 未找到 .opencode/rules/ 目录或目录为空。
该目录通常包含项目的编码规范和约束规则（包名、命名规范、代码结构等）。
如果项目有此类规范，建议先创建该目录并添加规范文件。
是否继续？（继续将仅基于代码扫描/需求文件生成顶层设计）
```

用户确认后继续，但不阻断流程。

---

## 阶段 1：前置校验与项目类型判断

### 1.1 确认关键文件

检查以下文件/目录是否存在：
- `docs/templates/index-template.md` — 全局索引模板
- `docs/templates/constitution-template.md` — 全局约束模板
- `docs/templates/architecture-template.md` — 架构蓝图模板
- `docs/templates/unlisted-components-template.md` — 未列出组件清单模板
- `docs/templates/domain-template.md` — 领域设计模板

缺失任何一个则中止，列出缺失文件并提示用户补充。

然后检查实例文件：

| 实例文件 | 处理方式 |
|----------|----------|
| `docs/INDEX.md` | 不存在则从 `index-template.md` 复制生成；存在则保留项目内容，只更新必要索引信息 |
| `docs/constitution.md` | 不存在则从 `constitution-template.md` 复制生成；存在则在原文件上填充/更新 |
| `docs/architecture.md` | 不存在则从 `architecture-template.md` 复制生成；存在则在原文件上填充/更新 |
| `docs/unlisted-components.md` | 不存在则从 `unlisted-components-template.md` 复制生成；存在则保留已有确认状态，只按需补齐表头 |

禁止因为模板版本升级而整文件覆盖已有实例文件。

### 1.2 初始化未列出组件清单

顶层设计生成阶段必须先初始化项目级未列出组件清单。存量项目可在本阶段扫描实际依赖；新建项目或设计期计划组件必须等阶段 1.4 收集技术栈和基础设施决策后，再在阶段 3.6/4.3 追加：

```text
docs/unlisted-components.md
```

处理规则：

1. 文件不存在时，从 `docs/templates/unlisted-components-template.md` 创建。
2. 文件已存在时，保留已有组件条目和确认状态，只补齐缺失表头或模板来源元数据。
3. 如果 `.opencode/rules/component-policy.md` 存在且当前工作区已有依赖声明文件，扫描存量项目实际依赖：
   - `pom.xml`
   - `build.gradle`
   - `package.json`
   - `go.mod`
   - `Cargo.toml`
   - 其他明确的依赖清单文件
4. 对比白名单和黑名单：
   - 白名单组件：不写入清单。
   - 黑名单组件：不写入清单；存量项目实际依赖在结果报告中提示后续使用 `asdd-rules-review` skill 检查。
   - 不在白名单且不在黑名单的实际依赖：追加到 `docs/unlisted-components.md`，确认状态为“新发现”。
5. 追加前按 `ecosystem + group + name` 或包名去重；已存在条目不覆盖、不修改确认状态。
6. 无法准确判断白名单/黑名单时，不凭空归类；记录到执行摘要中，提示后续由 `asdd-rules-review` 精确检查。
7. 新建项目或设计期计划组件在阶段 3.6 生成计划组件清单，并在阶段 4.3 写入 `docs/unlisted-components.md`。
8. `docs/INDEX.md` 存在时，确保“组件治理”章节索引 `docs/unlisted-components.md`。

### 1.3 判断项目类型（存量/新建）

**Step A — 仓库拓扑预扫描**：

先执行仓库拓扑预扫描，再判断存量/新建和架构形态。不要只检查根目录 `src/`；
企业项目常见结构是多个后端微服务、网关、common 模块、主应用和微前端子应用平铺在仓库根目录。

必须扫描以下信号：

- 顶层和二级构建文件：`pom.xml`、`build.gradle`、`settings.gradle`、`package.json`、`pnpm-workspace.yaml`、`go.mod`、`Cargo.toml`
- Maven/Gradle 多模块声明：父 POM `<modules>`、Gradle `include(...)`
- 后端服务目录：包含 `src/main/java`、启动类、`application.yml`、独立 `pom.xml` / `build.gradle` 的顶层目录
- 网关/注册/配置线索：`gateway`、Spring Cloud Gateway、Feign、Consul、Nacos、Apollo、服务名和端口配置
- 前端应用目录：包含 `package.json`、`vite.config.*`、`src/main.*` 的顶层目录
- 微前端线索：主应用注册子应用配置，以及 qiankun / wujie / micro-app / single-spa / Module Federation 依赖或配置
- 公共模块：`common`、`shared`、`core`、`base`、`packages/shared`

将预扫描结果整理为：

```text
后端服务候选：
  - {目录}：{服务名/端口/构建文件/启动类/配置文件}
前端应用候选：
  - {目录}：{应用名/路由前缀/构建文件/微前端角色}
公共模块候选：
  - {目录}：{common/shared/core/base}
架构信号：
  - {gateway/registry/config-center/feign/mq/micro-frontend/workspace/module-list}
```

如预扫描发现多个服务或前端应用，后续扫描必须逐个服务/应用采样，禁止只扫描第一个 `src/`。

**Step B — 判断存量/新建**：

| 判断条件 | 项目类型 |
|----------|----------|
| 存在任意构建文件、服务目录、前端应用目录或公共模块目录 | 存量项目 |
| 存在源码目录（`src/`、`app/`、`lib/`）且包含业务代码文件 | 存量项目 |
| 无源码目录或目录为空 | 新建项目 |

**Step C — 判断技术栈与架构形态**（仅存量项目）：

| 信号 | 判定 |
|------|------|
| 存在 `pom.xml` / `build.gradle` / `go.mod` / `Cargo.toml` 且无前端框架配置 | 纯后端 |
| 存在 `package.json` 且含 vue/react/angular/svelte 依赖，无后端构建文件 | 纯前端 |
| 同时存在后端构建文件和前端框架配置 | 全栈 |
| 多个顶层/二级目录各有独立构建文件，或存在 Maven/Gradle/workspace 多模块声明 | Monorepo |
| 多个后端服务候选，或命中 gateway/registry/config-center/Feign 等微服务信号 | 微服务 / 微服务 Monorepo |
| 多个前端应用候选，且命中微前端依赖或主应用注册子应用配置 | 微前端 / 全栈微前端 |

**判定优先级**：

1. 命中 Monorepo / 多模块 / workspace 时，优先判定为 Monorepo，再细分后端微服务、前端应用和公共模块。
2. 命中多个后端服务或微服务基础设施时，不得判定为单体。
3. 命中多个前端应用或微前端配置时，不得判定为单一前端。
4. 只有在确认仅 1 个构建单元、1 个后端启动入口、无服务发现/网关/Feign/workspace/微前端信号时，才能判定为单体。

将检测结果告知用户并请求确认。

- **存量项目**：进入阶段 2
- **新建项目**：进入阶段 1.4

---

### 1.4 新建项目处理（需求驱动 + 交互补充）

**跳过阶段 2**，通过系统需求文件提取信息，缺失部分交互补充。

#### Step A — 检查系统需求文件

检查 `docs/requirements/` 目录：
- `docs/requirements/overview.md` 是否存在
- `docs/requirements/req-modules/*.md` 是否存在

**如果需求文件存在**：进入 Step B 自动提取。

**如果不存在**，提示用户：

```
📋 未找到系统需求文件（docs/requirements/）。

系统需求文件由 asdd-requirements-decompose skill 生成，包含：
  - overview.md（需求总览）
  - req-modules/*.md（模块级需求）

请选择：
  A) 先使用 asdd-requirements-decompose skill 生成系统需求（推荐）
  B) 跳过需求文件，直接手动输入所有信息
```

如果用户选择 B，则跳过 Step B，直接进入 Step C 全量交互收集。

#### Step B — 从需求文件自动提取

**从 overview.md 提取**：
- 项目名称、项目定位描述
- 非功能需求（性能、安全、可用性指标）
- 系统边界（包含/不包含）
- 外部依赖系统
- 约束与假设条件

**从 req-modules/*.md 提取**：
- 模块/服务清单及职责描述
- 模块间依赖关系
- 核心数据实体（用于推断领域）
- 每个模块的功能范围

**从 .opencode/rules/ 提取**（阶段 0 已加载）：
- 技术栈约束（如已指定语言/框架）
- 命名规范
- 代码结构约束
- 其他硬性规则

#### Step C — 展示已提取信息 + 交互补充缺失

先展示从需求文件和规范中已提取的信息：

```
📊 已从需求文件和项目规范中提取以下信息：

项目名称：{提取到的名称}
项目定位：{提取到的描述}

模块/服务清单：
  1. {模块1} — {职责}
  2. {模块2} — {职责}
  ...

已采纳的规范约束（来自 .opencode/rules/）：
  - {规范约束1}
  - {规范约束2}
  ...
```

然后**仅询问需求和规范中未覆盖的信息**。根据缺失情况，从以下选项中筛选需要询问的部分：

**技术栈选型**（如规范中未指定）：

生成和展示选项前，先用 `.opencode/rules/component-policy.md` 过滤组件策略：
- 白名单中有对应场景时，把白名单组件作为推荐项。
- 黑名单组件不要作为默认推荐；用户手动指定黑名单组件时，必须提示禁止原因并要求替代。
- 未列出组件可以作为用户指定的“其他”选项，但必须纳入 `docs/unlisted-components.md`，确认状态为“待确认”。

```
📋 请选择技术栈：

**后端技术栈**：
  - 语言：A) Java 17+  B) Go 1.21+  C) Node.js 18+  D) Python 3.11+  E) 其他
  - 框架：A) Spring Boot 3.x  B) Go Gin  C) NestJS  D) FastAPI  E) 其他
  - 数据库：A) 达梦 DM8  B) HGDB  C) GaussDB  D) OceanBase  E) 其他（需登记未列出组件）
  - ORM：A) MyBatis-Plus  B) JPA/Hibernate  C) GORM  D) Prisma  E) 其他
  - 缓存：A) Redis  B) Memcached  C) 无  D) 其他
  - 消息队列：A) RocketMQ  B) Kafka  C) RabbitMQ  D) 无  E) 其他
  - 构建工具：A) Maven  B) Gradle  C) Go Modules  D) npm/pnpm  E) 其他

**前端技术栈**（如适用）：
  - 是否有前端：A) 是  B) 否（纯后端项目）
  - 框架：A) Vue 3  B) React 18  C) Angular 17  D) Svelte  E) 其他
  - UI 组件库：A) Element Plus  B) Ant Design  C) Arco Design  D) Naive UI  E) 其他
  - 状态管理：A) Pinia  B) Redux Toolkit  C) Zustand  D) NgRx  E) 其他
  - 构建工具：A) Vite  B) Webpack  C) Rollup  D) 其他
```

**架构约束选择**（如规范中未指定）：

```
📋 请选择架构约束：

**架构模式**：
  A) 单体应用 ← 建议（项目初期）
  B) 微服务架构

**API 风格**：
  A) RESTful，URI 版本化 `/api/v1/{resource}` ← 建议
  B) RESTful，Header 版本化
  C) GraphQL
  D) gRPC

**统一响应格式**：
  A) `{"code": 0, "message": "success", "data": {}}` ← 建议
  B) `{"success": true, "data": {}, "error": null}`
  C) 其他格式

**字段命名规范**：
  A) camelCase（驼峰）← 建议
  B) snake_case（下划线）

**分页参数**：
  A) `page`(从1开始) + `size`(默认20) ← 建议
  B) `offset` + `limit`
  C) 游标分页

**主键策略**：
  A) 雪花算法 Long 型 ID ← 建议
  B) UUID
  C) 数据库自增
  D) 其他

**审计字段**：
  A) `create_time`, `update_time`, `deleted`(逻辑删除) ← 建议
  B) `createdAt`, `updatedAt`, `isDeleted`
  C) 其他

**表名规则**：
  A) `{服务前缀}_{业务域}_{表名}` ← 建议（微服务）
  B) `{业务域}_{表名}` ← 建议（单体）
  C) 其他

**数据库治理规则**：
  A) 按适用 `.opencode/rules/database-*.md` 生成连接、安全、命名、DDL、SQL 顶层硬约束 ← 建议
  B) 仅采用通用数据约束（需说明原因）

**认证方案**：
  A) JWT + Spring Security / Passport ← 建议
  B) OAuth 2.0
  C) Session
  D) 无认证
  E) 其他

**数据安全**：
  A) 敏感数据入库前加密，日志脱敏 ← 建议
  B) 仅日志脱敏
  C) 无特殊要求
```

**全局基础设施**（如规范中未指定）：

```
📋 请选择全局基础设施策略：

**异常体系**：
  A) 三层异常：BusinessException / ServiceException / SystemException ← 建议
  B) 两层异常：BusinessException / SystemException
  C) 其他

**错误码分段**：
  A) 按模块分段（10001-19999 通用，20001-29999 服务A，...） ← 建议
  B) 按 HTTP 状态码扩展（40001, 40002, ...）
  C) 其他

**Redis 降级策略**：
  A) L1 本地缓存兜底 + 写操作直落 DB ← 建议
  B) 直接抛异常，快速失败
  C) 无 Redis 使用场景

**分布式锁**：
  A) 需要（Redis SETNX + Lua / Redisson 封装） ← 建议（微服务）
  B) 不需要

**请求上下文传播**：
  A) traceId + userId + tenantId，跨服务自动透传 ← 建议
  B) 仅 traceId
  C) 无需求

**前端公共层范围**（如有前端）：
  A) Axios 封装 + 权限指令 + 通用 composables + 共享类型 ← 建议
  B) 仅 Axios 封装 + 共享类型
  C) 其他
```

**关键原则**：
- 规范（.opencode/rules/）中已指定的约束**不再询问**，直接采纳并告知用户
- 需求文件中已有的信息**不再询问**，直接采纳并告知用户
- 仅询问既未在规范中指定、也未在需求文件中提及的信息

#### Step D — 确认汇总

将所有信息（需求提取 + 规范约束 + 用户输入）汇总展示：

```
📝 请确认以下顶层设计信息：

项目名称：{项目名称}
项目定位：{项目定位}

技术栈：
  - 后端：{语言} + {框架} + {数据库} + {ORM}
  - 前端：{框架} + {UI组件库}（如有）
  - 缓存：{缓存}
  - 消息：{消息队列}
  - 未列出组件待确认：{组件清单或无}
  - 黑名单冲突：{组件清单或无；存在时需先替换}

架构约束：
  - 架构模式：{单体/微服务}
  - API 风格：{风格}
  - 响应格式：{格式}
  - 主键策略：{策略}
  - 认证方案：{方案}

服务/模块清单：
  1. {模块1} — {职责}
  2. {模块2} — {职责}
  ...

已采纳的规范约束：
  - {来自 .opencode/rules/ 的约束列表}

确认以上信息？（是/否，或提供修改）：
```

用户确认后，将收集的信息转化为约束声明，**跳过阶段 2**，直接进入阶段 3。

---

## 阶段 2：扫描项目代码

**仅存量项目执行此阶段。新建项目跳过，直接进入阶段 3。**

### 2.1 加载扫描策略

读取 `references/scan-strategy.md` 获取完整的扫描目标和提取规则。

### 2.2 核心扫描原则

- **广度优先**：先扫描配置文件和目录结构，再采样代码文件
- **拓扑优先**：先完成仓库拓扑预扫描，识别所有服务、前端应用和公共模块，再逐个目标深入
- **采样而非全量**：每类代码文件（Controller、Entity、Service 等）只采样 2-3 个典型文件
- **配置文件优先**：构建文件、配置文件、Docker 文件等优先全量读取（通常不大）
- **目录结构优先**：先用 `ls` / `find` 了解整体布局，再有针对性地读取
- **规范对齐**：扫描结果与 `.opencode/rules/` 中的规范交叉验证，发现不一致时标注

### 2.3 扫描执行

按 `scan-strategy.md` 中定义的顺序执行扫描，将提取的信息按约束分类（S/P/D/E/T/U/C）组织。

扫描过程中向用户报告进度：
```
📂 扫描构建文件... (T 约束)
📂 扫描配置文件... (S 约束)
📂 扫描仓库拓扑... (服务/应用/公共模块清单)
📂 扫描目录结构... (C 约束)
📂 采样 Controller... (P 约束)
📂 采样 Entity/Model... (D 约束)
📂 扫描安全配置... (E 约束)
📂 扫描前端配置... (U 约束)
📂 扫描服务间通信... (领域检测)
📂 扫描公共模块... (G 约束)
```

---

## 阶段 3：分析与综合

**区分存量项目和新建项目**：

### 存量项目处理

#### 3.1 约束提炼

将扫描结果转化为约束声明：
- 每条约束必须是**可执行的硬性规则**，不是建议或最佳实践
- 约束格式：`- **ID**: 具体约束内容`
- ID 全局唯一，按分类前缀编号（S1, S2, P1, P2, ...）
- **必须将 .opencode/rules/ 中的规范融入对应约束分类**

**约束置信度标记**：

由于约束是从代码扫描逆向推断的，不同约束的可靠性不同。每条约束需标注置信度：

| 置信度 | 标记 | 判定条件 | 含义 |
|--------|------|----------|------|
| 高 | ✅ 确认 | 多个采样文件中模式一致，或配置文件中有明确声明，或 .opencode/rules/ 中有明确规范 | 可直接采信为约束 |
| 中 | 🟡 推断 | 仅在部分采样文件中出现，或从间接证据推断 | 建议用户确认 |
| 低 | ❓ 待确认 | 采样中出现不一致，或仅凭依赖推断但无实际使用代码 | 必须用户确认 |

- 来自 `.opencode/rules/` 的约束**自动标记为高置信度（✅）**
- 在 constitution.md 中，低置信度约束追加 `<!-- 待确认 -->` 标记
- 在 §3.4 分析结果确认中，将低置信度和中置信度约束**单独列出**提请用户重点审核
- 用户确认后移除置信度标记，约束生效

#### 3.2 架构模式识别

根据扫描结果判断：
- **单体应用**：单一构建单元、单一后端启动入口，无服务发现/网关/Feign/workspace/微前端信号
- **微服务**：多个后端服务模块，或有网关/注册中心/配置中心/Feign/MQ 等服务治理配置
- **微前端**：多个前端应用，且有主应用注册子应用配置或 qiankun / wujie / micro-app / single-spa / Module Federation 信号
- **Monorepo**：多个独立项目共享仓库，包含多个后端服务、前端应用或公共包

#### 3.3 领域检测

读取 `references/domain-detection.md` 获取领域检测信号。

对每个检测到的领域：
1. 评估该领域的约束复杂度
2. 约束 ≤ 20 行 → 追加到 `docs/constitution.md` 对应分类（使用领域前缀）
3. 约束 > 20 行 → 标记为需要创建独立领域文件（输出到 `docs/domains/`）

**领域前缀对照表**（完整列表见 `domain-detection.md`）：

| 领域 | 前缀 | 领域 | 前缀 |
|------|------|------|------|
| 认证授权 | A | 日志监控 | O |
| 消息通信 | M | 搜索引擎 | SE |
| 缓存策略 | CH | 工作流 | W |
| 文件存储 | ST | 国际化 | I |
| 定时任务 | SC | 微前端 | MF |

#### 3.4 分析结果确认

将分析结果汇总展示给用户：
- 识别到的约束数量（按分类），标注各置信度分布（如 `S: 5 条（✅3 🟡1 ❓1）`）
- 架构模式
- 检测到的领域及处理方式（追加 vs 独立文件）
- 项目名称（从构建文件或 README 提取）
- 与 .opencode/rules/ 的一致性报告
- 未列出组件清单：实际依赖中新发现的未列出组件、黑名单冲突和无法判定项

**需用户重点审核的约束**（中/低置信度）单独列出：
```
🟡 推断约束（建议确认）：
  - [P2] API 响应统一使用 Result<T> 包装 — 仅在 2/5 个采样 Controller 中发现

❓ 待确认约束：
  - [D3] ORM 框架使用 MyBatis-Plus — 发现 MyBatis 和 JPA 混用
```

请求用户确认后再进入填充阶段。

### 新建项目处理

新建项目在阶段 1.4 已收集所有信息，本阶段直接将收集的信息转化为约束声明：

#### 3.5 约束生成

根据阶段 1.4 收集的信息，生成以下约束（同时融入 .opencode/rules/ 的规范内容）：

**S 架构约束**：
- S1: 架构模式（单体/微服务）
- S2: 服务拆分规则（如有）

**P API 约束**：
- P1: API 风格
- P2: 统一响应格式
- P3: 字段命名规范
- P4: 分页参数规则

**D 数据约束**：
- D1: 数据库选型与未列出组件追踪
- D2: 数据库产品、兼容模式和 SQL 方言
- D3: 统一数据源、连接池和配置中心接入
- D4: 连接串、账号、密码、证书的密钥管理
- D5: 主键、表注释和字段注释
- D6: 表、字段、索引、约束、序列命名规则
- D7: DDL 脚本化与应用运行时 DDL/DCL 禁止规则
- D8: SQL 参数化和 MyBatis 动态拼接禁止规则

**E 安全约束**：
- E1: 认证方案
- E2: 数据安全规则

**T 技术栈约束**：
- T1: 语言版本
- T2: 框架版本
- T3: ORM/缓存等
- 对未列出组件只记录已确认或待确认的设计事实；不得把黑名单组件写入约束

**U UI/UX 约束**（如有前端）：
- U1: 前端框架
- U2: UI 组件库
- U3: 状态管理
- U4: HTTP 客户端
- U5: 响应式适配

**C 代码结构约束**：
- 根据项目类型（纯后端/纯前端/全栈）生成对应的 C1-C8 约束
- **优先采用 .opencode/rules/ 中定义的代码结构规范**

**G 全局基础设施约束**：
- G1: 公共模块定位（后端 common / 前端 shared）
- G2: 统一异常体系（异常层级 + 错误码分段策略）
- G3: 统一响应封装（ApiResponse<T>）
- G4: 统一 ID 生成器
- G5: Redis 封装（含降级策略）
- G6: 分布式锁封装
- G7: 请求上下文传播（traceId / userId / tenantId）
- G8: 前端公共层（Axios 封装、权限指令、通用 composables）
- **根据技术栈和架构模式选择适用的约束**
- **纯后端项目删除 G8；纯前端项目删除 G2-G7 中后端相关项**

#### 3.6 架构信息生成

根据阶段 1.4 收集的信息，填充 architecture.md：

- §1 项目定位：用户提供的描述 + 需求文件中的系统概述
- §2 技术栈：根据技术栈选择填充
- §3 系统架构：根据架构模式生成 ASCII 架构图、服务清单、通信方式等
- §4 数据架构：根据数据相关决策填充
- §5-§8：根据项目实际情况选择性填充
- §9 全局基础设施层：根据全局基础设施决策填充后端 Common 模块清单、前端 Shared 模块清单、降级策略矩阵、错误码分段规则

同时生成设计期计划组件清单，用于填充 `docs/unlisted-components.md`：
- 白名单组件不写入清单。
- 黑名单组件必须回到阶段 1.4 重新确认替代方案。
- 未列出组件写入清单，确认状态为“待确认”，发现来源记录为“顶层设计生成”。

#### 3.7 确认信息

展示生成的约束和架构信息供用户确认。

**新建项目无需置信度标记**（所有约束均为用户直接指定或规范指定）。

---

## 阶段 4：按序填充模板

### 4.1 加载填充指南

读取 `references/filling-guide.md` 获取逐模板的填充规则。

### 4.2 填充顺序

填充前先确保实例文件存在：

| 实例文件 | 缺失时操作 |
|----------|------------|
| `docs/constitution.md` | 从 `docs/templates/constitution-template.md` 复制生成 |
| `docs/architecture.md` | 从 `docs/templates/architecture-template.md` 复制生成 |
| `docs/unlisted-components.md` | 从 `docs/templates/unlisted-components-template.md` 复制生成 |
| `docs/INDEX.md` | 从 `docs/templates/index-template.md` 复制生成 |

如果实例文件已存在，说明这是已经使用流程的存量项目，必须基于现有文件继续填充/更新，不得用模板整文件覆盖。

严格按以下顺序填充，因为后续文件依赖前序文件的内容：

```
1. docs/constitution.md       ← 基础，其他文件引用其约束 ID
2. docs/architecture.md       ← 引用 constitution.md 中的技术栈
3. docs/unlisted-components.md ← 不在白名单/黑名单中的组件清单
4. docs/domains/*.md（如有）  ← 引用 constitution.md 中的约束 ID
5. docs/INDEX.md              ← 更新已有索引文件
```

### 4.3 填充操作

对每个文件执行三步操作：

**Step A — 替换占位符**

- **存量项目**：将所有 `{{占位符}}` 替换为从代码扫描中提取的实际内容
- **新建项目**：将所有 `{{占位符}}` 替换为阶段 1.4 收集的用户输入信息 + 需求文件提取的信息
- **规范约束**：确保填充内容符合 `.opencode/rules/` 中的规范要求

**Step B — 删除 AI 指引注释块**
删除所有 `<!-- AI 填充指引：... -->` 注释块。这些注释块以 `<!--` 开头，包含"AI 填充指引"字样，以 `-->` 结束。同时删除模板中其他指导性注释块。

**Step C — 更新 frontmatter**
- `status`: 更新为 `"🟡 设计中"`
- `last_updated`: 更新为当前日期（YYYY-MM-DD 格式）
- 其他字段按模板要求更新
- `docs/unlisted-components.md` 不参与业务架构内容填充；只删除 AI 指引注释块、
  更新 `last_updated`，追加本次新发现或待确认的未列出组件，并保留已有组件确认状态。

### 4.4 领域文件创建

对需要独立文件的领域：
1. **复制** `docs/templates/domain-template.md` 到 `docs/domains/` 目录下
2. 重命名为 `{编号}-{domain}.md`（如 `01-auth.md`）
3. 按 `filling-guide.md` 中的领域文件规则填充
4. 确保 `docs/domains/` 目录存在，不存在则创建

### 4.5 项目类型适配

- **纯后端项目**：删除 constitution.md 中的 `U` 分类，删除 architecture.md 技术选型表中的前端行，删除 constitution.md 中 C5-C8 及前端映射表，删除 constitution.md 中 G8，删除 architecture.md §9.2
- **纯前端项目**：删除 constitution.md 中的 `D` 分类，删除 architecture.md 技术选型表中的后端行，删除 constitution.md 中 C1-C4 及后端映射表，删除 constitution.md 中 G2-G7 中后端专属项，删除 architecture.md §9.1
- **全栈项目**：保留所有分类
- **Monorepo**：全局约束记录共享规则，子项目特有约束用 `[子项目名]` 前缀标注；C 分类按子项目分别列出

### 4.6 INDEX.md 更新

更新 `docs/INDEX.md` 中的相关内容：
- 替换 `{{项目名称}}` 为实际项目名
- 更新 `last_updated`
- 确保“组件治理”章节索引 `docs/unlisted-components.md`
- 删除 AI 指引注释块

---

## 阶段 5：质量验证

填充完成后，执行以下检查：

### 5.1 占位符检查
扫描所有已填充文件，确认不存在残留的 `{{...}}` 占位符。

### 5.2 注释块检查
确认所有指导性注释块已删除。搜索 `<!--` 标记，检查是否存在包含以下任一关键词的注释块：`AI 填充指引`、`创建前先判断`、`仅当决策涉及`、`本章节只记录`、`给关键设计阶段的指引`、`按需扩展分类`、`领域设计示例`、`本领域的强制约束规则`、`顶层设计 vs 关键设计`、`领域设计 vs 关键设计`。应无匹配。

### 5.3 约束 ID 唯一性
收集所有约束 ID（constitution.md + 领域文件），确认无重复。

### 5.4 架构图格式
确认 architecture.md 和领域文件中的架构图为 ASCII Art，不含 Mermaid 语法。

### 5.5 规范一致性检查
确认生成的约束和架构决策与 `.opencode/rules/` 中的规范不冲突。如有冲突，标记并提醒用户。

### 5.6 内容边界
确认 constitution、architecture 和 domains 文档不包含以下内容（这些属于关键设计层），按 `filling-guide.md` 内容边界检查清单中的搜索关键词逐项检查。`docs/unlisted-components.md` 只按组件清单结构检查，不参与架构内容边界扫描：
- 代码片段：搜索 ` ```java`、` ```python`、` ```go` 等代码块标记（ASCII Art 块除外）
- 数据库表 DDL：搜索 `CREATE TABLE`、`ALTER TABLE`
- API 接口定义：搜索 `@GetMapping`、`@PostMapping`、`GET /api`、`POST /api`
- 详细时序图：搜索 `sequenceDiagram`、`participant`
- 字段级定义：搜索 `| 字段名 | 类型 | 说明 |` 等数据库字段列表表格

### 5.7 结果报告

向用户输出验证报告：
```
✅ 顶层设计文档填充完成

已填充文件：
  - docs/constitution.md (S×n, P×n, D×n, E×n, T×n, U×n, C×n)
  - docs/architecture.md
  - docs/unlisted-components.md
  - docs/domains/01-xxx.md (如有领域文件)
  - docs/INDEX.md

验证结果：
  - 占位符残留：0
  - AI 指引注释残留：0
  - 约束 ID 冲突：0
  - 架构图格式：ASCII Art ✓
  - 规范一致性：✓
  - 未列出组件：新增 {n} / 待确认 {n} / 黑名单冲突 {n}
  - 内容边界：符合 ✓

📌 完成提示：
  - 文档状态为"设计中"，请人工审核后更新为"已确定"
  - 约束内容基于{代码扫描自动提取/需求文件+交互收集}，可能需要补充业务上下文

🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-architecture-review skill 审查顶层设计、澄清和修改顶层设计
    - 使用 asdd-frd-generate skill 选择模块专题生成 FRD

  🔄 当前阶段可选操作：
    - 使用 asdd-architecture-generate skill 补充领域设计

  ⏪ 回溯操作：
    - 使用 asdd-requirements-review skill 发现需求问题时修改系统需求
```
