---
name: asdd-architecture-review
description: >
  对已生成的顶层设计文档（constitution.md、architecture.md、领域设计文件）进行审查澄清和修改调整。
  三大功能：
  1）审查模式：扫描顶层设计文档，检测缺失、冲突、歧义、规范违规等问题，逐项向用户确认后自动修复；
  2）需求复核模式：将顶层设计与 docs/requirements/ 下的系统需求交叉比对，检测覆盖缺失和不一致；
  3）修改模式：对顶层设计进行定向修改（调整约束、修改架构决策、修正技术选型等）。
  所有操作强制参考 .opencode/rules/ 下的规范约束。
  确保在以下场景触发本 skill：用户提到审查顶层设计、检查架构设计、review design、
  顶层设计有问题、约束冲突、检查 constitution、检查 architecture、设计审查、
  帮我看看设计有没有问题、设计不一致、check top-level design、clarify design、
  review constitution、review architecture、顶层设计和需求对不上、设计缺失。
  修改场景也应触发：修改顶层设计、调整约束、改架构、改技术选型、修改 constitution、
  修改 architecture、调整领域设计、update design、modify constraints、
  设计要改、约束要调整、技术栈要换、增加约束、删除约束。
---

# asdd-architecture-review

对已生成的顶层设计文档进行审查澄清和修改调整。

## 定位

本 skill 是 asdd-architecture-generate 的配套工具，在顶层设计生成之后使用。

```
asdd-architecture-generate（生成）
    │
    ▼
docs/（constitution.md + architecture.md + domains/*.md）
    │
    ▼
asdd-architecture-review（本 skill：审查 / 需求复核 / 修改）  ← 可多次调用
    │
    ▼
确认设计无误后 → 使用 asdd-frd-generate skill → 使用 asdd-detailed-design-generate skill → ...
```

## 路径约定

- **全局约束**：`<项目根目录>/docs/constitution.md`
- **架构蓝图**：`<项目根目录>/docs/architecture.md`
- **领域文件目录**：`<项目根目录>/docs/domains/`
- **全局索引**：`<项目根目录>/docs/INDEX.md`
- **系统需求目录**：`<项目根目录>/docs/requirements/`
- **需求总览**：`<项目根目录>/docs/requirements/overview.md`
- **模块需求**：`<项目根目录>/docs/requirements/req-modules/*.md`
- **规范约束**：`<项目根目录>/.opencode/rules/`

---

## 阶段 0：前置准备

### 0.1 强制加载规范约束

扫描 `.opencode/rules/` 目录下的**所有文件**，读取全部内容作为规范基准。

后续所有检测和修改都以这些规范为权威参照。如果目录不存在或为空，向用户提示但不阻断：

```
⚠️ 未找到 .opencode/rules/ 目录或目录为空。
规范一致性检测将跳过，仅执行文档结构和内容检测。
```

### 0.2 加载顶层设计文档

检查并读取：
- `docs/constitution.md`
- `docs/architecture.md`
- `docs/domains/*.md`（如有）
- `docs/INDEX.md`

如果 constitution.md 或 architecture.md 不存在，中止并提示：

```
⛔ 未找到顶层设计文档。
请先使用 asdd-architecture-generate skill 生成顶层设计。

缺失文件：
  - {列出缺失的文件}
```

### 0.3 模式判断

根据用户意图判断工作模式：

| 用户意图 | 模式 |
|---------|------|
| 检查/审查/review/有没有问题/是否一致 | **审查模式**（阶段 1 → 2 → 3） |
| 对照需求/需求复核/设计和需求对不上/覆盖检查 | **需求复核模式**（阶段 4 → 5 → 3） |
| 修改/调整/改/补充/删除/更新某个具体内容 | **修改模式**（阶段 6 → 7） |
| 意图不明确 | 询问用户选择 |

**意图不明确时**，调用 OpenCode `question` tool 询问：

```
请选择操作模式：
  A) 审查模式 — 全面检查顶层设计文档，发现缺失、冲突和规范违规
  B) 需求复核模式 — 将顶层设计与系统需求交叉比对，检测覆盖和一致性
  C) 修改模式 — 对顶层设计进行定向修改
```

---

## 审查模式

### 阶段 1：全面扫描

按以下 7 个维度扫描所有顶层设计文档。

#### 1.1 结构完整性检测（Completeness）

| 检测项 | 检测目标 | 严重度 |
|--------|---------|--------|
| 约束分类完整性 | constitution.md 是否包含 S/P/D/E/T/G 基本分类（U/C 按项目类型判断） | 🔴 严重 |
| 约束内容非空 | 每个约束分类下是否有至少一条约束 | 🔴 严重 |
| 全局基础设施完整性 | architecture.md 是否包含 §9 全局基础设施层（§9.1-§9.4） | 🟡 警告 |
| G 约束与 §9 对应性 | constitution.md G 约束条目是否与 architecture.md §9 能力清单对应 | 🟡 警告 |
| 架构章节完整性 | architecture.md 是否包含项目定位、技术栈、系统架构等核心章节 | 🔴 严重 |
| 服务清单存在性 | architecture.md 是否有服务清单且至少一个服务 | 🟡 警告 |
| 架构图存在性 | architecture.md 是否包含 ASCII 架构图 | 🟡 警告 |
| 占位符残留 | 所有文件中是否存在未替换的 `{{...}}` 占位符 | 🔴 严重 |
| AI 指引残留 | 是否存在未删除的 `<!-- AI 填充指引 -->` 注释块 | 🟡 警告 |
| 模板来源元数据缺失 | 顶层文件是否保留 `template_id`、`template_version`、`target_path` | 🟡 警告 |
| 领域文件关联 | constitution.md 中领域分类的约束 ID 是否在对应领域文件中一致 | 🟡 警告 |

#### 1.2 冲突检测（Conflicts）

| 检测项 | 检测目标 | 严重度 |
|--------|---------|--------|
| 约束互相矛盾 | 不同分类的约束之间是否存在逻辑矛盾（如 S 说微服务但 T 只有单体框架） | 🔴 严重 |
| 技术栈冲突 | constitution.md 的 T 约束与 architecture.md 技术选型表是否一致 | 🔴 严重 |
| 架构模式冲突 | S 约束声明的架构模式与 architecture.md 的架构图/服务清单是否一致 | 🔴 严重 |
| 约束 ID 重复 | 所有约束 ID（含领域文件）是否全局唯一 | 🔴 严重 |
| 领域约束冲突 | 领域文件中的约束是否与 constitution.md 的全局约束矛盾 | 🟡 警告 |
| G 与领域约束重叠 | G 约束（全局基础设施）与 CH（缓存）、M（消息）、A（认证）等领域约束是否存在职责重叠或矛盾（如 G5 Redis 封装 vs CH 缓存策略） | 🟡 警告 |

#### 1.3 歧义检测（Ambiguities）

| 检测项 | 检测目标 | 严重度 |
|--------|---------|--------|
| 模糊约束 | 约束描述是否具体可执行（如"使用合适的缓存策略"属于模糊约束） | 🟡 警告 |
| 版本不明确 | 技术选型是否缺少版本号（如只写"Spring Boot"而非"Spring Boot 3.3.x"） | 🟡 警告 |
| 服务职责模糊 | 服务清单中服务职责描述是否过于笼统 | 🟢 提示 |
| 架构决策缺理由 | 核心架构决策是否缺少理由说明 | 🟢 提示 |

#### 1.4 规范一致性检测（Compliance）

**本维度以 `.opencode/rules/` 为权威基准。**

| 检测项 | 检测目标 | 严重度 |
|--------|---------|--------|
| 包名规范 | constitution.md 中 C 分类约束的包名/目录结构是否符合规范 | 🔴 严重 |
| 命名规范 | 字段命名、表名、API 路径等约束是否符合规范 | 🔴 严重 |
| 技术栈合规 | 技术选型是否在规范允许的范围内 | 🔴 严重 |
| 代码结构合规 | 代码分层约束是否与规范定义的目录结构一致 | 🟡 警告 |
| 版本约束合规 | 技术栈版本是否满足规范要求 | 🟡 警告 |
| 新增规范缺失 | 规范中定义了但顶层设计中未体现的约束 | 🟡 警告 |

#### 1.5 内容边界检测（Boundary）

| 检测项 | 检测目标 | 严重度 |
|--------|---------|--------|
| 代码片段 | 是否包含具体代码（搜索 ` ```java`、` ```python` 等，ASCII Art 除外） | 🟡 警告 |
| DDL 语句 | 是否包含 `CREATE TABLE`、`ALTER TABLE` | 🟡 警告 |
| API 定义 | 是否包含 `@GetMapping`、`POST /api` 等接口定义 | 🟡 警告 |
| 详细时序图 | 是否包含 `sequenceDiagram`、`participant` | 🟡 警告 |
| 字段级定义 | 是否包含数据库字段列表表格 | 🟡 警告 |

这些内容属于关键设计层（`modules/`），不应出现在顶层设计文档中。

#### 1.6 架构图格式检测

| 检测项 | 检测目标 | 严重度 |
|--------|---------|--------|
| Mermaid 语法 | 架构图是否误用了 Mermaid 语法而非 ASCII Art | 🟡 警告 |

#### 1.7 跨文件一致性检测（Cross-file）

| 检测项 | 检测目标 | 严重度 |
|--------|---------|--------|
| 约束引用有效性 | 领域文件 `related_constraints` 引用的约束 ID 是否存在于 constitution.md | 🔴 严重 |
| 服务清单同步 | architecture.md 的服务清单是否覆盖了所有领域文件中涉及的服务 | 🟡 警告 |
| 技术选型同步 | architecture.md 技术选型表与 constitution.md 的 T 约束是否一致 | 🔴 严重 |
| 全局基础设施同步 | architecture.md §9 能力清单与 constitution.md G 约束是否一致；如存在 `domains/00-global-infrastructure.md`，其内容是否与 §9 和 G 约束一致 | 🟡 警告 |

---

### 阶段 2：问题报告与用户澄清

#### 2.1 问题汇总

将检测到的问题按严重度分批展示。

**第一批：严重问题（🔴）** — 必须逐项确认：

```
🔴 发现 {N} 个严重问题，需要逐项确认：

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[C1] 技术栈冲突
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
constitution.md T1 声明 "Java 17+"，但 architecture.md 技术选型表中语言版本为 "Java 21"。

位置：
  - docs/constitution.md T1 约束
  - docs/architecture.md §2.1 后端技术栈表
```

对每个严重问题，调用 OpenCode `question` tool 提供修复选项：

```
如何处理技术栈版本冲突？
  A) 统一为 Java 17+（以 constitution.md 为准）
  B) 统一为 Java 21（以 architecture.md 为准）
  C) 自定义版本
  D) 跳过 — 暂不处理
```

**第二批：警告问题（🟡）** — 支持批量确认：

```
🟡 发现 {N} 个警告问题：

[W1] 模糊约束
  - P2 约束 "统一响应体" 缺少具体格式定义
  建议：补充为 `{"code": 0, "message": "success", "data": {}}`
  位置：docs/constitution.md P2 约束

[W2] 规范合规 — 代码结构
  - C1 约束的目录结构与 .opencode/rules/ 中的定义不一致
  规范要求：controller/ → service/ → repository/ → entity/
  当前约束：controller/ → service/impl/ → mapper/ → model/
  位置：docs/constitution.md C1 约束

...

请逐项确认，或输入"全部接受建议"批量处理。
```

**第三批：提示信息（🟢）** — 仅展示，不要求确认：

```
🟢 {N} 条提示信息（仅供参考，无需确认）：
  [I1] 架构决策 #3 缺少理由说明，建议补充选型依据
  [I2] gateway 服务的端口号未指定
```

#### 2.2 无问题时的处理

```
✅ 顶层设计审查完成，未发现问题。

扫描范围：
  - docs/constitution.md
  - docs/architecture.md
  - docs/domains/ 下 {N} 个领域文件
  - .opencode/rules/ 规范对照

检测维度：完整性 / 冲突 / 歧义 / 规范一致性 / 内容边界 / 架构图格式 / 跨文件一致性
结果：全部通过 ✓
```

---

### 阶段 3：自动修复（审查模式和需求复核模式共用）

#### 3.1 收集用户决策

将用户的所有决策汇总展示：

```
📋 修复计划：

| 编号 | 问题 | 用户决策 | 影响文件 |
|------|------|---------|---------|
| C1 | 技术栈版本冲突 | 统一为 Java 21 | constitution.md, architecture.md |
| W1 | 模糊约束 P2 | 补充具体格式 | constitution.md |
| W2 | 规范合规 C1 | 按规范修正 | constitution.md |

确认执行以上修复？
```

#### 3.2 执行修复

用户确认后，按以下顺序修复：

1. **constitution.md** — 修改约束内容
2. **architecture.md** — 同步更新技术选型和架构信息
3. **领域文件** — 更新受影响的领域文件
4. **变更记录** — 在相关文件的变更记录表追加修复记录

#### 3.3 修复验证

修复完成后，对修改的文件重新执行相关检测项，确认问题已解决：

```
✅ 审查修复完成

已修复：{N} 项问题
跳过：{M} 项（用户选择暂不处理）

已修改文件：
  - docs/constitution.md
  - docs/architecture.md
  ...

验证结果：修复后的文件通过所有相关检测 ✓
```

---

## 需求复核模式

### 阶段 4：加载需求文件

检查 `docs/requirements/` 目录：
- 读取 `overview.md`
- 读取 `req-modules/*.md` 下所有文件

如果不存在，中止并提示：

```
⛔ 未找到系统需求文件（docs/requirements/）。
需求复核模式需要系统需求作为比对基准。
请先使用 asdd-requirements-decompose skill 生成系统需求。
```

---

### 阶段 5：交叉比对

从以下 5 个维度对顶层设计与系统需求进行交叉复核。

#### 5.1 模块覆盖检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 需求模块未体现 | 需求 req-modules/ 中的模块在 architecture.md 服务清单中无对应 | 🔴 严重 |
| 设计多出模块 | architecture.md 服务清单中有模块但需求中无对应 | 🟡 警告 |
| 模块职责偏差 | 需求中模块职责描述与 architecture.md 中的服务职责明显不一致 | 🟡 警告 |

#### 5.2 非功能需求覆盖

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 性能需求未约束化 | overview.md 中的性能指标未在 constitution.md 的约束中体现 | 🟡 警告 |
| 安全需求未约束化 | overview.md 中的安全要求未在 E 约束中体现 | 🟡 警告 |
| 兼容性需求未约束化 | overview.md 中的兼容性要求未在 U 约束中体现 | 🟢 提示 |

#### 5.3 依赖关系一致性

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 依赖拓扑不一致 | 需求中的模块依赖图与 architecture.md 的服务间通信描述不一致 | 🟡 警告 |
| 通信方式未明确 | 需求中有依赖关系但 architecture.md 未指明同步/异步通信方式 | 🟡 警告 |

#### 5.4 约束溯源检测

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 无源约束 | constitution.md 中的约束在需求文件和 .opencode/rules/ 中都找不到来源 | 🟢 提示 |
| 需求约束被忽略 | overview.md "约束条件" 中的要求未在 constitution.md 中体现 | 🟡 警告 |

#### 5.5 系统边界一致性

| 检测项 | 说明 | 严重度 |
|--------|------|--------|
| 边界范围不一致 | overview.md 系统边界与 architecture.md 项目定位的"包含/不包含"不一致 | 🟡 警告 |
| 外部依赖遗漏 | overview.md 外部依赖在 architecture.md 中未体现 | 🟡 警告 |

比对完成后，同样检测规范一致性（阶段 1.4 的检测项），然后进入阶段 2 展示问题并请求用户确认，最后进入阶段 3 自动修复。

---

## 修改模式

### 阶段 6：理解修改意图

#### 6.1 定位修改目标

根据用户输入定位要修改的内容：

| 用户说 | 定位 |
|--------|------|
| "修改约束 S1" / "改 S1" | → `constitution.md` 的 S1 约束 |
| "修改技术选型" / "换数据库" | → `constitution.md` T 约束 + `architecture.md` 技术选型表 |
| "修改架构模式" / "改成微服务" | → `constitution.md` S 约束 + `architecture.md` 架构图/服务清单 |
| "修改认证方案" | → `constitution.md` E 约束 + 相关领域文件（如 `domains/01-auth.md`） |
| "修改全局基础设施" / "改公共模块" / "调整降级策略" | → `constitution.md` G 约束 + `architecture.md` §9 + 相关领域文件（如 `domains/00-global-infrastructure.md`） |
| "增加一条约束" | → `constitution.md` 对应分类 |
| "删除 U 分类" | → `constitution.md` 删除 U 分类 + `architecture.md` 删除前端相关 |
| "修改领域设计" | → `docs/domains/` 相应文件 |
| "修改架构图" | → `architecture.md` §3.2 服务拓扑图 |

**如果用户未明确指定目标**：

```
请选择要修改的范围：
  A) 全局约束（constitution.md — 约束规则）
  B) 架构蓝图（architecture.md — 技术选型/服务拓扑/架构决策）
  C) 领域设计（docs/domains/ — 领域级架构决策）
```

#### 6.2 评估影响范围

修改顶层设计可能引起连锁更新。在执行前评估影响：

| 修改内容 | 可能的联动更新 |
|---------|--------------|
| 修改 T 约束（技术栈） | architecture.md 技术选型表、C 约束代码结构、U 约束前端框架 |
| 修改 S 约束（架构模式） | architecture.md 架构图/服务清单、领域文件的通信方式 |
| 修改 E 约束（安全） | 认证领域文件（如有）、architecture.md 网关配置 |
| 修改 G 约束（全局基础设施） | architecture.md §9 能力清单、降级策略矩阵、错误码分段；领域文件 `domains/00-global-infrastructure.md`（如有） |
| 修改 D 约束（数据） | architecture.md 数据架构章节 |
| 新增/删除约束分类 | constitution.md frontmatter 的 constraint_categories |
| 修改项目类型 | 增删 U/D 分类、调整 C 约束、调整 architecture.md 技术选型表 |

---

### 阶段 7：执行修改

#### 7.1 展示修改计划

```
📋 修改计划：

**修改类型**：{类型}
**目标**：{文件/章节}

**具体变更**：
  1. docs/constitution.md:
     - T1: "Java 17+" → "Java 21+"
     - T2: "Spring Boot 3.3.x" → "Spring Boot 3.5.x"

  2. docs/architecture.md:
     - §2.1 技术选型表：语言版本 17+ → 21+，框架版本 3.3.x → 3.5.x
     - §2.1 备注列：移除 ⚠️ 标记

**规范检查**：
  - .opencode/rules/ 中未限制 Java 版本 ✓

确认执行？
```

#### 7.2 执行修改

用户确认后：

1. 修改目标文件内容
2. 同步联动更新受影响的其他文件
3. **确保修改后的内容符合 .opencode/rules/ 规范**
4. 更新所有受影响文件的变更记录

#### 7.3 修改验证

修改完成后，对受影响的文件执行一致性检测，确保修改未引入新问题：

```
✅ 修改完成

已修改文件：
  - docs/constitution.md
  - docs/architecture.md

规范一致性：✓
跨文件一致性：✓

📋 变更摘要：
  - T1 约束：Java 17+ → Java 21+
  - T2 约束：Spring Boot 3.3.x → Spring Boot 3.5.x
  - architecture.md 技术选型表同步更新
```

---

## 关键原则

### 规范约束是最高优先级

`.opencode/rules/` 中的规范具有最高权威性。当顶层设计与规范冲突时，默认建议以规范为准。但最终决策权在用户 — 如果用户明确要求偏离规范，应提醒风险但执行修改。

### 修改追溯

所有修改都记录在受影响文件的变更记录表中：

```markdown
| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0.0 | 2026-04-01 | 初始版本 | AI |
| v1.1.0 | 2026-04-02 | 审查修复：修复 3 项冲突、2 项规范违规 | AI |
| v1.2.0 | 2026-04-03 | 手动修改：Java 版本升级至 21+ | AI |
```

### 非破坏性修改

- 修改约束时，如果约束 ID 已被领域文件或其他文档引用，更新引用而非删除
- 删除约束分类时，检查是否有领域文件依赖该分类的约束
- 修改技术栈时，评估对 C 约束代码结构的影响

### 后续导航输出

审查/修改完成后，在报告末尾输出以下导航区块：

```
🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-frd-generate skill 选择模块专题生成 FRD

  🔄 当前阶段可选操作：
    - 使用 asdd-architecture-review skill 继续审查或修改
    - 使用 asdd-architecture-generate skill 补充领域设计

  ⏪ 回溯操作：
    - 使用 asdd-requirements-review skill 发现需求层面问题时修改系统需求
```

### 与 asdd-architecture-generate 的边界

| 操作 | 使用哪个 skill |
|------|---------------|
| 首次生成顶层设计（从零开始） | asdd-architecture-generate |
| 从存量项目扫描代码生成设计 | asdd-architecture-generate |
| 检查已有顶层设计的问题 | **asdd-architecture-review**（审查模式） |
| 对照需求检查设计覆盖 | **asdd-architecture-review**（需求复核模式） |
| 修改已有顶层设计的内容 | **asdd-architecture-review**（修改模式） |
| 完全重新生成（推翻重来） | asdd-architecture-generate |
