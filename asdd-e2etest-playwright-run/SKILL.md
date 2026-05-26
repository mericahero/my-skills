---
name: asdd-e2etest-playwright-run
description: >
  根据 REQ-ID、fast REQ-ID、BUG-ID 或工作项目录自动定位并执行 playwrightE2E/generated/*.spec.ts，生成 playwrightE2E/run-report.md。
  使用场景：用户要求运行 Playwright E2E、验证 playwrightE2E 脚本、执行 REQ/fast REQ/BUG
  的 Playwright 浏览器验收测试。
---

# asdd-e2etest-playwright-run

执行 Playwright E2E 并写入运行报告。

## 编号驱动

输入：REQ-ID、fast REQ-ID、BUG-ID 或工作项目录路径。

自动定位：
- `playwrightE2E/e2e-scenarios.yml`
- `playwrightE2E/generated/*.spec.ts`

输出：
- `playwrightE2E/run-report.md`

## 执行流程

1. 根据 REQ-ID / BUG-ID 定位唯一工作项目录和 `playwrightE2E/` 目录。
2. 读取 [playwright-run-rules.md](references/playwright-run-rules.md)。
3. 检测项目 Playwright 命令；优先使用项目已有脚本。
4. 执行当前工作项生成的 spec。
5. 如果失败涉及 locator、框架兼容、网络等待或断言差异，参考官方 [playwright-cli](../playwright-cli/SKILL.md) skill；当 `playwright-cli` 或 `npx --no-install playwright-cli` 可用时，按规则使用 `--debug=cli` attach 到暂停中的测试，采集 snapshot / generated locator / 属性证据。
6. 使用 [run-report.md](references/templates/run-report.md) 写报告。
7. 不因失败修改实现代码；只记录失败、证据和建议下一步。

## 默认证据

默认不截图；如生成截图，只能保存到 `playwrightE2E/artifacts/{run_id}/screenshots/` 并作为辅助证据。记录：
- 命令和退出码
- 失败 scenario 和 step
- 当前 URL
- 断言失败信息
- console error
- network failed request（如可获取）
- playwright-cli snapshot / generated locator（仅失败诊断需要时）
- screenshot 路径和触发原因（仅视觉类场景、失败概览或用户明确要求）

## 后续导航输出

运行完成后，在输出末尾追加：

```text
🔗 后续导航：

  ▶ 如 E2E 通过：
    - 如 code review 和 rules review 已通过，使用 asdd-requirement-close skill 关闭 REQ-...
    - 如是 bug 回归，使用 asdd-bug-close skill 关闭 BUG-...

  🔧 如 E2E 失败：
    - 环境问题：启动服务或补齐环境变量后，再次使用 asdd-e2etest-playwright-run skill 运行
    - 定位器问题：使用 asdd-e2etest-playwright-targets skill 更新 target map，再使用 asdd-e2etest-playwright-generate skill 重新生成脚本
    - 脚本问题：使用 asdd-e2etest-playwright-generate skill 修正脚本
    - 应用缺陷：回到对应实现 skill 修复后重新 review 和 E2E

  🔄 当前阶段可选操作：
    - 使用 asdd-e2etest-playwright-run skill 复跑当前工作项 E2E
```
