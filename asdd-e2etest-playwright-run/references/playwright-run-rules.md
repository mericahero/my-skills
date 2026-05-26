# Playwright 运行规则

## 命令检测

优先级：
1. `package.json` 中已有 `test:e2e` / `e2e` / `playwright` 脚本
2. `npx playwright test playwrightE2E/generated/{file}.spec.ts`
3. `pnpm playwright test ...`
4. `bunx playwright test ...`

如果 Playwright 未安装，不自动安装。报告为 BLOCKED，并说明需要用户选择是否引入依赖。

## 产物目录

每次运行生成一个 `run_id`，建议格式为 `YYYYMMDD-HHmmss`。所有由 ASDD E2E 流程主动生成或归档的运行产物放到当前工作项目录：

```text
playwrightE2E/artifacts/{run_id}/
```

推荐子目录：

```text
playwrightE2E/artifacts/{run_id}/screenshots/
playwrightE2E/artifacts/{run_id}/traces/
playwrightE2E/artifacts/{run_id}/videos/
playwrightE2E/artifacts/{run_id}/snapshots/
playwrightE2E/artifacts/{run_id}/reports/
```

不要把截图、trace、video 写到仓库根目录或项目根目录。`playwrightE2E/artifacts/` 是本地运行产物，默认由 `.gitignore` 忽略；需要长期留档时，由用户明确要求后再单独归档或强制提交指定文件。若 Playwright 项目配置已自动生成 `test-results/` 或 `playwright-report/`，报告中记录原始路径；如需归档，再复制或引用到上述工作项产物目录。

## playwright-cli 失败诊断

当失败类型可能是 `locator_ambiguous`、`locator_missing`、`framework_compat`、`api_param_mismatch` 或业务断言和真实页面状态不一致时，优先用 `playwright-cli` attach 到 Playwright Test 的暂停现场，而不是凭日志猜测。

命令能力与完整用法参考官方 [playwright-cli](../../playwright-cli/SKILL.md) skill；本流程只规定 ASDD 的失败诊断时机、产物目录和报告字段。

### 触发条件

- Playwright 输出包含 strict mode、locator timeout、waiting for selector、click intercepted、element not visible。
- 表单提交后没有请求发出，疑似 UI 框架输入事件未触发。
- `waitForResponse` 超时，但页面实际可能发出了不同 URL 或参数名。
- 断言文本/URL 与实际页面不一致，需要确认浏览器当前 DOM。

### 调试流程

1. 以不会自动打开 HTML report 的方式运行失败 spec：
   ```bash
   PLAYWRIGHT_HTML_OPEN=never npx playwright test playwrightE2E/generated/{{file}}.spec.ts --debug=cli
   ```
   如果项目有自定义 e2e 脚本，保留项目脚本，只追加等价的 `--debug=cli` 参数。
2. 该命令应在后台保持运行，直到输出出现 Debugging Instructions 和 session 名。
3. 使用 `playwright-cli attach {{session}}` 连接到暂停中的测试。
4. 在失败步骤前后执行：
   ```bash
   playwright-cli snapshot --filename=playwrightE2E/artifacts/{{run_id}}/snapshots/debug-snapshot.yml
   playwright-cli --raw generate-locator e5
   playwright-cli eval "el => el.getAttribute('data-testid')" e5
   playwright-cli console error
   playwright-cli network
   ```
5. 如需人工查看失败现场，可额外执行：
   ```bash
   playwright-cli screenshot --filename=playwrightE2E/artifacts/{{run_id}}/screenshots/{{scenario_id}}-failure-overview.png
   ```
6. 如需完整现场，使用 `playwright-cli tracing-start` / `tracing-stop`，并把 trace 路径写入报告。
7. 结束后停止后台 debug 进程，避免遗留浏览器和 Node 进程。

### 诊断产出

运行报告必须记录：

- 是否执行 `playwright-cli` 诊断。
- attach session 名。
- snapshot 文件路径。
- 失败元素 ref、`generate-locator --raw` 输出和关键属性。
- 当前 URL、console error、failed network request。
- screenshot 文件路径和触发原因（如果生成）。
- 建议更新的位置：测试脚本、`e2e-target-map.yml`、业务代码可测试性，或运行环境。

## 截图规则

默认不截图。只有以下情况允许截图：

- 失败现场需要人工快速判断页面状态，且 trace/snapshot 之外仍有直观价值。
- 场景类型是视觉契约、布局回归、Canvas/图表/地图/PDF 预览。
- 用户明确要求保留截图作为验收证据。

截图必须保存到：

```text
playwrightE2E/artifacts/{run_id}/screenshots/
```

文件名使用 `{scenario_id}-{step_id}.png` 或 `{scenario_id}-failure-overview.png`。截图只作为辅助证据；除非场景明确是视觉回归测试，否则不得作为唯一失败/通过依据。

## 环境

需要：
- `E2E_BASE_URL`
- 场景引用的账号、密码、token 等环境变量
- 运行中的前后端服务

缺失时报告 BLOCKED，不猜测默认账号。

## 失败分类

失败后按以下类型分类。分类影响报告中的 `auto_diagnosis` 和 `next_action`。

### 分类表

| 类型 | 特征 | 排查优先级 | 典型修复 |
|------|------|-----------|---------|
| `environment` | 连接超时、DNS 失败、ECONNREFUSED、服务未启动 | 1 | 启动前后端服务、检查 `E2E_BASE_URL` |
| `script_error` | 语法错误、TypeError、变量未定义、import 失败 | 2 | 修复测试脚本本身 |
| `locator_ambiguous` | strict mode violation：多个元素匹配同一 locator | 3 | 缩小定位范围（限定 dialog 内）、加 `data-testid` |
| `locator_missing` | 元素不存在、waitFor 超时、`waiting for selector` | 4 | 检查路由、检查条件渲染、检查弹窗是否已打开 |
| `framework_compat` | fill 后表单不提交、`toBeDisabled()` 对 Naive UI 无效、弹窗内定位失败 | 5 | 使用 `type()` 替代 `fill()`、用 `toHaveClass()` 替代 `toBeDisabled()` |
| `api_param_mismatch` | `waitForResponse` 超时但无匹配请求、URL 中参数名不匹配 | 6 | 检查 `url_param_format`，使用实际参数名（snake_case vs camelCase） |
| `api_status` | 响应状态码不符合预期（409、403、422、500） | 7 | 检查数据冲突（唯一约束）/ 权限 / 后端校验逻辑 |
| `assertion` | 业务断言失败：文本不匹配、URL 不对、元素状态错误 | 8 | 检查业务逻辑 / 测试数据 / 前端渲染 |
| `flaky` | 同一脚本多次运行结果不一致、超时时间接近边界 | 9 | 增加 timeout、添加显式等待条件、检查竞态 |
| `app_bug` | 前端 JS 报错、功能本身不工作、白屏 | 10 | 记录 bug，不修改测试 |

### 分类决策树

```
失败
├── 有 network error / ECONNREFUSED？
│   └── environment
├── 有 TypeError / SyntaxError / ReferenceError？
│   └── script_error
├── 有 "strict mode violation" / "resolved to N elements"？
│   └── locator_ambiguous
├── 有 "waiting for selector" / "locator not found"？
│   └── locator_missing
├── waitForResponse 超时 + 无匹配请求发出？
│   ├── 表单未提交（fill 后无 POST）
│   │   └── framework_compat
│   └── URL 参数名不匹配
│       └── api_param_mismatch
├── 有 409 / 403 / 422 状态码？
│   └── api_status
├── 有 expect(...).toBe(...) 失败？
│   └── assertion
├── 同一脚本多次运行结果不一致？
│   └── flaky
└── 前端 JS error / 功能不工作
    └── app_bug
```

### 自动诊断规则

根据失败类型自动生成诊断建议：

| 失败类型 | 自动诊断 |
|---------|----------------|
| `framework_compat` + Naive UI | "Naive UI `fill()` 不触发 Vue 响应式更新，建议改用 `type()` 或使用 spec 模板中的 `nFill()` 辅助函数" |
| `api_param_mismatch` | "URL 参数名格式不匹配。检查 `e2e-target-map.yml` 中的 `url_param_format`，使用实际参数名（可能为 snake_case）" |
| `locator_ambiguous` | "多个元素匹配同一 locator。建议限定在 `dialog(page)` 范围内，或为元素添加 `data-testid`" |
| `api_status: 409` | "数据唯一约束冲突。检查测试数据是否使用 `ts()` 动态生成，避免硬编码邮箱/手机号" |

## 失败处理

失败后：
1. 读取 Playwright 输出。
2. 汇总第一个真实失败。
3. 按上述分类决策树判定失败类型。
4. 生成 `auto_diagnosis` 建议。
5. 如场景声明 `flake_check`，按声明重复运行同一 spec 或同一场景，并记录是否同样失败。
6. 写入运行报告，不修改业务代码。

## 证据与健康门

- 默认记录 URL、文本/locator 断言、console error、network failure 和退出码。
- 如果有 Playwright JSON/JUnit/HTML 报告，优先提取结构化结果。
- trace/screenshot/video 只在项目已有配置、失败诊断需要、视觉类场景或用户明确要求时引用。
- 不因为重试通过就判定完全通过；报告中标记为不稳定（flaky）。
