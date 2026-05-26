# 上下文加载

## 输入解析

支持：
- `REQ-YYYYMMDD-NNN`
- `BUG-YYYYMMDD-NNN`
- `docs/modules/...` 路径
- 未指定时，扫描活跃 REQ / BUG 并让用户选择

## 标准需求事实源

按需读取：
1. `docs/functional-requirements/{module}/REQ-*.md`
2. `docs/modules/{module}/specs/{REQ-ID}-{name}/spec.md`
3. `api-design.md`
4. `frontend-page-design.md`
5. `frontend-detailed-design.md`
6. `backend-detailed-design.md`（涉及端到端数据或接口时）
7. `tasks.md`
8. `docs/modules/{module}/module-*.md`
9. `docs/architecture.md`、`docs/constitution.md`

## 快速需求事实源

读取：
1. `spec.md`
2. `fast-design.md`
3. 目标模块 `overview.md` 和 `module-*.md`
4. 与变更对象直接相关的代码文件

## 缺陷事实源

读取：
1. `docs/modules/_bugs/{BUG-ID}-{name}/spec.md`
2. `diagnosis.md`
3. `fix-design.md`（如存在）
4. `tasks.md`（如存在）
5. 若已升级为 REQ，读取 `upgraded_to_req` 指向的需求文档

## UI 框架事实收集

在设计阶段额外收集以下框架事实，用于后续 targets 和 generate 阶段的适配。

### 必查项

1. **UI 组件库识别**：读取前端 `package.json` 的 `dependencies` / `devDependencies`
   - `naive-ui` → Naive UI
   - `element-plus` → Element Plus
   - `ant-design-vue` → Ant Design Vue
   - `vant` → Vant
   - `@headlessui/vue` → Headless UI
   - `vuetify` → Vuetify
   - 如无匹配 → `unknown`

2. **请求封装层配置**：找到 axios/fetch 实例配置文件
   - 检查 `transformRequest` / `paramsSerializer` / 请求拦截器中的参数名转换
   - 确认参数名格式（camelCase / snake_case）
   - 记录 API base path（如 `/api/v1`）

3. **前端代理配置**：检查 `vite.config.ts` / `vue.config.js` 中的 proxy 配置
   - 路径重写规则（如 `/api` → `http://backend:8080/api`）
   - 是否存在路径前缀变化

4. **组件库特殊行为**（根据识别到的组件库）：
   - Naive UI：检查是否有自定义主题覆盖、是否使用了 `teleport-disabled` 配置
   - Element Plus：检查 `ElConfigProvider` 的 namespace 配置
   - Ant Design Vue：检查 `ConfigProvider` 的 prefixCls 配置

### 产出

在 `e2e-test-design.md` 的元数据段记录：

```markdown
| 字段 | 值 |
|---|---|
| UI 组件库 | `{{naive-ui / element-plus / ant-design-vue / vant / unknown}}` |
| API 基础路径 | `{{/api/v1}}` |
| URL 参数格式 | `{{snake_case / camelCase}}` |
| 代理重写 | `{{无 / 描述}}` |
```

## 缺失处理

缺关键事实时不要猜测。写明缺失项和需要补充的文档，例如：
- 页面入口不明确
- 验收标准没有用户可观察结果
- 缺陷没有复现步骤或期望行为
- 设计与代码不一致且无法判断以哪个为准
- UI 组件库无法从 package.json 识别（标记为 `unknown`，后续阶段使用保守策略）
