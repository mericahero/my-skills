# 扫描策略

本文档定义了从存量项目代码中提取信息的完整扫描策略。按信息需求组织，每节说明扫描什么、提取什么、映射到哪个约束分类。

## 扫描原则

1. **配置文件全量读取**：构建文件、配置文件通常不大，可以完整读取
2. **代码文件采样读取**：每类代码文件只采样 2-3 个典型文件
3. **目录结构先行**：先了解整体布局，再有针对性地深入
4. **按依赖顺序扫描**：先扫描基础设施（构建、配置），再扫描业务代码
5. **README 优先读取**：项目根目录的 `README.md` 优先读取，用于提取项目名称和定位描述（→ architecture.md §1）
6. **拓扑优先判定**：先识别仓库中所有构建单元、服务、前端应用和公共模块，再判断单体/微服务/Monorepo/微前端；禁止只根据根目录 `src/` 判定单体

---

## 0. 仓库拓扑预扫描 → 项目类型 + 服务/应用清单

**目标**：先建立仓库全貌，防止只扫描根 `src/` 而漏掉平铺的微服务、主应用、子应用和公共模块。

**必须扫描的顶层/二级信号**：

| 信号类型 | 文件或目录 |
|----------|------------|
| 后端构建单元 | `pom.xml`、`build.gradle`、`build.gradle.kts`、`settings.gradle`、`go.mod`、`Cargo.toml` |
| 前端构建单元 | `package.json`、`pnpm-workspace.yaml`、`yarn.lock`、`vite.config.*`、`webpack.config.*` |
| Maven 多模块 | 父 POM `<modules>`、子模块 `pom.xml` |
| Gradle 多模块 | `settings.gradle` / `settings.gradle.kts` 中的 `include(...)` |
| Node workspace | `pnpm-workspace.yaml`、`package.json` 的 `workspaces` |
| 后端服务目录 | 顶层目录含 `src/main/java`、启动类、`application.yml` / `application.properties` |
| 网关/服务治理 | `gateway` 目录或依赖、Spring Cloud Gateway、Feign、Consul、Nacos、Apollo、注册/配置中心配置 |
| 前端应用目录 | 顶层目录含 `package.json`、`vite.config.*`、`src/main.*` |
| 微前端 | qiankun / wujie / micro-app / single-spa / Module Federation 依赖，主应用注册子应用配置，子应用生命周期导出 |
| 公共模块 | `common`、`shared`、`core`、`base`、`packages/shared` |

**输出结构**：

```yaml
repository_topology:
  build_units:
    - path: {dir}
      type: backend|frontend|shared|unknown
      build_file: {file}
      module_name: {name}
  backend_services:
    - path: {dir}
      service_name: {spring.application.name or inferred}
      port: {server.port or unknown}
      signals: [starter, application.yml, feign, gateway, registry]
  frontend_apps:
    - path: {dir}
      app_name: {package name or inferred}
      role: shell|subapp|standalone|unknown
      signals: [vite, qiankun, wujie, module-federation]
  shared_modules:
    - path: {dir}
      kind: common|shared|core|base
  architecture_signals:
    - monorepo|microservice|micro-frontend|fullstack|single-app
```

**判定规则**：

- 存在多个构建单元或 workspace/multi-module 声明 → 优先判定为 Monorepo，再细分后端/前端/公共模块。
- 存在多个后端服务候选，或命中 gateway/registry/config-center/Feign/MQ 等服务治理信号 → 判定为微服务，不得判定为单体。
- 存在多个前端应用候选，或命中主应用注册子应用/微前端依赖/子应用生命周期 → 判定为微前端，不得判定为单一前端。
- 只有在确认单一构建单元、单一启动入口、无服务治理和无微前端/workspace 信号时，才可判定为单体。
- 如果信号冲突，输出候选拓扑并请求用户确认，不要静默选择单体。

---

## 1. 构建文件 → T 约束 + architecture.md §3

**目标文件**（按项目类型选择）：

| 项目类型 | 构建文件 |
|----------|----------|
| Java/Maven | `pom.xml`（根 + 子模块） |
| Java/Gradle | `build.gradle` / `build.gradle.kts`、`settings.gradle` |
| Go | `go.mod` |
| Rust | `Cargo.toml` |
| Node.js | `package.json`（根 + 子包） |
| Python | `pyproject.toml` / `requirements.txt` / `setup.py` |

**提取信息**：
- 语言及版本（如 Java 17、Go 1.21、Node 20）
- 框架及版本（如 Spring Boot 3.3.x、Gin 1.9、Next.js 14）
- 核心依赖列表（ORM、缓存、消息队列、安全框架等）
- 构建工具及版本（Maven 3.9、Gradle 8.x、Vite 5.x）
- 多模块结构（子模块名称和职责）

**映射**：
- 语言/框架/版本 → `T` 约束（T1, T2, T3...）
- 技术选型详情 → `architecture.md` §3 技术选型表

---

## 2. 配置文件 → S 约束 + architecture.md §4

**目标文件**：

| 类型 | 文件 |
|------|------|
| Spring Boot | `application.yml` / `application.properties`（含 profile 变体） |
| Spring Cloud | `bootstrap.yml`、Nacos/Consul 配置 |
| Node.js | `.env` / `.env.example`、`config/` 目录 |
| Docker | `docker-compose.yml`、`Dockerfile` |
| K8s | `k8s/` 或 `deploy/` 目录下的 YAML |
| 通用 | `nginx.conf`、`.gitlab-ci.yml` / `.github/workflows/` |

**提取信息**：
- 服务名称和端口
- 数据库连接信息（类型、是否多数据源）
- 中间件配置（Redis、MQ、ES 等）
- 注册中心/配置中心类型
- 服务间调用方式（Feign、gRPC、REST）
- 部署方式（Docker、K8s、传统部署）

**映射**：
- 架构模式（单体/微服务） → `S` 约束（S1, S2, S3...）
- 服务清单 → `architecture.md` §4 服务清单表

---

## 3. 目录结构 → C 约束 + architecture.md §2

**扫描方式**：
- 先使用“仓库拓扑预扫描”的 `build_units`、`backend_services`、`frontend_apps` 作为扫描入口
- 对每个后端服务候选分别扫描 `src/main/java`、`src/main/resources` 和配置文件
- 对每个前端应用候选分别扫描 `src/`、`src/router`、`src/store`、`src/main.*`、微前端注册配置
- 对公共模块候选扫描导出的包结构和公共能力
- 只有单构建单元项目才对根 `src/` 或项目主代码目录执行 2 层深度目录列表

**提取信息**：
- 代码分层模式（controller/service/repository、handler/usecase/repo、pages/components/stores 等）
- 目录命名规范
- 模块划分方式（按功能、按领域、按层）
- 前后端目录是否分离
- 服务/应用清单及其代码根路径
- 微前端主应用/子应用关系

**映射**：
- 分层规则 → `C` 约束（C1-C8，按实际项目调整）
- 整体布局 → `architecture.md` §2 架构图的输入

**注意**：constitution.md 模板中的 C1-C8 是 Spring Boot + Vue 3 的默认结构。如果实际项目使用不同技术栈，需要**完全重写** C 分类的约束内容，而非简单替换占位符。同时应优先采用 `.opencode/rules/` 中定义的代码结构规范。

---

## 4. Controller / Handler 采样 → P 约束

**目标文件**：
- 在 `controller/` / `handler/` / `routes/` / `api/` 目录下采样 2-3 个文件
- 优先选择不同业务模块的 Controller

**提取信息**：
- API 风格（RESTful、GraphQL、RPC）
- URL 路径模式（是否版本化、命名风格）
- 统一响应体结构（如 `{"code": 0, "message": "", "data": {}}`）
- 字段命名风格（camelCase、snake_case）
- 分页参数约定
- 参数校验方式（注解校验、手动校验）

**映射**：
- API 规范 → `P` 约束（P1, P2, P3, P4...）

---

## 5. Entity / Model 采样 → D 约束

**目标文件**：
- 在 `entity/` / `model/` / `domain/` / `schema/` 目录下采样 2-3 个文件
- 如有数据库迁移文件（`db/migration/`、`migrations/`），也采样 1-2 个

**提取信息**：
- 主键策略（自增、UUID、雪花算法）
- 公共字段（create_time、update_time、deleted 等）
- 表命名规则（前缀、分隔符）
- 字段命名规则（snake_case、camelCase）
- ORM 使用方式（注解、XML、代码生成）
- 软删除策略
- 审计字段

**映射**：
- 数据规范 → `D` 约束（D1, D2, D3...）

---

## 6. 安全配置 → E 约束

**目标文件**：
- `SecurityConfig` / `WebSecurityConfig` 类
- `shiro.ini` / Spring Security 配置
- JWT 相关工具类或配置
- OAuth2 配置
- CORS 配置
- 权限注解使用（`@PreAuthorize`、`@RequiresPermissions`）

**提取信息**：
- 认证方式（JWT、Session、OAuth2、SAML）
- 权限模型（RBAC、ABAC）
- Token 策略（过期时间、刷新机制）
- 加密策略（密码加密、敏感数据加密）
- CORS 策略

**映射**：
- 安全规范 → `E` 约束（E1, E2...）

---

## 7. 前端配置与结构 → U 约束

**目标文件**：
- `package.json`（前端依赖）
- `vite.config.ts` / `webpack.config.js` / `next.config.js`
- `tsconfig.json`
- `src/` 目录结构（2 层）
- 路由配置文件（`router/index.ts`）
- 状态管理入口（`stores/index.ts`）
- HTTP 客户端封装（`utils/request.ts` / `api/index.ts`）

**提取信息**：
- 前端框架及版本
- UI 组件库
- 状态管理方案
- 构建工具
- HTTP 客户端
- CSS 方案（Tailwind、SCSS、CSS Modules）
- 响应式适配策略

**映射**：
- 前端规范 → `U` 约束（U1-U5...）

---

## 8. 服务间通信 → 领域检测输入

**目标文件**：
- Feign Client 接口
- RestTemplate / WebClient 配置
- gRPC proto 文件
- MQ Producer / Consumer 类
- 事件总线配置

**提取信息**：
- 服务间同步调用方式和目标
- 异步消息主题和消费者
- 事件驱动模式

**映射**：
- 通信模式 → 领域检测（消息通信领域）
- 服务依赖关系 → `architecture.md` §4 依赖服务列

---

## 9. 其他配置文件 → 领域检测输入

**按需扫描**（仅在前序扫描中发现线索时才深入）：

| 线索 | 深入扫描 |
|------|----------|
| Redis 依赖 | `@Cacheable` 注解使用、CacheManager 配置 |
| OSS/MinIO/S3 依赖 | 文件上传 Controller、存储配置 |
| `@Scheduled` 注解或 XXL-Job 依赖 | Job 类、定时任务配置 |
| ELK/Prometheus 依赖 | 日志配置、监控端点 |
| WebSocket 依赖 | WS 端点配置 |

**映射**：
- 各项 → 对应领域的检测信号（详见 `domain-detection.md`）

---

## 10. 公共模块扫描 → G 约束 + architecture.md §9

**目标文件**：

| 类型 | 扫描目标 |
|------|----------|
| 后端公共模块 | `common/`、`shared/`、`core/`、`base/` 模块目录及其 `src/main/java/` 下的包结构 |
| 统一异常体系 | `GlobalExceptionHandler`、`*Exception.java`、`ErrorCode` 接口/枚举 |
| 统一响应封装 | `ApiResponse`、`Result`、`R`、`CommonResult` 类 |
| Redis 封装 | 自定义 `RedisClient`、`RedisHelper`、`CacheService`（非直接 `RedisTemplate` 使用） |
| ID 生成器 | `IdGenerator`、`SnowflakeIdWorker`、`UidGenerator` 类 |
| 分布式锁 | `DistributedLock`、`RedisLock`、`LockService` 类 |
| 请求上下文 | `RequestContext`、`UserContext`、MDC Filter/Interceptor |
| 错误码定义 | `ErrorCode` 接口、`*ErrorCode` 枚举、错误码常量类 |
| 前端公共模块 | `shared/`、`packages/shared/`、`common/` 目录 |
| Axios 封装 | `request.ts`、`http.ts`、`axios.ts` 封装文件 |
| 通用 composables | `composables/` 或 `hooks/` 目录下的 `use*.ts` 文件 |
| 全局指令 | `directives/` 目录下的自定义指令 |

**提取信息**：
- 公共模块名称和包结构
- 已有的全局工具类清单（类名、职责）
- 异常体系层级（有几层、基类是什么）
- 响应封装类名和泛型结构
- Redis 封装方式（是否有降级策略）
- 错误码分段规则（如已有）
- 前端公共工具清单（文件名、导出函数）
- 前端共享组件和指令清单

**映射**：
- 公共模块能力清单 → `G` 约束（G1-G8）
- 后端 Common 模块详情 → `architecture.md` §9.1
- 前端 Shared 模块详情 → `architecture.md` §9.2
- 降级策略配置 → `architecture.md` §9.3
- 错误码分段 → `architecture.md` §9.4

---

## 扫描结果组织模板

扫描完成后，按以下结构组织提取的信息：

```
## 扫描结果

### 项目基本信息
- 项目名称：{从构建文件或 README 提取}
- 项目类型：{后端/前端/全栈/Monorepo}
- 主要语言：{语言}

### S - 架构约束
- S1: ...
- S2: ...

### P - API 约束
- P1: ...

### D - 数据约束
- D1: ...

### E - 安全约束
- E1: ...

### T - 技术栈约束
- T1: ...

### U - UI/UX 约束
- U1: ...

### C - 代码结构约束
- C1: ...

### G - 全局基础设施约束
- G1: ...（公共模块定位）
- G2: ...（异常体系）
- G3: ...（响应封装）

### 领域检测信号
- 认证授权：{检测到/未检测到}，信号：...
- 消息通信：{检测到/未检测到}，信号：...
- 全局基础设施：{检测到/未检测到}，信号：...
- ...

### 架构信息
- 架构模式：{单体/微服务/Monorepo}
- 服务清单：...
- 技术选型：...

### 全局基础设施信息
- 后端公共模块：{模块名}，包含：{能力清单}
- 前端公共模块：{模块名}，包含：{能力清单}
- 降级策略：{已有/未发现}
- 错误码分段：{已有规则/未发现}
```
