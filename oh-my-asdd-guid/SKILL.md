---
name: oh-my-asdd-guid
description: >
  ASDD coding 流程导航 skill。无 REQ-ID / BUG-ID 时展示完整流程总览；
  输入普通需求、大规模需求、fast、bug、澄清、review、E2E、close、合并、冲突等场景关键词时展示对应子流程；
  输入 REQ-ID 或 BUG-ID 时只读扫描真实文档，判断当前所在阶段并给出后续 skill 建议。
  适用于用户询问 ASDD 流程怎么走、下一步用哪个 skill、当前需求或 bug 到哪一步、
  新需求怎么开始、bug 怎么修、什么时候使用澄清/review skill、如何进入 E2E 验收、关闭流程和合并冲突处理流程。
---

# oh-my-asdd-guid

ASDD coding 流程导航与当前阶段指引。

## 定位

本 skill 是只读导航，不创建文档、不修改状态、不执行其他 skill。

它回答三类问题：

1. ASDD coding 流程怎么用？
2. 给定 REQ / BUG 当前走到哪一步？
3. 下一步应该手动调用哪个 skill？

边界：

- 不替代 `asdd-workbench-overview`。如果用户要看活跃需求、活跃 bug 或全局态势，提示使用 `asdd-workbench-overview`。
- 不自动调用下游 skill。只输出建议的 skill 调用。
- 不把 E2E 验收写成 `tasks.md` 未完成任务。只提示使用 Playwright E2E 四段式流程验收。
- 不修改 `completed_date`、`status`、review 报告或任务状态。

---

## 输入解析

按以下优先级判断模式：

1. 输入中包含 `REQ-YYYYMMDD-NNN`：进入 REQ 当前阶段模式。
2. 输入中包含 `BUG-YYYYMMDD-NNN`：进入 BUG 当前阶段模式。
3. 输入中包含场景关键词：展示对应子流程。
4. 无输入或输入不明确：展示完整流程总览。

场景关键词：

| 关键词 | 输出内容 |
|--------|----------|
| `普通需求` / `新需求` / `frd` | 普通需求流程 |
| `大规模需求` / `系统需求` / `拆解` | 大规模系统需求流程 |
| `fast` / `极小需求` / `快速需求` | Fast Lane |
| `bug` / `缺陷` / `异常` | Bug 分支 |
| `澄清` / `review` / `审查` | 澄清与审查矩阵 |
| `e2e` / `验收` | E2E 验收入口 |
| `close` / `关闭` / `收口` | 关闭流程 |
| `合并` / `冲突` / `merge` / `PR` / `多人协同` | 多人协同与合并流程 |

---

## 无 ID 默认输出

无 REQ-ID / BUG-ID 且无明确场景时，输出完整总览。不要扫描活跃项。

```text
ASDD Coding 流程总览

你可以按场景选择入口：

| 场景 | 适用条件 | 推荐入口 |
|------|----------|----------|
| 普通需求 | 正常功能迭代，需求目标相对明确 | asdd-frd-generate |
| 大规模系统需求 | 一整套系统需求，需要先拆模块/主题 | asdd-requirements-decompose |
| 极小需求 Fast Lane | 局部低风险，小枚举/筛选/展示调整 | asdd-requirement-implement-fast |
| Bug 修复 | 异常、回归、线上/测试缺陷 | asdd-bug-diagnose |
| 继续开发 | 已有 tasks.md / fast-design.md | asdd-tasks-implement 或 fast 实现 |
| 澄清 / 审查 | 文档不清、设计不稳、任务不合理 | 对应 review skill |
| E2E 验收 | 开发完成后的用户可见验收 | 使用 Playwright E2E 四段式流程 |
| 合并 / 冲突处理 | 多人并行开发、PR 前或 merge/rebase 后 | asdd-merge-preflight |
| 查看活跃项 | 不知道当前有哪些 REQ/BUG | asdd-workbench-overview |

普通需求流程：
asdd-frd-generate
  -> 可选：asdd-frd-review
  -> asdd-detailed-design-generate
  -> 可选：asdd-detailed-design-review
  -> asdd-tasks-generate
  -> 可选：asdd-tasks-review
  -> asdd-tasks-implement
  -> asdd-code-review
  -> asdd-rules-review
  -> 使用 Playwright E2E 流程验收
  -> asdd-requirement-close

大规模系统需求流程：
asdd-requirements-decompose
  -> 可选：asdd-requirements-review
  -> asdd-architecture-generate
  -> 可选：asdd-architecture-review
  -> asdd-frd-generate
  -> 进入普通需求流程

Fast Lane：
asdd-requirement-implement-fast
  -> 使用 asdd-code-review skill 审查 REQ-...
  -> 使用 asdd-rules-review skill 检查 REQ-... 的规范合规
  -> 使用 Playwright E2E 流程验收
  -> 使用 asdd-requirement-close skill 关闭 REQ-...

Bug 分支：
使用 asdd-bug-diagnose skill 诊断 BUG-...
  -> simple bug: 使用 asdd-bug-fix-fast skill 修复 BUG-...
      -> 使用 asdd-code-review skill 审查 BUG-...
      -> 使用 asdd-rules-review skill 检查 BUG-... 的规范合规
      -> 可选：浏览器可见回归使用 Playwright E2E 流程验收
      -> 使用 asdd-bug-close skill 关闭 BUG-...
  -> complex bug: 使用 asdd-frd-generate skill 处理 BUG-...
      -> 普通需求流程
      -> 使用 asdd-bug-close skill 关闭 BUG-...

多人协同与合并：
使用 asdd-merge-preflight skill 检查 feature/REQ-20260429-001 分支合并到 develop 分支的风险
  -> 如有 Spec 文档冲突：使用 asdd-spec-merge-resolve skill 处理当前合并中的 Spec 文档冲突
  -> 如有代码冲突：使用 asdd-code-merge-resolve skill 分析当前代码冲突并给出合并建议
```

默认总览后继续输出“澄清 / 审查入口”矩阵。

---

## 普通需求流程

适用：

- 正常功能迭代。
- 用户已经能描述具体需求。
- 不需要先做大规模系统需求拆分。

流程：

```text
asdd-frd-generate
  -> 可选：asdd-frd-review
  -> asdd-detailed-design-generate
  -> 可选：asdd-detailed-design-review
  -> asdd-tasks-generate
  -> 可选：asdd-tasks-review
  -> asdd-tasks-implement
  -> asdd-code-review
  -> asdd-rules-review
  -> 使用 Playwright E2E 流程验收
  -> asdd-requirement-close
```

常用调用：

```text
使用 asdd-frd-generate skill 生成 FRD：我需要一个用户登录功能
使用 asdd-frd-review skill 审查 REQ-20260401-001 的 FRD
使用 asdd-detailed-design-generate skill 为 REQ-20260401-001 生成关键设计
使用 asdd-detailed-design-review skill 审查 REQ-20260401-001 的关键设计
使用 asdd-tasks-generate skill 为 REQ-20260401-001 拆分任务
使用 asdd-tasks-review skill 审查 REQ-20260401-001 的任务拆分
使用 asdd-tasks-implement skill 执行 REQ-20260401-001 的开发任务
使用 asdd-code-review skill 审查 REQ-20260401-001
使用 asdd-rules-review skill 检查 REQ-20260401-001 的规范合规
使用 asdd-requirement-close skill 关闭 REQ-20260401-001
```

如果是新项目且缺少顶层设计，先提示使用 `asdd-architecture-generate` skill 生成顶层设计。

---

## 大规模系统需求流程

`asdd-requirements-decompose` 是可选入口，只在大规模系统需求拆分时使用。

适用：

- 用户给的是一整套系统需求。
- 需求覆盖多个模块或多个业务域。
- 需要先拆分主题、模块和功能边界。
- 还没有清晰的单个 REQ 输入。

流程：

```text
asdd-requirements-decompose
  -> 可选：asdd-requirements-review
  -> asdd-architecture-generate
  -> 可选：asdd-architecture-review
  -> asdd-frd-generate
  -> 进入普通需求流程
```

常用调用：

```text
使用 asdd-requirements-decompose skill 拆解以下系统需求：<粘贴完整需求>
使用 asdd-requirements-review skill 审查系统需求拆解
使用 asdd-architecture-generate skill 生成顶层设计
使用 asdd-architecture-review skill 审查顶层设计
使用 asdd-frd-generate skill 为 user-auth 的 T1 生成 FRD
```

---

## 澄清与审查矩阵

```text
| 阶段 | 生成 / 执行 skill | 澄清 / 审查 skill | 什么时候用 |
|------|-------------------|-------------------|------------|
| 系统需求拆分 | asdd-requirements-decompose | asdd-requirements-review | 大需求拆分后，检查模块/主题边界 |
| 顶层设计 | asdd-architecture-generate | asdd-architecture-review | 架构约束、模块边界不清 |
| FRD | asdd-frd-generate | asdd-frd-review | 验收标准、范围、业务规则不清 |
| 关键设计 | asdd-detailed-design-generate | asdd-detailed-design-review | API/DB/前后端设计需要校验 |
| 任务拆分 | asdd-tasks-generate | asdd-tasks-review | 任务不清、TDD 结构不完整、设计变更后同步 |
| 实现代码 | asdd-tasks-implement | asdd-code-review | 检查实现是否满足设计 |
| 工程规范 | asdd-tasks-implement | asdd-rules-review | 检查规则、组件、工程规范合规 |
```

---

## Fast Lane

适用：

- 极小、局部、低风险。
- 不涉及 API 契约变化。
- 不涉及数据库结构变化。
- 不涉及跨模块联动。
- 不涉及权限、安全、审计规则变化。

流程：

```text
asdd-requirement-implement-fast
  -> asdd-code-review
  -> asdd-rules-review
  -> 使用 Playwright E2E 流程验收
  -> asdd-requirement-close
```

常用调用：

```text
使用 asdd-requirement-implement-fast skill 给订单列表状态筛选项增加“已取消”选项
使用 asdd-requirement-implement-fast skill 继续实现 REQ-20260426-003
使用 asdd-code-review skill 审查 REQ-20260426-003
使用 asdd-rules-review skill 检查 REQ-20260426-003 的规范合规
使用 asdd-requirement-close skill 关闭 REQ-20260426-003
```

如果执行中发现需要 API / DB / 跨模块 / 权限安全 / 新依赖 / 不清晰业务规则，停止 fast lane，提示改走普通需求流程。

---

## Bug 分支

规则：Bug 必须先诊断，不直接修复。

流程：

```text
使用 asdd-bug-diagnose skill 诊断 BUG-...
  -> simple bug: 使用 asdd-bug-fix-fast skill 修复 BUG-...
      -> 使用 asdd-code-review skill 审查 BUG-...
      -> 使用 asdd-rules-review skill 检查 BUG-... 的规范合规
      -> 可选：浏览器可见回归使用 Playwright E2E 流程验收
      -> 使用 asdd-bug-close skill 关闭 BUG-...

  -> complex bug: 使用 asdd-frd-generate skill 处理 BUG-...
      -> 普通需求流程
      -> 使用 asdd-bug-close skill 关闭 BUG-...
```

常用调用：

```text
使用 asdd-bug-diagnose skill 排查登录接口 500 的问题：<日志/现象>
使用 asdd-bug-diagnose skill 继续诊断 BUG-20260426-001
使用 asdd-bug-fix-fast skill 修复 BUG-20260426-001
使用 asdd-frd-generate skill 处理 BUG-20260426-001
使用 asdd-bug-close skill 关闭 BUG-20260426-001
```

---

## E2E 验收入口

E2E 是开发完成后的用户可见验收层，不替代开发过程中的 TDD。

输出规则：

- 默认提示使用 Playwright E2E 四段式流程：`使用 asdd-e2etest-playwright-design skill ... -> 使用 asdd-e2etest-playwright-targets skill ... -> 使用 asdd-e2etest-playwright-generate skill ... -> 使用 asdd-e2etest-playwright-run skill ...`。
- targets / run 阶段遇到定位、真实 DOM 或失败现场诊断问题时，可引用官方 `playwright-cli` skill 作为运行时探测能力。
- 除非项目明确安装并启用其他 runner，不提示或生成其他 runner 的 E2E 产物。
- 不把 E2E 验收写成 `tasks.md` 的待完成 checkbox。

---

## 多人协同与合并流程

适用：

- PR 前需要评估 source 分支合并到 target 分支的风险。
- merge/rebase 后出现 `docs/` 下 Spec 文档冲突。
- merge/rebase 后出现源码、测试、配置或迁移脚本冲突。
- 多人并行开发需要确认分支、REQ/BUG 编号和报告归档方式。

流程：

```text
使用 asdd-merge-preflight skill 检查 feature/REQ-20260429-001 分支合并到 develop 分支的风险
使用 asdd-merge-preflight skill source=feature/a target=release/2026-05
  -> 执行 merge / rebase
  -> 如有 Spec 文档冲突：使用 asdd-spec-merge-resolve skill 处理当前合并中的 Spec 文档冲突
  -> 如有代码冲突：使用 asdd-code-merge-resolve skill 分析当前代码冲突并给出合并建议
  -> 运行必要验证
  -> 继续 review / close
```

报告归档：

```text
docs/merge-reports/{session}/preflight.md
docs/merge-reports/{session}/metadata.yml
docs/merge-reports/{session}/spec-conflicts.md
docs/merge-reports/{session}/code-conflicts.md
```

编号提示：

- 多人并行时优先显式指定 `REQ-ID`，例如 `使用 asdd-frd-generate skill 用 REQ-20260429-001 生成 FRD：...`。
- `asdd-frd-generate` 只有在用户未提供编号时才自动推荐编号。

---

## 关闭流程

关闭是人工收口动作，不由 implement、review 或 E2E 自动触发。

需求关闭：

```text
使用 asdd-code-review skill 审查 REQ-...
  -> 使用 asdd-rules-review skill 检查 REQ-... 的规范合规
  -> 使用 Playwright E2E 流程验收
  -> 使用 asdd-requirement-close skill 关闭 REQ-...
```

Bug 关闭：

```text
simple bug:
使用 asdd-code-review skill 审查 BUG-...
  -> 使用 asdd-rules-review skill 检查 BUG-... 的规范合规
  -> 可选：浏览器可见回归使用 Playwright E2E 流程验收
  -> 使用 asdd-bug-close skill 关闭 BUG-...

complex bug:
完成 upgraded_to_req 指向的 REQ
  -> 使用 asdd-requirement-close skill 关闭 REQ-...
  -> 使用 asdd-bug-close skill 关闭 BUG-...
```

常用调用：

```text
使用 asdd-requirement-close skill 关闭 REQ-20260401-001
使用 asdd-bug-close skill 关闭 BUG-20260426-001
```

---

## REQ 当前阶段模式

当输入包含 `REQ-YYYYMMDD-NNN` 时，直接扫描真实文档，判断当前阶段。
不要依赖 `asdd-workbench-overview` 的输出作为事实源。

### 数据源

- `docs/functional-requirements/*/REQ-*.md`
- `docs/modules/*/specs/REQ-*`
- `docs/modules/*/specs/REQ-*/spec.md`
- `docs/modules/*/specs/REQ-*/tasks.md`
- `docs/modules/*/specs/REQ-*-fast-*/fast-design.md`
- `code-review.md`
- `rules-review.md`

### 阶段判断

优先判断已关闭：

- FRD、需求级 `spec.md` 或 fast `fast-design.md` 中 `completed_date` 非空，或 `status = 🔵 已关闭`。

Fast 需求识别：

- 目录名包含 `-fast-`，或 `spec.md` frontmatter 包含 `flow: fast`。

标准需求阶段：

| 当前事实 | 当前阶段 | 推荐下一步 |
|----------|----------|------------|
| 未找到 FRD 和需求目录 | 未定位需求 | 提示检查 ID，或使用 `asdd-frd-generate` skill 创建普通需求 |
| FRD 存在，需求级设计目录不存在 | FRD 已生成 / 待设计 | 可选使用 `asdd-frd-review` skill，然后使用 `asdd-detailed-design-generate` skill |
| 需求级设计存在，`tasks.md` 不存在 | 设计已生成 / 待拆任务 | 可选使用 `asdd-detailed-design-review` skill，然后使用 `asdd-tasks-generate` skill |
| `tasks.md` 存在且有 `- [ ]` | 实现中 | 使用 `asdd-tasks-implement` skill |
| `tasks.md` 全部完成，review 缺失 | 待 review / 验收 / close | 使用 `asdd-code-review` skill + 使用 `asdd-rules-review` skill，然后使用 Playwright E2E 流程验收，并使用 `asdd-requirement-close` skill |
| review 存在且有阻塞项 | review 待修复 | 使用 `asdd-tasks-implement` skill 根据 review 修复后重新 review |
| review 已通过且未关闭 | 待验收 / 待关闭 | 使用 Playwright E2E 流程验收，然后使用 `asdd-requirement-close` skill |
| 已关闭 | 已关闭 | 无需继续；如需查看其他项，使用 `asdd-workbench-overview` skill |

Fast 需求阶段：

| 当前事实 | 当前阶段 | 推荐下一步 |
|----------|----------|------------|
| `fast-design.md` 不存在或不完整 | Fast 建档/设计未完成 | 使用 `asdd-requirement-implement-fast` skill 继续 |
| `fast-design.md` 有 `- [ ]` | Fast 实现中 | 使用 `asdd-requirement-implement-fast` skill 继续实现 |
| `fast-design.md` 全部完成，review 缺失 | Fast 待 review | 使用 `asdd-code-review` skill + 使用 `asdd-rules-review` skill |
| review 已通过且未关闭 | Fast 待验收 / 待关闭 | 使用 Playwright E2E 流程验收，然后使用 `asdd-requirement-close` skill |
| 已关闭 | 已关闭 | 无需继续 |

Review 阻塞判定：

- review 报告结论包含 `待修复`、`D`、`F`，或仍有未处理 Critical / Major 阻塞项时，判定为“review 待修复”。

### REQ 输出格式

```text
ASDD 流程导航：REQ-...

当前判断：
- 类型：标准需求 / Fast 需求
- 模块：{module 或 未识别}
- 当前阶段：{阶段}
- 依据：
  - {列出 3-6 条文件事实}

🔗 后续导航：

  ▶ 推荐下一步：
    - 使用 {skill-name} skill {建议动作}

  ⏭ 后续流程：
    {从当前阶段开始的剩余流程}

  ⏪ 可选回溯：
    - 如果 FRD 范围或验收不清：使用 asdd-frd-review skill 审查 REQ-...
    - 如果设计有问题：使用 asdd-detailed-design-review skill 审查 REQ-...
    - 如果任务拆分不合理：使用 asdd-tasks-review skill 审查 REQ-...
```

---

## BUG 当前阶段模式

当输入包含 `BUG-YYYYMMDD-NNN` 时，扫描真实 bug 文档判断阶段。

### 数据源

- `docs/modules/_bugs/BUG-*/spec.md`
- `docs/modules/_bugs/BUG-*/diagnosis.md`
- `docs/modules/_bugs/BUG-*/fix-design.md`
- `docs/modules/_bugs/BUG-*/tasks.md`
- `docs/modules/_bugs/BUG-*/code-review.md`
- `docs/modules/_bugs/BUG-*/rules-review.md`

### 阶段判断

| 当前事实 | 当前阶段 | 推荐下一步 |
|----------|----------|------------|
| 未找到 bug 目录 | 未定位 bug | 提示检查 ID，或使用 `asdd-bug-diagnose` skill 创建 bug |
| `diagnosis.md` 不存在 | 待诊断 | 使用 `asdd-bug-diagnose` skill |
| `diagnosis.md` 存在但 `fix_mode` 不明确 | 诊断未完成 | 使用 `asdd-bug-diagnose` skill 继续诊断 |
| `fix_mode: fast`，`tasks.md` 不存在或有 `- [ ]` | simple bug 修复中 | 使用 `asdd-bug-fix-fast` skill |
| `fix_mode: fast`，`tasks.md` 全部完成，review 缺失 | simple bug 待 review | 使用 `asdd-code-review` skill + 使用 `asdd-rules-review` skill |
| `fix_mode: fast`，review 已通过 | simple bug 待关闭 | 如涉及浏览器可见回归，先使用 Playwright E2E 流程验收；然后使用 `asdd-bug-close` skill |
| `fix_mode: standard_req`，`upgraded_to_req` 为空 | complex bug 待升级 | 使用 `asdd-frd-generate` skill 处理 BUG-... |
| `upgraded_to_req` 存在 | 已升级需求 | 建议查看对应 REQ 的流程进度 |
| 已关闭 | 已关闭 | 无需继续 |

### BUG 输出格式

```text
ASDD 流程导航：BUG-...

当前判断：
- 类型：Bug
- fix_mode：fast / standard_req / 未明确
- 当前阶段：{阶段}
- 关联需求：{REQ-ID，如有}
- 依据：
  - {列出文件事实}

🔗 后续导航：

  ▶ 推荐下一步：
    - 使用 {skill-name} skill {建议动作}

  ⏭ 后续流程：
    {从当前阶段开始的剩余流程}
```

如果 bug 已升级为 REQ，推荐：

```text
使用 oh-my-asdd-guid skill REQ-... 查看关联需求进度
```

---

## 输出原则

- 先给结论，再给依据。
- 推荐下一步必须是一条可复制的 `使用 <skill-name> skill ...` skill 调用。
- 如果无法定位文件，明确说明扫描范围和可能原因。
- 对可选澄清/review，只标注“可选”；不要把它说成强制，除非流程关闭前确实要求 review。
- 对关闭前流程，保持表达为：review -> 使用 Playwright E2E 流程验收 -> close。
