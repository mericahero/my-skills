---
name: asdd-tasks-review
description: >
  对已生成的开发任务拆分（tasks.md）进行审查澄清和一致性校验。五大功能：
  1）内部一致性检查：扫描 tasks.md 中的任务拆分，检测任务间冲突、依赖关系不合理、
  描述歧义和不明确之处，逐项向用户确认后修复；
  2）关键设计一致性校验：将任务拆分与 specs/{REQ}/ 下的关键设计文件（spec.md、api-design.md、
  backend-detailed-design.md、frontend-detailed-design.md 等）交叉比对，
  检测不一致和偏离，支持关键设计变更后的同步更新；
  3）顶层设计一致性校验：将任务拆分与 constitution.md / architecture.md 比对，
  检测约束冲突和架构偏离，评估任务是否影响顶层设计规划；
  4）规范约束校验：将任务拆分与 .opencode/rules/ 比对，检测违规和不相符；
  5）TDD 结构校验：检查行为切片是否包含 RED 测试、GREEN 验证和 tasks.md 内的 TDD 证据回填区；
  6）完整性验证：验证任务是否完整覆盖对应需求的所有关键设计点，检测遗漏。
  确保在以下场景触发本 skill：用户提到审查任务、检查任务拆分、澄清任务、
  review tasks、clarify tasks、任务有问题、任务冲突、任务不清楚、
  任务和设计对不上、任务和架构不一致、帮我看看任务有没有问题、
  任务拆分审查、task review、tasks review、检查 tasks.md、
  任务拆得对不对、任务覆盖完整吗、设计改了同步任务、
  任务符不符合规范、check task compliance、验证任务拆分、
  任务遗漏了什么、任务依赖有问题、task clarification、
  即使用户没有明确说"审查"或"澄清"。
---

# asdd-tasks-review

对已生成的开发任务拆分（tasks.md）进行审查澄清和一致性校验。

## 定位

本 skill 是 asdd-tasks-generate 的配套工具，在任务拆分生成之后使用。

```
asdd-tasks-generate（生成任务拆分）
    |
    v
docs/modules/{module}/specs/{REQ-ID}-{name}/tasks.md
    |
    v
asdd-tasks-review（本 skill：审查 / 一致性校验 / 完整性验证）  <-- 可多次调用
    |
    v
确认任务无误后 -> asdd-tasks-implement
```

关键设计变更时也应调用本 skill，确保任务拆分与设计保持同步。

## 路径约定

| 资源 | 路径 |
|------|------|
| 任务文件 | `docs/modules/{module}/specs/{REQ-ID}-{name}/tasks.md` |
| 任务模板 | `docs/templates/tasks-template.md` |
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
| 全局约束 | `docs/constitution.md` |
| 架构蓝图 | `docs/architecture.md` |
| 领域设计 | `docs/domains/*.md` |
| 规范约束 | `.opencode/rules/`（加载该目录下所有文件） |

---

## 阶段 0：前置准备

### 0.1 强制加载规范约束

扫描 `.opencode/rules/` 目录下所有文件，读取全部内容作为规范基准。
后续所有检测都以这些规范为权威参照。

如果目录不存在或为空，向用户提示但不阻断：

```
未找到 .opencode/rules/ 目录或目录为空。
规范约束校验将跳过，仅执行任务结构和一致性检测。
```

### 0.2 加载任务文件

根据用户输入定位 tasks.md：

| 用户输入 | 定位方式 |
|---------|---------|
| 需求编号（如 `REQ-20260401-001`） | 在 `docs/modules/` 下搜索 `specs/` 目录匹配 REQ-ID 前缀的 tasks.md |
| 文件路径 | 直接读取 |
| 模块名 | 读取该模块 `spec.md`（模块级），列出需求索引供选择 |
| 未指定 | 列出所有模块和需求供选择 |

找不到对应 tasks.md 时中止并提示：

```
未找到任务拆分文件（tasks.md）。
请先使用 asdd-tasks-generate skill 生成任务拆分。
```

### 0.3 加载关联上下文

定位到 tasks.md 后，加载其关联的设计文件：

1. **需求级过程设计**：同目录下的 `spec.md`、`api-design.md`、`backend-database-design.md`、`backend-detailed-design.md`、`frontend-page-design.md`、`frontend-detailed-design.md`
2. **模块级概览文件**：`docs/modules/{module}/spec.md`、`overview.md`、`module-*.md`
3. **顶层设计**：`docs/constitution.md` + `docs/architecture.md` + `docs/domains/*.md`
4. **任务模板**：`docs/templates/tasks-template.md`（作为结构参考）

### 0.4 模式判断

根据用户意图判断工作模式：

| 用户意图 | 模式 |
|---------|------|
| 检查/审查/review/有没有问题 | **审查模式**（阶段 1 → 2 → 3） |
| 任务和设计对不上/设计改了同步 | **关键设计一致性校验**（阶段 4 → 2 → 3） |
| 任务和架构不一致/约束冲突 | **顶层设计一致性校验**（阶段 5 → 2 → 3） |
| 任务不符合规范/rules 检查 | **规范约束校验**（阶段 6 → 2 → 3） |
| 任务覆盖完整吗/有没有遗漏 | **完整性验证**（阶段 7 → 2 → 3） |
| 全面检查（或意图不明确） | **全量模式**（阶段 1 + 4 + 5 + 6 + 7 → 2 → 3） |

**意图不明确时**，调用 OpenCode `question` tool 询问：

```
请选择操作模式：
  A) 全面审查 — 执行所有检查（内部一致性 + 设计一致性 + 顶层设计 + 规范 + 完整性）
  B) 内部一致性检查 — 检查任务间冲突、依赖和歧义
  C) 关键设计一致性校验 — 将任务与模块设计文件交叉比对
  D) 顶层设计一致性校验 — 与 constitution.md / architecture.md 比对
  E) 规范约束校验 — 与 .opencode/rules/ 比对
  F) 完整性验证 — 验证任务是否覆盖所有设计点
```

### 0.5 确定检查范围

如果用户指定了具体模块或需求编号，仅检查对应 tasks.md。
否则扫描 `docs/modules/` 下所有包含 tasks.md 的需求目录。

---

## 审查模式：内部一致性检查

### 阶段 1：任务内部扫描

按以下维度扫描 tasks.md，每个维度独立检测。

#### 1.1 结构完整性检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 占位符残留 | 存在未替换的 `{{...}}` 占位符 | 🔴 严重 |
| AI 指引残留 | 存在未删除的 `<!-- AI 填充指引 -->` 注释块 | 🟡 警告 |
| Frontmatter 必填项缺失 | module / triggered_by / created / status 字段为空 | 🔴 严重 |
| 上下文链接缺失 | 上下文表格未链接到实际设计章节 | 🟡 警告 |
| 测试环境画像缺失 | 新生成 tasks 缺少 `## 测试环境画像`，或未记录测试框架、测试目录、局部测试命令；旧任务执行前需补齐 | 🔴 严重 |
| 变更记录缺失 | 文件末尾没有变更记录表 | 🟡 警告 |
| 开发验证与收尾缺失 | 文件末尾没有开发验证与收尾 section | 🔴 严重 |
| E2E 验收提示缺失 | 新生成 tasks 缺少非 checkbox 的 E2E 验收提示 | 🟡 警告 |
| TDD 证据结构缺失 | 行为切片没有 `TDD 证据` 表，或表头缺少 RED 测试、RED 命令、RED 失败原因、GREEN 命令、影响范围验证 | 🔴 严重 |

#### 1.2 纵向切片完整性检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 横向拆分 | 任务按技术层切分（所有 Entity → 所有 Service → 所有 Controller）而非按功能纵向切片 | 🔴 严重 |
| 切片链路不完整 | 某个切片缺少后端或前端的完整链路（如有后端但缺少对应前端） | 🔴 严重 |
| 切片缺少 RED 测试 | 某个行为切片没有后端 RED 测试或前端 RED 测试任务 | 🔴 严重 |
| 切片缺少 GREEN 验证 | 某个行为切片没有后端 GREEN 验证或前端 GREEN 验证任务 | 🔴 严重 |
| TDD 顺序错误 | 行为切片任务顺序是先实现后测试，或出现“补单测/最后补测试”等测试后补表述 | 🔴 严重 |
| 测试场景不足 | 后端测试未覆盖正常+异常+边界（至少 3 个场景） | 🟡 警告 |
| 切片不可独立验证 | 某个切片完成后无法独立验证（既无可调用 API 也无可操作页面） | 🟡 警告 |

#### 1.3 任务间依赖检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 循环依赖 | 切片 A 依赖切片 B 的输出，切片 B 又依赖切片 A 的输出 | 🔴 严重 |
| 依赖顺序错误 | 被依赖的切片排在依赖它的切片后面（如 §2 依赖 §1 的 Entity，但 §1 排在 §2 后面） | 🔴 严重 |
| §0 基础设施遗漏 | 多个切片共用的 Entity/Mapper/枚举未提取到 §0 | 🟡 警告 |
| §0 公共模块依赖缺失 | §0 未声明本需求依赖的 architecture.md §9 公共能力（如 BusinessException、ApiResponse、RedisClient 等） | 🟡 警告 |
| 隐式依赖 | 切片间存在未声明的依赖关系（如切片 2 的 Service 调用了切片 1 才创建的 Service 方法） | 🟡 警告 |

#### 1.4 任务描述清晰度检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 抽象描述 | 任务描述使用"实现xxx功能"等抽象表述，而非具体类名/方法名 | 🟡 警告 |
| 代码名缺失 | 任务描述中没有实际的类名、方法名、文件路径 | 🟡 警告 |
| 设计章节引用缺失 | 任务描述未引用设计文件的具体章节（如"按 backend-detailed-design.md §N"） | 🟢 提示 |
| 测试方法名缺失 | 测试任务未列出具体的 `shouldXxxWhenYyy()` 方法名 | 🟡 警告 |
| TDD 命令占位缺失 | TDD 证据表没有预留 RED 命令、GREEN 命令或影响范围验证命令 | 🟡 警告 |

#### 1.5 任务间冲突检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 重复任务 | 不同切片中存在功能重叠的任务（如两个切片都创建同一个 Entity） | 🔴 严重 |
| 矛盾描述 | 不同任务对同一功能的描述存在矛盾（如对同一接口的业务规则描述不一致） | 🔴 严重 |
| 文件冲突 | 不同任务修改同一个文件的同一部分 | 🟡 警告 |

---

## 通用流程：问题报告与修复

以下阶段 2 和阶段 3 被所有检测模式共用。

### 阶段 2：问题报告与用户澄清

#### 2.1 问题汇总

将检测到的问题按严重度分批展示。

**第一批：严重问题（🔴）** — 必须逐项确认：

```
🔴 发现 {N} 个严重问题，需要逐项确认：

--------------------------------------------
[C1] 横向拆分
--------------------------------------------
tasks.md 采用了横向拆分模式：§1 所有 Entity → §2 所有 Service → §3 所有 Controller。
应按功能纵向切片，每个切片包含从 Entity 到页面的完整链路。

位置：
  - docs/modules/{module}/specs/{REQ-ID}-{name}/tasks.md 全文
```

对每个严重问题，调用 OpenCode `question` tool 提供修复选项：

```
如何处理横向拆分问题？
  A) 按纵向切片重新拆分（推荐，每个切片 = RED 测试 + 后端链路 + 前端链路 + GREEN 验证）
  B) 保持当前结构，仅标注依赖关系
  C) 自定义处理
  D) 跳过 — 暂不处理
```

**第二批：警告问题（🟡）** — 支持批量确认：

```
🟡 发现 {N} 个警告问题：

[W1] 测试场景不足
  - 切片 2 后端 RED 测试仅有 1 个正常流程测试，缺少异常场景和边界条件
  位置：tasks.md §2.4

[W2] 抽象描述
  - 切片 1 任务描述"实现用户认证Service"过于抽象，应使用具体类名和方法名
  位置：tasks.md §1.2

请逐项确认，或输入"全部接受建议"批量处理。
```

**第三批：提示信息（🟢）** — 仅展示，不要求确认：

```
🟢 {N} 条提示信息（仅供参考，无需确认）：
  [I1] 切片 3 的任务描述可考虑补充设计章节引用
  [I2] §0 基础设施的配置变更任务可更具体
```

#### 2.2 无问题时的处理

```
任务拆分审查完成，未发现问题。

扫描范围：
  - {tasks.md 文件路径}
  - 纵向切片 {N} 个、基础设施 {M} 项、开发验证与收尾 {K} 项，且每个行为切片包含 TDD 证据回填区

检测维度：{列出已执行的检测维度}
结果：全部通过

任务可以进入开发实施阶段。
```

---

### 阶段 3：自动修复

#### 3.1 收集用户决策

将用户的所有决策汇总展示：

```
修复计划：

| 编号 | 问题 | 用户决策 | 影响范围 |
|------|------|---------|---------|
| C1 | 横向拆分 | 按纵向切片重新拆分 | tasks.md 全文重写 |
| W1 | 测试场景不足 | 补充异常+边界 RED 测试 | tasks.md §2.1 |
| W2 | 抽象描述 | 替换为具体代码名 | tasks.md §1.2 |

确认执行以上修复？
```

#### 3.2 执行修复

用户确认后：

1. 修改 tasks.md 中的具体内容
2. 修复内容需要从设计文件中获取实际的类名、方法名、测试场景等
3. 在 tasks.md 的变更记录表追加一行

#### 3.3 修复验证

修复完成后，对修改的内容重新执行相关检测项，确认问题已解决。

```
审查修复完成

已修复：{N} 项问题
跳过：{M} 项（用户选择暂不处理）

已修改文件：
  - docs/modules/{module}/specs/{REQ-ID}-{name}/tasks.md

验证结果：修复后的文件通过所有相关检测
```

---

## 关键设计一致性校验

### 阶段 4：任务与设计交叉比对

加载同需求目录下的 spec.md 和详细设计文件，并结合模块级 module-*.md 概览，从以下维度与 tasks.md 进行比对。

#### 4.1 Service 方法覆盖检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| Service 方法未拆任务 | backend-detailed-design.md 中定义的 Service 方法在 tasks.md 中没有对应任务 | 🔴 严重 |
| 任务超出设计范围 | tasks.md 中的任务在 spec.md 影响对象清单和详细设计文件中没有依据 | 🟡 警告 |
| 处理流程偏离 | 任务描述的处理逻辑与 backend-detailed-design.md 的伪代码/流程图不一致 | 🔴 严重 |

#### 4.2 API 接口一致性检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 接口遗漏 | api-design.md 中本需求涉及的接口在 tasks.md 中没有对应 Controller 任务 | 🔴 严重 |
| DTO 名不一致 | 任务中使用的 DTO 类名与 api-design.md §2/§3 定义的不一致 | 🔴 严重 |
| API 路径不一致 | 任务中引用的 API 路径与 api-design.md 定义的不一致 | 🟡 警告 |

#### 4.3 数据库设计一致性检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 表/字段遗漏 | backend-database-design.md 中本需求涉及的表在 tasks.md §0 中没有迁移任务 | 🔴 严重 |
| Entity 名不一致 | 任务中的 Entity 类名与数据库设计不匹配 | 🟡 警告 |
| 枚举遗漏 | backend-database-design.md §3 定义的枚举在 tasks.md 中没有对应任务 | 🟡 警告 |

#### 4.4 前端设计一致性检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 页面遗漏 | frontend-page-design.md 中本需求涉及的页面在 tasks.md 中没有对应任务 | 🔴 严重 |
| 组件名不一致 | 任务中的组件名与 frontend-page-design.md 定义的不一致 | 🟡 警告 |
| Store Action 遗漏 | frontend-detailed-design.md 的 Store Action 在 tasks.md 中没有对应任务 | 🟡 警告 |
| 路由配置遗漏 | frontend-page-design.md §1 的路由在 tasks.md 中没有配置任务 | 🟡 警告 |
| 可测试性标识任务遗漏 | frontend-page-design.md 的 E2E 可测试性标识契约要求关键 `data-testid`，但页面组件任务未要求实现 | 🟡 警告 |

#### 4.5 测试场景与 TDD 结构一致性检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 后端 RED 测试场景偏离 | 任务中的测试方法名与 backend-detailed-design.md 测试场景表不一致 | 🟡 警告 |
| 前端 RED 测试场景偏离 | 任务中的前端测试与 frontend-detailed-design.md 测试场景表不一致 | 🟡 警告 |
| Mock 策略偏离 | 任务中的 Mock 策略与 backend-detailed-design.md / frontend-detailed-design.md 测试场景章节不一致 | 🟢 提示 |
| 测试画像命令缺失 | TDD 证据表预留的 RED/GREEN 命令无法在 `## 测试环境画像` 中找到依据 | 🟡 警告 |
| TDD 证据字段缺失 | 任务没有预留 RED 测试、RED 命令、RED 失败原因、GREEN 命令、影响范围验证字段 | 🔴 严重 |
| 验收标准未映射测试 | backend/frontend 测试场景表中的 `关联 AC/BR` 未覆盖 spec.md 的关键 AC 或 BR | 🟡 警告 |
| 弱测试任务 | 测试任务只描述“存在/可渲染/调用 Mock/不报错”，没有明确关键断言或可观察行为 | 🟡 警告 |

#### 4.6 设计变更同步场景

当用户表示关键设计发生变更需要同步任务时：

1. **识别变更点** — 读取最新的设计文件，与 tasks.md 当前引用的内容对比
2. **分析影响范围** — 确定哪些任务受到设计变更的影响

```
关键设计变更影响分析：

设计变更点：
  1. api-design.md: 登录接口新增 captcha 参数
  2. backend-detailed-design.md §N: 处理流程新增验证码校验步骤
  3. frontend-page-design.md §2.1: 登录页新增验证码输入框

受影响的任务：
  - §1.2 Service 任务：需新增验证码校验逻辑
  - §1.3 Controller + DTO 任务：需新增 captcha 字段
  - §1.1 后端 RED 测试：需新增验证码相关测试场景
  - §1.7 页面组件：需新增验证码组件
  - §1.6 前端 RED 测试：需新增验证码相关测试

请确认影响范围，或补充调整：
  A) 确认，按以上范围同步修改 tasks.md
  B) 需要调整影响范围
```

用户确认后进入阶段 3 执行修复。

比对完成后，进入阶段 2 展示问题并请求用户确认，最后进入阶段 3 自动修复。

---

## 顶层设计一致性校验

### 阶段 5：顶层设计合规比对

加载 constitution.md、architecture.md 和 domains/*.md，从以下维度与 tasks.md 比对。

#### 5.1 约束合规检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 违反全局约束 | 任务内容与 constitution.md 的约束矛盾（如使用了禁止的技术、违反安全要求），含 G 分类全局基础设施约束 | 🔴 严重 |
| 约束未体现 | spec.md §10 引用的约束在 tasks.md 中没有对应的实现任务 | 🟡 警告 |
| 公共模块未引用 | 任务中涉及异常处理、响应封装、ID 生成、Redis 操作、分布式锁、请求上下文等 G 约束覆盖的能力，但未引用 architecture.md §9 中定义的 Common/Shared 模块公共类，而是自行实现 | 🔴 严重 |
| 错误码越界 | 任务中定义的错误码超出 architecture.md §9.4 分配给该模块的错误码段 | 🟡 警告 |
| 降级策略不一致 | 任务中的降级行为与 architecture.md §9.3 降级策略矩阵定义不一致 | 🟡 警告 |

#### 5.2 架构合规检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 技术栈偏离 | 任务中使用了 architecture.md 中未定义的技术组件 | 🔴 严重 |
| 代码结构违规 | 任务中的文件路径/包路径不符合 architecture.md 的代码结构约定 | 🟡 警告 |
| 服务职责偏离 | 任务涉及的功能超出了 architecture.md 中对应服务的职责范围 | 🟡 警告 |
| 通信方式违规 | 任务中的跨服务交互方式与架构定义不一致 | 🟡 警告 |

#### 5.3 领域设计合规检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 领域边界违规 | 任务涉及跨越了领域设计文件定义的领域边界 | 🟡 警告 |
| 领域约束冲突 | 任务内容与领域设计文件中的领域级约束矛盾 | 🟡 警告 |

#### 5.4 顶层设计影响评估

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 引入新技术 | 任务引入了 constitution.md 未规划的新技术或依赖 | 🟡 警告 |
| 引入新服务 | 任务涉及 architecture.md 未定义的新服务或新模块 | 🟡 警告 |
| 架构模式偏移 | 任务的实现方式偏离了架构蓝图中定义的模式（如应使用消息队列但任务用了同步调用） | 🟡 警告 |

对于影响顶层设计的问题，调用 OpenCode `question` tool 确认是否需要反向更新顶层设计：

```
以下任务可能影响顶层设计规划：

[T1] 切片 3 引入了 Redis Stream 作为消息队列
  - architecture.md 中未定义此组件
  - 建议：A) 更新 architecture.md 纳入此组件  B) 修改任务使用已有的消息方案  C) 跳过

请逐项确认。
```

比对完成后，进入阶段 2 展示问题并请求用户确认，最后进入阶段 3 自动修复。

---

## 规范约束校验

### 阶段 6：规范合规比对

将 tasks.md 与 `.opencode/rules/` 下的规范进行比对。

#### 6.1 命名规范检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 类名命名违规 | 任务中的 Java/TS 类名不符合规范的命名规则 | 🟡 警告 |
| 方法名命名违规 | 任务中的方法名不符合规范要求 | 🟡 警告 |
| 文件路径违规 | 任务中的文件路径不符合规范的目录结构 | 🟡 警告 |
| 测试方法名违规 | 测试方法名不符合规范要求的 `shouldXxxWhenYyy` 格式 | 🟢 提示 |

#### 6.2 代码结构规范检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 分层违规 | 任务的代码组织不符合规范的分层架构（Controller → Service → Repository） | 🟡 警告 |
| 包路径违规 | 任务中的 Java 包路径或前端目录结构不符合规范 | 🟡 警告 |

#### 6.3 测试规范检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 测试覆盖率不达标 | 测试场景覆盖率低于规范要求 | 🟡 警告 |
| Mock 策略违规 | Mock 方式不符合规范的测试隔离要求 | 🟢 提示 |
| TDD 证据结构违规 | 行为切片缺少 TDD 证据表，或证据表字段不完整 | 🔴 严重 |
| 测试后补表述 | 任务中出现“补单测”“最后补测试”“实现完成后写测试”等测试后补表述 | 🔴 严重 |
| 弱断言风险 | 测试任务以 `toBeDefined`、只断言 Mock 调用、只断言组件存在等作为主要证明 | 🟡 警告 |
| 只测 happy path | 行为切片只覆盖正常流程，缺少异常、边界、权限、空状态或重复提交等关键风险场景 | 🟡 警告 |

#### 6.4 安全规范检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 认证缺失 | 需要认证的接口对应的任务未提及认证实现 | 🔴 严重 |
| 权限控制缺失 | 需要鉴权的操作对应的任务未提及权限检查 | 🟡 警告 |
| 敏感数据处理缺失 | 涉及敏感数据的任务未提及脱敏或加密处理 | 🟡 警告 |

比对完成后，进入阶段 2 展示问题并请求用户确认，最后进入阶段 3 自动修复。

---

## 完整性验证

### 阶段 7：设计点覆盖检测

验证 tasks.md 是否完整覆盖了对应需求的所有关键设计点。

#### 7.1 后端设计覆盖检测

从 backend-detailed-design.md、backend-database-design.md、api-design.md 提取所有后端设计点，逐一检查 tasks.md 是否覆盖：

| 设计来源 | 检测项 | 严重度 |
|---------|--------|--------|
| backend-detailed-design.md 每个 Service 方法 | 是否有对应的 Service 任务 | 🔴 严重 |
| backend-detailed-design.md 每个处理流程步骤 | 关键步骤是否在任务描述中体现 | 🟡 警告 |
| backend-detailed-design.md 每个异常分支 | 异常处理是否在任务中提及 | 🟡 警告 |
| backend-detailed-design.md 每个测试场景 | 是否在 RED 测试任务中有对应方法 | 🟡 警告 |
| backend-database-design.md 每张表 | 是否有对应的迁移/Entity 任务 | 🔴 严重 |
| backend-database-design.md 每个枚举 | 是否有对应的枚举类任务 | 🟡 警告 |
| api-design.md 每个接口 | 是否有对应的 Controller 任务 | 🔴 严重 |
| api-design.md 每个 DTO | 是否有对应的 DTO 任务 | 🟡 警告 |

#### 7.2 前端设计覆盖检测

从 frontend-page-design.md 和 frontend-detailed-design.md 提取所有前端设计点：

| 设计来源 | 检测项 | 严重度 |
|---------|--------|--------|
| frontend-detailed-design.md 每个交互流程 | 是否有对应的页面组件任务 | 🔴 严重 |
| frontend-detailed-design.md 每个 Store Action | 是否有对应的 Store 任务 | 🟡 警告 |
| frontend-detailed-design.md 每个 Composable | 是否有对应的 Composable 任务 | 🟡 警告 |
| frontend-detailed-design.md 每个前端测试场景 | 是否在前端 RED 测试任务中有对应方法 | 🟡 警告 |
| frontend-page-design.md 每个页面 | 是否有对应的页面组件任务 | 🔴 严重 |
| frontend-page-design.md 每条路由 | 是否有路由配置任务 | 🟡 警告 |
| frontend-page-design.md 每个通用组件 | 是否有对应组件任务 | 🟡 警告 |
| frontend-page-design.md E2E 可测试性标识契约 | 关键交互 `data-testid` 是否在页面组件任务中体现 | 🟡 警告 |

#### 7.3 验收标准覆盖检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 验收提示缺失 | spec.md §8 存在 AC-* 验收标准，但 tasks.md 未提示使用 E2E 流程验收 | 🟡 警告 |
| 业务规则未体现 | spec.md §3 的 BR-* 业务规则在任务中没有对应的实现描述 | 🟡 警告 |

#### 7.4 覆盖率汇总

```
设计点覆盖率汇总：

| 设计来源 | 总设计点 | 已覆盖 | 未覆盖 | 覆盖率 |
|---------|---------|--------|--------|--------|
| Service 方法（backend-detailed-design.md） | 5 | 5 | 0 | 100% |
| API 接口（api-design.md） | 4 | 3 | 1 | 75% |
| 数据库表（backend-database-design.md） | 3 | 3 | 0 | 100% |
| 前端页面（frontend-page-design.md） | 2 | 2 | 0 | 100% |
| 测试场景（backend/frontend detailed design） | 15 | 12 | 3 | 80% |
| 验收标准（spec §8） | 6 | 5 | 1 | 83% |

未覆盖的设计点：
  1. 🔴 API 接口：GET /api/users/{id}/profile — 无对应 Controller 任务
  2. 🟡 测试场景：shouldRejectWhenTokenExpired() — 未在测试任务中列出
  3. 🟡 测试场景：shouldPaginateWhenListExceedsLimit() — 未在测试任务中列出
  4. 🟡 测试场景：shouldClearCacheWhenPasswordChanged() — 未在测试任务中列出
  5. 🟡 验收标准：AC-006 密码修改后强制重新登录 — 未在任务中体现
```

对未覆盖的设计点，调用 OpenCode `question` tool 确认是否需要补充任务：

```
发现 {N} 个设计点未被任务覆盖。如何处理？
  A) 补充任务覆盖所有遗漏点（推荐）
  B) 逐项确认是否需要覆盖
  C) 跳过 — 这些设计点不需要单独任务
```

比对完成后，进入阶段 2 展示问题并请求用户确认，最后进入阶段 3 自动修复。

---

## 关键原则

### 不自动推断，有疑问必须问

任务拆分处于设计到实施的关键转换点。任何歧义或不确定都应通过 OpenCode `question` tool 向用户确认，而非自行推断。特别是以下场景必须确认：

- 设计文件中有多种理解方式的描述
- 任务范围是否包含某个边界功能
- 设计变更是否需要同步到其他需求的 tasks.md
- 任务优先级和开发顺序的调整

### 规范约束是权威参照

`.opencode/rules/` 中的规范具有最高权威性。当任务与规范冲突时，默认建议以规范为准。但最终决策权在用户 — 如果用户明确要求偏离规范，应提醒风险但执行修改。

### 非破坏性修改

- 修复问题时只修改有问题的任务，不影响其他正常任务
- 补充遗漏任务时，插入到合理的位置并更新序号
- 重新拆分切片时，保留用户已确认的部分

### 修改追溯

所有修改都记录在 tasks.md 的变更记录表中：

```markdown
| 日期 | 变更内容 |
|------|----------|
| 2026-04-01 | 初始版本，基于 REQ-20260401-001 |
| 2026-04-02 | 审查修复：补充切片 2 测试场景、修正 DTO 类名 |
| 2026-04-03 | 设计同步：同步 api-design.md 新增的 captcha 参数 |
```

### 后续导航输出

审查/修改完成后，在报告末尾输出以下导航区块：

```
🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-tasks-implement skill 按切片顺序执行开发

  🔄 当前阶段可选操作：
    - 使用 asdd-tasks-review skill 继续审查或修改
    - 使用 asdd-tasks-generate skill 拆分其他需求的任务

  ⏪ 回溯操作：
    - 使用 asdd-detailed-design-review skill 发现设计问题时修改设计
    - 使用 asdd-frd-review skill 发现 FRD 问题时修改需求
```

### 与其他 skill 的边界
| 审查/澄清任务内容 | **asdd-tasks-review**（审查模式） |
| 任务与设计一致性检查 | **asdd-tasks-review**（关键设计一致性校验） |
| 任务与顶层设计检查 | **asdd-tasks-review**（顶层设计一致性校验） |
| 任务与规范检查 | **asdd-tasks-review**（规范约束校验） |
| 任务完整性检查 | **asdd-tasks-review**（完整性验证） |
| 设计变更后同步任务 | **asdd-tasks-review**（关键设计一致性校验 → 设计变更同步） |
| 审查/修改关键设计 | asdd-detailed-design-review |
| 审查/修改 FRD | asdd-frd-review |
| 审查/修改顶层设计 | asdd-architecture-review |
| 生成关键设计 | asdd-detailed-design-generate |
