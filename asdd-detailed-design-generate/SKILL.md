---
name: asdd-detailed-design-generate
description: >
  将 FRD（功能需求文档）转化为关键设计文档。生成/更新模块级概览文件，并在
  docs/modules/{module}/specs/{REQ-ID}-{name}/ 下生成本次变更的详细设计文件。
  流程：FRD 加载 → 代码检索 → 澄清确认 → 模块概览初始化/同步 → 需求级详细设计生成 → 质量校验。
  确保在以下场景触发本 skill：用户提到生成关键设计、FRD 转设计、根据需求生成设计文档、
  gen key design、generate key design、帮我做详设、帮我出设计文档、需求转设计、
  这个需求怎么实现、根据 FRD 生成模块设计、功能设计文档生成、根据需求写设计、
  写 API 设计和数据库设计、需求文档转技术方案、FRD to design、design doc from requirements。
  变更场景也应触发：需求变更后更新设计、FRD 改了同步设计文档、更新关键设计、
  根据新 FRD 刷新设计文档。
---

# asdd-detailed-design-generate

将 FRD 转化为关键设计文档。当前文档体系采用：

- **模块级概览**：`docs/modules/{module}/module-*.md`，只记录当前态地图和导航。
- **需求级过程设计**：`docs/modules/{module}/specs/{REQ-ID}-{name}/`，记录本次变更的详细设计。
- **代码最终事实源**：设计完成和代码实现后，模块级概览必须按实际代码位置同步。

禁止把模块根目录的文档维护成完整代码事实库。详细契约、DDL、页面布局、Service 流程都写入本次需求目录。

---

## 前提

- 顶层设计文档已存在：`docs/constitution.md` + `docs/architecture.md`
- FRD 已编写并可通过 `docs/functional-requirements/INDEX.md` 索引检索
- 模板文件位于 `docs/templates/`
- 如以上前提不满足，中止并告知用户先完成对应步骤

## 路径约定

| 概念 | 路径 |
|------|------|
| FRD 索引 | `docs/functional-requirements/INDEX.md` |
| FRD 文件 | `docs/functional-requirements/{module}/REQ-*.md` |
| 模块目录 | `docs/modules/{module}/` |
| 模块主规格 | `docs/modules/{module}/spec.md` |
| 模块概览 | `docs/modules/{module}/overview.md` |
| 模块 API 概览 | `docs/modules/{module}/module-api.md` |
| 模块数据概览 | `docs/modules/{module}/module-database.md` |
| 模块后端概览 | `docs/modules/{module}/module-backend.md` |
| 模块前端概览 | `docs/modules/{module}/module-frontend.md` |
| 需求设计目录 | `docs/modules/{module}/specs/{REQ-ID}-{name}/` |
| 需求过程主控 | `docs/modules/{module}/specs/{REQ-ID}-{name}/spec.md` |
| 需求 API 设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/api-design.md` |
| 需求数据库设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/backend-database-design.md` |
| 需求后端详细设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/backend-detailed-design.md` |
| 需求前端页面设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/frontend-page-design.md` |
| 需求前端详细设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/frontend-detailed-design.md` |

---

## 阶段 1：输入解析与上下文加载

### 1.1 解析用户输入

用户可提供以下任一输入：

- **需求编号**：如 `REQ-20260401-001`
- **FRD 文件路径**：直接指向 FRD 文件
- **功能描述**：如“用户登录功能”
- **未指定编号，仅说继续做设计**：从活跃需求中列出候选供用户选择

解析规则：

1. 如提供需求编号，读取 `docs/functional-requirements/INDEX.md` 查找匹配 FRD 链接。
2. 如提供文件路径，直接读取该 FRD。
3. 如提供功能描述，搜索 FRD 索引和 `docs/functional-requirements/`。
4. 如未提供明确 `REQ-ID` / 路径，仅表达“做设计”“继续设计”之类意图：
   - 扫描 `docs/functional-requirements/*/REQ-*.md`
   - 读取 frontmatter 中的 `status`、`last_updated`、`completed_date`
   - 联合检查 `docs/modules/*/specs/{REQ-ID}-*/` 是否存在、是否已有 `tasks.md`
   - 过滤出活跃需求（优先排除 `completed_date` 非空或 `status = 🔵 已关闭` 的项）
   - 按 `last_updated` 倒序展示候选，并标注推断阶段（待确认 / 待设计 / 设计中 / 实现中 / 待关闭）
   - 如果只有 1 个高置信候选，先向用户确认；如果有多个，必须让用户选择，不得自行决定

找不到 FRD 时中止：

```text
找不到匹配的 FRD。请确认：
- 需求编号格式是否正确（REQ-YYYYMMDD-NNN）
- FRD 是否已录入 docs/functional-requirements/INDEX.md
- 如果未指定 REQ-ID，请先用活跃需求候选确认本次要设计的需求
```

### 1.2 加载 FRD

读取 FRD 完整内容，提取：

| 提取项 | 用途 |
|--------|------|
| requirement_id | 生成 specs/{REQ-ID}-{name}/ 目录 |
| 需求标题 | 生成目录 slug 和文档标题 |
| 模块归属 | 确定 docs/modules/{module}/ |
| 功能描述 | 设计目标、业务流程 |
| 数据需求 | 生成 backend-database-design.md 和 module-database.md 同步项 |
| 接口需求 | 生成 api-design.md 和 module-api.md 同步项 |
| 页面/交互需求 | 生成 frontend-*.md 和 module-frontend.md 同步项 |
| 业务规则 | spec.md 业务规则和验收 |
| 验收标准 | spec.md AC 与 tasks.md 后续验证 |

### 1.3 加载顶层设计与现有模块概览

必须加载：

- `docs/constitution.md`
- `docs/architecture.md`
- `docs/functional-requirements/INDEX.md`
- 当前模块已存在的 `spec.md`、`overview.md`、`module-*.md`（如有）

按需加载：

- `docs/domains/*.md`
- `.opencode/rules/`
- 相关代码文件（通过代码检索确认现有事实）

---

## 阶段 2：代码检索与事实确认

设计前必须检索当前代码，不能只根据既有文档推断。

检索重点：

| 维度 | 需要确认 |
|------|----------|
| API | 是否已有相同/相近 Controller、URL、DTO、错误码 |
| 数据库 | 是否已有表、字段、Entity、Mapper、迁移脚本 |
| 后端 | 是否已有 Service、Job、Consumer、公共能力 |
| 前端 | 是否已有页面、路由、Store、Composable、API 函数、已有 `data-testid` / `aria-label` / label 风格 |
| 测试 | 已有测试结构、命名习惯、Mock 方式 |

检索结论写入需求级 `spec.md` 的“设计决策”和详细设计文件中。模块级 `module-*.md` 只在最终同步当前态时更新。

---

## 阶段 3：澄清确认

如发现以下问题，先向用户确认：

| 问题 | 示例 |
|------|------|
| 模块边界不清 | FRD 可能属于多个模块 |
| API 兼容性风险 | 现有稳定接口需要破坏性修改 |
| 数据迁移风险 | 字段类型变更、历史数据补齐 |
| 公共能力缺口 | architecture.md §9 未定义需要的公共能力 |
| 前后端边界不清 | 页面复用后端已有接口还是新建接口 |

确认后继续设计。

---

## 阶段 4：模板复制与文件生成

### 4.1 模块级概览文件

模块级文件长期存在，但只做当前态概览。

| 文件 | 模板来源 | 创建条件 |
|------|----------|----------|
| `spec.md` | `module-spec-template.md` | 所有模块 |
| `overview.md` | `module-overview-template.md` | 所有模块 |
| `module-api.md` | `module-api-template.md` | 有 API 或调用外部 API |
| `module-database.md` | `module-database-template.md` | fullstack / backend-only 且涉及数据 |
| `module-backend.md` | `module-backend-template.md` | fullstack / backend-only |
| `module-frontend.md` | `module-frontend-template.md` | fullstack / frontend-only |

创建/更新规则：

- 文件不存在：从 `docs/templates/` 复制模板，填充模块级基础信息。
- 生成文件必须保留模板 frontmatter 中的 `template_id`、`template_version`、`target_path`。
- 文件已存在：只同步当前态概览，不写详细请求体、DDL、页面线框、Service 伪代码。
- `spec.md`：追加需求索引行。
- `module-api.md`：新增/更新 API 当前态行，维护“引入需求 / 最近变更 / 相关变更 / 代码位置”。
- `module-database.md`：新增/更新表和字段当前态行。
- `module-backend.md`：新增/更新后端能力、集成点和代码位置。
- `module-frontend.md`：新增/更新页面、路由、Store、Composable 和代码位置。

### 4.2 需求级详细设计文件

每个需求拥有独立目录：

```text
docs/modules/{module}/specs/{REQ-ID}-{name}/
├── spec.md
├── api-design.md
├── backend-database-design.md
├── backend-detailed-design.md
├── frontend-page-design.md
└── frontend-detailed-design.md
```

| 文件 | 模板来源 | 适用模块 |
|------|----------|----------|
| `spec.md` | `spec-template.md` | 全部 |
| `api-design.md` | `api-design-template.md` | 有 API 新增/修改/废弃/删除 |
| `backend-database-design.md` | `backend-database-design-template.md` | fullstack / backend-only 且涉及数据 |
| `backend-detailed-design.md` | `backend-detailed-design-template.md` | fullstack / backend-only |
| `frontend-page-design.md` | `frontend-page-design-template.md` | fullstack / frontend-only 且涉及页面 |
| `frontend-detailed-design.md` | `frontend-detailed-design-template.md` | fullstack / frontend-only |

本 skill 不生成 `tasks.md`。任务拆分由 `asdd-tasks-generate` 完成。

### 4.3 填充顺序

严格按以下顺序：

1. `docs/modules/{module}/spec.md`：追加需求索引。
2. `docs/modules/{module}/overview.md`：确保模块导航存在。
3. `docs/modules/{module}/module-*.md`：初始化或预留本次同步行。
4. `specs/{REQ}/spec.md`：写本次变更主控文档和影响对象清单。
5. `specs/{REQ}/backend-database-design.md`：写本次数据设计（如适用）。
6. `specs/{REQ}/api-design.md`：写本次 API 契约（如适用）。
7. `specs/{REQ}/backend-detailed-design.md`：写本次后端实现设计（如适用）。
8. `specs/{REQ}/frontend-page-design.md`：写本次页面设计（如适用）。
9. `specs/{REQ}/frontend-detailed-design.md`：写本次前端交互设计（如适用）。
10. 回写 `module-*.md` 当前态概览，确保引入需求、最近变更、相关变更和代码位置可追溯。

---

## 阶段 5：填写规则

### 5.1 模块级概览规则

模块级概览只回答“现在模块里有什么”：

| 文件 | 允许内容 | 禁止内容 |
|------|----------|----------|
| `module-api.md` | 方法、URL、功能摘要、状态、引入需求、最近变更、相关变更、代码位置 | 请求/响应完整字段、DTO 代码、错误码细节 |
| `module-database.md` | 表名、字段名、字段含义、状态、引入需求、最近变更、相关变更、实体/迁移位置 | 完整 DDL、索引策略、复杂 SQL |
| `module-backend.md` | Service/Job/Consumer/Integration 当前态、变更链、代码位置 | 业务流程伪代码、详细异常/缓存策略 |
| `module-frontend.md` | 页面/路由/Store/Composable 当前态、变更链、代码位置 | 页面线框、组件 Props 详情、交互流程 |

字段语义：

- **引入需求**：第一次创建该 API / 表 / 字段 / 页面 / 能力的需求。
- **最近变更**：最后一次影响它的需求。
- **相关变更**：完整变更链，轻量列出 REQ 编号。

删除和废弃必须保留追溯记录，不直接从概览中消失。

### 5.2 需求级设计规则

`specs/{REQ}/spec.md` 是本次变更主控文档，必须包含：

- 背景与目标
- 本次变更范围
- 不做什么
- 影响对象清单
- 业务流程
- 业务规则
- 设计决策
- 详细设计文件索引
- 验收标准
- 风险与回滚
- 约束引用
- 模块概览同步清单

详细设计文件必须写到可拆任务的粒度：

- `api-design.md`：URL、方法、Controller、DTO、请求体、响应体、错误码、前端 API 调用。
- `backend-database-design.md`：DDL、字段说明、索引、枚举、迁移、自定义查询。
- `backend-detailed-design.md`：Service 方法、处理流程、跨服务、缓存、异常、测试策略。
- `frontend-page-design.md`：路由、页面结构、表格/表单字段、组件 Props/Emits、E2E 可测试性标识契约。
- `frontend-detailed-design.md`：Store、Composable、权限、数据流、组件库可测试性实现约定、前端测试策略。

前端可测试性标识契约必须遵守：

- 优先使用 role / label / accessible name；仅对关键交互、动态内容、组件库触发器和歧义元素声明 `data-testid`。
- 命名使用 `{module}-{surface}-{element}-{action}`，全部小写 kebab-case。
- `data-testid` 不绑定 AC/BR 编号、不拼接业务 ID、不表达样式或组件库实现。
- 动态列表使用稳定行标识，如 `{module}-list-row`，业务 ID 放入独立 `data-row-id` 或通过可见文本过滤。
- `frontend-detailed-design.md` 必须说明 Vue 3 / UI 组件库下 testid 的真实落点，例如真实 input、button、select trigger、dialog confirm button。

后端/前端详细设计中的“测试场景”表必须按模板完整填充：

- `关联 AC/BR`：映射到 `spec.md` 中的验收标准或业务规则编号；没有编号时先在 `spec.md` 补齐编号，不写空泛描述。
- `测试类型`：明确为正常流程、异常流程、边界条件、权限、空状态、重复提交、回滚、重试等。
- `场景`：描述可验证的输入、状态或触发条件。
- `测试方法`：使用项目测试命名风格；默认使用 `should{{Expected}}When{{Condition}}()`。
- `Mock`：写明 Mock 对象或不需要 Mock 的原因。
- `关键断言`：必须验证可观察行为、返回值、状态变化、持久化结果或异常语义，不使用“存在/不报错/Mock 被调用”作为主要证明。
- `优先级`：标记必须/可选；关键 AC、核心 BR、错误处理和权限场景默认为必须。

---

## 阶段 6：质量校验

生成/更新后必须检查：

在质量校验前，同步生命周期字段：

- 对应 FRD `status` 更新为 `🟡 进行中`，`last_updated` 更新为当前日期；不得写入 `completed_date`。
- 需求级 `spec.md` `status` 保持或更新为 `🟡 进行中`，`last_updated` 更新为当前日期；不得写入 `completed_date`。
- 不写入“待设计 / 设计完成”等过程状态，具体阶段由目录和 tasks.md 推断。

| 检查项 | 检查内容 |
|--------|----------|
| 占位符残留 | 搜索 `{{` 和 `}}` |
| 模板来源元数据 | 生成文件保留 `template_id`、`template_version`、`target_path` |
| 路径正确 | 详细设计文件位于 `specs/{REQ}/`，不是模块根目录 |
| 模块概览同步 | `spec.md` 的同步清单与 `module-*.md` 当前态行一致 |
| 追溯字段 | 模块概览行包含引入需求、最近变更、相关变更和代码位置 |
| 代码事实校验 | 新增/修改对象与代码检索结论不冲突 |
| 约束引用 | 引用的 constitution/architecture 约束存在 |
| 任务可拆分 | 详细设计包含具体类名、方法名、表名、组件名和测试策略 |
| 前端可测试性 | 浏览器关键交互已在 `frontend-page-design.md` 声明稳定 locator 或 `data-testid`，并在 `frontend-detailed-design.md` 说明实现落点 |

发现不一致时立即修正。

---

## 阶段 7：输出报告

输出以下报告：

```text
关键设计生成完成

需求编号：{requirement_id}
需求标题：{需求标题}
目标模块：{module}
模块类型：{fullstack / backend-only / frontend-only}

已生成/更新文件：
  模块级概览：
  - docs/modules/{module}/spec.md
  - docs/modules/{module}/overview.md
  - docs/modules/{module}/module-api.md（如适用）
  - docs/modules/{module}/module-database.md（如适用）
  - docs/modules/{module}/module-backend.md（如适用）
  - docs/modules/{module}/module-frontend.md（如适用）

  需求级过程设计：
  - docs/modules/{module}/specs/{REQ-ID}-{name}/spec.md
  - docs/modules/{module}/specs/{REQ-ID}-{name}/api-design.md（如适用）
  - docs/modules/{module}/specs/{REQ-ID}-{name}/backend-database-design.md（如适用）
  - docs/modules/{module}/specs/{REQ-ID}-{name}/backend-detailed-design.md（如适用）
  - docs/modules/{module}/specs/{REQ-ID}-{name}/frontend-page-design.md（如适用）
  - docs/modules/{module}/specs/{REQ-ID}-{name}/frontend-detailed-design.md（如适用）

质量校验：
  - 占位符残留：0
  - 模块概览同步：通过
  - 约束引用有效：通过
  - 任务拆分准备度：通过
  - 生命周期状态：FRD 与需求级 spec 已更新为 `🟡 进行中`

🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-detailed-design-review skill 审查关键设计一致性和完整性
    - 使用 asdd-tasks-generate skill 审查通过后生成 tasks.md

  🔄 当前阶段可选操作：
    - 使用 asdd-detailed-design-generate skill 生成或更新其他 REQ 的关键设计

  ⏪ 回溯操作：
    - 使用 asdd-frd-review skill 发现 FRD 问题时修改功能需求
    - 使用 asdd-architecture-review skill 发现顶层设计或约束问题时修改架构设计
```

---

## 硬性规则

1. 模块根目录不再生成 `api-design.md`、`backend-database-design.md`、`backend-detailed-design.md`、`frontend-page-design.md`、`frontend-detailed-design.md`。
2. 这些详细设计文件只能生成在 `docs/modules/{module}/specs/{REQ-ID}-{name}/` 下。
3. 模块级 `module-*.md` 只做当前态概览，禁止写完整契约、DDL、线框图、伪代码。
4. 每次需求设计完成后必须同步 `module-*.md` 的引入需求、最近变更、相关变更和代码位置。
5. 代码是最终事实源，文档是过程设计和导航；设计前后都必须用代码检索校验。
