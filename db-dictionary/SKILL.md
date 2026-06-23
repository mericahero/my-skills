---
name: "db-dictionary"
description: "自动化数据库数据字典生成工具，支持从数据库直连提取元数据、结合源码分析补充业务注释、按业务模块分类表、生成ER图和完整Excel数据字典。当用户需要生成数据字典、梳理数据库表结构、分析数据库架构、制作ER图、整理数据资产目录、或从源码反向生成数据库文档时调用。"
---

# Database Dictionary Generator（数据库数据字典生成器）

## 功能介绍

该 skill 用于自动化生成高质量的数据库数据字典，支持以下核心功能：

- **数据库元数据提取**：通过 JDBC 直连数据库，提取表结构、字段类型、主键、注释等完整元数据
- **源码驱动的业务注释补充**：分析 MyBatis Mapper XML、Entity 类注解（`@TableName`、`@TableField`、`@ApiModelProperty`），为字段补充业务含义注释
- **基于调用链的模块分类**：通过 Controller→Service→Mapper 调用链分析，将数据库表自动映射到业务模块
- **多格式输出**：生成 Excel 数据字典（按模块分 Sheet）、Mermaid ER 图文档、数据架构文档
- **质量验证与修复**：自动检测模块映射错误、注释质量、主键完整性等问题并修复

## 何时调用

当用户需要：
- 为现有数据库生成完整的数据字典
- 梳理数据库表结构与业务模块的对应关系
- 制作 ER 图（实体关系图）
- 整理数据资产目录或数据治理文档
- 从源码反向生成数据库文档
- 检查和修复现有数据字典的质量问题
- 分析数据库的概念实体架构、逻辑实体架构、物理实体架构

## 支持的数据库

| 数据库 | JDBC 驱动 | 连接格式 |
|--------|-----------|----------|
| MySQL | `mysql-connector-java-x.x.jar` | `jdbc:mysql://host:port/dbname` |
| PostgreSQL | `postgresql-x.x.x.jar` | `jdbc:postgresql://host:port/dbname` |
| 达梦(DM) | `DmJdbcDriver18.jar` | `jdbc:dm://host:port?schema=SCHEMA` |
| Oracle | `ojdbc8.jar` | `jdbc:oracle:thin:@host:port:sid` |
| SQL Server | `mssql-jdbc-x.x.x.jar` | `jdbc:sqlserver://host:port;databaseName=db` |

> **注意**：需要 Java 9+ 环境（推荐 Java 17），通过 JPype 调用 JDBC 驱动。

## 使用指南

### 基本使用步骤

```
用户请求 → 参数确认 → 数据库连接 → 元数据提取 → 源码分析 → 模块分类 → 生成输出 → 质量验证
```

### 详细工作流

#### Phase 1: 参数确认与准备

**必需参数**（通过 AskUserQuestion 向用户确认）：

| 参数 | 说明 | 示例 |
|------|------|------|
| 数据库连接信息 | JDBC URL、用户名、密码 | `jdbc:dm://10.168.191.113:6347?schema=TYYTH` |
| Java 环境 | JDK 9+ 的安装路径 | `D:\dev\java\zulu17` |
| 源码目录（可选） | 后端项目根目录，用于提取业务注释 | `D:\workspace\project-backend` |
| 业务模块列表（可选） | 系统的业务模块名称列表 | `首页,股票池,投研指标,产业链,...` |

**JDBC 驱动获取**：
- 优先从项目的 `lib/` 或 Maven 本地仓库 `~/.m2/repository/` 中查找
- 备选：从 Maven Central 下载对应驱动 JAR

#### Phase 2: 数据库元数据提取

通过 JPype + JDBC 连接数据库，执行以下 SQL 提取元数据：

```sql
-- 1. 表清单与表注释
SELECT TABLE_NAME, COMMENTS
FROM ALL_TAB_COMMENTS
WHERE OWNER = '{SCHEMA}' AND TABLE_TYPE = 'TABLE'

-- 2. 字段详情（类型、长度、精度、可空、默认值、注释）
SELECT c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE, c.DATA_LENGTH,
       c.DATA_PRECISION, c.DATA_SCALE, c.NULLABLE, c.DATA_DEFAULT,
       nvl(cc.COMMENTS, '') AS COMMENTS, c.COLUMN_ID
FROM ALL_TAB_COLUMNS c
LEFT JOIN ALL_COL_COMMENTS cc
  ON cc.OWNER = c.OWNER AND cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
WHERE c.OWNER = '{SCHEMA}'

-- 3. 主键信息
SELECT c.TABLE_NAME, c.COLUMN_NAME, c.CONSTRAINT_NAME
FROM ALL_CONS_COLUMNS c
JOIN ALL_CONSTRAINTS k ON c.OWNER = k.OWNER AND c.CONSTRAINT_NAME = k.CONSTRAINT_NAME
WHERE k.OWNER = '{SCHEMA}' AND k.CONSTRAINT_TYPE = 'P'
```

**输出**：`dm_full_schema.json`

```json
{
  "database": "DM DBMS",
  "version": "7.1.8.18",
  "schema": "TYYTH",
  "tables": {
    "YS_CHART": {
      "comment": "图表配置表",
      "columns": [
        {"name": "OBJID", "data_type": "VARCHAR", "data_length": "50", "comment": "主键ID", "is_pk": true}
      ]
    }
  }
}
```

#### Phase 3: 源码分析（可选，需提供源码目录）

**3.1 Mapper XML 分析** — 提取表名和 SQL 操作

扫描所有 `*Mapper.xml` 文件，提取：
- SQL 语句中的表名（正则：`FROM\s+(\w+)`、`INTO\s+(\w+)`、`UPDATE\s+(\w+)`）
- Mapper namespace → 对应的 Service 类
- Mapper 文件路径 → 对应的模块

**输出**：`mapper_table_mapping.json`

**3.2 Entity 类注解分析** — 提取字段业务注释

扫描 Entity 类文件，提取：
- `@TableName("table_name")` — 表名映射
- `@TableField("column_name")` — 字段映射
- `@ApiModelProperty("字段说明")` — Swagger API 注释
- 字段上的 Java 注释（`//` 或 `/** */`）

**输出**：`entity_field_comments.json`

**3.3 Controller→Service→Mapper 调用链分析**

1. 扫描所有 `@RestController`/`@Controller` 注解的类
2. 分析 `@RequestMapping`/`@GetMapping`/`@PostMapping` 路由
3. 追踪 Controller 注入的 Service → Service 调用的 Mapper
4. 建立 Controller → Service → Mapper → Table 的完整映射

#### Phase 4: 模块分类

**分类策略**（按优先级从高到低）：

1. **前缀精确匹配**：根据表名前缀分配到对应模块（权重最高）
2. **关键词匹配**：根据表名中的关键词分配
3. **调用链匹配**：根据 Controller→Service→Mapper 调用链确定模块
4. **默认分类**：无法匹配的表归入"其他"

**模块映射规则定义格式**：

```python
MODULE_MAPPING_RULES = {
    "模块名称": {
        "keywords": ["关键词1", "关键词2"],
        "prefixes": ["PREFIX_", "PREFIX2_"],
        "priority": 1
    }
}
```

**分类算法**：

```python
def classify_table(table_name, mapper_info=None):
    """
    对每张表计算所有模块的匹配分数：
    - 前缀匹配：+100 + len(prefix)（前缀越长分数越高）
    - 关键词匹配：+10 per keyword
    - 分数相同按 priority 排序
    - 返回最高分的模块
    """
```

#### Phase 5: 注释清理与合并

**清理规则**（移除无意义的代码元信息）：

```python
MEANINGLESS_PATTERNS = [
    r'@author\s+\w+',
    r'@date\s+\d{4}[/:-]\d+',
    r'@version\s+\d+\.\d+',
    r'@since\s+\d{4}-\d{2}',
    r'<p>\s*</p>',
    r'todo\s+objid',
    r'@title\s*[:\s]',
    r'@description\s*[:\s]',
]
```

**合并策略**：

```python
def merge_comments(db_comment, api_comment, code_comment):
    """
    优先级：数据库备注 > API注释 > 代码注释
    清理每个来源的无意义内容，去重后用 " | " 连接
    """
```

#### Phase 6: 生成输出文件

**6.1 Excel 数据字典**

文件名：`{系统名}_数据字典.xlsx`

结构：`00-汇总首页` + 各模块 Sheet + `00-其他`

每个模块 Sheet 的列定义：

| 列名 | 说明 | 来源 |
|------|------|------|
| 表名 | 数据库表名 | ALL_TAB_COMMENTS |
| 字段序号 | 字段在表中的顺序 | COLUMN_ID |
| 字段名 | 数据库字段名 | ALL_TAB_COLUMNS |
| 数据类型 | 字段数据类型 | DATA_TYPE |
| 长度 | 字段长度 | DATA_LENGTH |
| 精度 | 数值精度 | DATA_PRECISION |
| 是否可空 | Y/N → 是/否 | NULLABLE |
| 默认值 | 字段默认值 | DATA_DEFAULT |
| 数据库备注 | 原始数据库注释 | ALL_COL_COMMENTS |
| 业务注释 | 合并后的业务注释 | 源码分析 + 清理 |
| 是否主键 | 是/否 | ALL_CONSTRAINTS |

**样式规范**：
- 表头：深蓝色背景(#366092)、白色粗体字、居中对齐
- 首行冻结（`freeze_panes = 'A2'`）
- 列宽：表名35、字段名30、备注40-50

**6.2 ER 图文档**

文件名：`ER_{模块名}.md`

格式：Mermaid `erDiagram` 语法

- 每个模块最多展示 15 张核心表
- 每张表最多展示 8 个字段，超出部分用 `... "共N个字段"` 标注
- 实体关系通过表名前缀相似性或外键信息推断
- 字段注释经过清理，不含 @author 等元信息

**6.3 数据架构文档**

文件名：`{系统名}_数据架构文档.md`

包含三个层次的架构：
- **概念实体架构**：从业务视角描述核心实体
- **逻辑实体架构**：数据模型视角的实体关系
- **物理实体架构**：数据库实现细节（表名、字段类型、约束）

#### Phase 7: 质量验证

自动执行以下检查并输出评分报告：

| 检查项 | 权重 | 合格标准 |
|--------|------|----------|
| 数据完整性 | 25% | 100% 表和字段收录 |
| 模块映射正确性 | 25% | 关键表分配正确率 > 90% |
| 字段注释质量 | 25% | 有意义注释覆盖率 > 60% |
| 主键完整性 | 25% | 有主键的表占比 > 60% |

**评分等级**：90-100 优秀 | 80-89 良好 | 70-79 中等 | 60-69 及格 | <60 不及格

**常见问题自动修复**：
1. 模块映射错误 → 重新运行分类算法
2. 无意义注释残留 → 重新执行清理规则
3. 主键识别为 0 → 检查 SQL JOIN 条件

## 示例场景

### 示例1：为达梦数据库生成数据字典

**用户请求**：
```
请为我们的投研系统生成数据库数据字典，数据库是达梦，
连接信息是 jdbc:dm://10.168.191.113:6347/TYYTH, 用户名TYYTH
```

**处理步骤**：
1. 确认数据库连接参数和 Java 环境
2. 下载 DmJdbcDriver18.jar 驱动
3. 通过 JPype+JDBC 连接数据库
4. 执行 SQL 提取元数据（2739 张表、45169 个字段）
5. 分析源码中的 Mapper XML 和 Entity 注解
6. 按业务模块分类（13个模块 + 其他）
7. 生成 Excel 数据字典（14个Sheet）
8. 生成 13 个模块的 ER 图文档
9. 执行质量验证，评分 82.6/100（良好）

### 示例2：仅从数据库生成（无源码）

**用户请求**：
```
帮我生成MySQL数据库的数据字典，只有数据库连接，没有源码
```

**处理步骤**：
1. 跳过 Phase 3（源码分析）
2. 仅使用数据库元数据中的表注释和字段注释
3. 模块分类仅依赖表名前缀和关键词匹配
4. 业务注释列留空，仅保留数据库备注

### 示例3：检查和修复现有数据字典

**用户请求**：
```
检查一下我的数据字典质量，模块分类对不对
```

**处理步骤**：
1. 加载现有 Excel 和 JSON 数据文件
2. 执行 Phase 7 质量验证
3. 定位模块映射错误、注释质量问题
4. 自动修复并重新生成

## 技术实现

### 核心技术栈

| 组件 | 技术 | 用途 |
|------|------|------|
| 数据库连接 | JPype + JDBC | 通过 Python 调用 Java JDBC 驱动 |
| 元数据提取 | SQL 查询 | 从系统表提取表结构信息 |
| 源码分析 | 正则表达式 + 文件扫描 | 解析 Mapper XML、Entity 类注解 |
| Excel 生成 | openpyxl | 创建带格式的 .xlsx 文件 |
| ER 图 | Mermaid erDiagram | 生成 Markdown 格式的 ER 图 |
| 模块分类 | 评分算法 | 基于前缀+关键词+调用链的多维评分 |

### 关键 Python 依赖

```
JPype>=1.0
openpyxl>=3.0
```

### 数据库连接模板（JPype）

```python
import jpype
import jpype.imports

# 启动 JVM
jpype.startJVM(
    f"-Djava.class.path={jdbc_driver_path}",
    convertStrings=True
)

# 获取 JDBC 驱动
DriverManager = jpype.JClass("java.sql.DriverManager")
conn = DriverManager.getConnection(jdbc_url, username, password)

# 执行查询
stmt = conn.createStatement()
rs = stmt.executeQuery(sql)
while rs.next():
    table_name = rs.getString("TABLE_NAME")
    comments = rs.getString("COMMENTS")

# 关闭连接
conn.close()
jpype.shutdownJVM()
```

### 达梦数据库注意事项

- JDBC URL 格式必须是 `jdbc:dm://host:port?schema=SCHEMA`（不能用 `/SCHEMA` 路径格式）
- 需要 Java 9+ 环境（DmJdbcDriver18.jar 不支持 Java 8）
- 系统表使用 `ALL_TAB_COMMENTS`、`ALL_TAB_COLUMNS`、`ALL_COL_COMMENTS`、`ALL_CONSTRAINTS`
- 达梦默认 0 外键设计（通过应用层维护关联关系）

## 输出文件清单

| 文件 | 格式 | 说明 |
|------|------|------|
| `{系统名}_数据字典.xlsx` | Excel | 完整数据字典，按模块分 Sheet |
| `ER_{模块名}.md` | Markdown | 各模块的 Mermaid ER 图 |
| `{系统名}_数据架构文档.md` | Markdown | 三层架构文档 |
| `dm_full_schema.json` | JSON | 原始数据库元数据 |
| `mapper_table_mapping.json` | JSON | Mapper→表映射关系 |
| `entity_field_comments.json` | JSON | Entity 字段业务注释 |
| `fixed_module_mapping.json` | JSON | 修复后的模块映射规则 |

## 注意事项

1. **数据库连接安全**：JDBC 密码仅在内存中使用，不写入磁盘文件
2. **大表处理**：对于超过 1000 张表的数据库，分批处理避免内存溢出
3. **注释质量**：数据库中 30% 左右的表可能缺少注释，这是正常的（需要 DBA 补充）
4. **外键缺失**：许多业务系统不在数据库层面定义外键，ER 图中的关系需要通过命名约定推断
5. **模块分类准确度**：依赖源码分析的模块分类准确度约 80-90%，建议人工复核关键表
6. **编码问题**：确保 Python 脚本使用 UTF-8 编码处理中文注释
