---
name: api-to-mcp
description: 本技能用于将 REST API 后端服务接口转化为 Higress MCP Server YAML 配置。覆盖完整的工作流程：将 API 端点、参数、认证、请求/响应模板、错误处理等转化为 Higress mcp-server 插件的 YAML 格式。同时也覆盖 MCP 代理服务器（mcp-proxy）模式的配置。触发场景包括"将这个 API 转为 MCP"、"创建 MCP YAML 配置"、"将 REST API 包装为 MCP 工具"、"代理 MCP 服务器"，或任何涉及 Higress mcp-server 插件配置生成的任务。
---

# API 转 MCP 服务转换指南

## 概述

将 REST API 后端服务接口转化为 Higress `mcp-server` 插件的 YAML 配置，使 AI 助手能够无需编写代码即可调用现有 REST API 作为 MCP 工具。同时也支持代理已有的 MCP 服务器（`mcp-proxy` 模式）。

### 插件运行属性

- 插件执行阶段：`默认阶段`
- 插件执行优先级：`30`

### 两种服务器类型

| 类型 | `server.type` | 说明 |
|------|---------------|------|
| REST-to-MCP | `rest`（默认） | 将 REST API 转换为 MCP 工具，需配置 `tools` |
| MCP 代理 | `mcp-proxy` | 代理到后端 MCP 服务器，需配置 `mcpServerURL` 和 `transport` |

### 内置 MCP 服务器

如果使用插件内置的 MCP 服务器（如 `quark-search`），只需配置 `server.name` 为对应名称，无需配置 `tools` 字段。

## 工作流程

### 第 1 步：确定服务器类型

根据需求选择服务器类型：

1. **REST-to-MCP**：将 REST API 转换为 MCP 工具 → 走第 2-8 步
2. **MCP 代理**：代理已有的后端 MCP 服务器 → 走"MCP 代理模式"章节
3. **内置服务器**：使用插件内置的 MCP 服务器 → 只需配置 `server.name` 和 `server.config`

### 第 2 步：收集 API 信息

从用户或 API 文档（如 Swagger/OpenAPI）中收集以下信息：

1. **API 端点 URL** - 基础 URL + 路径
2. **HTTP 方法** - GET / POST / PUT / PATCH / DELETE
3. **认证方式** - API Key（header/query）、Bearer Token、Basic Auth 或无认证
4. **请求参数** - 路径参数、查询参数、请求头、请求体字段
5. **响应格式** - JSON 结构、需提取的关键字段
6. **错误响应** - 错误码和错误消息
7. **认证模式** - 静态（固定凭证）vs 多租户透传

如果用户提供了 Swagger/OpenAPI 规范，提取所有端点并为每个端点创建一个工具。

### 第 3 步：确定认证模式

从三种认证模式中选择一种：

| 模式 | 适用场景 | 关键配置 |
|------|----------|----------|
| **静态用户** | 所有请求使用同一凭证 | `defaultUpstreamSecurity` + `defaultCredential` |
| **多租户透传** | 每个用户有自己的凭证，从客户端透传到后端 | `defaultDownstreamSecurity` 且 `passthrough: true` |
| **工具级独立** | 特定工具需要不同认证 | `tools[].security` + `tools[].requestTemplate.security` |

#### 两层认证机制

MCP Server 插件支持两层认证：
1. **客户端到网关认证**（Downstream）：验证调用 MCP Server 的客户端身份
2. **网关到后端认证**（Upstream）：MCP Server 调用后端服务时的认证方式

#### 透明认证（Passthrough）

透明认证允许将 MCP Client 调用 MCP Server 时提供的凭证，透传给后端 REST API 的认证过程：

1. 在 `server.securitySchemes` 中定义客户端侧和后端侧两个认证方案
2. 工具级 `security` 配置 `id`（客户端方案）+ `passthrough: true`
3. 工具级 `requestTemplate.security` 配置 `id`（后端方案）
4. 当 `passthrough: true` 时，`requestTemplate.security.credential` 被忽略，优先使用透传的凭证

#### `passthroughAuthHeader` 字段

`server.passthroughAuthHeader`（默认 `false`）：是否透传 `Authorization` 请求头。设为 `true` 时，即使没有配置安全认证，也会将客户端的 `Authorization` 请求头透传到后端。适用于需要直接透传原始认证信息的场景。

#### 认证优先级（从高到低）

1. 工具级配置（`tools[].security` 和 `tools[].requestTemplate.security`）
2. 服务器级默认配置（`server.defaultDownstreamSecurity` 和 `server.defaultUpstreamSecurity`）
3. 认证方案默认值（`server.securitySchemes[].defaultCredential`）

### 第 4 步：定义工具

为每个 API 端点在 `tools` 下创建一个工具条目：

1. **工具名称** - 使用 `snake_case`，以操作动词为前缀（`list_`、`get_`、`create_`、`update_`、`delete_`、`review_`、`download_`、`compare_`）
2. **描述** - 清晰描述工具功能，格式："动作 + 对象 + 补充说明"
3. **参数（args）** - 定义每个参数的 `name`、`description`、`type`、`required`、`default`、`enum`、`position`、`items`、`properties`
4. **请求模板** - URL、方法、请求头、请求体/参数传递策略、认证
5. **响应模板** - 将 JSON 响应转换为 Markdown
6. **错误响应模板**（可选） - 处理 HTTP 状态码 >= 300 或 < 200 的情况

### 第 5 步：配置参数

#### 参数类型
`string`（默认）、`number`（浮点数）、`integer`、`boolean`、`array`（含 `items`）、`object`（含 `properties`）

`object` 类型支持嵌套 `properties`，`array` 类型支持 `items` 中定义元素 schema。

#### 参数位置
| 位置 | 适用场景 | 行为 |
|------|----------|------|
| `path` | RESTful URL 参数 | 替换 URL 中的 `{{.args.param}}` |
| `query` | GET 过滤/分页 | 追加到 URL 查询字符串 |
| `header` | 自定义请求头 / 认证令牌 | 作为 HTTP 请求头添加 |
| `cookie` | 会话 Cookie | 作为 Cookie 添加 |
| `body` | POST/PUT 请求体字段 | 添加到请求体 |

**重要**：指定了 `position` 的参数不受 `argsToJsonBody`/`argsToUrlParam`/`argsToFormBody` 影响。如果 `requestTemplate` 中明确指定了 `body`，则所有 `position: body` 的参数将被忽略，以避免冲突。

#### 参数传递策略（互斥）
| 策略 | 配置 | 自动设置 Content-Type |
|------|------|------------------------|
| 手动请求体模板 | `body: \|` | 手动设置 |
| JSON 请求体 | `argsToJsonBody: true` | `application/json; charset=utf-8` |
| URL 参数 | `argsToUrlParam: true` | 无 |
| 表单请求体 | `argsToFormBody: true` | `application/x-www-form-urlencoded` |

**关键**：`body`、`argsToJsonBody`、`argsToUrlParam`、`argsToFormBody` 之间是**互斥**的，只能选择一种。同时配置多个会导致系统报错并拒绝加载。

### 第 6 步：构建请求模板

```yaml
requestTemplate:
  method: GET  # 或 POST/PUT/PATCH/DELETE
  security:
    id: YourAuthScheme  # 透传模式下必填
  url: "http://api-host/path/{{.args.path_param}}?query={{.args.query_param}}"
  headers:
    - key: Content-Type
      value: application/json
    - key: Authorization
      value: "Bearer {{.config.apiKey}}"
  # 以下四选一（互斥）：
  # body: |
  #   {"key": "{{.args.value}}"}
  # argsToJsonBody: true
  # argsToUrlParam: true
  # argsToFormBody: true
```

**规则**：
- URL 路径参数：使用 `{{.args.param_name}}` 插值
- URL 特殊字符：使用 `{{urlquery .args.param_name}}` 进行编码
- POST/PUT 必须设置 `Content-Type` 请求头
- JSON 请求体：字符串值需要引号，布尔值/数字值不需要
- 固定参数（如 `noteable_type: "PullRequest"`）也必须在 `args` 中定义

### 第 7 步：构建响应模板

将 JSON 响应转换为可读的 Markdown。使用 GJSON Template 语法（Go 模板 + GJSON + Sprig 函数）。

**三种策略**（body 与 prependBody/appendBody 互斥，prependBody 和 appendBody 可共存）：

1. **完全转换**（`body`）：将 JSON 转换为结构化 Markdown
2. **前置说明**（`prependBody`）：保留原始 JSON，在前面添加字段说明
3. **后置说明**（`appendBody`）：保留原始 JSON，在后面添加使用说明

**模板语法**：
- 访问响应字段：`{{.field_name}}`、`{{.nested.field}}`
- 访问工具参数（在请求模板中）：`{{.args.param_name}}`
- 访问服务端配置：`{{.config.field_name}}`
- 循环：`{{range $idx, $item := .data}}...{{end}}`
- 条件：`{{if .field}}...{{end}}`
- `gjson` 函数复杂查询：`{{gjson "users.#(active==true)#.name"}}`
- 常用 Sprig 函数：`add`、`sub`、`mul`、`div`、`len`、`default`、`toJson`、`toPrettyJson`、`urlquery`、`b64enc`、`b64dec`、`upper`、`lower`、`trim`、`replace`、`join`、`slice`、`uuidv4`、`now`、`dateFormat`、`ternary`、`coalesce`、`list`、`first`、`last`、`uniq`、`sortAlpha`、`dict`、`hasKey`、`pluck` 等

**关键**：每个 `{{range}}` 和 `{{if}}` 都必须有匹配的 `{{end}}`。缺少 `{{end}}` 会导致响应为空。

### 第 8 步：配置错误响应模板（可选）

```yaml
errorResponseTemplate: |-
  HTTP 状态码: {{gjson "_headers.\\:status"}}
  错误码: {{gjson "_headers.x-ca-error-code"}}
  错误详情: {{.data.value}}
  请检查参数后重试。
```

**注意**：`:status` 在模板中必须转义为 `\\:status`。此模板仅在 HTTP 状态码 >= 300 或 < 200 时触发。未配置时返回原始错误响应。

### 第 9 步：验证与检查

对照常见避坑清单进行检查：

1. 透传模式：每个工具的 `requestTemplate.security.id` 已配置
2. 所有 `{{range}}` 和 `{{if}}` 都有匹配的 `{{end}}`
3. JSON 请求体中的布尔值/数字值没有引号
4. JSON 请求体中的字符串值有引号
5. 含特殊字符的路径参数使用了 `{{urlquery .args.param}}`
6. `body`/`argsToJsonBody`/`argsToUrlParam`/`argsToFormBody` 只使用了一个
7. POST/PUT 请求设置了 `Content-Type` 请求头
8. 固定值参数在 `args` 中定义，描述中标注"固定值"
9. `errorResponseTemplate` 中使用了 `\\:status`（转义）
10. 工具名称使用 `snake_case` 并带操作动词前缀
11. 如指定了显式 `body`，则不要依赖 `position: body` 参数（会被忽略）

## MCP 代理模式

当 `server.type` 为 `mcp-proxy` 时，插件将客户端请求代理到后端 MCP 服务器。

### 必填字段

| 字段 | 说明 |
|------|------|
| `server.mcpServerURL` | 后端 MCP 服务器的 URL。支持完整 URL（如 `http://example.com/mcp`）或路径（如 `/mcp`） |
| `server.transport` | 传输协议类型：`http`（StreamableHTTP）或 `sse`（Server-Sent Events） |

### 两种传输协议

#### StreamableHTTP（`transport: http`）
- 简单的请求-响应模型，使用标准 HTTP POST 请求
- 响应为完整的 JSON 数据
- 适合大多数 MCP 服务器实现

#### SSE（`transport: sse`）
- 基于 HTTP 的单向流式通信，支持长连接和实时消息推送
- 协议流程：发现阶段 → 初始化阶段 → 通知阶段 → 工具调用
- 建议使用更长的超时时间（如 10000ms）
- 原始请求头会自动复制到后端调用中

### MCP 代理配置示例

```yaml
server:
  name: my-mcp-proxy
  type: mcp-proxy
  transport: http
  mcpServerURL: "http://backend-mcp.example.com/mcp"
  timeout: 5000
  defaultDownstreamSecurity:
    id: ClientApiKey
  defaultUpstreamSecurity:
    id: BackendApiKey
  securitySchemes:
    - id: ClientApiKey
      type: apiKey
      in: header
      name: X-Client-API-Key
    - id: BackendApiKey
      type: apiKey
      in: header
      name: X-Backend-API-Key
      defaultCredential: "backend-secret-key"
```

对于 MCP 代理模式，`tools` 配置是可选的。如果不配置 `tools`，则代理所有后端 MCP 服务器的工具。

## 动态工具权限控制

除了静态 `allowTools` 白名单外，还支持通过 HTTP 请求头 `x-envoy-allow-mcp-tools` 动态控制工具访问权限。

**权限控制逻辑**：配置中 `allowTools` 和 Header 中工具列表取**交集**。

| Header 状态 | 行为 |
|-------------|------|
| Header 不存在 | 使用配置中的 `allowTools` |
| Header 为空字符串 | 使用配置中的 `allowTools` |
| Header 为空白字符串 `"  ,  ,  "` | 禁止访问所有工具 |
| Header 有值 `"tool1,tool2"` | 与配置的 `allowTools` 取交集 |

**注意**：MCP Server 插件会自动移除 `x-envoy-allow-mcp-tools` 请求头，不会传递给后端服务。

## 常见避坑速查表

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| 透传模式下后端返回 401 | `requestTemplate.security.id` 缺失 | 为每个工具添加 `security.id` |
| 响应模板返回空 `[]` | 缺少 `{{end}}` 或 GJSON 路径错误 | 检查所有 `range`/`if` 是否有 `{{end}}` |
| JSON 请求体格式错误 | 布尔值/数字值加了引号 | 去掉引号：`{{.args.flag}}` 而非 `"{{.args.flag}}"` |
| URL 路径特殊字符问题 | 未进行 URL 编码 | 使用 `{{urlquery .args.param}}` |
| 互斥冲突 | 同时设置了多种参数传递策略 | 只保留一个 |
| 工具列表中缺少工具 | `allowTools` 排除了该工具 | 检查或移除 `allowTools` |
| `errorResponseTemplate` 不触发 | HTTP 状态码在 200-299 范围内 | 仅在 >= 300 或 < 200 时触发 |
| `position: body` 参数被忽略 | 同时指定了显式 `body` 模板 | 移除 `position: body` 或移除显式 `body` |
| `passthrough: true` 时凭证不生效 | `requestTemplate.security.credential` 被忽略 | 透传模式下不能使用 `credential`，依赖透传的凭证 |

## 参考资源

### references/
- `yaml-rules.md` - 完整 YAML 配置规则，包含所有字段定义、规则编号（R-001 至 R-905）、Sprig 函数完整列表、GJSON 路径语法、已验证配置模式

### assets/
- `template-skeleton.yaml` - 即用型 YAML 模板骨架，覆盖多租户透传模式、静态用户模式、单工具片段模式、MCP 代理模式
