# Rules Reviewer 派发参考

本文件是 `asdd-rules-review` Lead 的派发参考，用于将 `.opencode/rules/` 中的规则条目裁剪、
分组并映射到预定义 OpenCode rules reviewer agents。

> **Lead-only**：不要把本文件作为所有 rules agents 的共享上下文传入。Lead 应先读取本文件和
> 规则文件，再将每个 agent 需要的规则原文、diff、完整文件、关联文件和输出 schema 动态传入。
> Agent 文件只保留稳定角色纪律；本文件不替代动态 prompt。

当前预定义 agents：

| Agent | 维度 |
|-------|------|
| `cc-review-rules-component` | 组件黑白名单、依赖基线、未列出组件 |
| `cc-review-rules-security` | 安全类规则合规 |
| `cc-review-rules-backend` | 后端工程规范 |
| `cc-review-rules-frontend` | 前端工程规范 |
| `cc-review-rules-database` | 数据库规范 |
| `cc-review-rules-middleware` | 中间件规范 |
| `cc-review-rules-general` | 通用/跨领域规范 |

---

## 预定义 Agent：cc-review-rules-component — 组件黑白名单合规审查

### 职责

专职审查项目依赖是否符合企业组件选型策略（component-policy.md）。
检查黑白名单合规性，追踪管理未列出的互联网组件。

### 输入

- `component-policy.md` 全文（白名单表 + 黑名单表 + 决策流程）
- 变更中的依赖声明文件 diff（pom.xml、package.json、build.gradle）
- `docs/unlisted-components.md`（如存在）

### 工作流程

#### Step 1：解析白名单和黑名单

从 component-policy.md 中提取：

- **白名单**：按场景分类的组件表（组件名、版本基线）
  - 前端组件表
  - 后端框架与运行时表
  - 应用中间件与治理表
  - 消息、缓存、搜索与事务表
  - 调度、流程与规则引擎表
  - 数据库表
  - 大数据与 AI 表
  - 监控与可观测性表

- **黑名单**：禁止使用的组件列表（组件名、禁止原因、替代方案）

#### Step 2：扫描变更中的依赖

**后端依赖**（pom.xml / build.gradle）：
```
解析 diff 中新增或变更的 <dependency> / implementation 声明
  → 提取 groupId + artifactId + version
  → 构建依赖变更清单
```

**前端依赖**（package.json）：
```
解析 diff 中新增或变更的 dependencies / devDependencies 条目
  → 提取包名 + 版本
  → 构建依赖变更清单
```

如果依赖声明文件未在变更中 → 报告"无依赖变更，组件合规检查跳过"。

#### Step 3：逐依赖三级判定

对每个新增或变更的依赖执行：

```
依赖 X（name + version）
  |
  ▼
[黑名单检查]
  X 在黑名单中？
    是 → 🔴 Critical 违规
         记录：组件名、黑名单匹配项、禁止原因、替代方案
         → 继续检查下一个依赖
    否 → 继续
  |
  ▼
[白名单检查]
  X 在白名单中？
    是 → 检查版本：
         X.version ≥ 白名单基线版本？
           是 → ✅ 合规
           否 → 🟠 Major：版本低于基线
                记录：当前版本、基线版本
    否 → 继续
  |
  ▼
[同场景替代检查]
  白名单中是否有与 X 同场景的组件？
  （如 X 是 HTTP 库，白名单中 Axios 是 HTTP 场景的标准选项）
    是 → 🟠 Major：应使用白名单中的同场景组件
         记录：X 的用途、白名单替代组件
    否 → 继续
  |
  ▼
[未列出组件处理]
  X 不在黑名单也不在白名单 → 标记为"未列出互联网组件"
  检查 Lead 传入的 docs/unlisted-components.md 裁剪上下文：
    X 已在追踪文件中？
      是 → 检查确认状态：
           ✅ 已确认 → 不报告为违规，仅标注"已追踪已确认"
           ⚠️ 待确认 → 🔵 Suggestion：提醒尽快确认
           ❌ 已拒绝 → 🟠 Major：已拒绝的组件仍在使用，应移除
      否 → 返回 unlisted_components 候选
           报告为 🔵 Suggestion：发现未列出组件，建议 Lead 写入追踪文件并等待确认
```

#### Step 4：返回未列出组件候选

对所有新发现的未列出组件，agent 只返回 `unlisted_components` 候选项。
`docs/unlisted-components.md` 的创建和追加由 Lead 在最终汇总阶段完成。

**后端组件条目格式**：

| 字段 | 来源 |
|------|------|
| 组件名 | artifactId |
| GroupId | groupId |
| 版本 | version |
| 用途说明 | 从代码 import 和使用方式推断 |
| 许可证 | 仅当传入上下文明确提供时填写，否则标注"未知" |
| 发现时间 | 当前日期（YYYY-MM-DD） |
| 确认状态 | new（Lead 写入时映射为“新发现”） |

**前端组件条目格式**：

| 字段 | 来源 |
|------|------|
| 组件名 | 包名 |
| 版本 | version |
| 用途说明 | 从代码 import 和使用方式推断 |
| 许可证 | 仅当传入上下文明确提供时填写，否则标注"未知" |
| 发现时间 | 当前日期（YYYY-MM-DD） |
| 确认状态 | new（Lead 写入时映射为“新发现”） |

#### Step 5：返回组件候选结果

```
## 组件合规审查报告

审查规则：component-policy.md
审查文件：{依赖声明文件列表}
合规状态：{✅ 合规 | ⚠️ 部分合规 | ❌ 不合规}

### 依赖变更摘要

新增依赖：{n} 个
变更依赖：{n} 个（版本升降级）

### 判定结果

| 依赖 | 判定 | 详情 |
|------|------|------|
| {name} | ✅ 白名单合规 | 版本 {v} ≥ 基线 {baseline} |
| {name} | 🟠 版本低于基线 | 当前 {v}，基线 {baseline} |
| {name} | 🔴 黑名单命中 | 替代方案：{alternative} |
| {name} | 🔵 未列出组件提示 | 建议 Lead 写入 unlisted-components.md |

### 未列出组件追踪

本次新发现 {n} 个未列出组件，建议 Lead 写入 docs/unlisted-components.md。
已追踪待确认：{n} 个
已追踪已确认：{n} 个
已追踪已拒绝：{n} 个（⚠️ 应移除）

### 违规列表

{按严重级别排列的违规详情}
```

---

## 预定义 Agent：cc-review-rules-security — 安全类规则合规审查

### 职责

专职审查代码是否符合所有适用规则中的安全相关条目。
从现有规则文件中跨文件提取安全条目进行专项深度审查，并承接未来独立安全规则文件。

> **半固定**：只要有安全规则条目且存在代码/配置/SQL 变更，Lead 就应调用此 agent；
> 安全规则开启 deepScan 时也应调用。
> 安全是跨领域关注点，任何代码变更都可能涉及安全规则条目。

### 输入

- 从所有适用规则中提取的安全相关条目（由 Lead 在阶段 2.2 提取）
- 所有变更文件 diff + 完整内容
- 安全关联文件（认证配置、数据库连接配置、加密工具类等）
- 项目配置文件（application.yml 中的安全相关配置）

### 安全条目来源映射

| 来源规则 | 提取的安全条目 |
|---------|--------------|
| engineering-dev-standards.md | 禁止硬编码密钥/密码、敏感信息不入代码 |
| database-dameng.md | 最小权限原则、禁止 SYS/SYSDBA 连接应用 |
| database-gaussdb.md | 禁止 sysadmin 用于应用连接 |
| database-higodb.md | TLS/SSL 必须开启、verify-full 优先、禁止硬编码凭据 |
| database-oceanbase.md | 禁止弱密码、凭据加密存储 |
| （未来独立安全规则文件） | 整体归入，如加密策略、密码复杂度、token 管理等 |

### 工作流程

#### Step 1：汇总安全规则条目

从 Lead 分发的安全条目中，按安全子领域分类整理：

```
安全子领域分类：
  ├── 凭据管理：硬编码密钥/密码、凭据加密存储、弱密码
  ├── 传输安全：TLS/SSL 配置、verify-full、加密传输
  ├── 权限控制：最小权限、禁止高权限账户用于应用、角色分离
  ├── 认证授权：token 管理、会话安全、认证机制
  └── 数据保护：敏感数据脱敏、加密算法选择、密钥管理
```

每个条目记录：
- 条目编号（来源规则文件 §章节.序号）
- 规则原文
- 安全子领域分类
- 检查方式（grep/配置分析/代码阅读）

#### Step 2：逐条目检查变更代码

对每个安全规则条目，在所有变更文件中检查：

```
安全条目 N：{规则描述}
  |
  → 确定检查目标：所有变更文件（安全不限领域）
  → 确定检查方式：
     - 凭据硬编码检查 → grep password/secret/credential/apiKey 等字面量
     - TLS/SSL 配置检查 → 检查 application.yml 中 ssl 相关配置项
     - 权限检查 → 检查数据库连接用户、Spring Security 配置
     - 加密使用检查 → 检查加密算法选择、密钥管理方式
  → 执行检查
  → 记录结果：合规 / 违规
```

#### Step 3：安全关联文件深度检查

对阶段 0.3 追踪到的安全关联文件进行深度检查：

```
认证/授权配置变更 → 检查 Filter/Interceptor 链是否完整
数据库连接配置变更 → 检查凭据是否加密、是否使用环境变量
加密工具类变更    → 检查算法强度、密钥管理方式、是否使用已废弃算法
```

#### Step 4：记录违规

每条违规必须包含：
- 规则来源（文件名 + 章节编号）
- 规则原文（直接引用）
- 安全子领域分类
- 违规文件和行号
- 违规代码片段
- 安全风险说明（该违规可能导致的安全后果）
- 修复建议

#### Step 5：返回安全候选结果

```
## 安全规范合规报告

审查规则：{安全条目来源规则列表}
安全条目总数：{n} 个（来自 {m} 个规则文件）
审查文件：{审查了哪些变更文件}
合规状态：{✅ 合规 | ⚠️ 部分合规 | ❌ 不合规}
违规数量：🔴 {n} + 🟠 {n} + 🟡 {n} + 🔵 {n}

### 按安全子领域汇总

| 子领域 | 检查条目 | 合规 | 违规 | 状态 |
|--------|---------|------|------|------|
| 凭据管理 | {n} | {n} | {n} | {✅|⚠️|❌} |
| 传输安全 | {n} | {n} | {n} | {✅|⚠️|❌} |
| 权限控制 | {n} | {n} | {n} | {✅|⚠️|❌} |
| 认证授权 | {n} | {n} | {n} | {✅|⚠️|❌} |
| 数据保护 | {n} | {n} | {n} | {✅|⚠️|❌} |

### 违规列表

{按严重级别从高到低排列}

### 安全小结

{1-3 句话总结安全合规情况，重点标注高风险项}
```

### 重点检查方向

| 检查方向 | 检索方式 |
|---------|---------|
| 硬编码密钥/密码/凭据 | grep `password\|secret\|credential\|apiKey\|token` 字面量赋值 |
| 数据库连接凭据加密 | 检查 datasource 配置中密码是否加密或使用环境变量 |
| TLS/SSL 配置 | 检查 application.yml 中 `ssl`/`tls` 配置项、`verify-full` 设置 |
| 数据库连接权限 | 检查连接用户是否为高权限账户（SYS/SYSDBA/sysadmin/root） |
| 弱密码模式 | 检查密码复杂度配置、是否存在简单密码字面量 |
| 加密算法选择 | 检查是否使用已废弃算法（MD5/SHA1/DES）、密钥长度是否足够 |
| 敏感数据日志 | 检查日志输出中是否包含密码、token 等敏感信息 |
| SQL 注入防护 | 检查 MyBatis `${}` 使用、JDBC 拼接 SQL 模式 |

---

## 预定义领域 Agents 通用工作流程

领域 agents（`cc-review-rules-backend`、`cc-review-rules-frontend`、
`cc-review-rules-database`、`cc-review-rules-middleware`、`cc-review-rules-general`）
共享相同的工作流程，区别在于 Lead 动态传入的规则内容和目标文件类型不同。

### 通用工作流程

#### Step 1：解析规则为可检查条目

将收到的规则内容解析为独立的、可检查的条目：

```
规则章节（如"后端规范 > 包路径强制约束"）
  |
  → 提取每条具体规则：
    条目 1："包路径必须为 com.picc.{project}.{service}/"
    条目 2："公司标识固定为 picc，不可更改"
    条目 3："目录名统一小写"
    ...
  → 每个条目记录：
    - 条目编号（规则文件 §章节.序号）
    - 规则原文
    - 检查方式（grep/结构分析/代码阅读）
    - 目标文件类型
```

#### Step 2：逐条目检查变更代码

对每个规则条目：

```
条目 N：{规则描述}
  |
  → 确定目标文件：从变更文件中筛选该条目关注的文件类型
  → 确定检查方式：
     - 关键词匹配型（如"禁止使用 System.out"）→ grep 搜索
     - 结构分析型（如"包路径必须为..."）→ 检查 package 声明
     - 语义理解型（如"Service 方法必须有事务注解"）→ 阅读代码逻辑
  → 执行检查
  → 记录结果：合规 / 违规
```

#### Step 3：记录违规

每条违规必须包含：
- 规则来源（文件名 + 章节编号）
- 规则原文（直接引用）
- 违规文件和行号
- 违规代码片段
- 修复建议

#### Step 4：返回领域候选结果

返回结构必须符合 `SKILL.md` 中的 Agent 输出 Schema：`applicability`、
`checked_rules`、`violations`，以及必要的 `reason`。

---

## 预定义 Agent：cc-review-rules-backend

### 职责

审查变更中的后端代码是否符合工程规范中的后端部分。

### 接收的规则

- engineering-dev-standards.md → 通用规则 + 后端规范章节
- 未来可能新增的后端相关规则

### 目标文件

- `src/main/java/**/*.java`（源码）
- `src/test/java/**/*.java`（测试代码）
- `pom.xml`（模块结构相关）

### 重点检查方向

| 检查方向 | 检索方式 |
|---------|---------|
| 包路径是否符合 `com.picc.{project}.{service}/` | 检查 package 声明 |
| 微服务内包结构是否正确（api/service/dao/po 等） | 检查目录结构和类所在包 |
| 类/方法/变量命名是否符合规范 | 代码阅读 |
| Controller/Service/DAO 分层是否正确 | 检查 import 和调用关系 |
| 异常处理是否符合规范 | 检查 try-catch 和异常类使用 |
| 事务注解是否正确使用 | grep `@Transactional` |
| 日志使用是否规范 | grep 日志框架调用 |
| 编码/配置硬编码检查 | grep 硬编码模式 |

---

## 预定义 Agent：cc-review-rules-frontend

### 职责

审查变更中的前端代码是否符合工程规范中的前端部分。

### 接收的规则

- engineering-dev-standards.md → 通用规则 + 前端规范章节
- 未来可能新增的前端相关规则

### 目标文件

- `*.vue`（SFC 组件）
- `*.ts`, `*.tsx`（TypeScript）
- `*.js`（JavaScript）
- `package.json`（依赖结构相关）

### 重点检查方向

| 检查方向 | 检索方式 |
|---------|---------|
| Vue SFC 是否使用 `<script setup>` + Composition API | 检查 `<script>` 标签 |
| 状态管理是否使用 Pinia | grep import 来源 |
| TypeScript 是否优先（而非 JS） | 检查文件扩展名和类型标注 |
| 组件命名是否 PascalCase | 检查文件名和组件注册 |
| CSS 是否使用 scoped | 检查 `<style>` 标签 |
| 目录结构是否符合规范 | 检查文件路径 |
| 编码/配置硬编码检查 | grep 硬编码模式 |

---

## 预定义 Agent：cc-review-rules-database

### 职责

审查变更中的数据库相关代码是否符合对应数据库的开发规范。

### 接收的规则

- database-{name}.md 全文（如 database-dameng.md）
- 未来可能新增的数据库相关规则

### 目标文件

- `*.sql`（SQL 脚本、迁移文件）
- `**/mapper/**/*.xml`（MyBatis XML 映射）
- `*.java`（涉及 SQL 构建的 Java 代码）
- `*.yml` / `*.properties`（数据库连接配置）

### 重点检查方向

| 检查方向 | 检索方式 |
|---------|---------|
| SQL 语法是否符合目标数据库方言 | 代码阅读 + 关键词匹配 |
| DDL 是否符合建表规范（命名、类型、约束） | 检查 CREATE TABLE 语句 |
| 索引是否符合规范 | 检查 CREATE INDEX 语句 |
| MyBatis XML 是否使用 `#{}` 而非 `${}` | grep `${` |
| 分页语法是否符合目标数据库 | 检查 LIMIT/OFFSET/ROWNUM 等 |
| 字符集/排序规则是否正确 | 检查 DDL 中的 CHARSET/COLLATE |
| 保留字是否被用作标识符 | 对照数据库保留字列表 |

---

## 预定义 Agent：cc-review-rules-middleware

### 职责

审查变更中涉及中间件使用的代码是否符合中间件相关规范。

### 接收的规则

- 中间件相关规则章节（从适用规则中提取）
- 未来可能新增的中间件专属规则

### 目标文件

- 涉及 Redis、MQ、缓存、分布式锁等的 Java/TS 文件
- 中间件配置文件

### 重点检查方向

| 检查方向 | 检索方式 |
|---------|---------|
| Redis 使用是否符合规范 | grep Redis 相关 import 和调用 |
| MQ 生产者/消费者是否符合规范 | grep MQ 相关注解和配置 |
| 缓存策略是否合理 | 检查缓存注解和 TTL 配置 |
| 分布式锁使用是否正确 | grep Redisson/Lock 相关代码 |

---

## 预定义 Agent：cc-review-rules-general — 通用/跨领域规范审查

### 职责

审查变更中的代码是否符合不归属于任何特定领域的通用/跨领域工程规范。
作为兜底角色，确保无规则条目被遗漏。

### 接收的规则

- engineering-dev-standards.md → 通用规则章节（编码规范、文件结构等）
- 未来可能新增的跨领域规则（DevOps、CI/CD、文档规范等）
- 无法归入现有领域的新规则条目

### 目标文件

- 所有变更文件（通用规则跨领域适用）
- 项目配置文件（`application.yml`、`pom.xml`、`package.json` 等）

### 重点检查方向

| 检查方向 | 检索方式 |
|---------|---------|
| 文件编码是否为 UTF-8 | 检查文件 BOM 头和编码声明 |
| 是否存在硬编码配置（非安全类） | grep 硬编码 URL、端口、环境特定值 |
| 组件白名单使用（代码层面） | 检查 import 是否引用了白名单外的工具库 |
| 文件/目录结构是否符合规范 | 检查项目目录布局和文件组织 |
| 配置文件格式是否规范 | 检查 YAML/Properties 格式、命名约定 |
| 跨领域一致性 | 检查前后端共享约定（如日期格式、编码规范）是否一致 |

> **与其他 agents 的边界**：
> - 硬编码密钥/密码 → `cc-review-rules-security`（安全相关）
> - 硬编码 URL/端口/环境值 → `cc-review-rules-general`（配置管理相关）
> - 包路径/分层规范 → `cc-review-rules-backend`（后端特定）
> - 组件依赖合规 → `cc-review-rules-component`（依赖层面）
> - 组件 import 使用 → `cc-review-rules-general`（代码层面跨领域检查）

---

## 新领域处理

当 Lead 发现规则内容涉及已有领域之外的新领域时：

1. 识别新领域名称（从规则内容的关键词和章节标题推断）。
2. 确定目标文件类型（从规则内容推断）。
3. 本次先归入 `cc-review-rules-general`，并在 dynamic prompt 中说明这是未分类领域规则。
4. 最终报告中标注“建议新增专用 rules reviewer agent”，但不要在运行时临时创建未定义 agent。

新增稳定领域时，应先在 `opencode/agents/` 增加预定义 `cc-review-rules-*` agent，
再更新 `asdd-rules-review` 的 agent 映射和本参考文件。
