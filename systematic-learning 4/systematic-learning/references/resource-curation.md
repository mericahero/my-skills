# Resource Curation (学习资源策展)

> Guides the process of proactively researching, evaluating, and curating the best learning resources for any knowledge domain.

## Principle: Curated, Not Exhaustive

The goal is NOT to list every possible resource. The goal is to recommend the BEST resource for each category — one that the learner can trust, follow start-to-finish, and not second-guess.

**One excellent resource read thoroughly beats ten mediocre resources skimmed.**

## Resource Categories

For any learning subject, curate resources across these categories:

### 1. Primary Book (主线书籍)
A comprehensive, authoritative book that covers the subject systematically.

**Selection criteria:**
- Written by a recognized authority (creator, core contributor, or respected educator)
- Published or updated within the last 3 years (for technology subjects)
- Covers the subject from basics to advanced in a structured progression
- Has positive community reception (reviews, ratings, recommendations)

**Search queries:**
- `"best book to learn [subject] [year]"`
- `"[subject] book recommended [community/forum]"`
- `"top rated [subject] book [publisher]"`

### 2. Video Course / Tutorial (视频课程)
A visual, instructor-led course for intuitive understanding.

**Selection criteria:**
- Instructor has credible credentials
- Content is up-to-date with current versions/practices
- Includes hands-on exercises, not just lectures
- Has a clear progression structure

**Platforms to check:**
- Free: YouTube, Khan Academy, Coursera (audit), edX, Kaggle Learn
- Paid: Udemy, Pluralsight, Frontend Masters, O'Reilly Learning
- University: MIT OCW, Stanford Online

### 3. Official Documentation (官方文档)
The authoritative reference for APIs, features, and best practices.

**Selection criteria:**
- Official project/organization documentation
- Includes getting started guide + API reference
- Has examples and tutorials section
- Is actively maintained

**Search queries:**
- `"[subject] official documentation"`
- `"[subject] docs getting started"`
- `"[technology] official site"`

### 4. Practice Platform (练习平台)
A place to practice with immediate feedback and progressive difficulty.

**Selection criteria:**
- Provides exercises with automatic checking
- Has progressive difficulty levels
- Active community (for hints, discussions)
- Free or has free tier

**Platforms by domain:**
- Programming: LeetCode, HackerRank, Exercism, Codewars
- Data Science: Kaggle, DataCamp, DataQuest
- SQL: SQLZoo, LeetCode Database, Mode Analytics
- General: GitHub (real projects), CodePen (frontend)

### 5. Community (社区)
A place to ask questions, see others' work, and stay updated.

**Selection criteria:**
- Active (daily posts/replies)
- Welcoming to beginners
- Has searchable archives
- Domain experts participate

**Common communities:**
- Stack Overflow (tag-specific)
- Reddit (subreddit-specific)
- Discord servers
- GitHub Discussions
- Official forums/mailing lists

## Research Workflow

### Step 1: Broad Search
Run these searches (in user's language + English):

```
1. "best way to learn [subject] [year]"
2. "[subject] learning resources [year]"
3. "[subject] roadmap"
4. "best [subject] book"
5. "best [subject] course"
6. "[subject] practice exercises"
```

### Step 2: Cross-Reference
For each resource found:
- Check if it appears in multiple independent recommendations
- Verify it's current (publication date, last update, version number)
- Check community ratings/reviews
- Verify the link is active

### Step 3: Evaluate Against Criteria
Score each candidate resource:

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Authority of author/creator | High | Creator > recognized expert > general educator |
| Recency | High | For tech: < 2 years. For theory: < 5 years. |
| Community reception | Medium | Check ratings, reviews, citations |
| Depth of coverage | Medium | Must cover beginner to advanced |
| Practical exercises | Medium | Prefer resources with exercises |
| Accessibility | Low | Free > paid, but quality matters more |

### Step 4: Select and Annotate
Choose ONE primary resource per category. For each selected resource, write:

```
Resource: [name]
Type: [book/course/docs/platform/community]
Author/Creator: [name]
Link: [URL]
Why this resource: [1-2 sentences on why it's the best choice]
Best for: [who this resource suits]
How to use: [specific advice on how to incorporate it into learning]
```

## Resource List Output Template

### Curated Resource List

| Category | Resource | Why | Link |
|----------|----------|-----|------|
| 主线书籍 | [Book Title] | [reason] | [URL] |
| 视频课程 | [Course Name] | [reason] | [URL] |
| 官方文档 | [Docs Name] | [reason] | [URL] |
| 练习平台 | [Platform Name] | [reason] | [URL] |
| 社区 | [Community Name] | [reason] | [URL] |

### Suggested Learning Sequence

Describe how to use these resources together:

1. Start with [course] for intuitive understanding (Week 1-2)
2. Read [book] alongside for depth and systematic coverage (Week 1-4)
3. Reference [docs] when you need to check specific APIs (ongoing)
4. Practice on [platform] after each module (ongoing)
5. Join [community] for questions and inspiration (ongoing)

## Timeliness Verification

For technology subjects, verify:
- **Book**: Check the edition and publication date. For fast-moving tech (frameworks, libraries), prefer editions published within 2 years.
- **Course**: Check when it was last updated. Many courses on Udemy/Coursera get updates — check the "last updated" date.
- **Documentation**: Official docs are usually current. Verify the version matches what you're teaching.
- **Platform**: Check if the platform is still active and maintained.
- **Community**: Check recent post volume and response times.

## Anti-Patterns in Resource Curation

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Listing 20 resources | Decision paralysis | Pick ONE per category |
| Recommending outdated resources | Wastes learner's time | Verify publication/update date |
| Only recommending paid resources | Creates barrier | Always include a free alternative |
| Ignoring the learner's level | Frustration or boredom | Match resources to stated level |
| No annotations | Learner doesn't know why | Always explain WHY each resource is recommended |
| Recommending without verification | Broken links, dead projects | Verify links are active before including |
