---
name: asdd-requirement-implement-fast
description: >
  面向极小需求的快速实现 skill。用户提出局部、小范围、低风险需求时，本 skill
  创建 `docs/modules/{module}/specs/{REQ-ID}-fast-{name}/`，生成 `spec.md` 和
  `fast-design.md`，并由 `fast-design.md` 承载轻量设计、任务清单、填充机制、
  TDD 证据和回归验证。本 skill 会按 RED -> 最小实现 -> GREEN -> 回归验证执行，
  完成后只进入 `🟢 待关闭`，不自动调用 review 或 close。
  确保在以下场景触发本 skill：用户提到极小需求、简单需求、快速实现小需求、
  增加一个筛选项选项、已有下拉框加选项、局部展示调整、quick requirement、
  fast requirement、small change、minor feature、快速需求实现。
---

# asdd-requirement-implement-fast

对极小需求执行 fast lane：轻量建档、简单设计、内嵌任务、TDD 实现和验证。

## 定位

本 skill 是需求主流程的轻量旁路，只适用于极小、局部、低风险需求。

```text
用户提出极小需求
  |
  v
asdd-requirement-implement-fast（本 skill）
  |
  v
docs/modules/{module}/specs/{REQ-ID}-fast-{name}/
  ├── spec.md
  └── fast-design.md
  |
  v
status = 🟢 待关闭
  |
  v
用户手动使用：
  - 使用 asdd-code-review skill 审查 REQ-...
  - 使用 asdd-rules-review skill 检查 REQ-... 的规范合规
  - 使用 asdd-requirement-close skill 关闭 REQ-...
```

## 关键边界

- 本 skill 不生成 FRD。
- 本 skill 不生成完整详细设计文件。
- 本 skill 不生成单独 `tasks.md`。
- `fast-design.md` 是唯一执行文档，必须同时覆盖轻量设计、具体任务、填充机制和验证证据。
- 本 skill 不自动调用 `asdd-code-review`、`asdd-rules-review` 或 `asdd-requirement-close`。
- 如果发现需求不满足 fast 条件，必须停止并建议改走标准 REQ 流程。
- 如果给定的 `REQ-ID` 已经是标准需求目录或已有 FRD，不得将其改造成 fast 需求；应继续标准流程或让用户确认新建 fast 需求。
- 不得为了 fast lane 放宽测试、review 或 close 质量门。

## 适用条件

只有同时满足以下条件，才能继续 fast lane：

1. 已有模块内的局部变更。
2. 不新增页面、接口、数据库表或数据库字段。
3. 不改变已有 API 契约；已有枚举/筛选项的兼容性补充可以继续。
4. 不涉及权限、安全、审计、资金、监管等高风险规则。
5. 不引入新技术栈、新组件或新依赖。
6. 不需要跨模块联动。
7. 验收标准可以用 1-3 条清晰表达。
8. 影响范围可以完整写入一个 `fast-design.md`。

典型适用场景：

- 给已有筛选项增加一个固定选项。
- 给已有下拉框增加一个枚举值。
- 调整已有字段的展示文案或排序规则。
- 对已有页面/接口做局部兼容性补充。
- 补齐已有校验规则中的一个局部分支。

## 升级标准流程条件

出现以下任一情况时，立即停止 fast lane：

1. 需要新增或变更 API 契约。
2. 需要新增或变更数据库结构、索引或迁移。
3. 需要跨模块联动或公共能力改造。
4. 涉及权限、安全、审计、资金、监管等高风险规则。
5. 业务规则不清晰，需要完整 FRD 澄清。
6. 实际改动超出极小需求范围。

停止后输出下一步建议：

```text
该需求不适合 fast lane。
请改走标准流程：
1. asdd-frd-generate
2. asdd-detailed-design-generate
3. asdd-tasks-generate
4. asdd-tasks-implement
```

## 路径约定

| 资源 | 路径 |
|------|------|
| Fast 需求目录 | `docs/modules/{module}/specs/{REQ-ID}-fast-{name}/` |
| Fast 需求规格模板 | `docs/templates/fast-requirement-spec-template.md` |
| Fast 需求规格 | `docs/modules/{module}/specs/{REQ-ID}-fast-{name}/spec.md` |
| Fast 设计模板 | `docs/templates/fast-requirement-design-template.md` |
| Fast 设计与任务 | `docs/modules/{module}/specs/{REQ-ID}-fast-{name}/fast-design.md` |
| 模块概览 | `docs/modules/{module}/overview.md`、`module-*.md` |
| 顶层约束 | `docs/constitution.md`、`docs/architecture.md` |
| 规范约束 | `.opencode/rules/` |

## 阶段 0：入口解析与 fast 判定

### 0.1 解析用户输入

从用户输入中提取：

- 需求标题
- 所属模块
- 业务目标
- 变更对象
- 验收标准
- 用户指定的代码范围（如有）

如果模块无法判断，扫描 `docs/modules/*/overview.md`、`docs/modules/*/spec.md`
和代码目录，列出候选模块让用户选择。

如果需求目标或验收标准不清楚，先询问用户；不要直接生成文档。

### 0.2 加载必要上下文

按需读取：

- `docs/INDEX.md`（如存在）
- `docs/constitution.md`
- `docs/architecture.md`
- 目标模块的 `spec.md`、`overview.md`、`module-*.md`
- 与变更对象直接相关的代码文件
- `.opencode/rules/` 中与当前任务相关的规则

不要读取完整 FRD 目录或生成完整设计文档，除非 fast 判定失败并准备建议转标准流程。

### 0.3 fast 判定

根据“适用条件”和“升级标准流程条件”生成判定结论：

```text
Fast 判定：
- 结论：适合 / 不适合
- 原因：
  1. ...
  2. ...
- 风险：
  - ...
```

不适合时停止；适合时继续。

## 阶段 1：创建或恢复 fast 需求目录

### 1.1 生成 REQ-ID

扫描以下位置的 `REQ-YYYYMMDD-NNN`：

- `docs/functional-requirements/**/*.md`
- `docs/modules/*/specs/REQ-*`
- `docs/modules/_bugs/**/*.md` 中的 `upgraded_to_req`

使用当前日期和最大序号 + 1 生成新 `REQ-ID`。

### 1.2 目录命名

目录名必须使用：

```text
{REQ-ID}-fast-{slug}
```

示例：

```text
docs/modules/order/specs/REQ-20260426-003-fast-add-status-filter-option/
```

规则：

- `fast` 必须出现在 `REQ-ID` 后，便于 review / close / overview 识别。
- `slug` 使用英文小写、数字和短横线。
- 不创建 `docs/functional-requirements/{module}/REQ-*.md`。

### 1.3 断点恢复

如果用户提供已有 fast 需求目录或 `REQ-ID`：

1. 定位 `docs/modules/*/specs/{REQ-ID}-fast-*`。
2. 读取 `spec.md` 和 `fast-design.md`。
3. 确认 `flow: fast`。
4. 根据 `fast-design.md` 中未完成的 `- [ ]` 任务继续执行。

已完成的 `- [x]` 任务不得回退或覆盖证据，除非用户明确要求重做。

如果同一 `REQ-ID` 只定位到标准需求目录或 FRD，停止 fast lane。不要移动、重命名或改写标准需求文档。

## 阶段 2：生成 spec.md

从 `docs/templates/fast-requirement-spec-template.md` 生成 `spec.md`。

必须填充：

- `requirement_id`
- `flow: fast`
- `requirement_type: fast_requirement`
- `requires_frd: false`
- `requires_detailed_design: false`
- `execution_doc: ./fast-design.md`
- 模块、优先级、状态、日期
- 需求目标
- Fast 适用性检查
- 做什么 / 不做什么
- 1-3 条验收标准

生成后状态为 `🟡 进行中`，不得写入 `completed_date`。

## 阶段 3：生成或更新 fast-design.md

从 `docs/templates/fast-requirement-design-template.md` 生成 `fast-design.md`。

`fast-design.md` 必须包含：

- 变更目标
- 不变项声明
- 影响范围
- 简单设计
- 前端可测试性标识（如涉及浏览器交互）
- 任务与填充机制
- RED / GREEN / 回归验证证据表
- 升级标准流程条件
- 升级记录

### 3.1 任务生成要求

任务必须写入 `fast-design.md`，不生成 `tasks.md`。

任务结构至少包含：

1. RED 验证
2. 最小实现
3. GREEN 与回归验证
4. 文档同步与状态收尾

任务应尽量指向具体文件、类、方法、组件、枚举或配置项。

如 fast 需求涉及 Vue3 页面交互，必须在 `fast-design.md` 的前端可测试性标识中声明关键 `data-testid` 或说明无需新增的原因。`data-testid` 只作为测试定位锚点，不参与业务逻辑、样式或权限判断；命名使用 `{module}-{surface}-{element}-{action}`。

### 3.2 填充机制

执行阶段必须按以下规则回填：

- 每完成一个任务，将 `- [ ]` 改为 `- [x]`。
- RED 执行后填写 RED 测试 / 验证、命令和失败原因。
- GREEN 执行后填写 GREEN 命令。
- 回归后填写影响范围验证。
- 文档同步后填写同步对象或说明无需同步。

不得把完整测试日志粘贴进文档，只记录摘要、命令和关键失败/通过原因。

## 阶段 4：按 fast-design.md 执行实现

### 4.1 执行顺序

按 `fast-design.md` 中任务顺序执行，只处理未完成项。

### 4.2 TDD 顺序

行为变更必须执行：

1. RED：新增或补齐测试 / 验证步骤，并确认失败原因能证明需求缺口。
2. 最小实现：只修改 fast-design.md 中列出的影响范围。
3. GREEN：运行对应验证并通过。
4. 回归验证：覆盖直接影响范围和邻接范围。

如果项目确实没有自动化测试能力，可用可复现的最小手工验证替代，但必须在执行证据中说明原因、步骤和结果。

### 4.3 实现边界

- 不顺手重构无关代码。
- 不修改 fast-design.md 未列出的范围，除非先更新影响范围并说明原因。
- 不引入新依赖。
- 不改变公开 API、DB 结构、权限模型或关键业务流程。
- 若发现必须越界，停止 fast lane，转标准流程。

## 阶段 5：验证、同步和待关闭

当 `fast-design.md` 任务全部完成后：

1. 确认执行证据表中 RED、GREEN、影响范围验证均已回填。
2. 按需同步 `module-*.md` 当前态：
   - 新增/调整 API 当前态 → `module-api.md`
   - 新增/调整枚举、字段展示或查询能力 → `module-backend.md` / `module-frontend.md`
   - 涉及数据库当前态但无结构变更 → `module-database.md`
3. 将 `spec.md` 和 `fast-design.md` frontmatter 更新为：

```yaml
status: "🟢 待关闭"
last_updated: "{当前日期}"
```

不得写入 `completed_date`。

## 阶段 6：输出

输出内容：

```text
✅ Fast requirement 实现完成，已进入待关闭

REQ-ID：REQ-...
目录：docs/modules/{module}/specs/{REQ-ID}-fast-{name}/

已更新：
  - spec.md
  - fast-design.md
  - 代码 / 测试
  - module-*.md（如适用）

🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-code-review skill 审查 REQ-...
    - 使用 asdd-rules-review skill 检查 REQ-... 的规范合规
    - 如涉及浏览器可见行为，使用 asdd-e2etest-playwright-design skill 为 REQ-... 设计 E2E，并继续 targets/generate/run
    - review 与验收通过后，使用 asdd-requirement-close skill 关闭 REQ-...

  🔄 当前阶段可选操作：
    - 使用 asdd-requirement-implement-fast skill 继续实现或修复 REQ-...

  ⏪ 回溯操作：
    - fast 需求不满足极小、局部、低风险条件时，改走标准 REQ 流程
```

## 关键原则

### fast 是压缩文档链，不压缩质量门

fast requirement 可以省略 FRD、完整详细设计和单独 tasks.md，但不能省略：

- 明确验收标准
- 轻量设计边界
- 具体任务
- RED / GREEN / 回归证据
- code review
- rules review
- close skill

### fast 需求仍然是 REQ

使用统一 `REQ-ID`，目录名增加 `-fast-`，并通过 frontmatter 的 `flow: fast`
作为可靠识别依据。

### 标准流程不受影响

没有 `flow: fast` 的需求仍按标准流程处理，必须具备 FRD、详细设计和 `tasks.md`。
