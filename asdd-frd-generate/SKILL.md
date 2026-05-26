---
name: asdd-frd-generate
description: >
  生成功能需求文档（FRD）。支持三种输入模式：
  1）从系统需求生成：指定模块的专题（T1/T2）或功能点（F1.1）生成对应 FRD；
  2）从用户输入生成：用户直接描述业务需求，生成 FRD 到对应模块目录下。
  3）从 Bug 诊断升级：用户手动传入 BUG-ID，本 skill 读取 bug `spec.md` 和 `diagnosis.md`，
  当 `fix_mode: standard_req` 时生成 FRD。
  生成过程参考顶层设计（constitution.md + architecture.md）、系统需求（overview.md + 模块需求）
  和 .opencode/rules/ 规范。需要用户确认的事项必须明确询问，禁止推断。
  确保在以下场景触发本 skill：用户提到生成功能需求、生成 FRD、为某专题生成需求、
  generate functional requirement、为 T1 生成 FRD、创建功能需求、
  写功能需求、新增一个功能需求、我要加一个新功能、帮我写 FRD、
  generate demand、create FRD、把这个需求细化成 FRD、
  为 user-auth 的 T2 生成功能需求、我需要一个批量导出的功能，
  即使用户没有明确说"FRD"或"功能需求"。
---

# asdd-frd-generate

生成功能需求文档（FRD）。支持从系统需求专题/功能点生成、从用户直接描述生成，以及从 Bug 诊断升级生成。

## 定位

本 skill 处于系统需求拆解和设计之间，负责将粗粒度的系统需求细化为可独立设计和开发的功能需求。

```
asdd-requirements-decompose（拆解系统需求）
    │
    ▼
docs/requirements/req-modules/*.md（模块级需求，含 T1/T2/F1.1 等）
    │
    ▼
asdd-architecture-generate（生成顶层设计和约束）
    │
    ▼
asdd-frd-generate（本 skill：生成 FRD）  ← 按专题 / 用户输入 / BUG-ID
    │
    ▼
docs/functional-requirements/{module}/REQ-*.md（FRD 文件）
    │
    ▼
设计阶段（docs/modules/）→ 开发

asdd-bug-diagnose（Bug 诊断与分流）
    │
    ▼
用户手动使用 `asdd-frd-generate` skill 处理 `BUG-...`（复杂 bug 升级）
```

## 路径约定

| 资源 | 路径 |
|------|------|
| FRD 模板 | `docs/templates/functional-requirement-template.md` |
| FRD 索引模板 | `docs/templates/functional-requirements-index-template.md` |
| FRD 输出目录 | `docs/functional-requirements/{module}/` |
| FRD 索引 | `docs/functional-requirements/INDEX.md` |
| 系统需求总览 | `docs/requirements/overview.md` |
| 模块级需求 | `docs/requirements/req-modules/{module-name}.md` |
| Bug 规格 | `docs/modules/_bugs/{BUG-ID}-{name}/spec.md` |
| Bug 诊断 | `docs/modules/_bugs/{BUG-ID}-{name}/diagnosis.md` |
| 全局约束 | `docs/constitution.md` |
| 架构蓝图 | `docs/architecture.md` |
| 领域设计 | `docs/domains/*.md` |
| 规范约束 | `.opencode/rules/`（加载该目录下所有文件） |

---

## 阶段 0：前置准备

### 0.1 强制加载规范约束

扫描 `.opencode/rules/` 目录下**所有文件**，读取全部内容作为规范基准。
后续生成的 FRD 内容必须遵循这些规范。

如果目录不存在或为空，提示但不阻断：

```
⚠️ 未找到 .opencode/rules/ 目录或目录为空。
规范一致性校验将跳过。
```

### 0.2 加载顶层设计

读取以下文件，作为 FRD 生成的架构和约束参考：

- `docs/constitution.md` — 提取关联的约束 ID（S/P/D/E/T/U/C/G），其中 G 分类定义了全局基础设施约束（公共模块、异常体系、响应封装等），FRD 涉及这些能力时应关联对应 G 约束 ID
- `docs/architecture.md` — 理解服务拓扑、技术选型、服务清单；§9 全局基础设施层定义了后端 Common 模块和前端 Shared 模块的能力清单，FRD 中涉及的功能如果依赖这些公共能力，应在影响范围中标注
- `docs/domains/*.md` — 如有相关领域设计，一并加载

如果 constitution.md 或 architecture.md 不存在，提示：

```
⚠️ 未找到顶层设计文档（constitution.md / architecture.md）。
建议先使用 asdd-architecture-generate skill 生成顶层设计。
是否继续？（继续将无法自动关联约束 ID）
```

### 0.3 加载系统需求上下文

读取系统需求文件，作为 FRD 生成的需求来源和交叉参考：

- `docs/requirements/overview.md` — 系统定位、模块划分、依赖关系
- `docs/requirements/req-modules/*.md` — 所有模块需求（建立模块间关联的全景视图）

如果系统需求不存在且用户是模式 1（从系统需求生成），中止并提示：

```
⛔ 未找到系统需求文件（docs/requirements/req-modules/）。
请先使用 asdd-requirements-decompose skill 拆解系统需求。
```

如果用户是模式 3（从 Bug 诊断升级），系统需求不是必需输入；
如存在，可作为理解模块边界和历史需求链路的可选背景。

### 0.4 确认 FRD 模板和索引

检查以下文件是否存在：
- `docs/templates/functional-requirement-template.md` — FRD 模板
- `docs/templates/functional-requirements-index-template.md` — FRD 索引模板
- `docs/functional-requirements/INDEX.md` — FRD 索引

处理规则：

- FRD 模板或 FRD 索引模板缺失：中止，提示用户先补充模板。
- `docs/functional-requirements/INDEX.md` 不存在：从 `docs/templates/functional-requirements-index-template.md` 复制生成。
- 生成后的 FRD 和索引必须保留模板 frontmatter 中的 `template_id`、`template_version`、`target_path`。

---

## 阶段 1：输入模式判断与需求编号确认

### 1.1 判断输入模式

根据用户意图判断输入模式：

| 用户意图 | 模式 |
|---------|------|
| 指定模块和专题（如"为 user-auth 的 T1 生成 FRD"） | **模式 1A：指定专题** |
| 指定模块全部专题（如"为 user-auth 生成所有 FRD"） | **模式 1B：批量生成** |
| 直接描述业务需求（如"我需要一个批量导出功能"） | **模式 2：用户输入** |
| 提供 `BUG-ID` 或 bug 目录路径（如 `使用 asdd-frd-generate skill 处理 BUG-20260426-001`） | **模式 3：Bug 诊断升级** |
| 指定功能点（如"为 user-auth 的 F1.1 生成 FRD"） | 定位到 F1.1 所属专题，按**模式 1A** 以整个专题生成 FRD |
| 意图不明确 | 询问用户选择 |

**FRD 粒度规则**：

- **模式 1**：一个 FRD = 一个专题（T）。功能点（F）是专题内的组成部分，不独立生成 FRD。
  当用户指定功能点（F1.1）时，自动扩展到该功能点所属的整个专题。
- **模式 2**：用户的一次输入 = 一个 FRD，不得将用户描述的一个功能自行拆分为多个 FRD。
  如果判断功能范围较大（如涉及多个独立业务主题），应向用户说明并询问是否需要拆分，而非自动拆分。

**意图不明确时**：

```
请选择 FRD 生成方式：
  A) 从系统需求生成 — 指定模块中的专题
  B) 从业务描述生成 — 直接描述你需要的功能
  C) 从 Bug 诊断升级 — 传入 BUG-ID
```

### 1.2 需求编号确认

在确定输入模式后、进入具体需求分析之前，必须确认需求编号。

#### 如果用户已提供需求编号

对用户提供的编号进行**格式校验**：

**合法格式**：`REQ-{YYYYMMDD}-{三位序号}`，如 `REQ-20260401-001`

**校验规则**：
- 前缀必须为 `REQ-`
- 日期部分为 8 位数字，且为合法日期
- 序号部分为 3 位数字
- 完整正则：`^REQ-\d{8}-\d{3}$`

**校验通过**：直接采用，继续下一步。

**校验不通过**：向用户说明问题，并推荐一个合法编号：

```
⚠️ 需求编号格式不正确。

您输入的编号：{用户输入的编号}
正确格式：REQ-YYYYMMDD-序号（如 REQ-20260401-001）
问题：{具体问题，如"日期格式不对" / "缺少前缀" / "序号不是三位数"}

推荐编号：REQ-{当天日期}-{下一个可用序号}

请确认使用推荐编号，或输入新的编号：
```

#### 如果用户未提供需求编号

主动向用户询问：

```
📋 请提供需求编号。

格式：REQ-YYYYMMDD-序号（如 REQ-20260401-001）

推荐编号：REQ-{当天日期}-{下一个可用序号}
（基于 docs/functional-requirements/ 下已有的最大序号 +1 推算）

请输入需求编号，或直接回车使用推荐编号：
```

#### 批量生成时的编号处理

模式 1B（批量生成）时，向用户确认编号起始值：

```
📋 批量生成将为 {N} 个专题创建 FRD，需要 {N} 个连续编号。

推荐起始编号：REQ-{当天日期}-{下一个可用序号}
编号范围：REQ-{日期}-{起始} ~ REQ-{日期}-{起始+N-1}

请确认，或指定起始编号：
```

#### 推算下一个可用序号

扫描 `docs/functional-requirements/` 下所有子目录中的 FRD 文件，提取已有的最大序号，+1 作为推荐序号。如果目录为空，从 001 开始。

---

## 模式 1：从系统需求生成

### 阶段 2A：定位需求来源

#### 2A.1 读取指定模块需求

读取 `docs/requirements/req-modules/{module-name}.md`，提取用户指定的内容：

- **指定专题（T1）**：提取该专题的目标、全部功能点（F1.1/F1.2/...）、涉及实体、验收标准
- **批量生成**：提取所有专题的索引
- **用户指定功能点（F1.1）**：定位到 F1.1 所属专题，按整个专题提取（等同于指定专题）

#### 2A.2 加载关联模块需求

根据当前模块的依赖声明，读取关联模块的需求文件：
- 如果 user-auth 依赖 notification，则读取 `req-modules/notification.md` 了解集成点
- 关联内容帮助生成更准确的影响范围和风险标记

#### 2A.3 展示提取信息并确认

展示从系统需求中提取的信息，请用户确认：

```
📋 已从系统需求中提取以下内容：

**来源**：req-modules/{module-name}.md → T1 {专题名称}

**专题目标**：{专题目标描述}

**功能点**：
  - F1.1 {功能名} — {描述}
  - F1.2 {功能名} — {描述}
  - F1.3 {功能名} — {描述}

**涉及实体**：{实体列表}

**已有验收标准**：
  - AC-001: {标准}
  - AC-002: {标准}

**关联约束**（来自 constitution.md）：
  - {相关约束 ID 及内容}

以上信息是否正确？是否需要补充或调整？
```

**批量生成时**，展示所有专题列表，请用户确认范围：

```
📋 {module-name} 模块包含以下专题：

| 专题 | 名称 | 功能点数 | 状态 |
|------|------|---------|------|
| T1 | {名称} | {N} | 🔴 |
| T2 | {名称} | {N} | 🔴 |
| T3 | {名称} | {N} | 🔴 |

将为以上所有专题逐一生成 FRD。确认？
也可以指定部分专题（如"只生成 T1 和 T3"）。
```

---

## 模式 2：从用户输入生成

### 阶段 2B：理解用户需求

#### 2B.1 需求分析

从用户输入中提取：
- 功能目标（做什么、为谁做）
- 业务规则（如有明确描述）
- 所属模块（从内容推断，但**必须用户确认**）
- 影响范围（从内容推断，但**必须用户确认**）

#### 2B.2 定位所属模块

根据用户描述的功能，结合已有的系统需求和架构信息，判断该功能应归属哪个模块。

**判断规则**：
- 查看 architecture.md 的服务清单，找到职责最匹配的模块
- 查看 req-modules/ 下已有模块，找到功能点最相关的模块
- 如果无法确定，列出候选模块让用户选择

**禁止推断，必须用户确认**：

```
📋 根据您描述的功能，我判断该需求可能属于以下模块：

  A) order-flow（订单管理）— 因为涉及订单数据导出
  B) report（统计报表）— 因为是导出类功能
  C) 新建模块

请确认所属模块：
```

#### 2B.3 确认需求细节

展示理解到的需求信息，向用户确认并补充缺失项：

```
📋 需求理解确认：

**功能名称**：{AI 提取的功能名}
**所属模块**：{用户确认的模块}
**功能目标**：{AI 理解的目标描述}

**待确认项**：
  1. 优先级：P0（阻塞上线）/ P1（核心功能）/ P2（增强功能）？
  2. {其他需要澄清的业务细节}

**待补充项**（如用户输入未涉及）：
  3. 是否有具体的业务规则需要遵守？
  4. 是否涉及与其他模块的联动？

请逐项确认或补充。
```

---

## 模式 3：从 Bug 诊断升级为 FRD

### 阶段 2C：加载 Bug 诊断上下文

#### 2C.1 定位 Bug 目录

根据用户传入的 `BUG-ID` 或 bug 目录路径，定位：

- `docs/modules/_bugs/{BUG-ID}-{name}/spec.md`
- `docs/modules/_bugs/{BUG-ID}-{name}/diagnosis.md`

两者缺一时中止并提示：

```text
⛔ 未找到完整的 Bug 诊断文档。
请先使用 `asdd-bug-diagnose` skill 处理 `{BUG-ID}`，生成或补全 `spec.md` 和 `diagnosis.md`。
```

#### 2C.2 校验修复路径判定

读取 `diagnosis.md` frontmatter 和“修复路径判定”章节，确认 `fix_mode`：

- `standard_req`：允许继续，进入 FRD 生成。
- `fast`：中止当前 skill，并提示用户改为手动使用 `asdd-bug-fix-fast` skill 处理 `{BUG-ID}`。
- `pending` 或缺失：中止，并提示先补全诊断结论。

提示文案：

```text
📋 当前 Bug 诊断结论：fix_mode = {value}

- 若为 `standard_req`：继续生成 FRD
- 若为 `fast`：请改为手动使用 `asdd-bug-fix-fast` skill 处理 `{BUG-ID}`
- 若为 `pending`：请先补全 `diagnosis.md` 的修复路径判定
```

#### 2C.3 提取升级信息并确认

从 bug `spec.md` 和 `diagnosis.md` 提取：

- 缺陷目标行为与现象
- 根因摘要
- 修复目标、非目标、兼容性边界
- 受影响模块、接口、数据、回归场景
- 与现有 FRD / 架构约束的冲突或缺口

向用户展示并确认：

```text
📋 已从 Bug 诊断提取以下 FRD 来源信息：

**来源 Bug**：{BUG-ID} {Bug 名称}
**当前结论**：复杂 bug，需升级为标准需求流程
**修复目标**：{summary}
**非目标**：{summary}
**影响范围**：{modules / api / data / regression}
**关键约束**：{compatibility / architecture / domain constraints}

以上信息将作为 FRD 的来源依据。是否正确？是否需要补充或调整？
```

如果无法从 bug 文档唯一判断所属模块，必须向用户确认目标模块；禁止自行推断。

---

## 阶段 3：生成 FRD

### 3.1 确定文件名

文件名格式：`{需求编号}-{英文功能名}.md`

- **需求编号**：使用阶段 1.2 中已确认的编号（如 `REQ-20260401-001`）
- **英文功能名**：从功能名称翻译为 kebab-case 英文（如 `user-login`、`batch-export`）
- 完整示例：`REQ-20260401-001-user-login.md`

展示文件名供用户确认：

```
📝 FRD 文件将创建为：
  docs/functional-requirements/{module}/REQ-{YYYYMMDD}-{序号}-{英文功能名}.md

文件名是否合适？（可以调整英文名部分）
```

### 3.2 创建目录和复制模板

1. 确保 `docs/functional-requirements/{module}/` 目录存在，不存在则创建
2. **复制** `docs/templates/functional-requirement-template.md` 到目标路径并重命名

### 3.3 填充 FRD 内容

按以下规则填充模板各 section：

#### Frontmatter

```yaml
type: functional-requirement
requirement_id: "REQ-{YYYYMMDD}-{序号}"
module: "{module-english-name}"
source: "{SRD 模块名 / 增量 / BUG-...}"        # 模式 1 填模块名，模式 2 填"增量"，模式 3 填 BUG-ID
source_topic: "{T1 / 增量 / bug-upgrade}"      # 模式 1 填专题号，模式 2 填"增量"，模式 3 填 `bug-upgrade`
related_constraints: ["S1", "P1"]     # 从 constitution.md 中提取关联约束
priority: "{P0 / P1 / P2}"           # 用户确认的优先级
status: "🔴 待处理"
created_date: "{当天日期}"
last_updated: "{当天日期}"
completed_date: ""
```

补充规则：

- 模式 1：`source` 填模块名，`source_topic` 填专题号（如 `T1`）
- 模式 2：`source` 填 `增量`，`source_topic` 填 `增量`
- 模式 3：`source` 填 `BUG-...`，`source_topic` 填 `bug-upgrade`
- `status` 只使用 `🔴 待处理` / `🟡 进行中` / `🟢 待关闭` / `🔵 已关闭`；FRD 刚生成时固定为 `🔴 待处理`

#### 功能目标

- **模式 1**：基于系统需求专题的目标和功能点描述，提炼 1-2 段话
- **模式 2**：基于用户输入的业务描述，提炼 1-2 段话
- **模式 3**：基于 bug `spec.md` 和 `diagnosis.md`，描述系统应恢复或补齐的目标行为，以及本次升级要覆盖的兼容性边界
- 说明与系统需求的对应关系（模式 1）

#### 业务规则

- **模式 1**：从系统需求的功能点描述中提取业务规则
- **模式 2**：从用户输入中提取，加上从 constitution.md 和 `.opencode/rules/` 推导的约束
- **模式 3**：从 bug 修复目标、非目标、根因约束和现有业务边界中提取，明确“允许修什么 / 不允许扩大到哪里”
- 每条规则用 BR-{序号} 编号
- 规则描述"业务怎么要求"，不描述"技术怎么实现"
- **不确定的规则必须向用户确认，禁止自行推断**

#### 验收标准

- **模式 1**：基于系统需求中已有的验收标准，转化为 WHEN/THEN 格式，并补充缺失场景
- **模式 2**：根据功能目标和业务规则推导，覆盖正常流程和关键异常
- **模式 3**：必须覆盖缺陷复现场景、修复后的正确行为、关键回归场景，以及“不过度修复”的保护性场景
- 每条用 AC-{序号} 编号
- 涉及数值必须明确，禁止使用"合理的""适当的"

#### 影响范围

从以下来源综合判断：
- architecture.md 的服务清单和依赖关系
- 系统需求中该模块的依赖声明
- bug `diagnosis.md` 中的影响范围、回归面和兼容性边界（模式 3）
- constitution.md 的约束类型（如涉及 D 约束则有数据影响）
- `.opencode/rules/` 中的规范要求

#### 风险标记

自动检测以下 6 类风险：

| 类型 | 检测方式 |
|------|---------|
| RD1 需求冲突 | 与已有 FRD 或系统需求的矛盾 |
| RD2 数据兼容 | 涉及已有数据结构变更 |
| RD3 接口兼容 | 涉及已有 API 变更 |
| RD4 跨模块影响 | 需要多个模块联动 |
| RD5 边界模糊 | 需求边界不够清晰 |
| RD6 性能风险 | 涉及大数据量/高并发 |

无风险时删除风险标记 section。

#### 删除 AI 指引注释块

删除模板中所有 `<!-- AI 填充指引 -->` 注释块和其他指导性注释。

#### 变更记录

```
| {当天日期} | 初始版本 | AI |
```

### 3.4 展示 FRD 草稿供用户确认

将生成的 FRD 内容展示给用户审阅：

```
📝 FRD 草稿已生成，请审阅：

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{FRD 完整内容}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

请确认内容，或指出需要修改的地方。
确认后将写入文件并更新索引。
```

**必须等待用户确认后才写入文件。**

---

## 阶段 4：写入文件与更新索引

### 4.1 写入 FRD 文件

用户确认后，将内容写入目标文件。

### 4.2 更新 FRD 索引

更新 `docs/functional-requirements/INDEX.md`：

- 如果该模块的标题不存在，新增模块标题和表格
- 在对应模块表格中追加一行
- 更新 frontmatter 的 `last_updated`

### 4.3 Bug 升级回写（仅模式 3）

当本次输入是 `BUG-ID -> FRD` 时，FRD 写入成功后必须回写 bug 目录，建立追踪关系：

- 在 `docs/modules/_bugs/{BUG-ID}-{name}/diagnosis.md` frontmatter 中写入 `upgraded_to_req: "{REQ-ID}"`
- 将 `diagnosis.md` 的 `status` 更新为 `🟡 进行中`
- 同步 `last_updated` 为当前日期
- 如 `spec.md` 存在，同步其 `status = 🟡 进行中` 和 `last_updated`
- 不写入 `completed_date`

这一步只记录“复杂 bug 已升级为需求”，不关闭 bug，也不自动触发设计、任务或实现。后续仍由用户手动使用对应 skill：

```text
使用 asdd-detailed-design-generate skill 为 REQ-... 生成关键设计
...
使用 asdd-requirement-close skill 关闭 REQ-...
使用 asdd-bug-close skill 关闭 BUG-...
```

### 4.4 批量生成处理

模式 1B（批量生成）时，逐一处理每个专题：

1. 生成第一个 FRD → 展示 → 用户确认 → 写入
2. 生成第二个 FRD → 展示 → 用户确认 → 写入
3. 依此类推

每个 FRD 都必须单独确认，不支持一次性确认所有。
因为每个 FRD 的业务规则和验收标准可能需要用户澄清不同的细节。

---

## 阶段 5：完成报告

```
✅ FRD 生成完成

**生成文件**：
  - docs/functional-requirements/{module}/REQ-{YYYYMMDD}-{序号}-{名称}.md

**索引更新**：
  - docs/functional-requirements/INDEX.md 已追加记录

**FRD 摘要**：
  - 功能名称：{名称}
  - 所属模块：{模块}
  - 来源：{T1 / 增量 / BUG-...}
  - 业务规则：{N} 条
  - 验收标准：{N} 条
  - 风险标记：{N} 条（{高/中/低}）

📌 完成提示：
  - 文档状态为 `🔴 待处理`，请人工确认后手动进入设计阶段（docs/modules/）
  - 如来源为 BUG-...，已回写 `diagnosis.md` 的 `upgraded_to_req`，bug 仍需后续手动关闭

🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-frd-review skill 审查 FRD 一致性
    - 使用 asdd-detailed-design-generate skill 基于 FRD 生成关键设计

  🔄 当前阶段可选操作：
    - 使用 asdd-frd-generate skill 生成其他专题/功能点的 FRD

  ⏪ 回溯操作：
    - 使用 asdd-architecture-review skill 发现架构约束问题时修改顶层设计
    - 使用 asdd-requirements-review skill 发现需求定义问题时修改系统需求
```

---

## 关键原则

### 禁止推断，必须确认

以下事项**必须**向用户明确询问，不可自行推断：

| 事项 | 为什么不能推断 |
|------|--------------|
| 需求编号 | 编号是需求管理的唯一标识，必须由用户指定或确认推荐编号 |
| 所属模块 | 一个功能可能合理归属多个模块 |
| 优先级 | 优先级是业务决策，不是技术判断 |
| 不确定的业务规则 | 规则错误会导致后续设计和开发走偏 |
| 模糊的验收标准数值 | 如"高并发"到底是 100 还是 10000 |
| 风险的处理方式 | 风险处理是需要权衡的决策 |

### FRD = "做什么"，不是"怎么做"

FRD 定义需求层面的信息。以下内容**不属于 FRD**：

| 不包含 | 归属 |
|--------|------|
| 详细接口定义（路径、参数、响应体） | docs/modules/{module}/specs/{REQ}/api-design.md |
| 数据库表/字段定义 | docs/modules/{module}/specs/{REQ}/backend-database-design.md |
| UI 页面布局和交互细节 | docs/modules/{module}/specs/{REQ}/frontend-page-design.md |
| 代码结构和实现方案 | docs/modules/{module}/specs/{REQ}/backend-detailed-design.md |

### 规范约束贯穿始终

`.opencode/rules/` 中的规范在以下环节起作用：
- 业务规则：规范中的命名约束影响实体和字段命名
- 验收标准：规范中的性能指标可作为验收基准
- 影响范围：规范中的代码结构约束影响模块划分判断
- 风险标记：违反规范的设计方向应标记为风险

### 与其他 skill 的边界

| 操作 | 使用哪个 skill |
|------|---------------|
| 拆解系统级大需求为模块 | asdd-requirements-decompose |
| 审查/澄清系统需求 | asdd-requirements-review |
| 从系统需求专题生成 FRD | **asdd-frd-generate**（本 skill） |
| 从用户输入生成 FRD | **asdd-frd-generate**（本 skill） |
| 生成顶层设计 | asdd-architecture-generate |
| 审查顶层设计 | asdd-architecture-review |
