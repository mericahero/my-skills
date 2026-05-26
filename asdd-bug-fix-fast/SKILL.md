---
name: asdd-bug-fix-fast
description: >
  面向 simple bug 的快速修复 skill。用户可通过 BUG-ID 手动触发，或在未提供 BUG-ID 时
  从活跃 fast bug 候选中选择。本 skill 会读取
  docs/modules/_bugs/{BUG-ID}-{name}/ 下的 diagnosis.md，生成或更新 fix-design.md 和 tasks.md，
  然后按 TDD 执行未完成任务、做回归验证，并在结束时提示用户手动使用 review skill。
  注意：本 skill 不自动调用其他 skill。
  确保在以下场景触发本 skill：用户提到快速修复 bug、修简单 bug、按 bug id 修复、
  fast bug fix、fix simple bug、执行 bug 修复、继续修这个 bug、从 bug 断点继续。
---

# asdd-bug-fix-fast

对 simple bug 执行轻量设计、任务生成、TDD 修复和验证。

## 定位

本 skill 只处理已经由 `asdd-bug-diagnose` 判定为 `fix_mode: fast` 的 bug。

```text
asdd-bug-diagnose
    |
    +--> fix_mode = fast
           |
           v
     asdd-bug-fix-fast（本 skill）
           |
           v
     手动使用：
       使用 asdd-code-review skill 审查 BUG-...
       使用 asdd-rules-review skill 检查 BUG-... 的规范合规
```

## 关键边界

- **本 skill 优先接受 BUG-ID 或 bug 目录路径；未提供时，应先列出活跃 fast bug 供用户选择。**
- **本 skill 不自动调用 review skill。**
- **本 skill 内部必须保持 TDD：RED → 最小修复 → GREEN → 回归验证。**
- **如果执行过程中发现 bug 实际上属于 complex，必须暂停并回退到标准需求流。**

## 路径约定

| 资源 | 路径 |
|------|------|
| Bug 目录 | `docs/modules/_bugs/{BUG-ID}-{name}/` |
| Bug 规格 | `docs/modules/_bugs/{BUG-ID}-{name}/spec.md` |
| Bug 诊断 | `docs/modules/_bugs/{BUG-ID}-{name}/diagnosis.md` |
| Fast 设计模板 | `docs/templates/bug-fix-design-template.md` |
| Fast 设计 | `docs/modules/_bugs/{BUG-ID}-{name}/fix-design.md` |
| Bug 任务模板 | `docs/templates/bug-tasks-template.md` |
| Bug 任务 | `docs/modules/_bugs/{BUG-ID}-{name}/tasks.md` |
| 模块概览 | `docs/modules/{module}/overview.md`、`module-*.md` |
| 顶层约束 | `docs/constitution.md`、`docs/architecture.md` |
| 规范约束 | `.opencode/rules/` |

---

## 阶段 0：入口校验

### 0.0 解析 bug 输入

支持三种入口：

- `BUG-ID`
- bug 目录路径
- 未提供 `BUG-ID`，仅表达“继续修 bug”“修那个 simple bug”

如果未提供 `BUG-ID` / 路径，则执行：

1. 扫描 `docs/modules/_bugs/BUG-*`
2. 读取每个 bug 的 `diagnosis.md`
3. 过滤出：
   - `fix_mode = fast`
   - `completed_date` 为空
   - `status` 不为 `🔵 已关闭`
4. 结合 `fix-design.md`、`tasks.md` 状态推断阶段（待修复 / 修复中 / 待关闭）
5. 按 `last_updated` 倒序列出活跃 fast bug 供用户选择

规则：

- 若只有 1 个候选，先向用户确认再继续。
- 若有多个候选，必须让用户选择，不得自行决定。
- 若没有活跃 fast bug，提示用户提供 `BUG-ID`，或先使用 `asdd-bug-diagnose` skill 创建/分流。

### 0.1 校验 bug 文档

必须存在：
- `spec.md`
- `diagnosis.md`

缺任一文件时中止，并提示先使用：

```text
使用 asdd-bug-diagnose skill 诊断 BUG-...
```

### 0.2 校验分流结论

读取 `diagnosis.md` frontmatter：

```yaml
fix_mode: fast | standard_req
```

如果：
- `fix_mode` 缺失
- `fix_mode = standard_req`

则中止，并提示用户手动使用：

```text
使用 asdd-frd-generate skill 处理 BUG-...
```

---

## 阶段 1：断点恢复判断

每次启动本 skill 时，先判断当前 bug 目录处于哪个阶段。

### 1.1 恢复规则

| 当前状态 | 继续动作 |
|---------|---------|
| 无 `fix-design.md` | 进入阶段 2 生成 fast 设计 |
| 有 `fix-design.md`，无 `tasks.md` | 进入阶段 3 生成任务 |
| 有 `tasks.md` 且存在 `- [ ]` | 进入阶段 4 执行未完成任务 |
| `tasks.md` 全部完成，但验证未完成 | 进入阶段 5 验证 |
| 任务和验证均完成 | 确保 bug `status = 🟢 待关闭`，直接输出 review / close 提示，不重复实现 |

### 1.2 已完成任务处理

当 `tasks.md` 已存在时：
- `- [x]` 的任务跳过
- `- [ ]` 的任务继续执行
- 不回退、不覆盖已完成证据，除非发现证据与诊断矛盾

---

## 阶段 2：生成或更新 fast 设计

### 2.1 设计目标

`fix-design.md` 是 simple bug 的最小设计锚点，用于连接诊断和任务，不替代完整 FRD/详细设计。

### 2.2 必填内容

`fix-design.md` 至少包含：
- 修复边界
- 不变项声明（API 不变 / DB 不变 / 公共能力边界不变）
- 目标修改点
- TDD 策略
- 回归范围
- 文档同步范围

### 2.3 执行约束

如果在生成设计时发现需要：
- API 变化
- 数据库设计变化
- 跨模块联动
- 顶层设计调整

则立即停止，并将 `diagnosis.md` 中的 `fix_mode` 改为 `standard_req`，提示用户改走：

```text
使用 asdd-frd-generate skill 处理 BUG-...
```

同时将 bug `spec.md` / `diagnosis.md` 的生命周期 `status` 保持或更新为 `🟡 进行中`，不得写入 `completed_date`。

正常生成或更新 `fix-design.md` 后，也应将 bug `spec.md` / `diagnosis.md` 的生命周期 `status` 保持或更新为 `🟡 进行中`，并同步 `last_updated`；不得写入 `completed_date`。

---

## 阶段 3：生成或更新 bug 任务

### 3.1 任务来源

`tasks.md` 基于以下文档生成：
- `spec.md`
- `diagnosis.md`
- `fix-design.md`
- 模块概览和必要代码事实

### 3.2 任务结构

必须包含：
- RED 复现任务
- 最小修复任务
- GREEN 验证任务
- 回归验证任务
- 文档同步任务

### 3.3 TDD 证据

`tasks.md` 必须包含 TDD 证据表，记录：
- RED 测试
- RED 命令
- RED 失败原因
- GREEN 命令
- 影响范围验证

生成或更新 `tasks.md` 后，同步 bug `spec.md` / `diagnosis.md`：

- `status` → `🟡 进行中`
- `last_updated` → 当前日期
- 不写入 `completed_date`

---

## 阶段 4：执行未完成任务

### 4.1 执行顺序

按 `tasks.md` 顺序执行，只处理未完成项。

### 4.2 TDD 强制顺序

对行为修复任务，必须遵循：

1. 先写或补齐 RED 测试
2. 运行 RED，确认失败原因与 `diagnosis.md` 一致
3. 编写最小修复代码
4. 运行 GREEN
5. 运行受影响范围验证
6. 回填 `tasks.md`

### 4.3 最小修复原则

- 代码变更聚焦当前 bug
- 不顺手做需求外改造
- 不补做“顺便优化”
- 不引入新依赖，除非重新分流

### 4.4 中途升级规则

执行过程中如果发现：
- 当前修复无法在 simple 范围内完成
- 需要额外设计文件
- 需要改变既有契约或数据结构

则立即暂停：
- 更新 `diagnosis.md` 为 `fix_mode: standard_req`
- 将 bug `spec.md` / `diagnosis.md` 的 `status` 保持或更新为 `🟡 进行中`
- 保留现有证据和已完成任务
- 提示用户手动使用 `asdd-frd-generate` skill 处理 `BUG-...`

---

## 阶段 5：验证与收口

### 5.1 必做验证

- 复现用例 GREEN
- 受影响范围验证通过
- 必要的局部/模块测试通过
- `tasks.md` 中的 TDD 证据已回填

### 5.2 文档同步

如果 bug 修复影响模块当前态，按需同步：
- `module-api.md`
- `module-database.md`
- `module-backend.md`
- `module-frontend.md`

完成 fast 修复后，更新 bug frontmatter：

- `status` → `🟢 待关闭`
- `last_updated` → 当前日期
- 不写入 `completed_date`

只有在用户确认回归、review 通过并决定关闭 bug 时，才可以由 close skill 将：

- `status` → `🔵 已关闭`
- `completed_date` → 当前日期

上述关闭动作不由本 skill 执行，必须由用户手动调用：

```text
使用 asdd-bug-close skill 关闭 BUG-...
```

### 5.3 结束提示

本 skill 结束时只提示用户手动 review，不自动调用。

输出格式：

```text
✅ Fast bug fix 完成

BUG-ID：BUG-...
模块：{module}

已更新文件：
  - docs/modules/_bugs/BUG-.../fix-design.md
  - docs/modules/_bugs/BUG-.../tasks.md
  - {代码文件列表}

🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-code-review skill 审查 BUG-...
    - 使用 asdd-rules-review skill 检查 BUG-... 的规范合规
    - 如涉及浏览器可见回归，使用 asdd-e2etest-playwright-design skill 为 BUG-... 设计回归 E2E，并继续 targets/generate/run
    - review 与验收通过后，使用 asdd-bug-close skill 关闭 BUG-...
```

---

## 关键原则

### fast 只压缩文档链，不压缩质量门

simple bug 可以跳过完整 FRD / 详细设计链，但不能跳过 TDD、验证和 review。

### 断点恢复优先

已有 `fix-design.md` / `tasks.md` / 任务状态时，优先恢复，不重头覆盖。

### 发现复杂化立即止损

当 bug 不再满足 fast 条件时，及时升级为 `standard_req`，而不是硬修到一半。
