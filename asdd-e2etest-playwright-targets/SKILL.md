---
name: asdd-e2etest-playwright-targets
description: >
  为 Playwright E2E 生成元素定位与代码事实映射。根据 REQ-ID、fast REQ-ID、BUG-ID 或工作项目录自动读取 playwrightE2E/e2e-test-design.md、
  真实前端路由、页面组件、表单组件、API 调用和已有测试，输出 e2e-target-map.yml 和
  locator-gaps.md。使用场景：为 REQ、fast REQ 或 BUG 的 Playwright 测试定位页面元素、
  查找 role/label/testid、确认路由和断言目标。
---

# asdd-e2etest-playwright-targets

为 Playwright E2E 生成代码事实驱动的目标定位图。

## 编号驱动

输入：REQ-ID、fast REQ-ID、BUG-ID 或工作项目录路径。

自动定位：
- 标准需求：`docs/modules/{module}/specs/{REQ-ID}-{name}/playwrightE2E/e2e-test-design.md`
- fast 需求：`docs/modules/{module}/specs/{REQ-ID}-fast-{name}/playwrightE2E/e2e-test-design.md`
- bug：`docs/modules/_bugs/{BUG-ID}-{name}/playwrightE2E/e2e-test-design.md`

输出：
- `playwrightE2E/e2e-target-map.yml`
- `playwrightE2E/locator-gaps.md`（仅存在缺口时）

## 执行流程

1. 根据 REQ-ID / BUG-ID 定位唯一工作项目录，再定位 `playwrightE2E/e2e-test-design.md`。
2. 读取 [code-target-discovery.md](references/code-target-discovery.md)。
3. 读取前端可测试性标识契约：标准需求读取 `frontend-page-design.md` §3 和 `frontend-detailed-design.md` §5；fast 需求读取 `fast-design.md` 的“前端可测试性标识”（如存在）。
4. 检索真实代码实现，确认 route、组件、可见文本、label、role、`data-testid`、表单字段、API 调用。
5. 参考官方 [playwright-cli](../playwright-cli/SKILL.md) skill；当 `playwright-cli` 或 `npx --no-install playwright-cli` 可用且目标应用可访问时，进行运行时探测：`snapshot` 获取真实可访问树/ref，`generate-locator --raw` 反推 Playwright locator，`eval` 补充 `data-testid` / `aria-label` / class 等快照未展示的属性。
6. 使用 [e2e-target-map.yml](references/templates/e2e-target-map.yml) 生成定位图，并记录静态代码证据、可测试性契约与运行时探测证据。
7. 如果缺少稳定定位，使用 [locator-gaps.md](references/templates/locator-gaps.md) 记录缺口和生产级修复建议。

## 硬规则

- 不得只根据设计文档猜元素定位。
- 设计与代码不一致时，以代码事实生成定位，同时在目标图中记录差异。
- 不得把脆弱 CSS、层级 nth-child、截图坐标作为主定位策略。
- Playwright 优先级：`getByRole` / `getByLabel` / `getByText` / `getByTestId` / 稳定 CSS。
- 当静态代码事实与浏览器 snapshot 不一致时，不直接编造 locator；优先记录差异并以 `playwright-cli generate-locator` 的真实 DOM 结果作为候选，再回到代码中确认原因。

## 后续导航输出

target map 生成完成后，在输出末尾追加：

```text
🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-e2etest-playwright-generate skill 为 REQ-... / BUG-... 生成 Playwright 脚本

  🔧 如有定位缺口：
    - blocker 级缺口必须先按 locator-gaps.md 修复生产代码或设计契约
    - 修复后再次使用 asdd-e2etest-playwright-targets skill 复核 target map

  🔄 当前阶段可选操作：
    - 使用 asdd-e2etest-playwright-targets skill 重新运行浏览器探测并更新定位证据

  ⏪ 回溯操作：
    - E2E 目标不清时，使用 asdd-e2etest-playwright-design skill 调整测试设计
```
