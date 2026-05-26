# Playwright 生成规则

## 文件位置

生成到：
```text
playwrightE2E/generated/{REQ_OR_BUG_ID}.spec.ts
```

如果项目已有 E2E 目录和命名约定，也可以同时建议复制到项目测试目录，但不得覆盖现有测试。

## 测试代码规则

- 使用 `@playwright/test`。
- 使用 `test.describe` 按工作项分组。
- 使用 `test.step` 对应场景步骤。
- 使用 target map 中的首选定位方式；如果存在 `targets.*.runtime_probe.generated_locator` 且有代码证据支撑，优先使用该 locator。
- 优先使用自动等待 locator，不使用固定 sleep。
- 等待必须绑定明确条件：locator 可见/可用、URL 变化、特定 response、DOM 状态或应用状态；不得使用任意 `waitForTimeout` 作为稳定性手段。
- 断言使用 `await expect(...)`。
- `baseURL` 来自 Playwright 配置或 `process.env.E2E_BASE_URL`。
- 密码、token、账号使用环境变量，不写入文档。
- 每个场景保持独立数据和状态；不得依赖前一个场景的登录态、缓存、排序或副作用。
- 如 `e2e-scenarios.yml` 声明 viewports，只生成该场景需要的 viewport 项；不要默认扩大到全浏览器矩阵。

## locator 生成来源

`playwright-cli` 可生成真实 DOM 上的 Playwright locator，但生成结果必须经过筛选后再写入 spec。

### 采信优先级

1. `targets.*.runtime_probe.generated_locator`，并且 locator 不依赖临时 DOM、随机文本、易变排序。
2. target map 的 `preferred` 语义定位：`role` / `label` / `testid`；使用 `testid` 前确认 `testability_contract.contract_status` 不是 `invalid_naming` 或 `missing_in_code`。
3. target map 的 `fallback`，仅在有明确代码证据且不会跨页面冲突时使用。
4. 稳定语义 CSS，例如 `input[name="email"]`、业务容器 `data-testid` 内的控件。

### 生成约束

- `playwright-cli` 录制动作只能作为交互顺序和 locator 证据，不能替代需求驱动断言。
- 断言文本内容时，避免 `await expect(page.getByText('文本')).toHaveText('文本')` 这类自证式断言。文本 locator 更适合 `toBeVisible()`；需要断言容器文本时，优先用 `getByTestId()`、`getByLabel()` 或限定范围后的 role locator。
- 对 `strict mode violation` 风险较高的按钮和输入框，必须限定范围，例如 `dialog(page)`、表格行、导航区域、表单区域。
- 如果目标的 `runtime_probe.status` 是 `blocked` 或 `not_run`，但 locator 又只能靠猜测得到，不生成该步骤；转为 `locator-gaps.md` blocker。
- 允许使用 `toMatchAriaSnapshot()` 做局部可访问树断言，但只断言必要区域，避免把整页动态内容固化进测试。

## 网络等待时序

`waitForResponse` / `waitForRequest` 的时序规则：**必须先注册监听，再执行触发操作。**

### 正确模式

```typescript
// 模式 1：Promise.all（推荐，用于 click 触发的请求）
const [resp] = await Promise.all([
  page.waitForResponse(r => r.url().includes('/users') && r.request().method() === 'POST'),
  button.click(),
]);
expect(resp.status()).toBe(200);

// 模式 2：先创建 Promise，再触发（用于非 click 触发，如 select 选项）
const respPromise = page.waitForResponse(
  r => r.url().includes('/users') && r.url().includes('auth_source=local'),
  { timeout: 10000 }
);
await trigger.click();
await option.click();
const resp = await respPromise;
expect(resp.status()).toBe(200);
```

### 禁止模式

```typescript
// 错误：先触发操作，再等待响应 — 响应可能在监听之前就已完成
await button.click();
const resp = await page.waitForResponse(...); // 可能永远等不到
```

## 测试数据唯一性

所有通过 UI 或 API 创建的实体数据，**必须**动态生成唯一值。

### 规则

- 用户名、邮箱、手机号等有唯一约束的字段，禁止硬编码。
- 每次测试运行都应生成全新数据，不依赖历史数据。
- 清理逻辑放在 `afterAll` / `afterEach` 中，通过 API 删除创建的测试数据。

### 工具函数

每个 spec 文件必须包含以下工具函数：

```typescript
function ts(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
```

### 数据生成模板

| 字段 | 生成方式 | 示例 |
|------|---------|------|
| 用户名 | `` `e2e-{type}-${ts()}` `` | `e2e-test-user-m5k2j8abc` |
| 邮箱 | `` `e2e-${ts()}@test.com` `` | `e2e-m5k2j8abc@test.com` |
| 手机号 | `` `138${ts().slice(-8).padEnd(8, '0')}` `` | `1382j8abc00` |
| 服务账号名 | `` `e2e-svc-${ts()}` `` | `e2e-svc-m5k2j8abc` |

禁止使用以下硬编码值：
- `e2e@test.com`、`test@test.com`
- `13800138000`、`13800000000`
- `test-user`、`e2e-user`

## UI 框架适配

从 `e2e-target-map.yml` 的 `framework_hints` 段读取适配策略，生成对应的测试代码。

### Naive UI

当 `framework_hints.ui_library` 为 `naive-ui` 时，强制使用以下策略：

**输入框**：使用 `type()` 逐字输入，不用 `fill()`。

```typescript
// Naive UI 输入：type() 触发 Vue 响应式更新
async function nFill(locator: Locator, value: string): Promise<void> {
  await locator.click();
  await locator.fill('');
  await locator.type(value, { delay: 30 });
}

// 使用示例
await nFill(dialog(page).getByPlaceholder('请输入用户名'), username);
await nFill(dialog(page).getByPlaceholder('请输入密码'), password);
```

**下拉选项**：选项渲染在 body 层的 teleport 容器中，使用全局 page 级别定位器。

```typescript
// Naive UI 下拉选择
async function nSelectOption(page: Page, triggerSelector: string, optionText: string): Promise<void> {
  await page.locator(triggerSelector).click();
  await page.locator('.n-base-select-option__content')
    .filter({ hasText: optionText })
    .click();
}
```

**禁用状态检测**：使用 `toHaveClass()` 替代 `toBeDisabled()`。

```typescript
// Naive UI 禁用状态
await expect(switchElement).toHaveClass(/n-switch--disabled/);
// 而非 toBeDisabled()
```

**弹窗范围**：所有弹窗内元素限定在 `getByRole('dialog')` 范围内。

```typescript
function dialog(page: Page) {
  return page.getByRole('dialog');
}
// 弹窗内的输入框
await dialog(page).getByPlaceholder('请输入用户名').click();
```

### Element Plus

当 `framework_hints.ui_library` 为 `element-plus` 时：

- 输入框：`fill()` 可正常使用。
- 下拉选项：`.el-select-dropdown__item` 在 body teleport 层，使用全局定位器。
- 禁用状态：`toBeDisabled()` 正常工作。

### Ant Design Vue

当 `framework_hints.ui_library` 为 `ant-design-vue` 时：

- 输入框：`fill()` 可正常使用。
- Modal：`getByRole('dialog')`。
- 禁用状态：检查 `aria-disabled="true"` 或 `toBeDisabled()`。

### 未识别框架

当 `framework_hints.ui_library` 为 `unknown` 时：

- 输入框：保守使用 `type()` 而非 `fill()`。
- 在 spec 文件头部注释说明未识别框架，建议人工验证。

## 控制台 / 网络

如场景要求 `no_console_error`：
- 收集 `page.on('console')` 中 error。
- 忽略明确列入场景白名单的第三方噪声。
- 测试末尾断言错误列表为空。

如场景要求网络断言：
- 使用 `page.waitForResponse` 等待特定 API。
- URL 匹配条件必须使用 `url_param_format` 中记录的**实际参数名格式**。
- 断言 status、关键响应字段或页面最终状态。

### URL 参数匹配

从 `e2e-target-map.yml` 的 `url_param_format` 获取实际参数格式。生成 `waitForResponse` 匹配条件时：

```typescript
// 如果 url_param_format.query_params = "snake_case"
// 使用 auth_source=local 而非 authSource=local
page.waitForResponse(r => r.url().includes('/users') && r.url().includes('auth_source=local'))

// 如果 url_param_format.query_params = "camelCase"
page.waitForResponse(r => r.url().includes('/users') && r.url().includes('authSource=local'))
```

不得假设参数名格式；必须以 `url_param_format` 的探测结果为准。

## 截图策略

默认不生成截图断言，也不把截图作为常规业务测试的通过依据。截图只能作为辅助产物或专门视觉场景的证据。

### 允许截图的场景

- `failure_overview`：失败后给人工查看页面概览，如白屏、错误页、遮罩、弹窗未打开。
- `visual_contract`：需求明确要求视觉状态，如主题、布局、响应式断点。
- `layout_regression`：修复或防止布局错位、遮挡、滚动区域异常。
- `canvas_chart_pdf`：Canvas、图表、地图、PDF 预览等结构化 DOM 难以充分断言的输出。
- `user_requested_evidence`：用户明确要求保留截图作为验收证据。

### 禁止用法

- 不得使用截图坐标定位元素。
- 不得用截图替代可结构化断言的 URL、文本、role、表单状态、网络响应。
- 不得默认生成截图 baseline；只有专门视觉回归测试才允许引入截图比对。
- 不得把截图写到仓库根目录、项目根目录或临时散落目录。

### 存放路径

所有截图写入当前工作项目录下：

```text
playwrightE2E/artifacts/{run_id}/screenshots/{scenario_id}-{step_id}.png
```

`run_id` 使用运行时间生成，例如 `20260427-153012`。同一次运行的 trace、video、snapshot 可放到同级目录：

```text
playwrightE2E/artifacts/{run_id}/traces/
playwrightE2E/artifacts/{run_id}/videos/
playwrightE2E/artifacts/{run_id}/snapshots/
```

run report 只记录相对路径和截图触发原因，不内嵌图片内容。`playwrightE2E/artifacts/` 是本地运行产物，默认由 `.gitignore` 忽略；需要长期留档时，应由用户明确要求后再单独归档或强制提交指定文件。

## 稳定性 / 产物

- 如场景声明 `flake_check: repeat-N`，生成或建议对应 repeat 命令；不要用重试掩盖真实失败。
- 默认不截图；只在失败概览、视觉类场景、用户明确要求或场景声明 `optional_on_failure` 时启用 screenshot。
- 失败证据优先来自 Playwright JSON 输出、URL、文本、locator 状态、console 和 network 摘要。
