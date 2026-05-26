---
name: asdd-e2etest-playwright-design
description: >
  为标准需求、fast 需求或 bug 生成 Playwright E2E 测试设计。读取 FRD、spec、详细设计、tasks、
  fast-design 或 bug 文档，输出到对应工作项的 playwrightE2E/e2e-test-design.md。
  使用场景：用户要求为 REQ、fast REQ、BUG 设计 Playwright 浏览器验收测试、生成 playwrightE2E
  测试设计、规划 Playwright E2E 场景。
---

# asdd-e2etest-playwright-design

为一个 REQ / fast REQ / BUG 生成 Playwright E2E 测试设计。

## 输出目录

| 工作项 | 输出目录 |
|---|---|
| 标准需求 | `docs/modules/{module}/specs/{REQ-ID}-{name}/playwrightE2E/` |
| fast 需求 | `docs/modules/{module}/specs/{REQ-ID}-fast-{name}/playwrightE2E/` |
| bug | `docs/modules/_bugs/{BUG-ID}-{name}/playwrightE2E/` |

## 执行流程

1. 定位用户指定的 REQ-ID、fast REQ-ID、BUG-ID 或目录路径。
2. 读取 [context-loading.md](references/context-loading.md)，按工作项类型加载事实源。
3. 只根据已生成的项目文档和当前代码事实设计测试，不从 `docs/templates/` 读取模板。
4. 标注后续 target 阶段需要运行时探测的交互点，例如弹窗、teleport 下拉、动态表格行、仅图标按钮和权限条件渲染。
5. 生成或更新 `playwrightE2E/e2e-test-design.md`，使用 [e2e-test-design.md](references/templates/e2e-test-design.md)。
6. 如发现需求/设计/bug 文档缺少浏览器可验收行为，停止并说明缺失信息，不编造场景。

## 设计原则

- 这是生产级验收测试设计，不做最小样例或 demo。
- 设计必须覆盖用户可观察行为、关键正常路径、负向路径、权限/错误状态和 bug 回归路径。
- 默认不设计截图断言；优先使用 URL、文本、role、表单状态、网络响应、控制台错误等可重复断言。
- 只有视觉契约、布局回归、Canvas/图表/地图/PDF 预览或用户明确要求时，才把截图列为辅助证据。
- 参考测试层级：P0 smoke/core 先覆盖关键用户旅程和回归路径；P1/P2 再覆盖响应式、可访问性、性能或扩展路径。
- 必须声明 console/network 健康门和是否需要 flaky 重跑；不能用任意等待或截图主观判断代替断言。
- 只产出 Playwright E2E 设计，不读取或混用其他 runner 产物。

## 后续导航输出

设计完成后，在输出末尾追加：

```text
🔗 后续导航：

  ▶ 主流程下一步：
    - 使用 asdd-e2etest-playwright-targets skill 为 REQ-... / BUG-... 生成 E2E target map

  🔄 当前阶段可选操作：
    - 使用 asdd-e2etest-playwright-design skill 继续调整 E2E 设计

  ⏪ 回溯操作：
    - 标准需求设计信息不足时，使用 asdd-detailed-design-review skill 修正关键设计
    - fast 需求信息不足时，使用 asdd-requirement-implement-fast skill 补齐 fast-design
    - bug 回归路径不清时，使用 asdd-bug-diagnose skill 补齐诊断证据
```
