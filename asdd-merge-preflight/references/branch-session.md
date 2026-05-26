# 分支输入与合并会话

## 输入解析

支持以下表达，均解析为 `source_ref` 和 `target_ref`：

- `检查 feature/REQ-20260429-001 分支合并到 develop 分支的风险`
- `source=feature/REQ-20260429-001 target=develop`
- `feature/REQ-20260429-001 -> develop`
- `从 feature/a 合并到 release/2026-05`

规则：

1. 同时给出 source 和 target 时，严格使用用户输入。
2. 只给出 source 时，询问 target；不得写死 `main`。
3. 只给出 target 时，source 使用当前 `HEAD` 所在分支。
4. 两者都未给出时，source 使用当前分支；target 优先使用当前分支 upstream，其次使用 `origin/HEAD` 指向的默认分支；仍无法确定时询问用户。
5. source / target 可以是本地分支、远端分支、tag 或 commit SHA，但报告中必须记录用户输入值和实际解析后的 ref。

## Ref 校验

按顺序尝试：

```bash
git rev-parse --verify {ref}^{commit}
git rev-parse --verify origin/{ref}^{commit}
git rev-parse --verify refs/heads/{ref}^{commit}
git rev-parse --verify refs/remotes/{ref}^{commit}
```

校验失败时停止并提示用户提供有效 ref。不要自动 fetch；如果用户要求同步远端，再按用户确认执行。

## 会话目录

`session` 目录格式：

```text
docs/merge-reports/{YYYYMMDD-HHmm}-{source-safe}-to-{target-safe}/
```

安全化规则：

- `/`、`\`、空格、冒号、`~`、`^`、`:`、`?`、`*`、`[`、`]` 替换为 `-`
- 连续 `-` 压缩为单个 `-`
- 最长保留 80 个字符，过长时保留前缀并附加短 SHA

预检测必须创建：

```text
docs/merge-reports/{session}/metadata.yml
docs/merge-reports/{session}/preflight.md
```

`metadata.yml` 记录 source/target 解析信息，供后续 Spec/Code 冲突处理 skill 复用。
