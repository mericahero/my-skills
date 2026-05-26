# 代码冲突分析策略

## 基本原则

代码冲突不做无确认的语义合并。AI 的职责是读取三方内容、git 历史和 ASDD 设计文档，给出可解释建议；修改必须由用户确认。

## 证据来源

必须尽量读取：

- `git diff --cc`
- `git show :1:{path}` base
- `git show :2:{path}` ours
- `git show :3:{path}` theirs
- `git log --oneline --decorate -- {path}`
- 关联 FRD、需求级设计、`tasks.md`、fast `fast-design.md`、bug `diagnosis.md`
- 模块当前态：`module-api.md`、`module-database.md`、`module-backend.md`、`module-frontend.md`
- 顶层约束：`docs/constitution.md`、`docs/architecture.md`、`docs/domains/*.md`

## 关联文档定位

从以下信号定位 REQ/BUG：

- 分支名、提交信息、冲突文件附近注释或测试名中的 REQ/BUG
- `docs/modules/*/specs/REQ-*` 中的代码位置
- `module-*.md` 的代码位置列
- API path、表名、Service/component 名和详细设计中的对象名

找不到关联文档时，报告必须标注“缺少 Spec 依据”。

## 风险分级

低风险，可建议处理；用户确认后才可修改：

- import/export/注册表/路由表/枚举值纯追加
- 测试名称、mock 数据、局部样式或注释的非重叠追加

中风险，逐项确认：

- 同一文件不同函数或不同 UI 区块
- 同一 Service/Controller/Component 的相邻逻辑
- package、构建、lint、格式化、测试配置

高风险，默认只建议；用户确认后才可修改：

- API 契约、DTO、数据库迁移、schema
- 权限、安全、审计、事务、状态机、资金、外部接口
- 同一函数、SQL、校验规则、数据流
- 删除/重命名与修改并存、锁文件、迁移编号顺序

## 建议格式

每个冲突对象必须输出：

- base 行为
- ours 行为及关联 REQ/BUG
- theirs 行为及关联 REQ/BUG
- Spec/设计依据
- 风险等级
- 选项 A 采用 ours
- 选项 B 采用 theirs
- 选项 C 合并两侧
- 选项 D 用户自行处理
- 选项 E 暂不处理
- 推荐选项和理由
- 需要运行的验证

## 修改边界

- 只修改用户明确确认的文件或对象。
- 用户确认范围外不批量套用。
- 锁文件优先建议用项目包管理器重新生成。
- 迁移脚本必须确认顺序、幂等性和回滚策略。
- 如需同步 Spec，提示使用相关 ASDD skill 或 `asdd-spec-merge-resolve`，不要在本 skill 中顺手改未确认的 Spec。

## 决策记录

所有风险等级都必须记录用户决策：

- `confirmed`：用户确认由 skill 按指定方案处理。
- `deferred`：用户确认暂不处理，或用户没有给出决策。
- `self_resolve`：用户决定自行处理，skill 不修改。

低风险可以批量确认，例如“低风险全部按推荐处理”；中风险和高风险必须记录具体文件、对象和方案。

## 校验

修改后必须检查：

```bash
rg -n "<<<<<<<|=======|>>>>>>>" .
git diff --name-only --diff-filter=U
```

根据项目实际建议最小验证命令；未执行时写“建议运行，未执行”。
