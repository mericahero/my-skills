---
name: asdd-e2etest-playwright-generate
description: >
  根据 REQ-ID、fast REQ-ID、BUG-ID 或工作项目录自动读取 playwrightE2E/e2e-test-design.md 和 e2e-target-map.yml，生成生产级 Playwright E2E
  场景与 .spec.ts 脚本。使用场景：用户要求生成 Playwright 测试脚本、把 E2E 设计落成
  Playwright Test、为 REQ/fast REQ/BUG 生成可提交的 Playwright 验收测试。
---

# asdd-e2etest-playwright-generate

生成 Playwright E2E 场景和测试脚本。

## 编号驱动

输入：REQ-ID、fast REQ-ID、BUG-ID 或工作项目录路径。

自动定位：
- `playwrightE2E/e2e-test-design.md`
- `playwrightE2E/e2e-target-map.yml`
- `playwrightE2E/locator-gaps.md`（如存在）

输出：
- `playwrightE2E/e2e-scenarios.yml`
- `playwrightE2E/generated/{REQ-OR-BUG-ID}.spec.ts`

## 执行流程

1. 根据 REQ-ID / BUG-ID 定位唯一工作项目录和 `playwrightE2E/`。
2. 确认设计和 target map 已存在；缺失时提示先运行对应 design / targets skill，并继续使用同一个 REQ-ID / BUG-ID。
3. 读取 [playwright-generation-rules.md](references/playwright-generation-rules.md)。
4. 如果 `e2e-target-map.yml` 的 `targets.*.runtime_probe.generated_locator` 存在，优先使用经过运行时验证的 locator；如果关键目标没有运行时探测且用户问题涉及定位失败，提示先用 targets skill 补跑 `playwright-cli` 探测。
5. 使用 [e2e-scenarios.yml](references/templates/e2e-scenarios.yml) 生成工具内场景。
6. 使用 [playwright-spec.ts](references/templates/playwright-spec.ts) 生成 `.spec.ts`。
7. 若 `locator-gaps.md` 存在且包含 blocker，不生成脚本；先让用户修复可测试性缺口。

## 质量门

- 断言必须证明需求目标，不写“只渲染”“不报错”类弱测试。
- 必须包含正常路径和设计/bug 要求的负向路径。
- BUG 场景必须包含回归断言。
- 默认关闭截图断言；失败证据由 Playwright 输出、trace 或 run report 记录。
- 如场景允许截图，必须写入 `playwrightE2E/artifacts/{run_id}/screenshots/`，并声明截图触发原因。
- 不直接复制 `playwright-cli` 录制动作作为最终测试；录制结果只能作为 locator 和交互顺序的证据，断言仍以 `e2e-test-design.md` 的验收目标为准。

## 后续导航输出

脚本生成完成后，在输出末尾追加：

```text
🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-e2etest-playwright-run skill 运行 REQ-... / BUG-... 的 Playwright E2E

  🔧 如脚本生成被阻塞：
    - blocker 级 locator gap：先按 locator-gaps.md 修复，再使用 asdd-e2etest-playwright-targets skill 复核
    - target map 缺失或过期：使用 asdd-e2etest-playwright-targets skill 更新 E2E target map

  🔄 当前阶段可选操作：
    - 使用 asdd-e2etest-playwright-generate skill 重新生成脚本

  ⏪ 回溯操作：
    - 场景目标不清时，使用 asdd-e2etest-playwright-design skill 调整 E2E 设计
```
