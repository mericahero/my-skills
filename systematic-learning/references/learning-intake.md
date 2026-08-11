# Learning Intake — Questioning Template for pre-flight

> This template is loaded by the `pre-flight` skill when invoked by `systematic-learning` as a pre-execution requirement-gathering phase. It defines the decision tree specific to learning scenarios.

## Purpose

Before starting any learning journey, clarify the learner's intent through structured questioning. This prevents wasted effort on wrong scope, wrong depth, or wrong approach.

## Decision Tree

The questioning follows this dependency order. Not all branches are relevant to every learner — skip branches that are already clear from the user's initial request.

### Branch 1: Subject Scope (PRIORITY: HIGH)

**Goal**: Narrow a potentially broad subject into a learnable scope.

**When to ask**: The user's request is broad or ambiguous (e.g., "我想学编程", "teach me AI").

**Questions**:

| # | Question | Recommendation Hints |
|---|----------|---------------------|
| 1.1 | "你具体想学 [subject] 的哪个方面？" | Based on the subject, recommend the most foundational/practical sub-area. E.g., for "编程" → "Python 作为第一门语言，因为它语法简洁且应用广泛" |
| 1.2 | "有没有特定的应用场景驱动你想学这个？" | Recommend the most common motivation. E.g., "如果是工作需要，建议聚焦实用部分；如果是兴趣，可以更全面" |
| 1.3 | "这个范围对你来说合适吗？还是想更宽/更窄？" | Recommend the scoped version: "我建议先聚焦 [specific scope]，学透后再扩展" |

**Self-answerable check**: If the user already specified a narrow subject (e.g., "我想学 NumPy 的广播机制"), skip this entire branch.

### Branch 2: Current Level (PRIORITY: HIGH)

**Goal**: Determine the learner's starting point to calibrate the learning path.

**When to ask**: The user's current level is not obvious from context.

**Questions**:

| # | Question | Recommendation Hints |
|---|----------|---------------------|
| 2.1 | "你之前接触过 [subject] 或相关领域吗？" | Recommend based on signals in their query. If they use domain jargon correctly → intermediate; if they ask basic vocabulary questions → beginner |
| 2.2 | "如果用 1-5 分评估你的基础（1=完全零基础，5=熟练），你给自己打几分？" | Recommend a level based on 2.1. "根据你的描述，我猜 2 分（有一些概念但没系统学过）" |
| 2.3 | "你的前置知识怎么样？[list specific prerequisites]" | Recommend checking the most critical prerequisite. E.g., "学 Pandas 前最好有 Python 基础——你的 Python 水平如何？" |

**Self-answerable check**: If the user explicitly states their level ("我是零基础", "我已经学了半年 Python"), skip this branch.

### Branch 3: Goal Depth (PRIORITY: HIGH)

**Goal**: Determine how deeply the user wants to learn — this affects module count, exercise depth, and time estimate.

**When to ask**: The user hasn't specified whether they want practical fluency or deep mastery.

**Questions**:

| # | Question | Recommendation Hints |
|---|----------|---------------------|
| 3.1 | "你的目标是'能用就行'还是'深度精通'？" | Recommend based on subject type. For tools/libraries → "先用起来，遇到瓶颈再深入"; for fundamentals (math, algorithms) → "理解原理更重要" |
| 3.2 | "学完之后你想能做什么？（描述一个具体的成功场景）" | Recommend a concrete scenario: "比如，学完 Pandas 后能独立清洗一份真实数据并出分析报告" |

**Self-answerable check**: If the user's goal is already clear from context, skip.

### Branch 4: Time & Pace (PRIORITY: MEDIUM)

**Goal**: Determine time budget to calibrate the learning schedule.

**When to ask**: The user hasn't mentioned time constraints.

**Questions**:

| # | Question | Recommendation Hints |
|---|----------|---------------------|
| 4.1 | "你打算投入多少时间学习？每天/每周大概多久？" | Recommend based on subject complexity. E.g., "我建议每天 1-2 小时，持续 2-3 周，这是大多数人的有效节奏" |
| 4.2 | "有完成期限吗？比如工作需要、考试、面试？" | If no deadline: "没有期限的话，建议设定一个自我约束的里程碑，避免拖延" |

**Self-answerable check**: If the user already stated time budget, skip.

### Branch 5: Format Preference (PRIORITY: MEDIUM)

**Goal**: Determine if the user has a preferred learning format.

**When to ask**: The user hasn't mentioned a format preference.

**Questions**:

| # | Question | Recommendation Hints |
|---|----------|---------------------|
| 5.1 | "你对学习材料的形式有偏好吗？比如文档、网站、幻灯片、交互式？" | Recommend based on knowledge type (see `output-formats.md`). E.g., for spatial concepts → "交互式 HTML 配图解最适合"; for broad overview → "HTML 报告带导航" |
| 5.2 | "你更喜欢看文字还是看图表？喜欢动手练习还是先理解理论？" | Recommend based on subject: "我建议理论+练习交替，每学一个概念立刻动手验证" |

**Self-answerable check**: If the user specified a format ("做个PPT", "写个文档"), skip.

### Branch 6: Application Direction (PRIORITY: LOW)

**Goal**: Understand where the user will apply this knowledge — informs the capstone project and extension paths.

**When to ask**: The subject has multiple application directions and the user's direction isn't clear.

**Questions**:

| # | Question | Recommendation Hints |
|---|----------|---------------------|
| 6.1 | "你学这个主要是为了什么方向的应用？" | List 2-3 common directions with brief descriptions. Recommend the most popular one: "大多数学习者选择 [direction]，因为 [reason]" |
| 6.2 | "有没有一个你最终想解决的具体问题或项目？" | If no specific project: "没有的话，我会设计一个通用的综合项目，你可以基于它修改" |

**Self-answerable check**: If the user's application direction is obvious, skip.

### Branch 7: Learning Style (PRIORITY: LOW)

**Goal**: Understand the user's learning style preferences.

**When to ask**: When you have no signals about how the user learns best.

**Questions**:

| # | Question | Recommendation Hints |
|---|----------|---------------------|
| 7.1 | "你之前学新东西时，什么方式对你最有效？看书？看视频？动手做项目？" | Recommend: "大多数人发现'概念讲解+动手练习'的组合最有效——看书理解，写代码验证" |
| 7.2 | "你对'先理解原理再用'还是'先用起来再理解原理'有偏好吗？" | Recommend based on subject: for tools → "先用起来，遇到问题再理解原理"; for fundamentals → "先理解原理，应用时会更通透" |

**Self-answerable check**: If time is limited and this branch is low-priority, skip with a default.

## Questioning Strategy

### Priority-Based Selection

Not all branches need to be explored. Use this priority guide:

| Priority | Branches | Must Ask If |
|----------|----------|-------------|
| HIGH | 1 (Scope), 2 (Level), 3 (Goal) | Not already clear from initial request |
| MEDIUM | 4 (Time), 5 (Format) | User hasn't mentioned |
| LOW | 6 (Application), 7 (Style) | Time permits and not obvious |

### Typical Question Count

| Scenario | Expected Questions |
|----------|--------------------|
| User request is detailed (states subject, level, goal) | 0-2 (confirm only) |
| User request is moderate (states subject, missing level/goal) | 3-5 |
| User request is vague ("我想学编程") | 5-8 |
| Maximum (all branches needed) | 8-10 (hits the cap) |

### Dependency Order

```
Branch 1 (Scope) → Branch 2 (Level) → Branch 3 (Goal)
                                              ↓
Branch 4 (Time) ← Branch 5 (Format) ← Branch 6 (Application)
                                              ↓
                                        Branch 7 (Style)
```

Branches 1-3 are sequential (each depends on the prior).
Branches 4-7 can be asked in any order after 1-3 are resolved.

## Snapshot Mapping

After pre-flight completes questioning, the snapshot maps to learning parameters:

| Snapshot Field | Learning Parameter | Usage |
|----------------|-------------------|-------|
| Subject Scope | → Knowledge Positioning scope | Defines what to position and map |
| Current Level | → Stage ① starting point | Determines where to start in the learning path |
| Goal Depth | → Bloom's taxonomy target | Sets the depth target for each module |
| Time & Pace | → Learning schedule | Calibrates time estimates per module |
| Format Preference | → Output format selection | Routes to the appropriate artifact skill |
| Application Direction | → Capstone project design + Extension paths | Informs Stage ⑤ and ⑦ |
| Learning Style | → Module content emphasis | Adjusts theory-to-practice ratio |

## Default Values (When User Skips)

When the user skips the interview or individual questions, use these defaults:

| Parameter | Default Value |
|-----------|--------------|
| Scope | As stated in initial request (no narrowing) |
| Level | Beginner (safest assumption) |
| Goal Depth | "能用就行" (practical fluency) |
| Time | 1-2 hours/day for 2-3 weeks |
| Format | HTML report (html-report skill) |
| Application | General (design a universal capstone) |
| Learning Style | Concept + practice alternating |
