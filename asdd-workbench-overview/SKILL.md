---
name: asdd-workbench-overview
description: >
  扫描 ASDD 文档目录，输出全局工作台视图。基于目录结构、frontmatter 字段、tasks.md 或 fast-design.md 状态，
  识别活跃需求、活跃 bug、已关闭需求、已关闭 bug、生命周期分布、最近关闭时间和待关闭项。
  不依赖额外 index 文件，不修改任何文档。适用于全局盘点、迭代把控、开始设计前选需求、
  开始 bug 修复前选 bug、查看当前有哪些活跃工作项、查看完成情况和完成时间。
---

# asdd-workbench-overview

扫描仓库中的 REQ / BUG 文档，输出全局工作台视图。

## 定位

这是一个只读态势视图 skill，用来回答：

- 当前有哪些活跃需求？
- 当前有哪些活跃 bug？
- 哪些需求已经关闭，什么时候关闭的？
- 哪些 bug 已经关闭，什么时候关闭的？
- 哪些项卡在待确认 / 设计中 / 实现中 / 修复中 / 待关闭？

本 skill 不创建索引、不回填状态、不修改文件。

它也不是其他 skill 的输入文档来源。
其他 skill 仍然必须直接扫描真实的 REQ / BUG 文档和目录。

---

## 数据源

### 需求（REQ）

- `docs/functional-requirements/*/REQ-*.md`
- `docs/modules/*/specs/REQ-*`
- `docs/modules/*/specs/REQ-*/tasks.md`
- `docs/modules/*/specs/REQ-*-fast-*/fast-design.md`

### 缺陷（BUG）

- `docs/modules/_bugs/BUG-*`
- `docs/modules/_bugs/BUG-*/diagnosis.md`
- `docs/modules/_bugs/BUG-*/spec.md`
- `docs/modules/_bugs/BUG-*/tasks.md`

---

## 状态推断规则

以 `docs/SPEC-DESIGN.md` 中的规则为准，优先级如下。

### REQ 生命周期与阶段推断

生命周期 `status` 只认可：`🔴 待处理` / `🟡 进行中` / `🟢 待关闭` / `🔵 已关闭`。

阶段推断：

1. 若 FRD 或需求级 `spec.md` 的 `completed_date` 非空，判定生命周期为“已关闭”
2. 若 FRD `status = 🔵 已关闭`，判定生命周期为“已关闭”
3. 若 `status = 🟢 待关闭`、标准需求 `tasks.md` 任务全为 `- [x]`，或 fast 需求 `fast-design.md` 任务全为 `- [x]`，阶段为“待关闭”
4. 若标准需求 `tasks.md` 存在且仍有 `- [ ]`，或 fast 需求 `fast-design.md` 存在且仍有 `- [ ]`，阶段为“实现中”
5. 若 `specs/{REQ}/spec.md`、任一 `*-design.md` 或 fast 需求 `fast-design.md` 存在，阶段为“设计中 / 待拆任务”
6. 若仅 FRD 存在，阶段为“待确认 / 待设计”

Fast 需求识别规则：

- 目录名匹配 `REQ-*-fast-*`，或
- `spec.md` frontmatter `flow: fast`

Fast 需求不要求存在 FRD、完整详细设计或 `tasks.md`。

### BUG 生命周期与阶段推断

生命周期 `status` 只认可：`🔴 待处理` / `🟡 进行中` / `🟢 待关闭` / `🔵 已关闭`。

阶段推断：

1. 若 `diagnosis.md` 或 `spec.md` 的 `completed_date` 非空，判定生命周期为“已关闭”
2. 若 `status = 🔵 已关闭`，判定生命周期为“已关闭”
3. 若 `status = 🟢 待关闭` 或 `tasks.md` 存在且任务全为 `- [x]`，阶段为“待关闭”
4. 若 `fix_mode = standard_req` 且 `upgraded_to_req` 指向的 REQ 已关闭，阶段为“待关闭”
5. 若 `fix_mode = standard_req` 且 `upgraded_to_req` 非空，阶段为“已升级需求”
6. 若 `tasks.md` 存在且仍有 `- [ ]`，阶段为“修复中”
7. 若 `diagnosis.md` 已存在，阶段为“待修复 / 待升级”

### 时间字段

- 首选：
  - REQ：`completed_date`
  - BUG：`completed_date`
- 若终态已明确但 `completed_date` 为空：
  - 使用 `last_updated` 作为推断完成时间
  - 输出时必须标记“推断”

---

## 输入方式

支持以下输入：

- 无参数：输出全局总览
- 模块名：只看某个模块
- `active`：只看活跃项
- `completed`：只看完成项
- `req`：只看需求
- `bug`：只看缺陷
- 组合过滤：如 `active bug`、`completed req user-auth`

如果用户表达不明确，默认输出：

1. 全局摘要
2. 活跃需求
3. 活跃 bug
4. 最近关闭的需求和 bug

---

## 输出格式

建议输出结构：

```text
📊 ASDD 全局工作台

摘要：
  活跃需求：{N}
  活跃 bug：{N}
  已关闭需求：{N}
  已关闭 bug：{N}

阶段分布：
  生命周期：待处理 {n} / 进行中 {n} / 待关闭 {n} / 已关闭 {n}
  需求阶段：待确认 {n} / 设计中 {n} / 实现中 {n} / 待关闭 {n} / 已关闭 {n}
  缺陷阶段：待修复 {n} / 修复中 {n} / 已升级需求 {n} / 待关闭 {n} / 已关闭 {n}

活跃需求：
  - REQ-... | {module} | {name} | {阶段} | 最近更新 {date}

活跃 bug：
  - BUG-... | {module} | {title} | {fix_mode} | {阶段} | 最近更新 {date}

最近关闭：
  - REQ-... | {module} | 关闭于 {date}
  - BUG-... | {module} | 关闭于 {date}

待关注项：
  - 标准需求 tasks 已全部完成但 completed_date 仍为空，或 fast 需求 fast-design 任务已全部完成但 completed_date 仍为空
  - bug 已待关闭但未关闭超过 {N} 天的项
  - 状态字段与目录事实不一致的项

🔗 后续导航：

  ▶ 根据工作台选择下一步：
    - 使用 oh-my-asdd-guid skill REQ-... 查看需求当前阶段和下一步
    - 使用 oh-my-asdd-guid skill BUG-... 查看 bug 当前阶段和下一步

  🔄 当前阶段可选操作：
    - 使用 asdd-workbench-overview skill active 查看活跃项
    - 使用 asdd-workbench-overview skill completed 查看已关闭项
```

---

## 使用原则

### 只读

本 skill 只扫描和汇总，不负责修正文档。

### 字段优先，目录兜底

有明确 frontmatter 时优先使用 frontmatter；
字段缺失或未同步时，再用目录、`tasks.md` 或 `fast-design.md` 状态兜底推断。

### 明确标记推断

凡不是由 `completed_date` 直接给出的完成时间，都要标记为“推断时间”。

### 不作为事实源

本 skill 的职责是展示，不是供其他 skill 读取结果。

当设计类 skill 未传 `REQ-ID`，或 bug 修复类 skill 未传 `BUG-ID` 时：

- 其他 skill 必须直接扫描真实目录和 frontmatter
- 可以复用本 skill 的判定规则
- 不能把本 skill 的输出当成输入事实源
