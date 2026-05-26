# Playwright 定位器缺口报告

## 元数据

| 字段 | 值 |
|---|---|
| 来源编号 | `{{REQ_OR_BUG_ID}}` |
| 运行器 | `Playwright Test` |
| 生成时间 | `{{DATE}}` |

## 缺口列表

| 目标 | 严重级别 | 阻塞原因 | 缺口类型 | 代码证据 | 生产代码修复建议 |
|---|---|---|---|---|---|
| `{{target_id}}` | `blocker \| warning \| info` | `{{为什么没有稳定定位器}}` | `missing_testid \| unstable_testid \| no_accessible_name \| ambiguous_text \| framework_compat \| dynamic_content \| other` | `{{文件 / 代码事实}}` | `{{添加可访问名称 / label / data-testid / 路由钩子}}` |

## 严重级别说明

| 级别 | 含义 | 对脚本生成的影响 |
|---|---|---|
| `blocker` | 无法生成可靠定位，脚本不可运行 | 不生成脚本，必须先修复 |
| `warning` | 当前可用但有脆弱性风险 | 生成脚本但标注风险和推荐修复 |
| `info` | 可优化但不影响测试稳定性 | 记录建议，不阻塞生成 |

## 缺口类型说明

| 类型 | 说明 | 示例 |
|---|---|---|
| `missing_testid` | 元素缺少 `data-testid` 属性 | 按钮只有图标无 label |
| `unstable_testid` | `data-testid` 命名不稳定或与业务/验收强耦合 | `ac001-submit`、`user-123-delete-button` |
| `no_accessible_name` | 控件没有可访问名称 | 图标按钮无 `aria-label` |
| `ambiguous_text` | 多个元素匹配同一文本 | 表格中多处"本地账号"标签与下拉选项文本重复 |
| `framework_compat` | 组件库行为与 Playwright 默认交互不兼容 | Naive UI `fill()` 不触发 Vue 响应式 |
| `dynamic_content` | 文本由接口动态返回且无稳定容器 | API 返回的错误提示无固定容器 |
| `other` | 其他无法稳定定位的情况 | 路由入口无法从代码确认 |

## 自动修复建议

为每个缺口提供可直接复制粘贴到生产代码库的修复代码：

### 示例：缺少 data-testid

```vue
<!-- 修复前 -->
<NButton @click="handleLock(row)">
  <template #icon><LockOutline /></template>
</NButton>

<!-- 修复后 -->
<NButton data-testid="user-list-row-lock-button" :data-row-id="row.id" @click="handleLock(row)">
  <template #icon><LockOutline /></template>
</NButton>
```

### 示例：文本歧义

```vue
<!-- 修复前 -->
<NSelect v-model:value="authSourceSelectValue" :options="authSourceOptions" />

<!-- 修复后 -->
<NSelect
  v-model:value="authSourceSelectValue"
  :options="authSourceOptions"
  data-testid="auth-source-filter"
  :input-props="{ 'data-testid': 'auth-source-input' }"
/>
```

### 示例：框架兼容性（Naive UI）

```typescript
// 测试辅助函数：Naive UI 输入框使用 type() 代替 fill()
async function nInput(locator: Locator, value: string) {
  await locator.click();
  await locator.fill('');
  await locator.type(value, { delay: 30 });
}
```

## 规则

- 不得使用截图坐标解决缺口。
- 不得使用脆弱的 DOM 层级选择器作为主定位器。
- 不得把 AC/BR 编号、业务 ID、权限码、样式名或组件库 class 写入 `data-testid`。
- 必须先在生产代码或设计中修复缺口，再生成稳定的 Playwright 脚本。
- `warning` 级缺口可在生成的脚本中使用降级定位器。
- `framework_compat` 类缺口必须在测试辅助函数中统一处理，不得逐场景绕过。
