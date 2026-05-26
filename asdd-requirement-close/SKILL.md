---
name: asdd-requirement-close
description: >
  手动关闭功能需求的收口 skill。用户传入 REQ-ID 或需求目录后，本 skill 校验标准需求的
  tasks.md / TDD 证据，或 fast 需求的 fast-design.md 内嵌任务和验证证据，并校验代码审查、
  规范审查、验收结果和模块概览同步情况；通过后将对应需求文档更新为
  status = 🔵 已关闭 并写入 completed_date。未提供 REQ-ID 时，从真实 REQ 文档和
  specs/REQ-* 目录中扫描待关闭候选供用户选择。本 skill 不自动调用其他 skill。
  确保在以下场景触发本 skill：关闭需求、需求收口、requirement close、close req、
  完成需求归档、验收通过后关闭需求、把这个 REQ 关掉。
---

# asdd-requirement-close

手动收口需求，写入最终生命周期状态。

## 定位

本 skill 是需求实现分支的最终人工关口。

```text
asdd-tasks-implement
  或 asdd-requirement-implement-fast
  → status = 🟢 待关闭
  → 用户手动使用 review skill
  → 用户手动使用 asdd-requirement-close skill（本 skill）
  → status = 🔵 已关闭 + completed_date
```

## 关键边界

- 本 skill 不自动调用 implement、code-review 或 rules-review。
- 本 skill 不修代码、不补任务，只做关闭前校验和最终状态写入。
- `completed_date` 只能在本 skill 确认关闭时写入。
- `asdd-workbench-overview` 不是事实源；必须直接读取真实 FRD、spec、tasks 或 fast-design，以及 review 文件。

## 路径约定

| 资源 | 路径 |
|------|------|
| FRD | `docs/functional-requirements/{module}/REQ-*.md` |
| 需求目录 | `docs/modules/{module}/specs/{REQ-ID}-{name}/` |
| 需求主控 | `docs/modules/{module}/specs/{REQ-ID}-{name}/spec.md` |
| 任务 | `docs/modules/{module}/specs/{REQ-ID}-{name}/tasks.md` |
| Fast 设计与任务 | `docs/modules/{module}/specs/{REQ-ID}-fast-{name}/fast-design.md` |
| 代码审查 | `docs/modules/{module}/specs/{REQ-ID}-{name}/code-review.md` |
| 规范审查 | `docs/modules/{module}/specs/{REQ-ID}-{name}/rules-review.md` |
| 模块概览 | `docs/modules/{module}/module-*.md` |

---

## 阶段 0：定位需求

支持输入：

- `REQ-ID`
- 需求目录路径
- FRD 文件路径
- 未指定，只说“关闭当前需求 / 收口需求”

未提供 `REQ-ID` 时：

1. 扫描 `docs/functional-requirements/*/REQ-*.md`
2. 关联扫描 `docs/modules/*/specs/REQ-*`
3. 排除 `completed_date` 非空或 `status = 🔵 已关闭` 的项
4. 优先列出 `status = 🟢 待关闭`、标准需求 `tasks.md` 全部完成、或 fast 需求 `fast-design.md` 内嵌任务全部完成的候选
5. 按 `last_updated` 倒序展示，必须由用户确认选择

没有候选时，提示用户提供 `REQ-ID`，或先使用实现 / review skill 完成前置流程。

---

## 阶段 1：关闭前校验

### 1.1 通用校验

必须同时满足：

1. 需求级 `spec.md` 存在，且 `status` 不是 `🔵 已关闭`
2. `code-review.md` 存在，且结论不是 `待修复` / `D` / `F`
3. `rules-review.md` 存在，且结论不是 `待修复` / `D` / `F`
4. review 报告中没有未处理的 Critical / Major 阻塞项
5. 模块 `module-*.md` 已同步本需求涉及对象的状态、最近变更、相关变更和代码位置；如无需同步，必须在执行文档中说明
6. 用户已确认业务验收或回归验证通过

### 1.2 标准需求校验

当目录名不包含 `-fast-` 且 `spec.md` frontmatter 不是 `flow: fast` 时，必须额外满足：

1. FRD 存在，且 `status` 不是 `🔵 已关闭`
2. `tasks.md` 存在，且所有任务均为 `- [x]`
3. tasks 中的 TDD 证据已回填：RED 测试、RED 命令、RED 失败原因、GREEN 命令、影响范围验证均非空

### 1.3 Fast 需求校验

当目录名包含 `-fast-` 或 `spec.md` frontmatter 为 `flow: fast` 时，必须额外满足：

1. `spec.md` frontmatter 包含：
   - `flow: fast`
   - `requires_frd: false`
   - `requires_detailed_design: false`
   - `execution_doc: "./fast-design.md"`
2. `fast-design.md` 存在，且 `status` 不是 `🔵 已关闭`
3. `fast-design.md` 中所有任务均为 `- [x]`
4. `fast-design.md` 的执行证据已回填：RED 测试 / 验证、RED 命令、RED 失败原因、GREEN 命令、影响范围验证均非空
5. `fast-design.md` 的“不变项声明”没有出现必须停止 fast lane 的结论
6. `fast-design.md` 的“升级记录”没有未处理的升级标准流程事项

Fast 需求不得因为缺少 FRD、完整详细设计或 `tasks.md` 被阻塞；这些文件在 fast lane 中本来就不应生成。

若任一项不满足，不得关闭；输出阻塞项和建议的手动下一步。

---

## 阶段 2：执行关闭

校验通过后，同步以下文件 frontmatter：

- 标准需求 FRD（仅标准需求）：
  - `status: "🔵 已关闭"`
  - `last_updated: "{当前日期}"`
  - `completed_date: "{当前日期}"`
- 需求级 `spec.md`：
  - `status: "🔵 已关闭"`
  - `last_updated: "{当前日期}"`
  - `completed_date: "{当前日期}"`
- Fast 需求 `fast-design.md`（仅 fast 需求）：
  - `status: "🔵 已关闭"`
  - `last_updated: "{当前日期}"`

按需同步已有索引中的展示状态：

- `docs/functional-requirements/INDEX.md` 对应行状态更新为 `🔵`（仅标准需求存在 FRD 时）
- `docs/modules/{module}/spec.md` 需求索引对应行状态更新为 `🔵 已关闭`

不得创建新的工作项 index。

---

## 阶段 3：输出

```text
✅ 需求已关闭

REQ-ID：REQ-...
模块：{module}
关闭日期：{YYYY-MM-DD}

已更新：
  - docs/functional-requirements/{module}/REQ-...md（标准需求）
  - docs/modules/{module}/specs/REQ-.../spec.md
  - docs/modules/{module}/specs/REQ-...-fast-.../fast-design.md（fast 需求）
  - docs/functional-requirements/INDEX.md（如存在对应行）
  - docs/modules/{module}/spec.md（如存在对应行）

关闭依据：
  - 标准需求 tasks.md 全部完成，或 fast 需求 fast-design.md 任务全部完成
  - TDD / 验证证据完整
  - code-review.md 通过
  - rules-review.md 通过
  - 用户验收/回归确认通过

🔗 后续导航：

  ▶ 收口完成：
    - 使用 asdd-workbench-overview skill 查看全局工作台
    - 使用 oh-my-asdd-guid skill REQ-... 查看归档状态

  🔄 后续可选操作：
    - 如后续发现回归问题，使用 asdd-bug-diagnose skill 诊断 BUG-...
```

---

## 关键原则

### 关闭是人工动作

实现完成、review 完成都不等于关闭。只有用户手动触发本 skill 并通过校验后，才能写入 `completed_date`。

### 状态只表达生命周期

本 skill 只写 `🔵 已关闭`。设计中、实现中、待关闭等阶段由目录、标准需求 `tasks.md` 或 fast 需求 `fast-design.md` 推断。
