---
name: asdd-bug-diagnose
description: >
  对 bug 进行诊断建档、证据采集、复现确认、根因分析和复杂度分流。
  本 skill 负责生成或更新 docs/modules/_bugs/{BUG-ID}-{name}/ 下的 spec.md 和 diagnosis.md，
  判定该 bug 走复杂修复（升级到 FRD）还是简单修复（进入 fast fix）。
  注意：本 skill 不自动调用其他 skill，只输出建议的下一步 skill 调用，由用户手动触发。
  确保在以下场景触发本 skill：用户提到排查 bug、定位异常、诊断报错、分析线上问题、
  diagnose bug、investigate error、root cause analysis、错误定位、回归问题排查、
  帮我看看这个 bug、帮我定位异常，即使用户没有明确说“诊断”。
---

# asdd-bug-diagnose

对 bug 进行诊断建档、复现确认、根因分析和修复路径分流。

## 定位

本 skill 是 bug 流程的唯一入口，负责把“口头 bug”变成可追踪、可分流、可继续执行的文档资产。

```text
用户报 bug / 提供异常线索
    |
    v
asdd-bug-diagnose（本 skill：建档 + 诊断 + 分流）
    |
    +--> simple bug  -> 用户手动使用 `asdd-bug-fix-fast` skill 修复 `BUG-...`
    |
    +--> complex bug -> 用户手动使用 `asdd-frd-generate` skill 处理 `BUG-...`
```

## 关键边界

- **本 skill 不自动调用其他 skill。**
- **skill 与 skill 之间的切换由用户手动触发。**
- **诊断必须以证据为基础，不允许“未复现先假定根因”。**
- **复杂度分流是本 skill 的强职责，代码修复不是。**

## 路径约定

| 资源 | 路径 |
|------|------|
| Bug 目录 | `docs/modules/_bugs/{BUG-ID}-{name}/` |
| Bug 规格模板 | `docs/templates/bug-spec-template.md` |
| Bug 诊断模板 | `docs/templates/bug-diagnosis-template.md` |
| 复杂 bug 下游 | `docs/functional-requirements/{module}/REQ-*.md` |
| 简单 bug 下游 | `docs/modules/_bugs/{BUG-ID}-{name}/fix-design.md` + `tasks.md` |
| 顶层约束 | `docs/constitution.md` |
| 架构蓝图 | `docs/architecture.md` |
| 模块概览 | `docs/modules/{module}/overview.md`、`module-*.md` |
| 规范约束 | `.opencode/rules/`（按需读取） |

---

## 阶段 0：前置准备

### 0.1 确认 BUG-ID

支持三种输入：

| 输入 | 处理方式 |
|------|---------|
| 已有 `BUG-YYYYMMDD-NNN` | 直接定位对应目录 |
| 已有 `docs/modules/_bugs/...` 路径 | 直接读取目录 |
| 未提供 BUG-ID，仅描述问题 | 生成新 BUG-ID 并创建目录 |

BUG-ID 格式：

```text
BUG-{YYYYMMDD}-{三位序号}
```

推荐序号规则：
- 扫描 `docs/modules/_bugs/BUG-*`
- 取当天最大序号 +1
- 当天没有记录则从 `001` 开始

### 0.2 确认模板与目录

检查：
- `docs/templates/bug-spec-template.md`
- `docs/templates/bug-diagnosis-template.md`
- `docs/modules/_bugs/`

缺任一模板则中止并提示用户补齐。

### 0.3 加载已有 bug 文档（如存在）

如果 bug 目录已存在，则按需加载：
- `spec.md`
- `diagnosis.md`
- `fix-design.md`
- `tasks.md`

用途：
- 断点恢复诊断
- 避免覆盖已有判断
- 判断是否需要重新分类 simple / complex

---

## 阶段 1：问题受理与事实确认

### 1.1 收集事实输入

优先采集以下信息：
- 现象描述
- 期望行为 / 实际行为
- 报错堆栈 / 日志片段
- 请求参数 / 页面操作步骤
- 触发环境（本地、测试、生产）
- 是否已有失败测试

### 1.2 定位所属模块

依据以下信息推断候选模块：
- 报错类名、包路径、接口路径、页面路径
- `docs/modules/{module}/overview.md`
- `docs/modules/{module}/module-*.md`
- `docs/architecture.md` 的服务职责

如果无法唯一确定模块，必须向用户确认。

### 1.3 创建或更新 `spec.md`

`spec.md` 记录：
- 问题描述
- 修复目标
- 影响范围
- 非目标（如适用）

如果 `spec.md` 已存在，不整文件覆盖，只补齐缺失信息并更新 `last_updated`。

---

## 阶段 2：复现与证据采集

### 2.1 优先复现

能复现时，至少记录以下之一：
- 失败测试
- 失败命令
- 明确的手工复现步骤

### 2.2 RED 证据要求

如果可以通过测试复现，优先使用测试复现，并记录：
- 测试文件/测试方法
- 执行命令
- 失败原因

如果暂时无法用测试复现，也必须明确写出：
- 为什么无法测试复现
- 当前依赖的替代证据（日志、报错、页面录屏、用户步骤）

### 2.3 证据不足时的处理

如果既无法复现，也没有足够日志/堆栈，不得进入根因结论阶段。应在 `diagnosis.md` 中明确标记：

```text
置信度：低
状态：待补充证据
```

并提示用户补充输入后再次调用本 skill。

---

## 阶段 3：调用链追踪与根因分析

### 3.1 代码定位

按最短可验证路径追踪：
- 请求入口 / 页面入口
- Controller / 页面组件
- Service / Store / Composable
- Repository / Mapper / API client
- 触发异常或错误状态的位置

### 3.2 根因分析

区分：
- **直接原因**：触发异常或错误行为的具体代码事实
- **深层原因**：为什么会出现该直接原因

### 3.3 同类风险扫描

搜索项目中是否存在同类模式：
- 同类空值处理遗漏
- 同类状态流转遗漏
- 同类权限校验缺失
- 同类前后端契约不一致

如果发现同类风险，只记录事实和位置，不在本 skill 中扩修。

### 3.4 写入 `diagnosis.md`

`diagnosis.md` 至少包含：
- 错误概要
- 置信度评级
- 代码定位
- 调用链
- 根因分析
- 触发条件
- 修复建议
- 影响面地图
- 同类风险扫描
- 原始错误信息

---

## 阶段 4：复杂度分流

### 4.1 simple bug 判定条件

必须同时满足：
- 单模块内可收敛
- 不引入新的 API 契约
- 不修改数据库表结构 / 索引 / 枚举 / 迁移
- 不修改顶层设计、领域边界、公共能力边界
- 不需要新增依赖
- 可收敛为局部最小修复
- 可通过本地 TDD + 回归验证完成关闭

### 4.2 complex bug 判定条件

命中任一项即判定为 complex：
- 需要新增或重写业务规则，超出当前 bug 修复范围
- 需要跨模块协同改动
- 需要 API / DTO / TS 类型联动调整
- 需要数据库设计变化
- 根因是设计缺失，而非局部实现错误
- 无法收敛为最小修复，需要进入完整设计流程

### 4.3 写入分流结论

在 `diagnosis.md` frontmatter 中写入：

```yaml
fix_mode: "fast | standard_req"
upgraded_to_req: ""
status: "🔴 待处理"
```

并在正文中明确记录：
- 判定结果
- 判定依据
- 建议的下一步 skill 调用

状态字段只表达生命周期。待修复、待升级、已升级需求等具体阶段由 `fix_mode`、`upgraded_to_req`、`fix-design.md` 和 `tasks.md` 推断。

---

## 阶段 5：完成输出

### 5.1 simple bug 输出

输出格式：

```text
✅ Bug 诊断完成

BUG-ID：BUG-...
模块：{module}
复杂度判定：simple

已更新文件：
  - docs/modules/_bugs/BUG-.../spec.md
  - docs/modules/_bugs/BUG-.../diagnosis.md

🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-bug-fix-fast skill 修复 BUG-...
```

### 5.2 complex bug 输出

输出格式：

```text
✅ Bug 诊断完成

BUG-ID：BUG-...
模块：{module}
复杂度判定：complex

已更新文件：
  - docs/modules/_bugs/BUG-.../spec.md
  - docs/modules/_bugs/BUG-.../diagnosis.md

🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-frd-generate skill 处理 BUG-...
```

---

## 关键原则

### 诊断优先，修复后置

本 skill 只负责把问题定位清楚、把修复路径分清楚，不直接进入代码实现。

### skill 内可自动推进，skill 间必须人工切换

本 skill 内可以顺序完成建档、复现、定位、分流；但不得自动调用 `asdd-frd-generate` 或 `asdd-bug-fix-fast`。

### 证据优先于判断

没有复现、没有堆栈、没有代码定位时，不得给出高置信度根因。

### simple 不等于不测试

simple bug 进入 fast lane 后仍必须保持 TDD：先 RED，再最小修复，再 GREEN，再回归验证。
