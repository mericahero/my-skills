# Spec 冲突处理策略

## 范围边界

只处理 `docs/**` 下的 ASDD Spec 文档冲突。非 `docs/**` 文件只记录，不修改。

## 风险分级

低风险，可建议批量处理并记录；执行前必须用户确认：

- `docs/INDEX.md`
- `docs/functional-requirements/INDEX.md`
- `docs/unlisted-components.md`
- 不同 REQ/BUG 目录新增导致的导航追加

中风险，必须用户确认：

- `docs/modules/{module}/spec.md`
- `docs/modules/{module}/overview.md`
- `docs/modules/{module}/module-api.md`
- `docs/modules/{module}/module-database.md`
- `docs/modules/{module}/module-backend.md`
- `docs/modules/{module}/module-frontend.md`

高风险，默认只建议；执行前必须用户确认：

- `docs/constitution.md`
- `docs/architecture.md`
- `docs/domains/*.md`
- `docs/requirements/**`
- 同一 `REQ-ID` 或 `BUG-ID` 目录下的过程文档
- 同一 API/DB/backend/frontend 详细设计文件

## 低风险策略

- 索引类文件优先根据真实文件系统重建，不拼接冲突块。
- `docs/functional-requirements/INDEX.md` 按真实 FRD 文件扫描、去重、稳定排序。
- `docs/INDEX.md` 按模块目录和顶层文件扫描，保留人工说明区；无法识别人工说明时升级为中风险。
- `docs/unlisted-components.md` 按包名/组件名去重；同名不同用途升级为中风险。
- 低风险项可以向用户建议“全部按推荐处理”，但用户未确认前不得修改。

## 中风险策略

模块当前态文件按稳定键处理：

| 文件 | 稳定键 |
|------|--------|
| `module-api.md` | `METHOD + PATH` |
| `module-database.md` | `table` 或 `table.field` |
| `module-backend.md` | Service/Job/Consumer/集成点名称 |
| `module-frontend.md` | route/page/component/store/composable 名称 |
| `spec.md` | REQ-ID / BUG-ID / 依赖模块 |
| `overview.md` | 导航路径 / 核心链路名称 |

不同稳定键可建议合并；同一稳定键字段冲突必须用户确认。模块当前态必须以合并后代码事实和已确认设计为准。

## 高风险策略

输出每个冲突对象的：

- ours 意图
- theirs 意图
- 涉及 REQ/BUG
- 影响模块
- 可选方案
- 推荐方案和理由
- 用户决策

用户选择“暂不处理”或“自行处理”时，不修改文件，只记录报告。

## 决策记录

所有风险等级都必须记录用户决策：

- `confirmed`：用户确认由 skill 按指定方案处理。
- `deferred`：用户确认暂不处理，报告标记为未处理。
- `self_resolve`：用户决定自行处理，skill 不修改。

用户可以批量确认低风险项，例如“低风险全部处理”；中风险和高风险必须记录具体范围，不能默认套用。

## 校验

处理后必须检查：

```bash
rg -n "<<<<<<<|=======|>>>>>>>" docs
git diff --name-only --diff-filter=U
```

仍有冲突时，在报告中标记 `pending`，不要为了清空冲突标记而丢失语义。
