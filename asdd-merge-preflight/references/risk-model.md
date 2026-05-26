# 合并预检测风险模型

风险按代码和 Spec 两条线分别评估，最终取最高风险。每个风险项都必须写清楚“对象、两侧变化、证据、建议”。

## 强制高风险

出现任一情况直接判为高风险：

- source 与 target 修改同一代码文件，且涉及业务逻辑、API、DB、权限、安全、审计、事务、状态机、资金或外部集成。
- source 与 target 修改同一 `REQ-ID` / `BUG-ID` 目录。
- source 与 target 修改 `docs/constitution.md`、`docs/architecture.md`、`docs/domains/*.md` 或 `docs/requirements/**`。
- source 与 target 同时新增相同 `REQ-ID` / `BUG-ID`。
- 迁移脚本、锁文件、包管理文件、部署配置存在双边变化。

## Spec 风险

低风险：

- `docs/INDEX.md`
- `docs/functional-requirements/INDEX.md`
- `docs/unlisted-components.md`
- 不同 REQ/BUG 独立目录新增

中风险：

- `docs/modules/{module}/spec.md`
- `docs/modules/{module}/overview.md`
- `docs/modules/{module}/module-api.md`
- `docs/modules/{module}/module-database.md`
- `docs/modules/{module}/module-backend.md`
- `docs/modules/{module}/module-frontend.md`

高风险：

- 全局约束、架构、领域、系统需求
- 同一工作项目录
- 同一 API/table/field/service/page/permission/rule 在两侧出现变化

## 代码风险

低风险：

- 测试文件、文档、样式、局部常量的非重叠新增
- import/export/路由注册/枚举的纯追加

中风险：

- 同一模块不同文件的业务逻辑变化
- 同一文件不同函数或不同 UI 区块变化
- 构建、lint、格式化、测试配置变化

高风险：

- 同一代码文件双边变化
- 同一函数、SQL、校验规则、数据流、状态机或 API handler 双边变化
- 迁移脚本顺序、锁文件、删除/重命名与修改并存

## 建议级别

| 最高风险 | 建议 |
|----------|------|
| 低 | 可以合并，但仍需保留报告 |
| 中 | 合并前指定 owner，实际冲突后优先用对应 resolve skill |
| 高 | 不建议直接合并；先拆分决策或安排合并责任人逐项处理 |

## 证据要求

每个风险项至少包含：

- source 变化摘要
- target 变化摘要
- 文件路径或对象键
- 相关 REQ/BUG
- 推荐处理 skill 或人工决策点
