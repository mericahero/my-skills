---
name: asdd-bug-close
description: >
  手动关闭 bug 的收口 skill。用户传入 BUG-ID 或 bug 目录后，本 skill 校验 simple bug 的
  fast fix 任务、TDD 证据、review 结果和回归确认，或校验 complex bug 已升级的 REQ 已关闭；
  通过后将 bug spec.md 与 diagnosis.md 更新为 status = 🔵 已关闭 并写入 completed_date。
  未提供 BUG-ID 时，从 docs/modules/_bugs/BUG-* 扫描待关闭候选供用户选择。本 skill 不自动调用其他 skill。
  确保在以下场景触发本 skill：关闭 bug、bug 收口、bug close、close bug、
  缺陷验收通过后关闭、把这个 BUG 关掉。
---

# asdd-bug-close

手动收口 bug，写入最终生命周期状态。

## 定位

本 skill 是 bug 分支的最终人工关口。

```text
simple bug:
  使用 asdd-bug-diagnose skill 诊断 BUG-...
    → 使用 asdd-bug-fix-fast skill 修复 BUG-...
    → review
    → 使用 asdd-bug-close skill 关闭 BUG-...（本 skill）

complex bug:
  使用 asdd-bug-diagnose skill 诊断 BUG-...
    → 使用 asdd-frd-generate skill 处理 BUG-...
    → 需求主流程
    → 使用 asdd-requirement-close skill 关闭 REQ-...
    → 使用 asdd-bug-close skill 关闭 BUG-...（本 skill）
```

## 关键边界

- 本 skill 不自动调用 bug-fix-fast、frd-generate、review 或 requirement-close。
- 本 skill 不修代码、不补任务，只做关闭前校验和最终状态写入。
- `completed_date` 只能在本 skill 确认关闭时写入。
- `asdd-workbench-overview` 不是事实源；必须直接读取 bug 目录和相关 REQ 文档。

## 路径约定

| 资源 | 路径 |
|------|------|
| Bug 目录 | `docs/modules/_bugs/{BUG-ID}-{name}/` |
| Bug 规格 | `docs/modules/_bugs/{BUG-ID}-{name}/spec.md` |
| Bug 诊断 | `docs/modules/_bugs/{BUG-ID}-{name}/diagnosis.md` |
| Fast 设计 | `docs/modules/_bugs/{BUG-ID}-{name}/fix-design.md` |
| Bug 任务 | `docs/modules/_bugs/{BUG-ID}-{name}/tasks.md` |
| 代码审查 | `docs/modules/_bugs/{BUG-ID}-{name}/code-review.md` |
| 规范审查 | `docs/modules/_bugs/{BUG-ID}-{name}/rules-review.md` |
| 升级需求 | `docs/functional-requirements/*/{REQ-ID}-*.md` 与 `docs/modules/*/specs/{REQ-ID}-*/spec.md` |

---

## 阶段 0：定位 Bug

支持输入：

- `BUG-ID`
- bug 目录路径
- 未指定，只说“关闭当前 bug / bug 收口”

未提供 `BUG-ID` 时：

1. 扫描 `docs/modules/_bugs/BUG-*`
2. 读取 `spec.md` 与 `diagnosis.md` frontmatter
3. 排除 `completed_date` 非空或 `status = 🔵 已关闭` 的项
4. 优先列出：
   - `status = 🟢 待关闭`
   - `tasks.md` 全部完成的 fast bug
   - `fix_mode = standard_req` 且 `upgraded_to_req` 指向已关闭需求的 complex bug
5. 按 `last_updated` 倒序展示，必须由用户确认选择

没有候选时，提示用户提供 `BUG-ID`，或先完成诊断 / 修复 / 升级需求流程。

---

## 阶段 1：识别关闭路径

读取 `diagnosis.md` frontmatter：

```yaml
fix_mode: fast | standard_req
upgraded_to_req: ""
```

- `fix_mode = fast`：按 simple bug 关闭校验。
- `fix_mode = standard_req`：按 complex bug 关闭校验。
- 缺失或 `pending`：不得关闭，提示先使用 `asdd-bug-diagnose` skill 处理 `BUG-...`，补全分流结论。

---

## 阶段 2A：simple bug 关闭校验

必须同时满足：

1. `spec.md`、`diagnosis.md`、`fix-design.md`、`tasks.md` 均存在
2. `tasks.md` 所有任务均为 `- [x]`
3. tasks 中的 TDD 证据已回填：RED 测试、RED 命令、RED 失败原因、GREEN 命令、影响范围验证均非空
4. `code-review.md` 存在，且结论不是 `待修复` / `D` / `F`
5. `rules-review.md` 存在，且结论不是 `待修复` / `D` / `F`
6. review 报告中没有未处理的 Critical / Major 阻塞项
7. 受影响范围回归验证已通过
8. 用户确认 bug 已验收通过，可以关闭

若任一项不满足，不得关闭；输出阻塞项和建议的手动下一步。

---

## 阶段 2B：complex bug 关闭校验

必须同时满足：

1. `diagnosis.md` 中 `fix_mode = standard_req`
2. `upgraded_to_req` 非空
3. 能在真实 FRD / specs 目录中定位到该 `REQ-ID`
4. 对应 FRD 或需求级 `spec.md` 已满足：
   - `status = 🔵 已关闭`，或
   - `completed_date` 非空
5. 用户确认该需求的关闭结果已经覆盖当前 bug 的修复目标和回归范围

如果 `upgraded_to_req` 为空，提示用户先手动使用：

```text
使用 asdd-frd-generate skill 处理 BUG-...
```

如果升级需求尚未关闭，提示用户先手动使用：

```text
使用 asdd-requirement-close skill 关闭 REQ-...
```

---

## 阶段 3：执行关闭

校验通过后，同步以下文件 frontmatter：

- `spec.md`：
  - `status: "🔵 已关闭"`
  - `last_updated: "{当前日期}"`
  - `completed_date: "{当前日期}"`
- `diagnosis.md`：
  - `status: "🔵 已关闭"`
  - `last_updated: "{当前日期}"`
  - `completed_date: "{当前日期}"`

不得修改 `fix_mode` 和 `upgraded_to_req` 的历史含义。
不得创建新的工作项 index。

---

## 阶段 4：输出

```text
✅ Bug 已关闭

BUG-ID：BUG-...
模块：{module}
关闭路径：{fast / standard_req}
关闭日期：{YYYY-MM-DD}

已更新：
  - docs/modules/_bugs/BUG-.../spec.md
  - docs/modules/_bugs/BUG-.../diagnosis.md

关闭依据：
  - simple：tasks/TDD/review/回归均通过
  - complex：升级需求 {REQ-ID} 已关闭，并覆盖当前 bug 修复目标

🔗 后续导航：

  ▶ 收口完成：
    - 使用 asdd-workbench-overview skill 查看全局工作台
    - 使用 oh-my-asdd-guid skill BUG-... 查看归档状态

  🔄 后续可选操作：
    - 如发现新回归，使用 asdd-bug-diagnose skill 诊断新的 BUG-...
```

---

## 关键原则

### 关闭是人工动作

修复完成、review 完成都不等于关闭。只有用户手动触发本 skill 并通过校验后，才能写入 `completed_date`。

### complex bug 跟随升级需求

复杂 bug 不在 bug 分支直接实现。它必须先升级为 REQ，并在对应需求关闭后，再关闭 bug。
