---
name: asdd-detailed-design-review
description: >
  对已生成的关键设计文档进行审查、澄清和修改。当前文档结构中，模块根目录只保存
  spec.md、overview.md、module-*.md 概览；每次变更的详细设计保存在
  docs/modules/{module}/specs/{REQ-ID}-{name}/ 下。支持设计内部一致性校验、FRD 一致性校验、
  顶层设计合规校验、模块概览同步校验、完整性校验和定向修改。
  确保在以下场景触发本 skill：用户提到审查关键设计、检查设计一致性、澄清设计文档、
  review key design、clarify design、设计有问题、设计冲突、设计不清楚、
  修改关键设计、调整设计文档、FRD 改了同步设计、设计和需求对不上、
  设计和架构不一致、帮我看看设计有没有问题、设计文档审查、design review、
  设计要改、改一下设计、设计不符合规范、check design compliance、
  设计够不够详细、设计能不能拆任务、设计完整性检查、验证设计文档。
---

# asdd-detailed-design-review

对关键设计进行审查、澄清和修改。

当前文档职责：

- `docs/modules/{module}/spec.md`：模块边界、需求索引、模块依赖。
- `docs/modules/{module}/overview.md`：模块导航和主要代码位置。
- `docs/modules/{module}/module-*.md`：模块当前态概览和变更链。
- `docs/modules/{module}/specs/{REQ}/`：本次变更的详细设计过程。

详细设计文件不应出现在模块根目录。

---

## 路径约定

| 资源 | 路径 |
|------|------|
| 模块目录 | `docs/modules/{module}/` |
| 模块主规格 | `docs/modules/{module}/spec.md` |
| 模块概述 | `docs/modules/{module}/overview.md` |
| 模块 API 概览 | `docs/modules/{module}/module-api.md` |
| 模块数据概览 | `docs/modules/{module}/module-database.md` |
| 模块后端概览 | `docs/modules/{module}/module-backend.md` |
| 模块前端概览 | `docs/modules/{module}/module-frontend.md` |
| 需求设计目录 | `docs/modules/{module}/specs/{REQ-ID}-{name}/` |
| 需求主控 spec | `docs/modules/{module}/specs/{REQ-ID}-{name}/spec.md` |
| 需求 API 设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/api-design.md` |
| 需求数据库设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/backend-database-design.md` |
| 需求后端详细设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/backend-detailed-design.md` |
| 需求前端页面设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/frontend-page-design.md` |
| 需求前端详细设计 | `docs/modules/{module}/specs/{REQ-ID}-{name}/frontend-detailed-design.md` |
| FRD | `docs/functional-requirements/{module}/REQ-*.md` |
| 顶层设计 | `docs/constitution.md`、`docs/architecture.md`、`docs/domains/*.md` |
| 规范约束 | `.opencode/rules/` |

---

## 阶段 0：加载上下文

### 0.1 加载规范约束

扫描 `.opencode/rules/` 目录下所有文件，读取全部内容作为规范基准。目录不存在时提示但不阻断。

### 0.2 定位设计范围

用户可指定：

- 需求编号：在 `docs/modules/*/specs/` 下匹配 `REQ-ID`。
- 需求目录：直接读取该目录。
- 模块名：扫描该模块下所有 `specs/{REQ}/`。
- 未指定：扫描所有模块的 `specs/{REQ}/`。

### 0.3 加载文件

对每个目标需求加载：

- 同目录 `spec.md`
- 同目录存在的 `api-design.md`
- 同目录存在的 `backend-database-design.md`
- 同目录存在的 `backend-detailed-design.md`
- 同目录存在的 `frontend-page-design.md`
- 同目录存在的 `frontend-detailed-design.md`
- 模块根目录 `spec.md`、`overview.md`、`module-*.md`
- 对应 FRD
- 顶层设计和领域设计

---

## 阶段 1：设计内部一致性校验

### 1.1 影响对象与详细设计一致

检查 `specs/{REQ}/spec.md` 的“影响对象清单”：

| 检查项 | 说明 | 严重度 |
|--------|------|--------|
| API 对象缺设计 | 影响对象列出 API，但同目录 `api-design.md` 无对应契约 | 🔴 严重 |
| DB 对象缺设计 | 影响对象列出表/字段，但同目录 `backend-database-design.md` 无对应设计 | 🔴 严重 |
| 后端能力缺设计 | 影响对象列出 Service/Job/Consumer，但 `backend-detailed-design.md` 无对应流程 | 🔴 严重 |
| 前端对象缺设计 | 影响对象列出页面/交互，但前端详细设计文件无对应内容 | 🔴 严重 |
| 设计超范围 | 详细设计文件出现 spec.md 影响对象清单之外的大变更 | 🟡 警告 |

### 1.2 详细设计之间一致

| 检查项 | 说明 | 严重度 |
|--------|------|--------|
| DTO 字段不一致 | `api-design.md` 请求/响应字段与前端页面/Store 使用字段不一致 | 🔴 严重 |
| API 与 Service 不一致 | `api-design.md` Controller/Service 方法与 `backend-detailed-design.md` 不一致 | 🔴 严重 |
| DB 与 Service 不一致 | `backend-database-design.md` 表/字段与 Service 处理流程不一致 | 🔴 严重 |
| 页面与交互不一致 | `frontend-page-design.md` 页面/路由与 `frontend-detailed-design.md` Store/Composable 不一致 | 🔴 严重 |
| 前端可测试性契约缺失 | 涉及浏览器关键交互但 `frontend-page-design.md` 未声明稳定 role/label/testid 定位契约 | 🟡 警告 |
| testid 落点缺失 | `frontend-page-design.md` 声明了 `data-testid`，但 `frontend-detailed-design.md` 未说明 Vue 3 / UI 组件库真实落点 | 🟡 警告 |
| testid 高耦合命名 | `data-testid` 使用 AC/BR 编号、业务 ID、权限码、样式名、组件库 class 或无语义编号 | 🟡 警告 |
| P0 交互不可稳定定位 | P0 验收路径中的图标按钮、动态行、弹窗确认、teleport 下拉等既无可访问名也无 `data-testid` | 🔴 严重 |
| 测试场景不足 | 后端/前端详细设计缺少正常、异常、边界测试场景 | 🟡 警告 |
| 测试场景未映射 AC/BR | 后端/前端详细设计的测试场景缺少 `关联 AC/BR`，或未覆盖关键验收标准/业务规则 | 🟡 警告 |
| 测试场景表字段缺失 | 新模板要求的测试类型、场景、Mock、关键断言、优先级未填完整 | 🟡 警告 |
| 弱测试断言 | 关键断言只描述存在、不报错、组件可渲染或 Mock 被调用，未验证可观察行为 | 🟡 警告 |

### 1.3 需求主控文档完整性

`specs/{REQ}/spec.md` 必须包含：

- 本次变更范围
- 不做什么
- 影响对象清单
- 业务流程
- 业务规则
- 设计决策
- 详细设计文件索引
- 验收标准
- 风险与回滚
- 约束引用
- 模块概览同步清单

缺失关键章节为 🔴 严重。

---

## 阶段 2：模块概览同步校验

模块级 `module-*.md` 是当前态索引，必须与本次需求设计保持追溯关系。

| 检查项 | 说明 | 严重度 |
|--------|------|--------|
| API 概览未同步 | `api-design.md` 涉及的 API 未在 `module-api.md` 出现 | 🔴 严重 |
| API 追溯信息缺失 | `module-api.md` 缺少引入需求、最近变更、相关变更或代码位置 | 🟡 警告 |
| 数据概览未同步 | `backend-database-design.md` 涉及的表/字段未在 `module-database.md` 出现 | 🔴 严重 |
| 数据追溯信息缺失 | `module-database.md` 缺少引入需求、最近变更、相关变更或代码位置 | 🟡 警告 |
| 后端概览未同步 | `backend-detailed-design.md` 涉及的能力未在 `module-backend.md` 出现 | 🟡 警告 |
| 前端概览未同步 | 前端设计涉及的页面/Store/Composable 未在 `module-frontend.md` 出现 | 🟡 警告 |
| 能力追溯信息缺失 | `module-backend.md` / `module-frontend.md` 缺少引入需求、最近变更、相关变更或代码位置 | 🟡 警告 |
| 删除无追溯 | 已废弃/删除对象直接消失，未进入废弃与删除记录 | 🔴 严重 |

---

## 阶段 3：FRD 一致性校验

将 `specs/{REQ}/` 与对应 FRD 比对：

| 检查项 | 说明 | 严重度 |
|--------|------|--------|
| 需求目标缺失 | FRD 的核心目标未在 spec.md 中覆盖 | 🔴 严重 |
| 业务规则遗漏 | FRD 的业务规则未在 spec.md 或详细设计中体现 | 🔴 严重 |
| 验收标准缺失 | FRD 的验收标准未映射到 spec.md AC | 🔴 严重 |
| 设计越界 | 详细设计实现了 FRD 范围外的大功能 | 🟡 警告 |

---

## 阶段 4：顶层设计与规则合规校验

检查：

- `constitution.md` 约束引用是否存在。
- `architecture.md` §9 公共能力是否被优先复用。
- 是否新增技术栈、公共组件、错误码段、服务拓扑。
- 是否违反 `.opencode/rules/` 的命名、分层、组件白名单/黑名单、安全规则。

发现需要变更顶层设计时，必须提示用户确认后再修改。

---

## 阶段 5：定向修改

用户要求修改设计时：

1. 定位修改对象：需求目录详细设计、模块概览、FRD 或顶层设计。
2. 先分析上下游影响：
   - 修改 API → 同步 `api-design.md`、相关前端文件、`module-api.md`
   - 修改表/字段 → 同步 `backend-database-design.md`、Service 设计、`module-database.md`
   - 修改 Service → 同步 `backend-detailed-design.md`、`module-backend.md`、tasks.md（如已生成）
   - 修改页面/交互 → 同步前端设计文件、`module-frontend.md`
3. 修改后追加变更记录。
4. 重新执行阶段 1 和阶段 2 的一致性校验。

---

## 阶段 6：输出报告

报告格式：

```text
关键设计审查完成

范围：
  - 模块：{module}
  - 需求：{REQ-ID}

发现问题：
  🔴 严重：{N}
  🟡 警告：{N}
  🟢 提示：{N}

主要问题：
  1. [{级别}] {问题描述}
     位置：{文件路径}
     建议：{修复建议}

已修改文件：
  - {path}（如有）

🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-tasks-generate skill 设计通过后生成 tasks.md
    - 使用 asdd-tasks-review skill 如已生成 tasks.md，设计变更后同步任务

  🔄 当前阶段可选操作：
    - 使用 asdd-detailed-design-review skill 继续审查或修改关键设计

  ⏪ 回溯操作：
    - 使用 asdd-frd-review skill 发现 FRD 问题时修改功能需求
    - 使用 asdd-architecture-review skill 发现顶层设计或约束问题时修改架构设计
```

---

## 硬性规则

1. 不在模块根目录创建详细设计文件。
2. 修改详细设计时必须检查 `module-*.md` 是否需要同步。
3. `module-*.md` 只写当前态概览，不写完整 DDL、请求响应、页面线框、伪代码。
4. 代码是最终事实源。发现文档与代码事实冲突时，先报告冲突并确认修正方向。
