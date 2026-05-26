---
name: asdd-tasks-implement
description: >
  根据 tasks.md 中的纵向切片任务执行代码开发。支持全量执行所有任务，
  也支持执行指定的某个或某几个任务。每个行为切片按 TDD RED → GREEN → REFACTOR 执行：
  先写失败测试并确认失败原因正确，再写最小实现，最后验证通过并在 tasks.md 中回填 TDD 证据摘要。
  强制执行包管理规则：白名单优先、黑名单禁止、未列出的包必须确认。
  所有 AI 生成的代码标注 spec-coding 注释以便追溯。
  确保在以下场景触发本 skill：用户提到开始开发、执行任务、开始编码、实现任务、
  apply tasks、start coding、开始实现、帮我写代码、按任务开发、
  执行 tasks.md、把任务实现了、做任务、继续开发、继续实现、
  开发切片 1、执行 §1 和 §2、把这个需求做了、动手写代码、
  implement tasks、run dev tasks、code the tasks、
  即使用户只说了"开始吧"或"动手"，只要上下文中存在待完成的开发任务，也应触发。
---

# asdd-tasks-implement

根据 tasks.md 中的纵向切片任务执行代码开发。

## 定位

本 skill 是 asdd-tasks-generate 和 asdd-tasks-review 的下游工具，在任务拆分完成且通过审查后使用。

```
asdd-tasks-generate（生成任务拆分）
    |
    v
asdd-tasks-review（审查/澄清任务）
    |
    v
asdd-tasks-implement（本 skill：按任务执行代码开发）  <-- 可多次调用，支持断点续做
    |
    v
RED 测试 + 代码实现 + GREEN 验证 + tasks.md TDD 证据回填
```

## 路径约定

| 资源 | 路径 |
|------|------|
| 任务文件 | `docs/modules/{module}/specs/{REQ-ID}-{name}/tasks.md` |
| 需求级 spec | `docs/modules/{module}/specs/{REQ-ID}-{name}/spec.md` |
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
| FRD | `docs/functional-requirements/{module}/REQ-*.md` |
| 全局约束 | `docs/constitution.md` |
| 架构蓝图 | `docs/architecture.md` |
| 领域设计 | `docs/domains/*.md` |
| 组件策略（白名单/黑名单） | `.opencode/rules/component-policy.md` |
| 开发规范 | `.opencode/rules/`（按本 skill 的规则加载策略读取） |

---

## 阶段 0：包管理规则加载（最高优先级）

包管理是硬性约束，在任何代码编写之前强制加载，贯穿整个开发过程。

### 0.1 加载组件策略

读取 `.opencode/rules/component-policy.md`，解析其中的白名单、黑名单和未列出组件决策流程。
开发中需要引入依赖时，优先从白名单中选择，并禁止引入黑名单组件。

如果文件不存在，向用户提示但不阻断：

```
未找到 .opencode/rules/component-policy.md（组件策略）。
将不做组件白名单/黑名单约束，但不得绕过项目已有依赖和架构约束。
```

### 0.2 包引入决策流程

开发过程中每次需要引入新依赖时，执行以下检查：

```
需要引入包 X
    |
    v
包 X 在黑名单中？ ──是──▶ 🚫 立即中止，报告违规，不得引入
    |
    否
    v
包 X 在白名单中？ ──是──▶ ✅ 直接使用
    |
    否
    v
白名单中有替代包？ ──是──▶ ✅ 使用白名单中的替代包
    |
    否
    v
⚠️ 暂停，调用 OpenCode `question` tool 与用户确认：
  "需要引入 {包名}（{用途}），该包不在白名单中。
   A) 允许使用并加入白名单
   B) 使用其他替代方案：{列出候选}
   C) 不引入，调整实现方案"
```

黑名单违规时的报告格式：

```
🚫 包管理违规 — 黑名单命中

尝试引入的包：{包名} {版本}
黑名单匹配项：{黑名单中对应条目}
用途：{为什么需要这个包}

请选择替代方案：
  A) 使用 {白名单中的替代包}
  B) 调整实现方案避免此依赖
  C) 自定义处理
```

---

## 阶段 1：上下文加载与任务解析

### 1.1 加载开发规范

按任务内容加载 `.opencode/rules/` 下的规范。后续所有代码编写都遵循已加载的规范。

**核心规则直接加载**：

- `.opencode/rules/component-policy.md`
- `.opencode/rules/engineering-dev-standards.md`

**专项规则按需加载**：

| 规则文件 | 加载条件 |
|----------|----------|
| `database-*.md` | 任务涉及 SQL、DDL、MyBatis、datasource、Entity/PO/Mapper、数据库连接或特定数据库方言 |
| `pdfc-architecture-api.md` | 任务涉及分层结构、Controller、DTO/VO、`CrudApi`、`ApiResponse`、REST/WebService API |
| `pdfc-dao-transaction.md` | 任务涉及 DAO、Mapper XML、事务、并发更新、防重复提交、分布式事务 |
| `pdfc-cross-cutting.md` | 任务涉及日志、参数校验、异步、审计、权限码、异常处理 |
| `pdfc-desensitization-encryption.md` | 任务涉及敏感数据、脱敏、加密、密钥、密码传输、敏感日志 |
| `pdfc-integration.md` | 任务涉及 BES/TongWeb、Consul、Apollo、Redis、OpenFeign、JWT、文件上传、邮件等集成 |

如果目录不存在或为空（`component-policy.md` 除外无其他文件），提示但不阻断：

```
.opencode/rules/ 下未找到额外的开发规范文件。
将仅执行包管理规则，其他规范参考设计文件中的约定。
```

### 1.2 定位任务文件

根据用户输入定位 tasks.md：

| 用户输入 | 定位方式 |
|---------|---------|
| 需求编号（如 `REQ-20260401-001`） | 在 `docs/modules/` 下搜索 `specs/` 目录匹配 REQ-ID 前缀的 tasks.md |
| 文件路径 | 直接读取 |
| 模块名 | 读取该模块 `spec.md`（模块级），列出需求索引供选择 |
| 未指定 | 扫描活跃需求，列出包含待完成任务或已完成但未关闭的 tasks.md 供选择 |

找不到 tasks.md 时中止：

```
未找到任务拆分文件（tasks.md）。
请先使用 asdd-tasks-generate skill 生成任务拆分，再使用 asdd-tasks-review skill 审查。
```

### 1.3 加载设计上下文

定位到 tasks.md 后，按以下顺序加载关联文件（两层设计 + 约束）：

**第一层 — 需求级过程设计**（核心参照）：
- `specs/{REQ-ID}-{name}/spec.md` — 变更目标、范围、影响对象、验收标准、概览同步清单
- `specs/{REQ-ID}-{name}/api-design.md` — API 契约、DTO、错误码、前端 TS 类型
- `specs/{REQ-ID}-{name}/backend-database-design.md` — DDL、索引、枚举、迁移、自定义查询
- `specs/{REQ-ID}-{name}/backend-detailed-design.md` — Service 流程、缓存、异常、后端测试策略
- `specs/{REQ-ID}-{name}/frontend-page-design.md` — 路由、页面结构、组件 Props（fullstack/frontend-only 模块）
- `specs/{REQ-ID}-{name}/frontend-detailed-design.md` — Store、Composable、权限、前端测试策略（同上）

**第二层 — 模块级概览文件**（定位辅助）：
- `spec.md`（模块级）— 需求索引、依赖声明
- `overview.md` — 模块导航、主要代码位置
- `module-api.md` — API 当前态和变更链
- `module-database.md` — 表/字段当前态和变更链
- `module-backend.md` — 后端能力当前态和代码位置
- `module-frontend.md` — 前端页面/路由/Store 当前态和代码位置

**约束来源**：
- `docs/constitution.md` + `docs/architecture.md` — 顶层约束（含 G 分类全局基础设施约束）
- `docs/architecture.md` §9 — 后端 Common 模块能力清单（§9.1）和前端 Shared 模块能力清单（§9.2）；开发时凡涉及异常处理、响应封装、ID 生成、Redis 操作、分布式锁、请求上下文等 G 约束覆盖的能力，必须使用 §9 中定义的公共类，禁止在业务模块中重复实现
- `docs/domains/*.md` — 根据 spec 涉及的领域按需加载
- `docs/functional-requirements/{module}/` — 对应 FRD

代码编写时，具体的类名、方法名、DTO 名、表名、组件名来自同目录详细设计文件，
并用模块级概览和代码检索结果校验。代码完成后必须同步 module-*.md 当前态概览。

### 1.4 解析任务进度

从 tasks.md 中解析所有任务状态：

- `- [x]` → 已完成
- `- [ ]` → 待完成

显示进度概览：

```
开发任务：{需求名称}（{REQ-ID}）
模块：{module}

进度：{N}/{M} 任务已完成

待完成任务：
  §0 基础设施
    - [ ] 0.1 数据库迁移 ...
    - [ ] 0.2 共享枚举 ...
  §1 {切片1名称}
    - [ ] 1.1 Entity + Mapper ...
    - [ ] 1.2 Service ...
    ...
```

如果所有任务已完成且需求尚未关闭 → 不重复实现，检查验证证据是否完整，并提示可手动进入 review / close 流程。

### 1.5 确定执行范围

根据用户意图确定要执行的任务：

| 用户说 | 执行范围 |
|--------|---------|
| "全部执行" / "开始开发" | 所有待完成任务，按顺序 |
| "执行 §1" / "做切片 1" | 仅 §1 下的所有待完成任务 |
| "执行 §1 和 §3" | §1 和 §3 下的待完成任务 |
| "执行 1.2" / "做 Service 那个任务" | 仅指定的单个任务 |
| "从 §2 开始" | §2 及之后的所有待完成任务 |
| 未指定 | 调用 OpenCode `question` tool 确认 |

如果选择的任务存在依赖关系（如 §2 依赖 §0），提醒用户：

```
⚠️ 依赖提醒

你选择执行 §2，但 §0 基础设施尚未完成。
§2 的实现依赖 §0 创建的数据库表和共享枚举。

  A) 先执行 §0 再执行 §2（推荐）
  B) 仅执行 §2，假设 §0 已就绪
  C) 重新选择执行范围
```

---

## 阶段 2：逐任务执行开发

按纵向切片顺序执行：§0 基础设施 → §1 切片1 → §2 切片2 → ... → §N 开发验证与收尾。
每个行为切片内按：RED 测试 → 确认失败 → 最小实现 → GREEN 验证 → REFACTOR → 回填 TDD 证据 的顺序。

### 2.1 任务执行流程

对每个待执行的任务：

**a. 宣布当前任务**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
正在执行任务 {X}/{M}：{任务编号} {任务描述}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**b. 对照设计文件理解任务**

每个任务不是凭描述盲写代码 — 要回到设计文件中理解完整上下文：

| 任务类型 | 参照设计文件 |
|---------|------------|
| Entity + Mapper | backend-database-design.md §4 DDL + §5 自定义查询 |
| Service | backend-detailed-design.md 的 Service 方法定义和处理流程（伪代码级） |
| Controller + DTO | api-design.md §3 接口详细契约 + §2 共享类型 |
| 后端 RED 测试 | backend-detailed-design.md 测试场景表 + 测试策略 |
| TS 类型 + API | api-design.md §2 共享类型 + §3 前端调用代码 |
| Pinia Store | frontend-detailed-design.md Store Action 映射 |
| 页面组件 | frontend-page-design.md 页面结构 + frontend-detailed-design.md 交互流程 |
| 前端 RED 测试 | frontend-detailed-design.md 前端测试场景表 |
| 数据库迁移 | backend-database-design.md §4 DDL 完整建表语句 |
| 共享枚举 | backend-database-design.md §3 枚举定义 |

**c. 包依赖检查**

编写代码前，检查本任务是否需要引入新依赖。如需要，执行阶段 0.3 的包引入决策流程。

**d. 测试环境画像检查**

执行行为变更任务前，必须检查 `tasks.md` 的 `## 测试环境画像`：

- 如果当前任务包含后端 RED 测试，必须能找到后端测试框架、测试目录和局部测试命令
- 如果当前任务包含前端 RED 测试，必须能找到前端测试框架、测试目录和局部测试命令
- 测试命令优先使用画像中的命令；如命令与项目实际配置不一致，先修正 `tasks.md` 画像再执行
- 如果 `tasks.md` 缺少测试环境画像，先基于项目配置和已有测试文件补充画像；无法确认时暂停并说明需要初始化测试能力
- 如果当前任务所需的测试框架或局部测试命令标注为 `none`，不得直接跳过 RED；必须暂停，建议先初始化最小测试框架，或由用户确认可接受的替代验证方式
- E2E 测试框架、覆盖率命令为 `none` 不阻塞当前单元级 RED；只记录为后续 E2E / 覆盖率验证能力缺口

**e. TDD 适用性判断**

除以下任务外，所有新增功能、Bug 修复、重构和行为变更都必须执行 TDD：
- 纯数据库迁移 / DDL
- 纯配置文件变更
- 纯静态文档
- 生成代码或脚手架初始化

如果任务属于例外，必须在 tasks.md 的 TDD 证据表中标注“非 TDD”，并写明验证命令或验证方式。

如果任务是行为变更，但 tasks.md 没有 RED 测试任务或 TDD 证据表，暂停并建议先使用 asdd-tasks-review skill 修复任务拆分。

**f. RED：先写失败测试**

行为变更任务必须先根据详细设计中的测试场景写最小失败测试：
- 后端测试场景从 backend-detailed-design.md 的测试场景表获取
- 前端测试场景从 frontend-detailed-design.md 的前端测试场景表获取
- 测试方法名使用 `shouldXxxWhenYyy()` 格式
- 测试只验证目标行为，不为当前实现细节写测试
- Mock 策略按详细设计中的 Mock 列和关键断言执行
- 断言必须验证可观察行为或输出结果，不使用 `toBeDefined()`、只断言 Mock 被调用、只断言组件存在等弱断言作为主要证明

写完 RED 测试后，立即运行局部测试命令并确认：
- 测试失败
- 失败原因是目标行为尚未实现或断言未满足
- 失败不是语法错误、依赖错误、测试环境错误或 Mock 配置错误

如果测试直接通过，说明它没有证明新行为缺失，必须修正测试并重新运行直到 RED 正确。

如果测试因语法、依赖或环境错误失败，先修正测试本身，不得进入实现。

**g. GREEN：编写最小代码**

- 遵循 `.opencode/rules/` 中的开发规范
- 遵循 `architecture.md` 的代码结构约定和包路径
- 遵循 `overview.md` 中的代码位置映射
- **公共模块优先原则**：凡涉及异常抛出、响应封装、ID 生成、Redis 操作、分布式锁、请求上下文获取等 G 约束覆盖的能力，必须使用 architecture.md §9.1 中定义的 Common 模块公共类（如 `BusinessException`、`ApiResponse<T>`、`IdGenerator`、`RedisClient`、`DistributedLock`、`RequestContext`），禁止在业务模块中自行实现。前端同理，必须使用 §9.2 中定义的 Shared 模块内容（如 `request.ts`、`v-permission`、`useLoading`）
- 代码变更聚焦当前任务，保持最小化
- 遇到不确定的地方暂停询问，不猜测实现
- 只写足以让当前 RED 测试通过的代码，不顺手实现未被测试覆盖的扩展功能

**h. 添加 spec-coding 标注**

所有 AI 编写的代码，在方法/函数/类级别添加标注。标注的目的是让团队能快速识别
哪些代码是 AI 通过 spec-coding 流程生成的，便于后续 review 和维护。

标注格式（根据语言选择注释语法）：

| 语言 | 标注语法 |
|------|---------|
| Java / JavaScript / TypeScript | `// spec-coding` |
| Python | `# spec-coding` |
| Vue template（`<template>` 内） | `<!-- spec-coding -->` |
| SQL | `-- spec-coding` |
| CSS / SCSS / Less | `/* spec-coding */` |
| XML / HTML | `<!-- spec-coding -->` |
| YAML / Shell | `# spec-coding` |

标注位置：
- **新增方法/函数**：在方法签名上方一行
- **新增类/接口**：在类声明上方一行
- **新增文件**：在 package/import 语句之后、第一个类或函数之前

示例：
```java
// spec-coding
public class AuthService {

    // spec-coding
    public LoginResult login(String username, String password) {
        // ...
    }
}
```

```typescript
// spec-coding
export function validateToken(token: string): boolean {
  // ...
}
```

```vue
<template>
  <!-- spec-coding -->
  <div class="login-form">
    ...
  </div>
</template>
```

不需要标注的情况：
- 纯配置文件修改（application.yml、pom.xml、package.json 等）
- 纯 import/依赖声明的增减
- 单纯的格式调整或空行变动

**i. GREEN 验证与重构**

实现后立即运行同一个局部测试命令，确认 RED 测试已经 GREEN：
- 目标测试通过
- 输出没有新增错误或异常警告
- 如有其他受影响测试失败，必须立即修复

GREEN 后才允许重构：
- 只做命名、去重、提取 helper 等不改变行为的整理
- 每次重构后重新运行局部测试，保持 GREEN
- 不借重构添加新行为；新行为必须回到下一轮 RED

完成当前切片前，运行受影响范围测试：
- 后端：当前 Test 类、相关 Service/Controller 测试，必要时运行模块或全量 `mvn test`
- 前端：当前 test 文件、相关 Store/Composable 测试，必要时运行模块或全量 `npm run test`

**j. 回填 tasks.md**

任务完成后，立即在 tasks.md 中将 `- [ ]` 改为 `- [x]`，并回填对应切片的 TDD 证据摘要。

```
✅ 任务 {编号} 完成：{任务描述}
   已修改文件：{列出本任务创建/修改的文件}
   已更新 tasks.md：- [x] {任务编号}
   TDD 证据：
     RED 测试：{测试文件/测试方法}
     RED 命令：{局部测试命令}
     RED 失败原因：{预期失败原因摘要}
     GREEN 命令：{局部测试命令}
     影响范围验证：{受影响范围测试命令}
```

不攒到最后批量回填 — 这样即使中途中断，进度也不会丢失。

不在 tasks.md 中粘贴完整测试日志，只记录可追溯的摘要和命令。

**k. 继续下一个任务**

### 2.2 暂停条件

遇到以下情况立即暂停，不要自行猜测处理：

| 暂停条件 | 处理方式 |
|---------|---------|
| 任务描述不清晰 | 调用 OpenCode `question` tool 询问澄清，得到回答后继续 |
| 设计文件有歧义 | 列出多种理解方式，调用 OpenCode `question` tool 让用户选择 |
| 发现设计缺陷 | 报告问题，建议先使用 asdd-tasks-review skill 或 asdd-detailed-design-review skill |
| 行为变更缺少 RED 测试任务或 TDD 证据表 | 暂停，建议先使用 asdd-tasks-review skill 修复 tasks.md |
| 缺少测试环境画像，或当前 RED 任务所需的测试框架/局部命令为 none | 暂停，补充测试环境画像；必要时建议先初始化测试能力 |
| RED 测试无法写出 | 暂停，说明缺少的设计信息或测试基础设施 |
| RED 测试直接通过 | 修正测试；如无法修正，暂停说明现有行为已覆盖或测试场景有误 |
| RED 失败原因不是目标行为缺失 | 先修正测试/环境，不进入实现 |
| 需要黑名单中的包 | 按阶段 0.3 报告违规，等用户决策 |
| 需要未列出的包 | 按阶段 0.3 与用户确认 |
| 编译/运行错误 | 报告错误，提供可能的解决方案选项 |
| 规范与设计冲突 | 报告冲突，调用 OpenCode `question` tool 让用户裁决 |
| 用户中断 | 立即停止，显示当前进度 |

暂停时的报告格式：

```
⏸️ 开发暂停

当前进度：{N}/{M} 任务已完成
暂停位置：{当前任务编号} {任务描述}
暂停原因：{具体原因}

{问题详情或选项}

继续开发：再次调用本 skill 即可从暂停点恢复
```

---

## 阶段 3：进度报告

### 3.1 全部完成

当 `tasks.md` 全部完成且受影响范围验证通过后，除回填 `tasks.md` 外，还应同步以下文档状态：

- 对应 FRD：`docs/functional-requirements/{module}/REQ-*.md`
  - `status` → `🟢 待关闭`
  - `last_updated` → 当前日期
  - 不写入 `completed_date`
- 对应需求级 `spec.md`：`docs/modules/{module}/specs/{REQ-ID}-{name}/spec.md`
  - `status` → `🟢 待关闭`
  - `last_updated` → 当前日期
  - 不写入 `completed_date`

如果只是部分完成、中途暂停或仍需补验证，保持 `status = 🟡 进行中`，不得写入 `completed_date`。
最终 `status = 🔵 已关闭` 和 `completed_date` 只能由用户手动使用 `asdd-requirement-close` skill 关闭 `REQ-...` 后写入。

```
✅ 开发完成

需求：{需求名称}（{REQ-ID}）
模块：{module}
进度：{M}/{M} 任务全部完成

本次完成的任务：
  §0 基础设施
    - [x] 0.1 ...
    - [x] 0.2 ...
  §1 {切片1}
    - [x] 1.1 ...
    ...

创建/修改的文件：
  后端：
    - src/main/java/... (新建)
    - src/test/java/... (新建)
  前端：
    - src/views/... (新建)
    - src/stores/... (新建)
    - src/tests/... (新建)

完成提示：
  1. 运行全量单元测试确认通过
  2. 使用 E2E 流程进行验收
  3. 回填 FRD 和需求级 spec 的 `status = 🟢 待关闭`
  4. 同步 docs/modules/{module}/module-*.md 当前态概览（状态、最近变更、相关变更、代码位置）
  5. 手动使用 `asdd-code-review` skill 审查 `REQ-...`，并使用 `asdd-rules-review` skill 检查 `REQ-...` 的规范合规
  6. 如涉及浏览器可见行为，使用 Playwright E2E 四段式流程验收
  7. review 和验收通过后，手动使用 `asdd-requirement-close` skill 关闭 `REQ-...`
  8. 如发现问题，可再次调用本 skill 补充修复

🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-code-review skill 审查 REQ-...
    - 使用 asdd-rules-review skill 检查 REQ-... 的规范合规
    - 如涉及浏览器可见行为，使用 asdd-e2etest-playwright-design skill 为 REQ-... 设计 E2E，并继续 targets/generate/run
    - review 与验收通过后，使用 asdd-requirement-close skill 关闭 REQ-...

  🔄 当前阶段可选操作：
    - 使用 asdd-tasks-implement skill 从断点恢复或补充修复

  ⏪ 回溯操作：
    - 使用 asdd-tasks-review skill 发现任务拆分问题时修改任务
    - 使用 asdd-detailed-design-review skill 发现设计问题时修改设计
```

### 3.2 部分完成（暂停/中断）

```
⏸️ 开发暂停

需求：{需求名称}（{REQ-ID}）
进度：{N}/{M} 任务已完成

本次完成：
  - [x] {任务1}
  - [x] {任务2}

剩余任务：
  - [ ] {任务3}
  - [ ] {任务4}
  ...

恢复开发：再次调用本 skill，将从 {下一个待完成任务} 继续
```

---

## 关键原则

### 纵向执行，不横向跨切片

按 §0 → §1 → §2 → ... → §N 的顺序执行。每个行为切片内按 RED 测试 → 实现 → GREEN 验证的顺序。
不要跨切片并行实现（如先做完所有 Entity 再做所有 Service）。
每个切片完成后就是一个可验证的端到端功能单元。

### TDD 证据不可省略

每个行为切片必须先写 RED 测试并看见预期失败，再写最小实现并验证 GREEN。
没有 RED 失败记录、GREEN 命令和影响范围验证，不得把对应任务标记为完成。

TDD 证据只写入 tasks.md，不生成独立 TDD spec 或 `tdd-evidence.md`。复杂需求也只记录摘要，避免执行文件膨胀。

### 代码来自设计，不来自想象

每一行代码都应该能在设计文件中找到依据：
- 类名、方法名 → specs/{REQ}/api-design.md / backend-database-design.md / backend-detailed-design.md
- 业务逻辑 → specs/{REQ}/spec.md 的业务流程 + backend/frontend detailed design 的处理流程
- 测试场景 → backend-detailed-design.md / frontend-detailed-design.md 的测试场景表
- 文件路径 → overview.md + module-*.md + 代码检索结果

如果设计文件中找不到足够的信息来实现某个任务，暂停并请用户澄清，
而不是自行发挥。

### 包管理是红线

白名单和黑名单规则贯穿整个开发过程。这不是建议，是硬性约束：
- 白名单中有的包 → 优先使用
- 黑名单中的包 → 绝对不用
- 两个名单都没有的包 → 必须确认后才能用

违反黑名单规则等同于引入安全漏洞或合规风险，所以在引入任何新依赖前都要检查。

### 即时回填，支持恢复

每完成一个任务就回填 tasks.md，且 tasks.md 永久保留。这确保：
- 中断后不丢失进度
- 跨会话可以从断点恢复
- 团队成员能看到实时进度

### 与其他 skill 的边界

| 操作 | 使用哪个 skill |
|------|---------------|
| 生成任务拆分 | asdd-tasks-generate |
| 审查/澄清任务 | asdd-tasks-review |
| 执行代码开发 | **asdd-tasks-implement**（本 skill） |
| 审查/修改关键设计 | asdd-detailed-design-review |
| 审查/修改 FRD | asdd-frd-review |
| 审查/修改顶层设计 | asdd-architecture-review |
