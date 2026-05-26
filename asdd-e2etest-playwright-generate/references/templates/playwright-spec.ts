import { expect, test, type Locator, type Page } from '@playwright/test';

// {{框架提示注释}}

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const ADMIN_USER = process.env.E2E_ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? '';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'TestPass123!';

function ts(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---- 框架适配辅助函数 ----
// 根据 e2e-target-map.yml 的 framework_hints 自动生成。
// 如框架检测有误，可手动调整。

/**
 * 获取弹窗/模态框范围，用于限定定位器避免歧义。
 * 防止多个元素共享同一文本/role 时产生冲突。
 */
function dialog(page: Page): Locator {
  return page.getByRole('dialog');
}

{{#if naive_ui}}
/**
 * Naive UI 输入填充：使用 type() 代替 fill() 以触发 Vue 响应式更新。
 * Naive UI NInput 在 fill() 后不会更新 Vue model。
 */
async function nFill(locator: Locator, value: string): Promise<void> {
  await locator.click();
  await locator.fill('');
  await locator.type(value, { delay: 30 });
}

/**
 * Naive UI 下拉选项选择：选项渲染在 body 层的 teleport 容器中，
 * 不在组件 DOM 内。必须使用 page 级别定位器。
 */
async function nSelectOption(page: Page, triggerSelector: string, optionText: string): Promise<void> {
  await page.locator(triggerSelector).click();
  await page.locator('.n-base-select-option__content')
    .filter({ hasText: optionText })
    .click();
}

/**
 * Naive UI 禁用状态检测：使用 CSS class 代替 HTML disabled 属性。
 * 示例：n-switch--disabled 用于 NSwitch，n-button--disabled 用于 NButton。
 */
async function expectDisabled(locator: Locator, cssPattern: RegExp): Promise<void> {
  await expect(locator).toHaveClass(cssPattern);
}
{{else if element_plus}}
/**
 * Element Plus 下拉选项选择：下拉渲染在 body 层 teleport 中。
 */
async function epSelectOption(page: Page, triggerSelector: string, optionText: string): Promise<void> {
  await page.locator(triggerSelector).click();
  await page.locator('.el-select-dropdown__item').filter({ hasText: optionText }).click();
}
{{else}}
/**
 * 通用输入填充（未识别框架）：使用 type() 作为安全默认值。
 */
async function safeFill(locator: Locator, value: string): Promise<void> {
  await locator.click();
  await locator.fill('');
  await locator.type(value, { delay: 30 });
}
{{/if}}

// ---- 认证辅助函数 ----

let _adminToken: string | null = null;

async function ensureAdminToken(): Promise<string> {
  if (_adminToken) return _adminToken;
  const resp = await fetch(`${BASE_URL}{{AUTH_LOGIN_PATH}}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });
  const body = await resp.json();
  _adminToken = body?.data?.access_token ?? body?.data?.token ?? body?.access_token ?? body?.token;
  if (!_adminToken) throw new Error(`登录失败: ${JSON.stringify(body)}`);
  return _adminToken;
}

async function loginAs(page: Page, username: string, password: string): Promise<void> {
  await page.goto('{{LOGIN_ROUTE}}');
  await page.getByPlaceholder('{{USERNAME_PLACEHOLDER}}').fill(username);
  await page.getByPlaceholder('{{PASSWORD_PLACEHOLDER}}').fill(password);
  await page.getByRole('button', { name: '{{LOGIN_BUTTON_TEXT}}' }).click();
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

async function gotoUserManagement(page: Page): Promise<void> {
  await page.goto('{{ROUTE}}');
  await page.waitForLoadState('networkidle');
}

// ---- API 辅助函数 ----

async function apiCreateUser(request: any, data: { username: string; password?: string; authSource?: string }, retries = 3): Promise<{ status: number; body: any }> {
  const token = await ensureAdminToken();
  for (let i = 0; i < retries; i++) {
    const resp = await request.post(`${BASE_URL}{{API_USERS_PATH}}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data,
    });
    if (resp.status() === 429) {
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      continue;
    }
    const body = await resp.json();
    return { status: resp.status(), body };
  }
  throw new Error(`apiCreateUser 在 ${retries} 次重试后失败（429 限流）`);
}

// ---- 行操作辅助函数 ----

async function getRowAction(page: Page, username: string, actionClass: string): Promise<Locator> {
  const row = page.locator('.user-table tbody tr').filter({ hasText: username }).first();
  return row.locator(`.${actionClass}`).first();
}

function getLockButton(row: Locator): Locator {
  return row.locator('td').nth({{LOCK_BUTTON_COLUMN_INDEX}}).locator('button').first();
}

// ---- 数据清理 ----

const createdUserIds: string[] = [];
const createdSvcUserIds: string[] = [];

test.afterAll(async ({ request }) => {
  const token = await ensureAdminToken();
  const headers = { Authorization: `Bearer ${token}` };
  for (const id of [...createdUserIds, ...createdSvcUserIds]) {
    try {
      await request.delete(`${BASE_URL}{{API_USERS_PATH}}/${id}`, { headers });
    } catch {}
  }
});

// ---- 场景 ----

test.describe('{{REQ_OR_BUG_ID}} {{TITLE}}', () => {
  test('{{SCENARIO_ID}} {{SCENARIO_TITLE}}', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await test.step('打开入口路由', async () => {
      // 使用 e2e-target-map.yml 中的路由导航
    });

    await test.step('{{步骤标题}}', async () => {
      // 使用框架适配辅助函数（nFill / nSelectOption 等）
      // 进行表单交互。使用 e2e-target-map.yml 中的定位器。
    });

    await test.step('断言浏览器状态', async () => {
      // 添加 URL/文本/role/网络断言（从场景断言生成）
      // 使用 url_param_format 进行网络等待 URL 匹配
    });

    await test.step('断言无非预期控制台错误', async () => {
      expect(consoleErrors).toEqual([]);
    });
  });
});
