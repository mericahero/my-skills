# 代码目标定位探测

## 必查代码

根据技术栈检索：
- 路由：`router`, `routes`, `pages`, `app`, `views`
- 页面组件：与设计中的页面名、路由、组件名匹配的文件
- 表单组件：输入框、选择器、按钮、校验消息
- API 客户端：`api`, `service`, `request`, `fetch`, `axios`
- 状态管理：`store`, `composable`, `hooks`
- 已有 E2E / component 测试：复用 locator 风格

优先使用 OpenCode 内置工具：
- `glob`：先定位候选目录和文件，例如 `src/**/*.{ts,tsx,js,jsx,vue,svelte}`、`app/**/*`、`pages/**/*`、`tests/**/*`。
- `grep`：搜索 route、组件名、可见文案、`data-testid`、`aria-label`、`label`、API 路径。
- `read`：读取命中的代码片段并记录证据。
- `bash`：仅在需要运行项目已有脚本或 OpenCode 工具无法表达的命令时使用。

示例检索模式：
```text
grep pattern: "route|path|Login|登录|data-testid|aria-label|label"
glob pattern: "src/**/*.{ts,tsx,js,jsx,vue,svelte}"
```

## 前端可测试性契约

在生成 target map 前，必须先读取 `frontend-page-design.md` 的 E2E 可测试性标识契约和 `frontend-detailed-design.md` 的可测试性实现约定。fast 需求没有完整前端设计时，读取 `fast-design.md` 的“前端可测试性标识”章节。

采信规则：

- 如果契约声明了 `data-testid`，先在真实代码中确认该属性存在，并记录到 `targets.*.testability_contract`。
- 如果契约声明优先使用 role / label，先验证可访问名称是否真实存在；不存在时记录 locator gap。
- 如果代码存在 `data-testid` 但设计契约未记录，记录 `implementation_difference`，建议同步设计或确认该标识是否为历史遗留。
- 如果契约命名包含 AC/BR 编号、业务 ID、权限码、样式名或组件库 class，不直接采信，记录为 `unstable_testid` 缺口。
- 对动态列表，优先使用稳定行标识（如 `user-list-row`）+ 可见文本或独立 `data-row-id`，不要要求动态 `data-testid`。

## UI 组件库探测

检测项目使用的 UI 组件库，确定组件交互的特殊行为。这是避免 Playwright 与框架不兼容的关键步骤。

### 探测方法

1. 读取 `package.json` 的 `dependencies` / `devDependencies`，识别 UI 组件库：
   - `naive-ui` → Naive UI
   - `element-plus` → Element Plus
   - `ant-design-vue` → Ant Design Vue
   - `vant` → Vant
   - `@headlessui/vue` → Headless UI
   - `vuetify` → Vuetify
   - 如无匹配，报告为 `unknown`，使用通用策略

2. 根据识别到的组件库，确定以下关键适配项：

| 适配项 | Naive UI | Element Plus | Ant Design Vue | Vant | 通用 |
|--------|----------|-------------|----------------|------|------|
| 输入方式 | `type()` | `fill()` | `fill()` | `type()` | `type()` |
| 下拉渲染位置 | Teleport to body | Teleport to body | Teleport to body | 内联 | 内联 |
| 弹窗渲染位置 | 内联（NModal） | Teleport to body | Teleport to body | 内联 | 内联 |
| 禁用状态检测 | CSS class `n-*-disabled` | HTML `disabled` | HTML `disabled` + `aria-disabled` | HTML `disabled` | HTML `disabled` |
| 表单校验时机 | blur + submit | blur + submit | blur + submit | blur + submit | blur + submit |

### Naive UI 特殊处理

Naive UI 是最常见的兼容性问题来源，必须特别注意：

1. **输入框**：`fill()` 写入 DOM 值但不触发 Vue 响应式更新。必须使用 `type()` 逐字输入，或在 `fill()` 后手动触发 `input` 事件。推荐：
   ```typescript
   await locator.click();
   await locator.fill('');
   await locator.type(value, { delay: 30 });
   ```

2. **下拉选项**：NSelect 的下拉选项渲染在 body 层的 teleport 容器中（`.n-base-select-option__content`），不在组件 DOM 内。必须使用全局 page 级别定位器：
   ```typescript
   await page.locator('.my-select-trigger').click();
   await page.locator('.n-base-select-option__content').filter({ hasText: '选项文本' }).click();
   ```

3. **禁用状态**：NSwitch、NButton 等组件禁用时不使用 HTML `disabled` 属性，而是添加 CSS class（如 `n-switch--disabled`）。必须用 `toHaveClass()` 替代 `toBeDisabled()`。

4. **弹窗范围**：NModal 使用 `preset="card"` 时渲染 `role="dialog"`。弹窗内元素必须限定在 dialog 范围内，避免与页面其他元素冲突。

### 产出

在 `e2e-target-map.yml` 的 `framework_hints` 段记录探测结果。

## API 参数格式探测

检索前端请求封装层，确认参数名在传输过程中是否发生转换。

### 探测方法

1. 找到 axios/fetch 实例配置文件（通常在 `src/utils/request.ts` 或 `src/api/request.ts`）。
2. 检查是否有参数转换拦截器：
   - `transformRequest`
   - `paramsSerializer`
   - 请求拦截器中的 key 转换逻辑
3. 检查后端 API 实际接收的参数名格式：
   - 阅读后端 Controller 的 `@RequestParam` / `@PathVariable` 注解
   - 或阅读后端 DTO 字段名
4. 对比前端 JS 代码中的 camelCase 参数名与后端实际使用的 snake_case / camelCase 参数名。

### 常见转换模式

| 前端格式 | 后端格式 | 转换位置 | 示例 |
|---------|---------|---------|------|
| camelCase | camelCase | 无转换 | `authSource=local` |
| camelCase | snake_case | axios 拦截器 / 网关 | `auth_source=local` |
| camelCase | camelCase | 无转换 | `pageSize=10` |

### 关键检查点

- URL 查询参数：GET 请求中的参数名格式
- 请求体字段：POST/PUT 请求体中的字段名格式
- 路径参数：URL 路径中的参数格式

### 产出

在 `e2e-target-map.yml` 的 `url_param_format` 段记录实际格式，在 `assertion_targets` 中使用实际格式编写 URL 匹配条件。

## playwright-cli 运行时探测

静态代码检索只能说明“代码可能渲染什么”，不能证明浏览器中的真实可访问名称、teleport 位置、条件渲染状态和最终 locator。目标应用可访问时，必须把 `playwright-cli` 作为运行时探测层。

命令能力与完整用法参考官方 [playwright-cli](../../playwright-cli/SKILL.md) skill；本流程只规定 ASDD 的探测时机、证据写入和采信规则。

### 可用性检查

优先使用全局命令：

```bash
playwright-cli --version
```

如果全局命令不可用，尝试本地命令：

```bash
npx --no-install playwright-cli --version
```

如果两者都不可用，不自动安装依赖。在 `runtime_probe.status` 记录为 `blocked`，说明需要用户安装或提供可运行环境。

### 探测流程

1. 使用稳定 session 名打开目标路由：
   ```bash
   playwright-cli -s=asdd-e2e open "$E2E_BASE_URL{{route_path}}"
   ```
2. 获取真实可访问树和元素 ref：
   ```bash
   playwright-cli -s=asdd-e2e snapshot --filename=playwrightE2E/runtime-snapshot.yml
   ```
3. 对关键 ref 生成 Playwright locator：
   ```bash
   playwright-cli -s=asdd-e2e --raw generate-locator e5
   ```
4. 当 snapshot 未展示 `id`、`class`、`data-*`、`aria-*` 时，用 `eval` 补充属性证据：
   ```bash
   playwright-cli -s=asdd-e2e eval "el => el.getAttribute('data-testid')" e5
   playwright-cli -s=asdd-e2e eval "el => el.getAttribute('aria-label')" e5
   playwright-cli -s=asdd-e2e eval "el => el.className" e5
   ```
5. 对弹窗、下拉、toast 等动态层，先触发打开动作，再重新 `snapshot`。禁止用坐标作为主定位；如果必须确认遮挡或布局，可补充 `snapshot --boxes` 作为诊断证据。

### 采信规则

- `generate-locator --raw` 的结果是候选 locator，不是最终答案；必须回到代码中确认它不会依赖易变文案、排序或临时 DOM。
- 如果 locator 同时命中多个元素，必须缩小范围，例如限定到 `page.getByRole('dialog')`、目标表格行、导航区域或 `data-testid` 容器。
- 对文本断言不要使用只靠该文本本身定位的 `toHaveText()`；文本 locator 更适合 `toBeVisible()`。需要断言文本内容时，优先使用 `getByTestId()`、`getByLabel()` 或稳定容器。
- 对有副作用的按钮、提交、删除操作，只有在测试数据隔离和清理策略明确时才允许运行时点击；否则只探测到打开弹窗或表单前一步。
- 运行时探测失败不等于需求失败。记录 `blocked` 或 `partial`，并说明缺失的是服务、账号、权限、前置数据还是 locator 可测试性。

## 定位优先级

1. 运行时验证过的语义 locator（来自 `playwright-cli generate-locator`，并有代码证据支撑）
2. `role + accessible name`
3. `label`
4. `data-testid`
5. `text`
6. 稳定语义 CSS（如 `input[name="email"]`）
7. 缺口，不猜测

## 必须记录的证据

每个 target 记录：
- `source_file`
- `source_evidence`
- `runtime_probe`（是否运行、snapshot 文件、ref、生成 locator、属性证据）
- `design_reference`
- `implementation_reference`
- `difference`（如设计与实现不一致）

## 缺口判定

记录 locator gap，而不是生成测试：
- 控件没有可访问名称
- 文本由接口动态返回且无稳定容器
- 多个同名按钮无法区分
- 关键交互只有图标且无 label
- 页面路由或入口无法从代码确认
- 组件库行为与 Playwright 默认交互不兼容（记录为 `framework_compat` 类型缺口）
