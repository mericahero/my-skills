# API 转 MCP YAML 配置规则

将 REST API 接口转化为 Higress mcp-server 插件 YAML 配置的完整参考文档。内容提炼自 `mcp-server-readme.md` 和 `后端服务接口转化为MCP服务的YAML规则文档.md`。

## 插件运行属性

- 插件执行阶段：`默认阶段`
- 插件执行优先级：`30`

## YAML 文件结构

```yaml
server:                    # 必填
  name: "service-name"
  type: "rest"             # 默认: rest，可省略；mcp-proxy 时必填
  config: {}               # 服务端配置（API 密钥等）
  timeout: 36000           # 超时时间（毫秒）
  mcpServerURL: ""         # mcp-proxy 类型时必填：后端 MCP 服务器 URL
  transport: ""            # mcp-proxy 类型时必填：http 或 sse
  passthroughAuthHeader: false  # 是否透传 Authorization 请求头
  securitySchemes: []      # 认证方案定义
  defaultDownstreamSecurity: {}  # 客户端到网关的认证
  defaultUpstreamSecurity: {}    # 网关到后端的认证

allowTools: []             # 可选：工具白名单

tools:                     # REST-to-MCP 时必填
  - name: "tool_name"
    description: "工具描述"
    args: []
    requestTemplate: {}
    responseTemplate: {}
    security: {}
    errorResponseTemplate: ""
```

## 服务端配置

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `server.name` | string | 是 | - | MCP 服务器名称。使用内置服务器（如 quark-search）时只需配置此字段；REST-to-MCP 场景可填任意值 |
| `server.type` | string | 否 | `rest` | `rest`（REST-to-MCP 转换）或 `mcp-proxy`（MCP 代理） |
| `server.config` | object | 否 | `{}` | 服务端配置，可在模板中通过 `{{.config.field}}` 访问 |
| `server.mcpServerURL` | string | mcp-proxy 时必填 | - | 后端 MCP 服务器 URL。支持完整 URL（如 `http://example.com/mcp`）或路径（如 `/mcp`，使用路由集群基础 URL） |
| `server.timeout` | integer | 否 | `5000` | 请求超时时间（毫秒）。慢接口（如 PICC）建议用 36000；SSE 协议建议用 10000 |
| `server.transport` | string | mcp-proxy 时必填 | - | 传输协议类型：`http`（StreamableHTTP）或 `sse`（Server-Sent Events） |
| `server.passthroughAuthHeader` | boolean | 否 | `false` | 是否透传 `Authorization` 请求头。设为 `true` 时，即使未配置安全认证也会透传客户端 `Authorization` 到后端。默认 `false`，未明确配置安全认证时会移除 `Authorization` 防止凭证误传 |
| `server.securitySchemes` | array | 否 | - | 可复用的认证方案 |
| `server.defaultDownstreamSecurity` | object | 否 | - | 默认客户端到网关认证，应用于所有未显式配置 `security` 的工具及 `tools/list` 请求 |
| `server.defaultUpstreamSecurity` | object | 否 | - | 默认网关到后端认证，应用于所有未显式配置 `requestTemplate.security` 的工具 |

## MCP 传输协议

MCP 代理服务器（`mcp-proxy` 类型）支持两种传输协议：

### StreamableHTTP 协议（`transport: http`）

- 简单的请求-响应模型，使用标准 HTTP POST 请求
- 响应为完整的 JSON 数据
- 适合大多数 MCP 服务器实现

```yaml
server:
  name: my-mcp-proxy
  type: mcp-proxy
  transport: http
  mcpServerURL: "http://backend-mcp.example.com/mcp"
  timeout: 5000
```

### SSE 协议（`transport: sse`）

- 基于 HTTP 的单向流式通信，支持长连接和实时消息推送
- 协议流程：发现阶段 → 初始化阶段 → 通知阶段 → 工具调用
- 原始请求头会自动复制到后端调用中
- 建议使用更长的超时时间

```yaml
server:
  name: my-sse-proxy
  type: mcp-proxy
  transport: sse
  mcpServerURL: "http://backend-mcp.example.com"
  timeout: 10000
```

## 认证配置

### 两层认证机制

1. **客户端到网关认证**（Downstream）：验证调用 MCP Server 的客户端身份
2. **网关到后端认证**（Upstream）：MCP Server 调用后端服务时的认证方式

### 认证方案字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 认证方案的唯一标识 |
| `type` | string | 是 | `http`（Basic/Bearer）或 `apiKey` |
| `scheme` | string | 否 | 当 `type=http` 时：`basic` 或 `bearer` |
| `in` | string | 否 | 当 `type=apiKey` 时：`header` 或 `query` |
| `name` | string | 否 | 当 `type=apiKey` 时：请求头名称或查询参数名 |
| `defaultCredential` | string | 否 | 默认凭证值。Basic Auth 为 "user:password"；Bearer Token 为 Token 本身；API Key 为 Key 本身 |

### 认证方案示例

```yaml
server:
  securitySchemes:
    - id: MyBasicAuth
      type: http
      scheme: basic
      defaultCredential: "admin:secretpassword"
    - id: MyBearerToken
      type: http
      scheme: bearer
      defaultCredential: "eyJhbGciOiJIUzI1NiIs..."
    - id: MyApiKeyInHeader
      type: apiKey
      in: header
      name: X-Custom-API-Key
      defaultCredential: "abcdef123456"
    - id: MyApiKeyInQuery
      type: apiKey
      in: query
      name: "api_token"
      defaultCredential: "uvwxyz789012"
```

### 三种认证模式

#### 模式一：静态用户（固定凭证）

```yaml
server:
  name: my-service
  securitySchemes:
    - id: MyAuth
      type: apiKey
      in: header
      name: Private-Token
      defaultCredential: "fixed-token-value"
  defaultUpstreamSecurity:
    id: MyAuth
```

#### 模式二：多租户透传（动态凭证）

```yaml
server:
  name: my-service
  securitySchemes:
    - id: MyAuth
      type: apiKey
      in: header
      name: Private-Token
  defaultDownstreamSecurity:
    id: MyAuth
    passthrough: true
```

每个工具必须配置：
```yaml
requestTemplate:
  security:
    id: MyAuth
```

#### 模式三：工具级独立认证

```yaml
tools:
  - name: admin_operation
    security:
      id: ClientBearer
      passthrough: false
    requestTemplate:
      security:
        id: AdminApiKey
        credential: "admin-secret-key"
```

### 透明认证（Passthrough）工作流程

1. MCP Client 发起请求，携带凭证（如 `Bearer <token>`）
2. MCP Server 根据 `tools[].security.id` 识别认证方案，提取凭证并移除原始请求头
3. 因 `passthrough: true`，提取的凭证被标记为透传凭证
4. MCP Server 查看 `requestTemplate.security.id`，确定后端认证方案
5. 将透传凭证按后端方案添加到对后端的请求中

**注意**：
- 当 `passthrough: true` 时，`requestTemplate.security.credential` 被忽略
- `extractAndRemoveIncomingCredential` 函数会提取核心凭证部分（如 Bearer token 值、Basic auth 的 base64 编码部分）
- 确保证书格式与目标认证方案兼容

### 认证规则

| 规则 | 说明 |
|------|------|
| R-201 | 每个认证方案必须有唯一的 `id` |
| R-202 | 当 `type=apiKey` 时，必须配置 `in` 和 `name` |
| R-203 | 当 `type=http` 时，必须配置 `scheme`（basic/bearer） |
| R-204 | `defaultDownstreamSecurity` 适用于所有未显式配置 `security` 的工具及 `tools/list` 请求 |
| R-205 | `defaultUpstreamSecurity` 适用于所有未显式配置 `requestTemplate.security` 的工具 |
| R-206 | 当 `passthrough=true` 时，提取的凭证用于后端；`requestTemplate.security.credential` 被忽略 |
| R-207 | 优先级：工具级 > 服务端级 > defaultCredential |
| R-208 | 透传模式下，`requestTemplate.security.id` 必须配置 |
| R-209 | `passthroughAuthHeader: true` 可在未配置安全认证时透传 `Authorization` 请求头 |

## 工具配置

### 工具字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tools[].name` | string | 是 | 工具名称，`snake_case`，全局唯一 |
| `tools[].description` | string | 是 | 工具描述，供 AI 理解工具能力 |
| `tools[].args` | array | 是 | 参数定义，无参数时为 `[]` |
| `tools[].requestTemplate` | object | 是 | HTTP 请求模板 |
| `tools[].responseTemplate` | object | 是 | HTTP 响应转换模板 |
| `tools[].security` | object | 否 | 工具级客户端认证配置（含 `id` 和 `passthrough`） |
| `tools[].errorResponseTemplate` | string | 否 | 错误响应模板（HTTP >= 300 或 < 200 时触发） |

### 工具命名规则

| 规则 | 说明 |
|------|------|
| R-301 | 使用 `snake_case`：`list_private_tokens`、`create_pr_note` |
| R-302 | 以操作动词为前缀：`list_`、`get_`、`create_`、`update_`、`delete_`、`review_`、`download_`、`compare_` |
| R-303 | 描述必须清晰描述功能，可追加后缀标记 |
| R-304 | 描述格式：动作 + 对象 + 补充说明（如"支持分页"） |

## 参数定义

### 参数字段

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `args[].name` | string | 是 | - | 参数名称 |
| `args[].description` | string | 是 | - | 参数描述（含格式要求 + 示例值） |
| `args[].type` | string | 否 | `string` | `string`、`number`、`integer`、`boolean`、`array`、`object` |
| `args[].required` | boolean | 否 | `false` | 是否必填 |
| `args[].default` | any | 否 | - | 默认值 |
| `args[].enum` | array | 否 | - | 允许的值 |
| `args[].position` | string | 否 | - | `query`、`path`、`header`、`cookie`、`body` |
| `args[].items` | object | 否 | - | 数组元素 schema（当 `type=array` 时） |
| `args[].properties` | object | 否 | - | 对象属性 schema（当 `type=object` 时） |

### 参数规则

| 规则 | 说明 |
|------|------|
| R-401 | 每个参数必须有 `name` 和 `description` |
| R-402 | 描述应包含：含义 + 格式要求 + 示例值 |
| R-403 | 分页参数：`page` 默认 1，`per_page` 默认 20，类型 `integer` |
| R-404 | 路径参数必须设置 `position: path`，URL 中使用 `{{.args.param}}` |
| R-405 | 查询参数可使用 `position: query` 或直接在 URL 中插值 |
| R-406 | 设置了显式 `position` 的参数不受 `argsToJsonBody`/`argsToUrlParam`/`argsToFormBody` 影响 |
| R-407 | 无参数工具：`args: []` |
| R-408 | 固定值参数（如 `noteable_type: "PullRequest"`）必须在 `args` 中定义，描述中标注"固定值" |
| R-409 | 如 `requestTemplate` 中明确指定了 `body`，则所有 `position: body` 的参数将被忽略 |

### 参数示例

```yaml
args:
  # 路径参数
  - name: project_id
    description: "仓库 ID 或完整路径"
    type: string
    required: true
    position: path

  # 带默认值的查询参数
  - name: page
    description: "页码"
    type: integer
    required: false
    default: 1
    position: query

  # 枚举参数
  - name: state
    description: "评审状态：approved / rejected"
    type: string
    required: true
    enum: ["approved", "rejected"]

  # 布尔参数
  - name: with_projects
    description: "是否返回项目列表"
    type: boolean
    required: false
    default: false

  # 对象参数（含嵌套 properties）
  - name: filters
    description: "过滤条件"
    type: object
    properties:
      category:
        type: string
        enum: ["food", "hotel", "attraction"]
      price:
        type: integer
        minimum: 0

  # 数组参数（含 items schema）
  - name: coordinates
    description: "坐标点列表"
    type: array
    items:
      type: object
      properties:
        lat:
          type: number
        lng:
          type: number

  # 固定值参数
  - name: noteable_type
    description: "固定值：PullRequest"
    type: string
    required: true
```

## 请求模板

### 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `requestTemplate.url` | string | 是 | 请求 URL 模板，支持 `{{.args.param}}` |
| `requestTemplate.method` | string | 是 | `GET` / `POST` / `PUT` / `PATCH` / `DELETE` |
| `requestTemplate.headers` | array | 否 | 请求头，每个含 `key` 和 `value` |
| `requestTemplate.body` | string | 否 | 手动请求体模板（互斥） |
| `requestTemplate.argsToJsonBody` | boolean | 否 | 参数作为 JSON 请求体（默认 `false`），自动添加 `Content-Type: application/json; charset=utf-8` |
| `requestTemplate.argsToUrlParam` | boolean | 否 | 参数作为 URL 查询参数（默认 `false`） |
| `requestTemplate.argsToFormBody` | boolean | 否 | 参数作为表单提交（默认 `false`），自动添加 `Content-Type: application/x-www-form-urlencoded` |
| `requestTemplate.security` | object | 否 | 工具级后端认证配置 |
| `requestTemplate.security.id` | string | 配置 security 时必填 | 引用 `server.securitySchemes` 中的认证方案 ID |
| `requestTemplate.security.credential` | string | 否 | 覆盖默认凭证。`passthrough: true` 时被忽略 |

### 请求模板规则

| 规则 | 说明 |
|------|------|
| R-501 | `url` 和 `method` 为必填 |
| R-502 | URL 路径参数使用 `{{.args.param}}`，如 `/projects/{{.args.project_id}}` |
| R-503 | URL 查询参数可直接拼接：`?page={{.args.page}}&per_page={{.args.per_page}}` |
| R-504 | POST/PUT 必须设置 `Content-Type` 请求头 |
| R-505 | 使用手动 `body` 发送 JSON 时，必须设置 `Content-Type: application/json` |
| R-506 | 后端需要表单提交时，设置 `Content-Type: application/x-www-form-urlencoded` |
| R-507 | `requestTemplate.security.id` 引用 `server.securitySchemes` 中的 ID |
| R-508 | 设置了 `defaultUpstreamSecurity` 且工具无 `requestTemplate.security` 时，使用服务端默认 |
| R-509 | 透传模式下，每个工具的 `requestTemplate.security` 必须配置 `id` |
| R-510 | URL 参数含特殊字符需编码：`{{urlquery .args.param}}` |
| R-511 | `body`、`argsToJsonBody`、`argsToUrlParam`、`argsToFormBody` 互斥，同时配置多个会报错 |

### 请求模板示例

**GET + URL 查询参数**：
```yaml
requestTemplate:
  method: GET
  security:
    id: MyAuth
  url: "http://api-host/api/v1/resources?page={{.args.page}}&per_page={{.args.per_page}}"
  headers:
    - key: Content-Type
      value: application/json
```

**GET + argsToUrlParam**（高德地图示例）：
```yaml
requestTemplate:
  url: "https://restapi.amap.com/v3/geocode/geo"
  method: GET
  argsToUrlParam: true
  headers:
    - key: x-api-key
      value: "{{.config.apiKey}}"
```

**POST + JSON 请求体**：
```yaml
requestTemplate:
  method: POST
  security:
    id: MyAuth
  url: "http://api-host/api/v1/resources"
  headers:
    - key: Content-Type
      value: application/json
  body: |
    {
      "name": "{{.args.name}}",
      "description": "{{.args.description}}"
    }
```

**POST + 嵌套 JSON 请求体**：
```yaml
requestTemplate:
  method: POST
  body: |
    {
      "arguments": {
        "sql": "{{.args.sql}}",
        "limit": {{.args.limit | default 100}}
      }
    }
  headers:
    - key: Content-Type
      value: application/json
  url: "http://api-host/api/v1/execute"
```

## 响应模板

### 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `responseTemplate.body` | string | 否 | 完整响应转换（与 prepend/append 互斥） |
| `responseTemplate.prependBody` | string | 否 | 原始响应前添加的文本（与 `body` 互斥，与 `appendBody` 可共存） |
| `responseTemplate.appendBody` | string | 否 | 原始响应后追加的文本（与 `body` 互斥，与 `prependBody` 可共存） |

### 响应模板规则

| 规则 | 说明 |
|------|------|
| R-601 | `body` 与 `prependBody`/`appendBody` 互斥；`prependBody` 和 `appendBody` 可共存 |
| R-602 | 响应模板应将 JSON 转换为 **Markdown**，使用 `#` 标题、`-` 列表、`**粗体**` |
| R-603 | 使用 GJSON 路径语法：`{{.field}}`、`{{.data.list}}` |
| R-604 | 数组遍历：`{{range $idx, $item := .data}}...{{end}}` |
| R-605 | 条件渲染：`{{if .field}}...{{end}}` |
| R-606 | 提取关键字段，避免返回过大的原始 JSON |
| R-607 | 复杂 JSON 且 AI 需要全部字段时，使用 `prependBody` 添加字段说明 + 保留原始 JSON |
| R-608 | JSON 中布尔值/数字值不需要引号；字符串值需要引号 |

### 响应模板示例

**简单字段提取（高德地图地理编码）**：
```yaml
responseTemplate:
  body: |
    # 地理编码信息
    {{- range $index, $geo := .geocodes }}
    ## 地点 {{add $index 1}}
    - **国家**: {{ $geo.country }}
    - **省份**: {{ $geo.province }}
    - **城市**: {{ $geo.city }}
    - **坐标**: {{ $geo.location }}
    - **级别**: {{ $geo.level }}
    {{- end }}
```

**条件逻辑 + 日期格式化 + 数组切片（天气预报）**：
```yaml
responseTemplate:
  body: |
    # {{.location.name}}, {{.location.country}} 天气预报
    **当前温度**: {{.current.temp_c}}°C
    **天气状况**: {{.current.condition.text}}

    ## 未来预报
    {{range $index, $day := .forecast.forecastday}}
    ### {{$day.date}}
    {{if gt $day.day.maxtemp_c 30}}**高温预警!**{{end}}
    {{if lt $day.day.mintemp_c 0}}**低温预警!**{{end}}
    - **最高温度**: {{$day.day.maxtemp_c}}°C
    - **最低温度**: {{$day.day.mintemp_c}}°C
    - **降水概率**: {{$day.day.daily_chance_of_rain}}%
    #### 分时预报
    {{range $hour := slice $day.hour 6 24 3}}
    - **{{dateFormat "15:04" $hour.time_epoch}}**: {{$hour.temp_c}}°C, {{$hour.condition.text}}
    {{end}}
    {{end}}
```

**prependBody + appendBody（保留原始 JSON + 字段说明）**：
```yaml
responseTemplate:
  prependBody: |
    # 产品信息

    以下是产品的详细信息，以JSON格式返回。字段说明：

    - **id**: 产品唯一标识符
    - **name**: 产品名称
    - **price**: 产品价格（美元）
    - **inventory**: 库存信息
      - **quantity**: 当前库存数量
      - **warehouse**: 仓库位置

    原始JSON响应：

  appendBody: |

    您可以使用这些信息来了解产品的详细信息、价格、库存状态和用户评价。
```

**appendBody 参数说明（银行卡验证）**：
```yaml
responseTemplate:
  appendBody: |2-
      - 以下是返回参数说明
      - 参数名称: code, 参数类型: integer, 参数描述: 响应状态码
      - 参数名称: desc, 参数类型: string, 参数描述: 描述信息
      - 参数名称: data, 参数类型: object, 参数描述: 无描述
      - 参数名称: data.bankId, 参数类型: string, 参数描述: 银行编码
      - 参数名称: data.bankName, 参数类型: string, 参数描述: 银行名称
```

## 错误响应模板

### 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `errorResponseTemplate` | string | 否 | 错误响应模板，HTTP 状态码 >= 300 或 < 200 时触发 |

### 可用上下文变量

| 变量 | 说明 |
|------|------|
| `{{gjson "_headers.\\:status"}}` | HTTP 响应状态码（注意：`:status` 需要 `\\` 转义） |
| `{{gjson "_headers.x-ca-error-code"}}` | 请求头中的错误码 |
| `{{.field_name}}` | 响应体中的字段 |

### 错误响应规则

| 规则 | 说明 |
|------|------|
| R-701 | 可选；未配置时返回原始错误响应 |
| R-702 | 访问 HTTP 状态码使用 `{{gjson "_headers.\\:status"}}`（`:status` 需用 `\\` 转义） |
| R-703 | 错误模板应包含：状态码 + 错误描述 + 可操作的建议 |

### 示例

```yaml
errorResponseTemplate: |-
  HTTP 状态码: {{gjson "_headers.\\:status"}}
  API 调用失败，请检查参数。
```

```yaml
errorResponseTemplate: |-
  statusCode: {{gjson "_headers.\\:status"}}
  errorCode: {{gjson "_headers.x-ca-error-code"}}
  data: {{.data.value}}
```

## 模板语法

### 模板引擎

Higress REST 转 MCP 使用 [GJSON Template](https://github.com/higress-group/gjson_template)，结合 Go 模板 + GJSON 路径语法 + Sprig 函数。包含所有 [Sprig](https://github.com/Masterminds/sprig) 函数（70+ 种），功能等同于 Helm 模板能力。

完整函数参考：[Helm 函数文档](https://helm.sh/docs/chart_template_guide/function_list/)

### 变量访问

| 语法 | 说明 | 示例 |
|------|------|------|
| `{{.args.param}}` | 访问工具参数 | `{{.args.project_id}}` |
| `{{.config.field}}` | 访问服务端配置 | `{{.config.apiKey}}` |
| `{{.field}}` | 访问响应 JSON 字段 | `{{.id}}` |
| `{{.nested.field}}` | 访问嵌套字段 | `{{.author.name}}` |
| `{{$var := .value}}` | 变量赋值 | `{{$diffList := .data}}` |

### 控制结构

| 语法 | 说明 |
|------|------|
| `{{if .field}}...{{end}}` | 条件渲染 |
| `{{if .field}}...{{else}}...{{end}}` | if-else |
| `{{range $idx, $item := .list}}...{{end}}` | 带索引遍历 |
| `{{range $item := .list}}...{{end}}` | 简单遍历 |
| `{{range $key, $value := .map}}...{{end}}` | Map 遍历 |
| `{{with .field}}...{{end}}` | 切换上下文 |
| `{{- range ...}}` | 去除前导空白 |

### Sprig 函数完整列表

#### 字符串操作
| 函数 | 说明 | 示例 |
|------|------|------|
| `trim` | 去除空白 | `{{trim .name}}` |
| `upper` / `lower` | 大小写转换 | `{{upper .name}}` |
| `replace` | 替换 | `{{replace " " "-" .name}}` |
| `plural` | 复数形式 | `{{plural "item" "items" .count}}` |
| `nospace` | 去除所有空白 | `{{nospace .name}}` |
| `join` | 连接数组 | `{{.args.labels \| join ","}}` |

#### 数学运算
| 函数 | 说明 | 示例 |
|------|------|------|
| `add` | 加法 | `{{add $idx 1}}` |
| `sub` | 减法 | `{{sub .total .used}}` |
| `mul` | 乘法 | `{{mul .price .quantity}}` |
| `div` | 除法 | `{{div .total .count}}` |
| `max` / `min` | 最大/最小值 | `{{max .a .b}}` |
| `len` | 长度 | `{{len .data}}` |

#### 日期格式化
| 函数 | 说明 | 示例 |
|------|------|------|
| `now` | 当前时间 | `{{now}}` |
| `date` / `dateFormat` | 日期格式化 | `{{dateFormat "2006-01-02" .date}}` |
| `dateInZone` | 指定时区 | `{{dateInZone "2006-01-02" .date "Asia/Shanghai"}}` |
| `dateModify` | 修改时间 | `{{dateModify "+24h" .date}}` |

#### 列表操作
| 函数 | 说明 | 示例 |
|------|------|------|
| `list` | 创建列表 | `{{list "a" "b" "c"}}` |
| `first` / `last` | 首/尾元素 | `{{first .items}}` |
| `uniq` | 去重 | `{{uniq .items}}` |
| `sortAlpha` | 字母排序 | `{{sortAlpha .items}}` |
| `slice` | 切片 | `{{slice .items 6 24 3}}` |

#### 字典操作
| 函数 | 说明 | 示例 |
|------|------|------|
| `dict` | 创建字典 | `{{dict "key" "value"}}` |
| `get` / `set` | 获取/设置 | `{{get .map "key"}}` |
| `hasKey` | 是否存在键 | `{{hasKey .map "key"}}` |
| `pluck` | 提取字段 | `{{pluck "name" .users}}` |

#### 流程控制
| 函数 | 说明 | 示例 |
|------|------|------|
| `ternary` | 三元运算 | `{{ternary "yes" "no" .flag}}` |
| `default` | 默认值 | `{{.args.limit \| default 100}}` |
| `empty` | 是否为空 | `{{empty .field}}` |
| `coalesce` | 取第一个非空 | `{{coalesce .a .b .c}}` |

#### 类型转换
| 函数 | 说明 | 示例 |
|------|------|------|
| `toString` | 转字符串 | `{{toString .value}}` |
| `toJson` | 转 JSON | `{{.args.labels \| toJson}}` |
| `toPrettyJson` | 转格式化 JSON | `{{.data \| toPrettyJson}}` |
| `toRawJson` | 转原始 JSON | `{{.data \| toRawJson}}` |

#### 编码/解码
| 函数 | 说明 | 示例 |
|------|------|------|
| `b64enc` | Base64 编码 | `{{.args.content \| b64enc}}` |
| `b64dec` | Base64 解码 | `{{.args.content \| b64dec}}` |
| `urlquery` | URL 编码 | `{{urlquery .args.id}}` |

#### UUID
| 函数 | 说明 | 示例 |
|------|------|------|
| `uuidv4` | 生成 UUID | `{{uuidv4}}` |

### GJSON 路径语法

| 语法 | 说明 | 示例 |
|------|------|------|
| `.` | 点号取值 | `address.city` |
| `.0` | 数组索引 | `users.0.name` |
| `.#` | 数组长度 | `users.#` |
| `.#.field` | 数组字段提取 | `users.#.name` |
| `.#(condition)` | 数组过滤 | `users.#(active==true)#.name` |
| `.@reverse` | 修饰符 | `users.@reverse.#.name` |
| `{key:path}` | 多路径 | `{name:users.0.name,count:users.#}` |
| `\. ` | 转义字符 | `path.with\.dot` |

### gjson 函数复杂查询

```
活跃用户: {{gjson "users.#(active==true)#.name"}}

30岁以上的活跃开发者: {{gjson "users.#(active==true && age>30)#.name"}}

用户名（倒序）: {{gjson "users.@reverse.#.name"}}

管理员:
{{range $user := gjson "users.#(roles.#(==admin)>0)#"}}
  - {{$user.name}} ({{$user.age}})
{{end}}
```

### 模板语法规则

| 规则 | 说明 |
|------|------|
| R-801 | 请求模板：参数用 `{{.args.param}}`，配置用 `{{.config.field}}` |
| R-802 | 响应模板：JSON 根字段用 `{{.field}}` |
| R-803 | 每个 `range` 必须有 `{{end}}`；每个 `if` 必须有 `{{end}}` |
| R-804 | JSON 中布尔值/数字值不加引号：`"flag": {{.args.flag}}` |
| R-805 | JSON 中字符串值加引号：`"name": "{{.args.name}}"` |
| R-806 | 使用 `\|` 进行管道操作：`{{.args.content \| b64enc}}` |
| R-807 | 使用 `default` 设置默认值：`{{.args.limit \| default 100}}` |
| R-808 | `range` 块中，循环变量使用 `$` 前缀：`{{$item.name}}`、`{{$idx}}` |
| R-809 | 使用 `{{-` 去除模板标签前导空白 |
| R-810 | 使用 `gjson` 函数进行复杂 JSON 查询和过滤 |

## 权限控制

### 静态工具白名单

```yaml
allowTools:
  - tool1
  - tool2
  - tool3
```

未指定 `allowTools` 时允许所有工具。`allowTools` 为空数组时禁止所有工具。

### 动态工具权限

通过 HTTP 请求头 `x-envoy-allow-mcp-tools`（逗号分隔的工具名称）实现动态控制。

**权限控制逻辑**：配置中 `allowTools` 和 Header 中工具列表取**交集**。

| Header 状态 | 行为 |
|-------------|------|
| Header 不存在 | 使用配置中的 `allowTools` |
| Header 为空字符串 `""` | 使用配置中的 `allowTools` |
| Header 为空白字符串 `"  ,  ,  "` | 禁止访问所有工具 |
| Header 有值 `"tool1,tool2"` | 与配置的 `allowTools` 取交集 |

**前置插件集成**：必须使用 `proxywasm.ReplaceHttpRequestHeader`（而非 `AddHttpRequestHeader`）设置 header，确保安全性。

| 规则 | 说明 |
|------|------|
| R-901 | `allowTools` 为静态白名单；未指定时允许所有工具 |
| R-902 | `x-envoy-allow-mcp-tools` 请求头为动态白名单；与 `allowTools` 取交集 |
| R-903 | 请求头缺失或为空时：使用配置中的 `allowTools` |
| R-904 | 请求头仅含空白字符 `"  ,  ,  "` 时：阻止所有工具 |
| R-905 | MCP Server 插件自动移除 `x-envoy-allow-mcp-tools` 请求头，不会转发到后端 |
| R-906 | `allowTools` 为空数组时，无论 header 如何设置，都禁止所有工具访问 |

## 已验证的配置模式

| 模式 | 认证方式 | 工具数 | 关键特性 |
|------|----------|--------|----------|
| 静态用户 | 固定凭证 | 3 | 凭证在 config 中，简单 |
| 多租户透传 | 透传 | 11 | 客户端凭证透传，支持多用户 |
| 数据库工具 | Bearer Token | 6 | 嵌套 JSON 请求体，条件渲染 |
| 单工具片段 | 引用服务端方案 | 1 | 独立工具定义，含错误模板 |
| MCP 代理 (HTTP) | apiKey | - | StreamableHTTP 协议代理 |
| MCP 代理 (SSE) | Bearer | - | SSE 流式协议代理 |

### 已验证的关键配置点

| 配置项 | 验证结果 |
|--------|----------|
| `security.passthrough: true` | 多租户：客户端 `Private-Token` 成功透传 |
| `requestTemplate.security.id` | 透传模式下每个工具必填 |
| `position: path` | 路径参数成功替换 URL 中的 `{{.args.param}}` |
| `position: query` | 查询参数自动添加到 URL 查询字符串 |
| `{{urlquery .args.id}}` | URL 编码处理路径参数中的特殊字符 |
| `body` 模板 `{{.with_projects}}` | 布尔值不加引号，正确输出 `true`/`false` |
| `{{range}}...{{end}}` | 数组遍历正常，支持嵌套 |
| `{{if $note.children}}` | 条件渲染正常，检测字段是否存在 |
| `{{add $idx 1}}` | Sprig 数学函数正常 |
| `{{len $diffList}}` | `len` 返回正确的数组长度 |
| `errorResponseTemplate` | HTTP 状态码 >= 300 时正确触发 |
| `{{gjson "_headers.\\:status"}}` | 成功访问 HTTP 状态码（需转义） |
| `server.config` + `{{.config.apiKey}}` | 服务端配置在请求模板中引用成功 |
| `{{uuidv4}}` | UUID 生成正常 |
| `{{- range` | 去除前导空白，避免 Markdown 多余空行 |
| `{{if gt $day.day.maxtemp_c 30}}` | 比较函数 + 条件渲染正常 |
| `{{slice $day.hour 6 24 3}}` | 数组切片函数正常 |
| `{{dateFormat "15:04" $hour.time_epoch}}` | 日期格式化正常 |
| `passthroughAuthHeader: true` | 未配置安全认证时透传 Authorization 请求头 |

## API 到 YAML 映射对照表

| 后端 API 属性 | YAML 位置 | 说明 |
|---------------|-----------|------|
| API 端点 URL | `requestTemplate.url` | 支持 `{{.args.param}}` 插值 |
| HTTP 方法 | `requestTemplate.method` | GET/POST/PUT/PATCH/DELETE |
| 路径参数 | `args[].position: path` + URL `{{.args.param}}` | 自动替换 URL 占位符 |
| 查询参数 | `args[].position: query` 或 URL 拼接 | 或 `argsToUrlParam: true` |
| 请求体参数 | `requestTemplate.body` 或 `argsToJsonBody: true` | 或 `argsToFormBody: true` |
| 请求头 | `requestTemplate.headers[]` | 每个含 `key` 和 `value` |
| 认证方式 | `server.securitySchemes` + `requestTemplate.security` | 支持透传 |
| 响应格式 | `responseTemplate.body` | 转换为 Markdown |
| 错误响应 | `errorResponseTemplate` | HTTP >= 300 时触发 |
| 分页参数 | `args` 中 `page` + `per_page` | 在 URL 中拼接 |
| 枚举值 | `args[].enum` | 限制允许的值 |
| 默认值 | `args[].default` | 参数未提供时使用 |
| 必填校验 | `args[].required: true` | AI 必须提供 |
| 嵌套对象 | `args[].type: object` + `properties` | 支持嵌套 schema |
| 数组参数 | `args[].type: array` + `items` | 支持数组元素 schema |
| 后端 MCP 服务器 URL | `server.mcpServerURL` | mcp-proxy 类型用 |
| 传输协议 | `server.transport` | `http` 或 `sse` |
