# Playwright E2E 运行报告

## 元数据

| 字段 | 值 |
|---|---|
| 来源编号 | `{{REQ_OR_BUG_ID}}` |
| 运行器 | `Playwright Test` |
| 执行命令 | `{{COMMAND}}` |
| 基础 URL | `{{BASE_URL}}` |
| 执行结果 | `通过 / 失败 / 阻塞` |
| 运行时间 | `{{DATE}}` |
| UI 框架 | `{{从 e2e-target-map.yml 检测到的组件库}}` |

## 执行配置

| 项目 | 值 |
|---|---|
| 测试层级 | `冒烟 / 核心 / 回归 / 扩展` |
| 视口 | `桌面 / 移动 / 两者 / 无` |
| 稳定性检查 | `无 / 重复 N 次` |
| 执行模式 | `串行 / 并行` |
| 产物 | `标准输出-JSON / JSON / trace / 截图 / 无` |
| 产物目录 | `playwrightE2E/artifacts/{run_id}/` |

## 运行产物

| 类型 | 路径 | 触发原因 |
|---|---|---|
| JSON / JUnit / HTML | `{{路径或无}}` | `{{项目默认输出 / 手动归档}}` |
| trace | `playwrightE2E/artifacts/{run_id}/traces/... 或无` | `{{失败诊断 / 项目默认 / 用户要求}}` |
| snapshot | `playwrightE2E/artifacts/{run_id}/snapshots/... 或无` | `{{playwright-cli 诊断 / 无}}` |
| screenshot | `playwrightE2E/artifacts/{run_id}/screenshots/... 或无` | `{{failure_overview / visual_contract / layout_regression / canvas_chart_pdf / user_requested_evidence / 无}}` |
| video | `playwrightE2E/artifacts/{run_id}/videos/... 或无` | `{{用户要求 / 视觉演示 / 无}}` |

## 场景结果

| 场景 | 优先级 | 结果 | 证据 |
|---|---|---|---|
| `{{scenario_id}}` | `P0/P1/P2` | `通过 / 失败 / 阻塞` | `{{URL/文本/网络/控制台证据}}` |

## 汇总统计

| 指标 | 值 |
|---|---|
| 场景总数 | `{{N}}` |
| 通过 | `{{N}}` |
| 失败 | `{{N}}` |
| 跳过 / 未运行 | `{{N}}` |
| 通过率 | `{{N%}}` |

## 失败详情

| 场景 | 步骤 | 期望 | 实际 | 失败类型 | 自动诊断 |
|---|---|---|---|---|---|
| `{{scenario_id}}` | `{{步骤}}` | `{{期望}}` | `{{实际}}` | `环境 / 脚本错误 / 定位器歧义 / 定位器缺失 / 框架兼容性 / API 参数不匹配 / API 状态码 / 断言失败 / 不稳定 / 应用缺陷` | `{{自动诊断和修复建议}}` |

### 失败类型说明

| 类型 | 说明 |
|---|---|
| `environment` | 服务未启动、网络不通、环境变量缺失 |
| `script_error` | 测试脚本语法或逻辑错误 |
| `locator_ambiguous` | 多个元素匹配同一 locator |
| `locator_missing` | 元素不存在或未出现 |
| `framework_compat` | UI 组件库与 Playwright 默认交互不兼容 |
| `api_param_mismatch` | waitForResponse URL 参数名格式错误 |
| `api_status` | API 返回非预期状态码 |
| `assertion` | 业务断言失败 |
| `flaky` | 多次运行结果不一致 |
| `app_bug` | 前端功能本身有缺陷 |

## 控制台与网络

| 类型 | 详情 |
|---|---|
| 控制台错误 | `{{消息或无}}` |
| 网络失败 | `{{请求/状态码或无}}` |

## playwright-cli 诊断

| 项目 | 详情 |
|---|---|
| 是否执行 | `是 / 否 / 不可用` |
| attach session | `{{session 名或无}}` |
| snapshot | `playwrightE2E/artifacts/{run_id}/snapshots/debug-snapshot.yml 或无` |
| 失败元素 ref | `{{e5 或无}}` |
| 生成 locator | `{{playwright-cli --raw generate-locator 输出或无}}` |
| 元素属性 | `{{data-testid / aria-label / class / 无}}` |
| trace | `{{trace 路径或无}}` |
| screenshot | `playwrightE2E/artifacts/{run_id}/screenshots/... 或无` |
| 结论 | `{{locator 需更新 / target map 需更新 / 应用缺陷 / 环境问题 / 无}}` |

## 可复现性

| 项目 | 详情 |
|---|---|
| 重跑结果 | `结果一致 / 不稳定 / 未重跑` |
| 不稳定信号 | `无 / 重试后通过 / 间歇性失败 / 超时波动` |
| 环境变量齐全 | `是/否 + 缺失的环境变量` |

## 下一步操作

`{{修复定位器缺口 / 修复应用缺陷 / 修复测试脚本 / 更新 e2e-target-map url_param_format / 应用框架兼容性解决方案 / 更新测试设计 / 启动开发服务器 / 提供环境变量}}`

### 下一步操作映射

| 失败类型 | 建议操作 |
|---|---|
| `environment` | 启动前后端服务，检查 `E2E_BASE_URL` |
| `script_error` | 修复测试脚本 |
| `locator_ambiguous` | 在 `e2e-target-map.yml` 中添加 `data-testid` 或缩小定位范围 |
| `locator_missing` | 检查页面路由和条件渲染，更新 target map |
| `framework_compat` | 在 spec 中使用框架适配辅助函数（`nFill()` / `type()`） |
| `api_param_mismatch` | 更新 `e2e-target-map.yml` 的 `url_param_format`，重新生成脚本 |
| `api_status` | 检查测试数据唯一性，确保使用 `ts()` 生成 |
| `assertion` | 检查业务逻辑和测试数据 |
| `flaky` | 增加显式等待条件，检查竞态 |
| `app_bug` | 提交缺陷报告 |
