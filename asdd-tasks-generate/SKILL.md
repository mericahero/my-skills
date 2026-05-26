---
name: asdd-tasks-generate
description: >
  将关键设计（spec.md）拆解为可执行的纵向切片开发任务，生成 tasks.md。
  流程：设计加载 → 代码检索（OpenCode 内置工具）→ 澄清确认 → 纵向切片任务拆分 → 质量校验。
  每个切片包含 TDD RED 测试 + 后端全链路 + 前端全链路 + GREEN 验证，并在 tasks.md 中预留 TDD 证据回填区，可独立验证。
  确保在以下场景触发本 skill：用户提到任务拆分、拆解任务、生成任务清单、task breakdown、
  帮我拆任务、把设计拆成任务、设计转任务、dev task、generate tasks、create tasks from design、
  这个需求怎么拆、帮我规划开发任务、设计拆分为开发任务、从 spec 生成 tasks、
  拆 task、task 拆解、开发计划、实现计划、帮我安排开发步骤。
  隐含场景也应触发：用户提到某个 spec 或需求并说"怎么开始开发"、"帮我拆成可执行的步骤"、
  "这个功能开发顺序是什么"、"帮我排一下开发计划"。
---

# asdd-tasks-generate

将关键设计拆解为可执行的纵向切片开发任务。每个切片是一个完整的前后端功能单元，包含 RED 测试、实现、GREEN 验证和 tasks.md 内的 TDD 证据回填区，可独立验证。

## 定位

本 skill 是 asdd-detailed-design-generate 和 asdd-detailed-design-review 的下游工具，在关键设计完成且通过审查后使用。

```
asdd-detailed-design-generate（生成关键设计）
    |
    v
asdd-detailed-design-review（审查/澄清设计）
    |
    v
asdd-tasks-generate（本 skill：设计 → 任务拆分）
    |
    v
docs/modules/{module}/specs/{REQ-ID}-{name}/tasks.md
    |
    v
开发实施
```

## 路径约定

| 资源 | 路径 |
|------|------|
| 需求级 spec | `docs/modules/{module}/specs/{REQ-ID}-{name}/spec.md` |
| 任务输出 | `docs/modules/{module}/specs/{REQ-ID}-{name}/tasks.md` |
| 任务模板 | `docs/templates/tasks-template.md` |
| 模块主规格 | `docs/modules/{module}/spec.md` |
| 模块概述 | `docs/modules/{module}/overview.md` |
| 模块 API 概览 | `docs/modules/{module}/module-api.md` |
| 模块数据概览 | `docs/modules/{module}/module-database.md` |
| 模块后端概览 | `docs/modules/{module}/module-backend.md` |
| 模块前端概览 | `docs/modules/{module}/module-frontend.md` |
| API 设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/api-design.md` |
| 数据库设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/backend-database-design.md` |
| 后端详细设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/backend-detailed-design.md` |
| 前端页面设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/frontend-page-design.md` |
| 前端详细设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/frontend-detailed-design.md` |
| 全局约束 | `docs/constitution.md` |
| 架构蓝图 | `docs/architecture.md` |
| 领域设计 | `docs/domains/*.md` |
| 规范约束 | `.opencode/rules/` |

---

## 阶段 1：输入解析与设计加载

### 1.1 解析用户输入

用户可提供以下任一输入：
- **需求编号**：如 `REQ-20260401-001`
- **spec 文件路径**：直接指向 spec.md
- **模块名 + 功能描述**：如"user-auth 模块的登录功能"
- **未指定编号，仅说继续拆任务**：从活跃需求中列出候选供用户选择

**解析规则**：
1. 如提供需求编号 → 在 `docs/modules/` 下搜索 `specs/` 目录匹配 REQ-ID 前缀的 spec.md
2. 如提供文件路径 → 直接读取
3. 如提供模块名 → 读取该模块的 `spec.md`（模块级），列出需求索引表供用户选择
4. 如未提供明确 `REQ-ID` / 路径，仅表达“拆任务”“继续任务规划”之类意图：
   - 扫描 `docs/modules/*/specs/REQ-*`
   - 优先选择存在 `spec.md` 且 `tasks.md` 缺失或仍有 `- [ ]` 的需求目录
   - 关联读取对应 FRD frontmatter 的 `status`、`last_updated`、`completed_date`
   - 过滤出活跃需求（排除 `completed_date` 非空或 `status = 🔵 已关闭` 的项），按 `last_updated` 倒序展示候选
   - 若候选只有 1 个，先向用户确认；若有多个，必须让用户选择

找不到对应 spec 时中止并提示先使用 asdd-detailed-design-generate skill。

### 1.2 加载设计文件

任务拆分以 `specs/{REQ-ID}-{name}/` 下的本次变更设计为准，模块根目录文件只作为定位和当前态概览。

读取需求级 spec.md 后，从中确定模块归属，然后加载：

**第一层 — 需求级过程设计**（核心输入）：
- `specs/{REQ-ID}-{name}/spec.md` — 本次变更目标、影响对象、设计决策、验收标准、模块概览同步清单
- `specs/{REQ-ID}-{name}/api-design.md` — 本次涉及的 API 契约、DTO、错误码、前端 API 调用
- `specs/{REQ-ID}-{name}/backend-database-design.md` — 本次涉及的 DDL、字段、索引、枚举、迁移、自定义查询
- `specs/{REQ-ID}-{name}/backend-detailed-design.md` — 本次后端 Service 流程、跨服务、缓存、异常、测试策略
- `specs/{REQ-ID}-{name}/frontend-page-design.md` — 本次页面、路由、布局、组件 Props/Emits（如适用）
- `specs/{REQ-ID}-{name}/frontend-detailed-design.md` — 本次 Store、Composable、权限、前端测试策略（如适用）

**第二层 — 模块级概览**（定位辅助）：
- `spec.md`（模块级）— 模块主规格，需求索引、模块间依赖声明
- `overview.md` — 模块导航、核心流程、主要代码位置
- `module-api.md` — API 当前态概览，用于确认引入需求、最近变更、相关变更、代码位置
- `module-database.md` — 表/字段当前态概览，用于确认引入需求、最近变更、相关变更、实体/迁移位置
- `module-backend.md` — 后端能力当前态概览（fullstack/backend-only）
- `module-frontend.md` — 前端页面/路由/Store 当前态概览（fullstack/frontend-only）

**约束加载**：
- `docs/constitution.md` + `docs/architecture.md` — 顶层设计约束（含 G 分类全局基础设施约束和 §9 全局基础设施层）
- `docs/architecture.md` §9 — 提取后端 Common 模块能力清单（§9.1）和前端 Shared 模块能力清单（§9.2），任务拆分时确保引用公共模块已有能力，禁止在业务模块中重复实现
- `docs/domains/` — 根据 spec 涉及的领域关键词匹配加载
- `.opencode/rules/` — 项目规范（命名规范、组件版本、代码结构等）

**两层协同关系**：
```
specs/{REQ}/spec.md             specs/{REQ}/详细设计文件
影响对象清单              ───▶    api-design.md / backend-database-design.md / frontend-*.md
业务流程和验收标准        ───▶    backend-detailed-design.md / frontend-detailed-design.md
模块概览同步清单          ───▶    module-api.md / module-database.md / module-backend.md / module-frontend.md
```
任务描述中的具体代码名（类名、方法名、DTO 名、表名、组件名）优先来自同目录详细设计文件，并用模块级概览和代码检索结果校验。

### 1.3 提取关键信息

从两层设计文件中提取任务拆分所需的关键信息：

**需求级 spec.md — 变更主控信息**：

| 来源 | 提取内容 | 用途 |
|------|---------|------|
| spec.md §2 本次变更范围 | 做什么 / 不做什么 | 控制任务范围 |
| spec.md §3 影响对象清单 | API、表、字段、后端能力、页面、交互 | 确定任务覆盖对象 |
| spec.md §4 业务流程 | 核心流程图、异常分支 | 确定切片划分和顺序 |
| spec.md §5 业务规则 | BR-* 业务规则 | 确定 Service/前端校验逻辑 |
| spec.md §7 详细设计文件索引 | 关联设计文件 | 定位详细设计 |
| spec.md §8 验收标准 | AC-* 验收标准 | 确定 E2E 验收提示 |
| spec.md §11 模块概览同步清单 | module-*.md 同步项 | 确定收尾任务 |

**需求级详细设计文件 — 具体代码名和技术细节**：

| 来源 | 提取内容 | 用途 |
|------|---------|------|
| api-design.md §1 | 接口清单（方法、路径、认证） | 确定 Controller 方法签名 |
| api-design.md §2 | 共享类型（DTO 字段、枚举对照、TS 类型） | 确定 DTO 类名和前端类型文件 |
| api-design.md §3 | 接口详细契约（请求体、响应体、业务规则、前端调用代码） | 确定实际的类名、方法名、API 函数 |
| api-design.md §4 | 错误码清单 | 确定异常处理实现 |
| backend-database-design.md §2 | ER 图 | 确定实体关系 |
| backend-database-design.md §3 | 枚举定义 | 确定共享枚举任务 |
| backend-database-design.md §4 | DDL 完整建表语句、索引 | 确定数据库迁移任务 |
| backend-database-design.md §5 | 自定义查询 | 确定 Mapper 自定义方法 |
| backend-detailed-design.md §2 | Service 方法、处理流程、关键规则、异常分支 | 确定模块内调用链路 |
| backend-detailed-design.md 跨服务/缓存/幂等章节 | 跨服务交互、缓存策略、幂等策略 | 确定特殊实现任务 |
| backend-detailed-design.md 异常处理章节 | 错误码、异常类型、前端提示、日志要求 | 确定异常处理实现模式 |
| backend-detailed-design.md 测试场景章节 | 测试对象、测试方法、Mock、关键断言 | 确定测试基础设施 |
| module-*.md 代码位置 | 后端/前端代码入口和当前态 | 校验文件路径和变更链 |
| frontend-page-design.md §1 | 路由清单 | 确定路由配置任务 |
| frontend-page-design.md §2 | 页面结构线框图、表格列、表单字段 | 确定页面组件任务 |
| frontend-page-design.md §3 | E2E 可测试性标识契约 | 确定关键交互 `data-testid` 实现任务 |
| frontend-page-design.md §4 | 通用组件 Props/Emits | 确定组件任务 |
| frontend-detailed-design.md §2 | Store 结构、Actions 约定 | 确定 Store 实现任务 |
| frontend-detailed-design.md 交互/权限/可测试性/测试章节 | 交互流程、权限校验、testid 落点、测试对象、Mock | 确定特殊前端任务和测试基础设施 |

**约束来源**：

| 来源 | 提取内容 | 用途 |
|------|---------|------|
| architecture.md | 代码结构约定、包路径、服务端口 | 确定文件位置和配置 |
| constitution.md | 全局约束 | 确保任务符合约束 |
| domains/*.md | 领域级约束和实现指引 | 跨模块实现参考 |
| .opencode/rules/ | 命名规范、测试规范、版本要求 | 确定命名和测试要求 |

---

## 阶段 2：代码检索

### 2.1 判断是否需要代码检索

检查项目源码目录是否存在且包含业务代码：
- 如无源码 → 标记为绿地项目，跳过检索
- 如有源码 → 继续

### 2.2 执行代码检索

使用 OpenCode 内置的文件检索与读取能力进行检索。检索时必须基于完整上下文：

```
检索以下内容：

## 检索背景
基于 {模块名} 模块的 {需求名称} 需求（{REQ-ID}），即将进行任务拆分。
需要了解现有代码结构和基础设施。

## 需求涉及的实现
- Service 方法：{列出 backend-detailed-design.md 中本需求的所有 Service 方法}
- API 接口：{列出 api-design.md 中本需求的接口路径}
- 数据表：{列出 backend-database-design.md 中本需求的表名}
- 前端组件：{列出 frontend-page-design.md / frontend-detailed-design.md 中本需求的组件和 Store}

## 检索目标
1. 查找项目的代码结构（包路径、分层方式、配置文件位置）
2. 查找与 {模块名} 相关的现有 Controller/Service/Repository/Entity
3. 查找现有的公共基础类（BaseEntity、BaseService、统一响应类、全局异常处理）
4. 查找现有的枚举定义模式、DTO 命名约定
5. 查找数据库迁移工具和脚本位置（Flyway/Liquibase）
6. 查找前端的 API 封装模式、Store 模板、路由配置方式
7. 查找已有的测试基础设施（测试框架、测试目录、测试基类、Mock 配置、测试工具依赖、局部测试命令、覆盖率命令）
8. 查找已有测试文件，提取命名、断言、Mock、setup/teardown 风格
9. 查找 Spring Boot 和 Vue3 的具体版本和关键依赖版本
```

### 2.3 检索要求

必须完成必要的代码检索后才能进入阶段 3。至少覆盖：
- Glob 查找项目结构（`src/**/*.java`, `src/**/*.vue`, `src/**/*.ts`）
- Grep 搜索关键类名、方法名、API 路径、表名、包路径
- Read 读取关键配置文件（pom.xml、build.gradle、package.json、application.yml 等）
- Read 读取与本需求直接相关的 Controller、Service、Repository/Mapper、Entity、DTO、前端 API、Store、组件和测试文件

```
已使用 OpenCode 内置工具完成代码检索。
如有不确定的代码位置或复用决策，任务拆分中标注为待确认，并在澄清阶段向用户确认。
```

### 2.4 形成测试环境画像

代码检索完成后，必须形成一份测试环境画像，用于填充 `tasks.md` 的“测试环境画像”章节。画像至少包含：

| 项 | 说明 |
|----|------|
| 后端测试框架 | 如 JUnit5、SpringBootTest、pytest、go test；未发现则写 `none` |
| 前端测试框架 | 如 Vitest、Jest；未发现则写 `none` |
| E2E 测试框架 | 如 Playwright、Cypress；未发现则写 `none` |
| 测试目录 | 后端、前端、E2E 测试文件的实际目录 |
| 局部测试命令 | 可运行单个 Test 类或单个 test 文件的命令 |
| 覆盖率命令 | 项目已有覆盖率命令；未发现则写 `none` |
| 示例测试文件 | 2-3 个最接近当前需求的测试文件路径，用于执行阶段匹配风格 |

如果项目没有任何测试框架，不要在任务中虚构命令。应在测试环境画像中明确写：

```text
未发现测试框架；执行 RED 前需先初始化最小测试能力，或由用户确认可接受的验证替代方案。
```

---

## 阶段 3：澄清确认

代码检索完成后，识别需要用户确认的事项。

### 3.1 识别澄清项

| 场景 | 说明 |
|------|------|
| 同名冲突 | 设计要求新建的类/文件在项目中已存在 |
| 复用决策 | 现有代码中有可复用的组件/方法，需确认是复用还是新建 |
| 基础设施选择 | 如数据库迁移工具选择（Flyway vs Liquibase）、测试框架选择 |
| 命名约定 | 现有代码的命名约定与设计文件不一致 |
| 版本依赖 | 设计中依赖的组件版本与项目实际版本不同 |

### 3.2 向用户确认

如有澄清项，调用 OpenCode `question` tool 确认。如无澄清项，直接进入阶段 4。

---

## 阶段 4：任务拆分与生成

### 4.1 复制模板

从 `docs/templates/tasks-template.md` 复制到 `docs/modules/{module}/specs/{REQ-ID}-{name}/tasks.md`。

### 4.2 纵向切片规划

这是任务拆分的核心步骤。根据 spec.md 中的功能设计，将实现工作拆分为纵向切片。

#### 为什么必须纵向拆分

横向拆分（按技术层切）有致命缺陷：完成一个层级后无法验证功能是否正确，错误积累到最后才暴露。纵向拆分的每个切片是一个**端到端可验证的功能单元**，完成后立即可以验证，后一个切片在前一个通过验证的基础上开发。

**禁止横向拆分**：
```
✓ 正确（纵向）：             ✗ 错误（横向）：
切片1: 用户登录               任务1: 所有 Entity
  - LoginController           任务2: 所有 Mapper
  - AuthService.login()       任务3: 所有 Service
  - UserMapper                任务4: 所有 Controller
  - loginAPI + authStore      任务5: 所有前端
  - AuthServiceTest RED       任务6: 所有测试
  - authStore.test.ts
  ✓ 完成后可独立验证          ✗ 完成任务1-5后仍无法验证
```

#### 切片划分策略

1. 以 backend-detailed-design.md 中的每个 Service 方法（或一组紧密关联的方法）为单位划分切片
2. 每个切片包含该功能从数据库到前端的完整链路
3. 如果多个 API 共享同一个 Entity 和 Mapper，它们的 Entity/Mapper 放在 §0 基础设施中
4. 切片之间尽量减少依赖，被依赖的切片排在前面

#### 每个切片的验证标准

每个切片完成后，必须可通过开发侧自动化测试独立验证。最终用户可见验收不生成 `- [ ]` 任务，统一在任务清单中提示使用 E2E 流程进行验收。

| 验证方式 | 验证内容 |
|---------|---------|
| 后端 RED/GREEN 单元测试全部通过 | Service 方法的正常流程、异常场景、边界条件，且执行阶段能回填 RED 失败原因 |
| 前端 RED/GREEN 单元测试全部通过 | Store Action + Composable 逻辑正确，且执行阶段能回填 RED 失败原因 |

### 4.3 按模板结构填充

严格按 tasks-template.md 的结构填充 tasks.md。

#### 填充 frontmatter

```yaml
---
module: "{实际模块名}"
triggered_by: "{REQ-ID}"
created: "{当前日期 YYYY-MM-DD}"
status: "🟡 进行中"
---
```

生成或更新 `tasks.md` 后，同步对应 FRD 和需求级 `spec.md`：

- `status` 更新为 `🟡 进行中`
- `last_updated` 更新为当前日期
- 不写入 `completed_date`

#### 填充标题和上下文

```markdown
# 实现任务：{spec.md 的 H1 标题}

## 上下文

| 维度 | 来源 |
|------|------|
| 需求规格 | specs/{REQ-ID}-{name}/spec.md |
| API 设计 | ./api-design.md §{实际章节号} |
| 数据库设计 | ./backend-database-design.md §{实际章节号} |
| 后端详细设计 | ./backend-detailed-design.md §{实际章节号} |
| 前端页面设计 | ./frontend-page-design.md §{实际章节号}（如有） |
| 前端详细设计 | ./frontend-detailed-design.md §{实际章节号}（如有） |
| 模块概览同步 | ../../module-*.md |
```

#### 填充 §0 基础设施

放置被多个切片共同依赖的工作：

- 数据库迁移（CREATE TABLE / ALTER TABLE）— 来自 backend-database-design.md §4 的 DDL
- 共享枚举类 — 来自 backend-database-design.md §3 的枚举定义
- 配置变更 — 来自 architecture.md 或 backend-detailed-design.md 的配置要求
- 共享 Entity / Mapper（如果被多个切片复用）
- **公共模块依赖声明** — 列出本需求依赖的 architecture.md §9 中的公共能力（如 `common.exception.BusinessException`、`common.response.ApiResponse<T>`、`common.redis.RedisClient` 等），确保开发时直接引用而非重复实现

如果没有基础设施依赖，删除 §0。

#### 填充测试环境画像

复制模板后，先填充 `## 测试环境画像`：

- 测试框架、测试目录、局部测试命令和覆盖率命令必须来自阶段 2 的代码检索结果
- 如果已有测试文件，列出最接近当前需求的示例测试文件，便于执行阶段复用断言和 Mock 风格
- 如果未发现某类测试框架，写 `none`，不要写猜测命令
- 如果行为切片需要 RED 测试但未发现任何测试框架，任务中必须增加阻塞说明：执行前先初始化测试能力或由用户确认替代验证方式
- 后续 TDD 证据表中的 RED/GREEN 命令必须与本画像一致

#### 填充纵向切片

每个切片按以下结构填充：

```markdown
## {N}. {功能名称}（如：用户登录）

> {一句话说明这个切片做什么，来自 spec.md 的业务描述}

### 后端

- [ ] {N}.1 后端 RED 测试：{实际Test类名}.java — 先写失败测试，覆盖 {来自 backend-detailed-design.md 的测试场景}
- [ ] {N}.2 Entity + Mapper：{实际类名}.java, {实际Mapper名}.java
- [ ] {N}.3 Service：{实际ServiceImpl名}.java 实现 {方法名}() — {来自 backend-detailed-design.md 的处理逻辑概述}
- [ ] {N}.4 Controller + DTO：{实际Controller名}.java, {实际DTO名}.java
- [ ] {N}.5 后端 GREEN 验证：运行 {实际Test类名}.java 并确认通过

### 前端（如无前端则删除）

- [ ] {N}.6 前端 RED 测试：{module}.test.ts — 先写失败测试，覆盖 Store/Composable/API 调用逻辑
- [ ] {N}.7 TypeScript 类型 + API 函数：src/types/{module}.ts, src/api/{module}.ts
- [ ] {N}.8 Pinia Store：src/stores/{module}.ts — {来自 frontend-detailed-design.md 的 Store Action}
- [ ] {N}.9 页面组件：src/views/{module}/{Component}.vue — {来自 frontend-page-design 的页面结构，并按 E2E 可测试性标识契约补充关键交互 data-testid}
- [ ] {N}.10 前端 GREEN 验证：运行 {module}.test.ts 并确认通过

### TDD 证据（执行阶段回填摘要，不粘贴完整日志）

| 范围 | RED 测试 | RED 命令 | RED 失败原因 | GREEN 命令 | 影响范围验证 |
|------|----------|----------|---------------|------------|--------------|
| 后端 | {实际Test类名}.{测试方法名} | {局部测试命令} | {执行阶段回填} | {局部测试命令} | {受影响范围测试命令} |
| 前端 | {测试文件/测试方法名} | {局部测试命令} | {执行阶段回填} | {局部测试命令} | {受影响范围测试命令} |
```

**任务描述要求**：
- 使用实际的类名、方法名、表名、文件路径（从设计文件和代码检索结果中获取）
- 不用设计文档的抽象描述（"实现用户管理Service"），要用具体的代码名（"UserServiceImpl.java 实现 login() 方法"）
- 引用设计文件的具体章节（"按 backend-detailed-design.md §N 的处理流程"）
- 前端页面组件任务必须引用 `frontend-page-design.md` 的 E2E 可测试性标识契约；如果设计声明了 `data-testid`，任务必须要求实现到真实交互元素或组件库触发器上

### 4.3.1 TDD 测试任务与证据要求

测试不是附属品，是每个切片的**入口门禁**。任务必须表达 RED → GREEN → REFACTOR 顺序，不允许生成“先实现、最后补测试”的任务结构。

TDD 证据不生成独立 spec 或独立 `tdd-evidence.md`。默认只在 `tasks.md` 的每个切片中预留证据表，执行阶段回填摘要：
- RED 测试：测试文件和测试方法
- RED 命令：局部测试命令
- RED 失败原因：必须是目标行为缺失或断言失败的预期原因，不是语法错误、依赖错误或测试环境错误
- GREEN 命令：同一局部测试通过命令
- 影响范围验证：受影响模块测试或全量测试命令

不要要求粘贴完整测试日志，避免复杂需求的 `tasks.md` 膨胀。

#### 后端 RED 测试要求

每个切片的后端 RED 测试任务必须明确列出：

1. **测试场景来源**：从 backend-detailed-design.md 的测试场景表中获取，包括：
   - 正常流程测试（至少 1 个）
   - 异常场景测试（至少 1 个，如：参数校验失败、资源不存在、状态冲突）
   - 边界条件测试（如有，如：空列表、最大长度、并发）

2. **测试方法命名**：使用 `shouldXxxWhenYyy()` 格式（来自 backend-detailed-design.md 测试场景表的"测试方法"列）

3. **测试工具和 Mock 策略**：按 backend-detailed-design.md 测试场景章节的 Mock 列和关键断言：
   - Service 测试：`@MockBean` Mock Repository 层
   - Controller 测试：`@MockBean` Mock Service 层
   - Repository 测试（自定义查询）：H2 或 Testcontainers

4. **任务描述格式示例**：
```
- [ ] 1.1 后端 RED 测试：AuthServiceImplTest.java
  - shouldReturnTokenWhenCredentialsValid()          — 正常登录返回 Token
  - shouldThrowExceptionWhenPasswordIncorrect()      — 密码错误抛 BusinessException
  - shouldLockAccountWhenFailedAttemptsExceedLimit()  — 连续失败超限锁定账户
  - shouldRejectLoginWhenAccountLocked()              — 锁定状态拒绝登录
  按 backend-detailed-design.md 测试场景表，Mock UserMapper + TokenService
- [ ] 1.5 后端 GREEN 验证：mvn test -Dtest=AuthServiceImplTest
```

#### 前端 RED 测试要求

每个切片的前端 RED 测试任务必须明确列出：

1. **测试范围**：按 frontend-detailed-design.md 测试场景章节：
   - Store Actions 逻辑（必须测试）
   - Composable 纯逻辑（必须测试）
   - 工具函数（必须测试）
   - 页面组件视图层（不要求测试）

2. **测试场景来源**：从 frontend-detailed-design.md 的前端测试场景表获取

3. **Mock 策略**：按 frontend-detailed-design.md 测试场景章节的 Mock 列
   - API 请求：`vi.mock('@/api/xxx')`
   - Router：`vi.mock('vue-router')`
   - ElMessage：`vi.mock('element-plus')`

4. **任务描述格式示例**：
```
- [ ] 1.6 前端 RED 测试：useAuthStore.test.ts
  - shouldUpdateTokenWhenLoginSuccess()     — 登录成功后 Store 更新 Token
  - shouldClearTokenWhenLogout()            — 登出后清除 Token 和用户信息
  - shouldShowErrorWhenLoginFailed()        — 登录失败显示错误提示
  按 frontend-detailed-design.md 前端测试场景表，Mock loginAPI + router
- [ ] 1.10 前端 GREEN 验证：npm run test -- useAuthStore.test.ts
```

#### TDD 例外任务

纯数据库迁移、纯配置、纯静态文档、脚手架生成代码可以不强制 RED 测试，但必须在任务描述中说明验证方式，并在 TDD 证据表中标注：

```
| 后端 | 非 TDD：数据库迁移 | 不适用 | 纯 DDL 变更 | 迁移校验命令 | 受影响 Repository/Service 测试 |
```

#### 填充开发验证与 E2E 验收提示

收尾部分只包含开发侧验证和文档同步任务；最终验收只写 E2E 流程提示，不生成待完成任务：

```markdown
## N. 开发验证与收尾

- [ ] N.1 运行全量后端单元测试，确认覆盖率 >= 90%
- [ ] N.2 运行全量前端单元测试，确认覆盖率 >= 90%（JS/TS 逻辑代码）
- [ ] N.3 同步模块级 module-*.md 当前态概览（引入需求、最近变更、相关变更、代码位置）
- [ ] N.4 执行文档更新检查清单（更新变更记录、检查 constitution/domain 同步）

## E2E 验收提示

本需求的最终验收请使用 E2E 流程进行验收。
```

### 4.4 通用填充规则

- 替换所有 `{{占位符}}` 为实际内容
- 删除所有 `<!-- AI 填充指引 -->` 注释块
- 删除不适用的章节（如纯后端模块删除前端部分）
- 更新变更记录：`| {当前日期} | 初始版本，基于 {REQ-ID} |`

---

## 阶段 5：质量校验与输出

### 5.1 质量检查

| 检查项 | 检查内容 | 修复方式 |
|--------|---------|---------|
| 占位符残留 | 搜索 `{{` 和 `}}` | 替换为实际内容 |
| **纵向切片完整性** | 每个切片是否包含完整链路（RED 测试+后端实现+前端实现+GREEN 验证），而非按层横切 | 重新组织为纵向切片 |
| **TDD 顺序正确** | 每个行为切片是否先列 RED 测试，再列实现任务，最后列 GREEN 验证 | 调整为 RED → 实现 → GREEN |
| **TDD 证据区存在** | 每个行为切片是否包含 TDD 证据表，字段为 RED 测试、RED 命令、RED 失败原因、GREEN 命令、影响范围验证 | 补充证据表 |
| **后端 RED 测试任务存在** | 每个切片是否有后端 RED 测试任务，且列出了具体测试方法名 | 补充 RED 测试任务和方法名 |
| **前端 RED 测试任务存在** | 每个含前端的切片是否有前端 RED 测试任务 | 补充前端 RED 测试任务 |
| **测试场景充分性** | 后端测试是否覆盖正常+异常+边界（至少 3 个场景），前端测试是否覆盖 Store + Composable | 从 backend-detailed-design.md / frontend-detailed-design.md 补充 |
| **切片可验证性** | 每个切片完成后是否可独立验证（有 API 可调用 或 有页面可操作） | 调整切片划分 |
| 代码名验证 | 任务描述是否使用实际类名/方法名（非"实现xxx功能"这类抽象描述） | 替换为实际代码名 |
| 开发验证与 E2E 验收提示存在 | 最后是否有开发验证与收尾 section，以及非 checkbox 的 E2E 验收提示 | 补充 |
| 上下文链接 | 上下文表格是否链接到实际设计章节 | 修正链接 |

### 5.2 输出报告

```
任务拆分完成

需求编号：{REQ-ID}
需求标题：{标题}
目标模块：{module}

已生成文件：
  docs/modules/{module}/specs/{REQ-ID}-{name}/tasks.md

任务概览：
  基础设施：{N} 项（§0）
  纵向切片：{M} 个
    - 切片 1：{名称}（RED 测试 {r} 项 + 后端 {a} 项 + 前端 {b} 项 + GREEN 验证 {g} 项）
    - 切片 2：{名称}（RED 测试 {r} 项 + 后端 {a} 项 + 前端 {b} 项 + GREEN 验证 {g} 项）
    - ...
  开发验证与收尾：{K} 项
  E2E 验收提示：已标注
  总任务数（不含 E2E 验收提示）：{total} 项

质量校验：
  - 占位符残留：0
  - 纵向切片完整：通过
  - TDD 结构：每个行为切片均含 RED 测试、GREEN 验证和证据回填区
  - 代码名使用：通过

执行提示：
  按 §0 → §1 → §2 → ... → §N 顺序开发
  每完成一个切片可独立验证

🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-tasks-review skill 审查任务拆分的一致性
    - 使用 asdd-tasks-implement skill 按切片顺序执行开发

  🔄 当前阶段可选操作：
    - 使用 asdd-tasks-generate skill 拆分其他需求的任务

  ⏪ 回溯操作：
    - 使用 asdd-detailed-design-review skill 发现设计问题时修改设计
    - 使用 asdd-frd-review skill 发现 FRD 问题时修改需求
```

---

## 重要约束

1. **代码检索使用 OpenCode 内置工具**，基于完整的检索上下文（spec 功能描述、Service 方法、API 路径、数据表等）完成检索后才拆分
2. **检索结果必须可追溯**：任务中出现的代码位置、类名、方法名、公共能力和测试基础设施应来自设计文件或代码检索结果
3. **纵向切片原则**：每个切片 = 后端全链路 + 前端全链路 + 单元测试，可独立验证。禁止横向拆分
4. **TDD 结构不可省略**：后端/前端行为变更必须先 RED 测试，再最小实现，最后 GREEN 验证；证据摘要写入 tasks.md
5. **从 tasks-template.md 复制**，严格按模板结构填充
6. **任务描述使用实际代码名**（类名、方法名、表名），不用设计文档的抽象描述
7. **参考 .opencode/rules/**：命名规范、组件版本、代码结构
8. **参考 constitution.md + architecture.md**：顶层设计约束
9. **跨模块参考 docs/domains/**：领域设计
10. **有澄清项时调用 OpenCode `question` tool** 向用户确认
11. **tasks.md 永久保留**：生成后作为执行记录留在 `specs/{REQ}/`，后续只更新状态和变更记录
