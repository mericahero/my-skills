# 领域自动检测

本文档定义了从代码中自动检测技术领域的信号特征、判断规则和文件命名规范。

## 检测流程

```
扫描阶段发现依赖/配置线索
        ↓
按下方信号表逐领域匹配
        ↓
命中 ≥ 2 个信号 → 标记为"检测到"
        ↓
评估约束复杂度
        ↓
  ≤ 20 行 → 追加到 constitution.md（使用领域前缀）
  > 20 行 → 创建独立领域文件
```

---

## 领域信号表

### 1. 认证授权 (Auth)

| 信号类型 | 具体信号 |
|----------|----------|
| 依赖 | `spring-boot-starter-security`、`spring-security-oauth2`、`jjwt`、`nimbus-jose-jwt`、`sa-token`、`shiro` |
| 配置 | `SecurityConfig`、`WebSecurityConfigurerAdapter`、`SecurityFilterChain` Bean |
| 代码 | 登录 Controller、`@PreAuthorize`、`@RequiresPermissions`、TokenProvider/TokenUtil 类 |
| 配置文件 | `jwt.secret`、`oauth2.client` 配置项 |

- **文件命名**：`01-auth.md`
- **约束前缀**：`A`（如 A1, A2, A3）
- **判断阈值**：命中 ≥ 2 个信号类型

### 2. 消息通信 (Messaging)

| 信号类型 | 具体信号 |
|----------|----------|
| 依赖 | `rocketmq-spring-boot-starter`、`spring-kafka`、`spring-boot-starter-amqp`（RabbitMQ）、`pulsar-client` |
| 代码 | `@RocketMQMessageListener`、`@KafkaListener`、`@RabbitListener`、Producer/Consumer 类 |
| 配置文件 | `rocketmq.name-server`、`spring.kafka.bootstrap-servers`、`spring.rabbitmq.host` |

- **文件命名**：`02-messaging.md`
- **约束前缀**：`M`（如 M1, M2）
- **判断阈值**：命中 ≥ 1 个依赖 + ≥ 1 个代码信号

### 3. 缓存策略 (Caching)

| 信号类型 | 具体信号 |
|----------|----------|
| 依赖 | `spring-boot-starter-data-redis`、`spring-boot-starter-cache`、`caffeine`、`redisson` |
| 代码 | `@Cacheable`、`@CacheEvict`、`@CachePut`、`RedisTemplate`、`StringRedisTemplate`、`CacheManager` Bean |
| 配置文件 | `spring.redis.host`、`spring.cache.type` |

- **文件命名**：`03-caching.md`
- **约束前缀**：`CH`（如 CH1, CH2，避免与 C-代码结构冲突）
- **判断阈值**：命中 ≥ 2 个信号类型
- **注意**：如果 Redis 仅用于简单 KV 存储（无 `@Cacheable` 等注解），约束通常 ≤ 20 行，追加到 constitution.md 即可

### 4. 文件存储 (Storage)

| 信号类型 | 具体信号 |
|----------|----------|
| 依赖 | `aliyun-sdk-oss`、`minio`、`aws-java-sdk-s3`、`cos_api`（腾讯云） |
| 代码 | 文件上传 Controller（`MultipartFile` 参数）、OssClient/MinioClient 封装类 |
| 配置文件 | `oss.endpoint`、`minio.endpoint`、`aws.s3.bucket` |

- **文件命名**：`04-storage.md`
- **约束前缀**：`ST`（如 ST1, ST2）
- **判断阈值**：命中 ≥ 1 个依赖 + ≥ 1 个代码/配置信号

### 5. 定时任务 (Scheduling)

| 信号类型 | 具体信号 |
|----------|----------|
| 依赖 | `xxl-job-core`、`spring-boot-starter-quartz`、`elastic-job` |
| 代码 | `@Scheduled`、`@XxlJob`、`@DisallowConcurrentExecution`、Job/Task 类 |
| 配置文件 | `xxl.job.admin.addresses`、`spring.quartz` 配置 |

- **文件命名**：`05-scheduling.md`
- **约束前缀**：`SC`（如 SC1, SC2）
- **判断阈值**：命中 ≥ 2 个信号类型
- **注意**：如果只有少量 `@Scheduled` 注解且无分布式调度框架，约束通常 ≤ 20 行

### 6. 日志监控 (Observability)

| 信号类型 | 具体信号 |
|----------|----------|
| 依赖 | `micrometer-registry-prometheus`、`spring-boot-starter-actuator`、`logstash-logback-encoder`、`skywalking`、`opentelemetry` |
| 代码 | 自定义 Metrics、`@Traced`、链路追踪 Filter |
| 配置文件 | `management.endpoints`、`logging.logstash`、ELK 相关配置、Grafana dashboard JSON |

- **文件命名**：`06-observability.md`
- **约束前缀**：`O`（如 O1, O2）
- **判断阈值**：命中 ≥ 2 个信号类型
- **注意**：如果只有基础的 `spring-boot-starter-actuator` 而无额外监控体系，约束通常 ≤ 20 行

### 7. 搜索引擎 (Search)

| 信号类型 | 具体信号 |
|----------|----------|
| 依赖 | `spring-boot-starter-data-elasticsearch`、`elasticsearch-rest-high-level-client`、`easy-es` |
| 代码 | `@Document`（ES 注解）、ElasticsearchRepository、SearchService 类 |
| 配置文件 | `spring.elasticsearch`、`spring.data.elasticsearch` |

- **文件命名**：`07-search.md`
- **约束前缀**：`SE`（如 SE1, SE2）
- **判断阈值**：命中 ≥ 2 个信号类型

### 8. 工作流/审批 (Workflow)

| 信号类型 | 具体信号 |
|----------|----------|
| 依赖 | `flowable-spring-boot-starter`、`activiti`、`camunda` |
| 代码 | ProcessEngine 配置、流程定义 BPMN 文件、审批 Controller |
| 配置文件 | `flowable.database-schema-update`、BPMN XML 文件 |

- **文件命名**：`08-workflow.md`
- **约束前缀**：`W`（如 W1, W2）
- **判断阈值**：命中 ≥ 1 个依赖 + ≥ 1 个代码/配置信号

---

## 前端领域信号

以下领域仅在前端或全栈项目中检测：

### 9. 国际化 (i18n)

| 信号类型 | 具体信号 |
|----------|----------|
| 依赖 | `vue-i18n`、`react-intl`、`next-intl`、`i18next` |
| 代码 | `$t()` / `useI18n()` 调用、locale 文件目录（`locales/`、`i18n/`） |

- **文件命名**：`09-i18n.md`
- **约束前缀**：`I`（如 I1, I2）
- **判断阈值**：命中依赖 + locale 文件存在

### 10. 微前端 (Micro-Frontend)

| 信号类型 | 具体信号 |
|----------|----------|
| 依赖 | `qiankun`、`wujie`、`micro-app`、`single-spa`、`@module-federation/*`、Webpack/Vite Module Federation 配置 |
| 配置 | 主应用注册子应用配置、子应用导出生命周期、`activeRule`、`container`、`entry`、remote/module exposes |
| 仓库结构 | 多个前端应用目录、workspace packages、`apps/*`、`packages/*`、主应用/子应用命名 |

- **文件命名**：`10-micro-frontend.md`
- **约束前缀**：`MF`（如 MF1, MF2）
- **判断阈值**：命中 ≥ 2 类信号，或命中“主应用注册子应用配置 / 子应用生命周期导出 / Module Federation remote/exposes”任一强信号

---

## 基础设施领域信号

以下领域在所有项目中检测（不区分前后端）：

### 11. 全局基础设施 (Global Infrastructure)

| 信号类型 | 具体信号 |
|----------|----------|
| 后端公共模块 | 存在 `common`/`shared`/`core`/`base` 模块目录，包含跨服务共享代码 |
| 统一异常体系 | `GlobalExceptionHandler`、`BusinessException`、`ServiceException`、`BaseException` 类 |
| 统一响应封装 | `ApiResponse`、`Result<T>`、`R<T>`、`CommonResult` 类 |
| Redis 封装 | 自定义 `RedisClient`、`RedisHelper`、`CacheService` 封装类（非直接使用 `RedisTemplate`） |
| ID 生成器 | `IdGenerator`、`SnowflakeIdWorker`、`UidGenerator` 类 |
| 分布式锁 | `DistributedLock`、`RedisLock`、`LockService` 封装类 |
| 请求上下文 | `RequestContext`、`UserContext`、`TraceContext`、MDC 相关 Filter/Interceptor |
| 错误码定义 | `ErrorCode` 接口/枚举、`CommonErrorCode`、按模块分段的错误码常量类 |
| 前端公共模块 | 存在 `shared`/`common`/`packages/shared` 目录，包含跨应用共享代码 |
| Axios 封装 | 自定义 `request.ts`/`http.ts` 封装（含拦截器、统一错误处理） |
| 通用 composables | `useLoading`、`usePagination`、`usePermission` 等跨应用组合式函数 |
| 全局指令 | `v-permission`、`v-loading` 等自定义指令 |

- **文件命名**：`00-global-infrastructure.md`（使用 `00-` 前缀确保排在所有领域文件之前）
- **约束前缀**：`G`（如 G1, G2, G3）
- **判断阈值**：命中 ≥ 3 个信号类型
- **特殊规则**：
  - 此领域的约束**始终写入 constitution.md 的 G 分类**（不受 20 行阈值限制）
  - 当信号丰富（命中 ≥ 6 个信号类型）且需要详细的架构决策说明时，额外创建 `00-global-infrastructure.md` 领域文件
  - architecture.md §9 全局基础设施层**始终填充**（不受领域检测结果影响），内容来自扫描结果或用户交互

---

## 复杂度评估规则

检测到领域后，按以下标准评估约束复杂度：

| 复杂度指标 | ≤ 20 行（追加到 constitution.md） | > 20 行（创建独立文件） |
|------------|----------------------------------|------------------------|
| 技术选型决策 | 0-1 个 | ≥ 2 个 |
| 架构约束规则 | 1-3 条 | ≥ 4 条 |
| 需要架构图 | 否 | 是 |
| 方案对比 | 无 | 有 |
| 实现指引 | 无需 | 需要 |

**简单判断法**：如果该领域只需要说明"用了什么、怎么配置"，追加到 constitution.md。如果还需要说明"为什么这样选、整体怎么交互、各模块怎么配合"，创建独立文件。

---

## 领域文件编号规则

- 编号从 `01` 开始，按检测顺序递增
- 如果某个领域最终决定追加到 constitution.md 而非创建独立文件，跳过该编号
- 编号不要求连续，但必须递增
- 文件名格式：`{两位编号}-{英文领域名}.md`，如 `01-auth.md`、`03-caching.md`
- **输出目录**：`docs/domains/`（如目录不存在则创建）
- **模板来源**：从 `docs/templates/domain-template.md` 复制到 `docs/domains/` 下并重命名，然后填充
