# Extension Paths (拓展延伸路径)

> Stage ⑦ of the Eight-Stage Learning Cycle. Guides the design of post-learning extension paths that deepen understanding and connect to adjacent knowledge domains.

## Why Extension Matters

Learning doesn't end at mastery of the core subject. The extension stage:

1. **Builds knowledge networks** — each new connection strengthens existing knowledge (network effect of learning)
2. **Reveals the boundaries** — understanding where a tool/knowledge ends and alternatives begin deepens understanding of both
3. **Provides direction** — prevents the "what now?" feeling after completing a learning path
4. **Creates feedback loops** — extension topics loop back to Stage ⓪ (Knowledge Positioning) for the next learning cycle

## Three Extension Paths

### Path 1: Horizontal Extension (横向拓展)

**Definition**: Learn alternative or complementary tools/concepts at the same abstraction level.

**Purpose**: Understand design trade-offs by comparing alternatives. "Why does tool A do X this way while tool B does it differently?" This comparative thinking deepens understanding of both tools.

**Research method**:
- Search for "[subject] alternatives [year]"
- Search for "[subject] vs [competitor]"
- Look for benchmark comparisons and migration guides
- Check if alternatives are actively maintained

**For each alternative, document**:

| Field | Description |
|-------|-------------|
| Name | Tool/concept name |
| Positioning | What problem does it solve? |
| Key difference | How does it differ from the learned subject? |
| Trade-off | What does it gain/lose vs the learned subject? |
| When to use | In what scenario would you choose this? |
| Learning effort | How much additional learning is needed? |

**Selection criteria for recommendations**:
- The alternative is actively maintained (check GitHub stars, recent commits, community activity)
- The alternative has meaningful design differences (not just a clone)
- The alternative is practically relevant (people actually use it in production)

### Path 2: Vertical Extension (纵向深入)

**Definition**: Go deeper into the underlying implementation or theory below the current knowledge layer.

**Purpose**: Understand "why it works" at a fundamental level. This transforms surface-level competence into deep expertise.

**Research method**:
- Search for "[subject] internals" or "[subject] implementation"
- Search for "[subject] source code walkthrough"
- Look for conference talks about internals
- Check for academic papers or technical specs

**Common vertical topics by domain**:

| Domain | Vertical Topics |
|--------|----------------|
| Programming libraries | Source code, C/C++ extensions, memory management, performance profiling |
| Frameworks | Internal architecture, middleware pipeline, rendering engine |
| Algorithms | Mathematical proofs, complexity analysis, lower bounds |
| Data formats | Binary encoding, compression algorithms, schema evolution |
| Languages | Compiler/interpreter design, garbage collection, JIT compilation |

**For each vertical topic, document**:

| Field | Description |
|-------|-------------|
| Topic | What to learn |
| Depth | How deep to go (awareness / understanding / implementation) |
| Prerequisites | What additional knowledge is needed |
| Resource | Where to learn this |
| Benefit | What understanding it adds to the core subject |

### Path 3: Application Extension (应用延伸)

**Definition**: Connect the learned knowledge to upstream application domains where it can be used.

**Purpose**: Apply the knowledge in real-world contexts. Application consolidates learning and reveals practical gaps.

**Research method**:
- Search for "[subject] use cases [year]"
- Search for "[subject] applications in [field]"
- Look for project tutorials that use the subject
- Check job postings for what skills are combined with this subject

**For each application direction, document**:

| Field | Description |
|-------|-------------|
| Direction | Application domain name |
| Description | What this direction involves |
| Required additions | What else needs to be learned (beyond the core subject) |
| Project idea | A concrete project combining core + application |
| Career relevance | What roles value this combination |

## Research Workflow for Extension Paths

### Step 1: Web Search (Proactive)
Run these searches (in user's language + English):

```
1. "[subject] alternatives comparison [year]"
2. "[subject] vs [known competitor]"
3. "[subject] internals implementation"
4. "[subject] under the hood"
5. "[subject] applications use cases"
6. "[subject] projects for beginners"
7. "what to learn after [subject]"
8. "[subject] next steps"
```

### Step 2: Filter and Prioritize
From search results:
- Select 3-5 alternatives for horizontal path (most relevant/popular)
- Select 2-3 vertical topics (most impactful for understanding)
- Select 3-4 application directions (most practical/aligned with user's likely goals)

### Step 3: Verify Currency
- Check that recommended tools/frameworks are actively maintained
- Verify job market relevance for application directions
- Check that vertical topics have accessible learning resources

### Step 4: Organize into Path Diagram
Create a visual showing the three paths radiating from the core knowledge:

```
                    [Horizontal]
                    ↙
    [Core Knowledge] ←→ [Vertical (down)]
                    ↘
                    [Application (up)]
```

## Extension Path Output Template

### Horizontal Extension
| Tool | Positioning | Key Difference | Trade-off | When to Learn |
|------|-------------|----------------|-----------|---------------|
| [Alt 1] | [what it does] | [how it differs] | [gains/losses] | [when in journey] |
| [Alt 2] | ... | ... | ... | ... |

### Vertical Extension
| Topic | Depth | What It Reveals | Resource |
|-------|-------|-----------------|----------|
| [Topic 1] | [awareness/understanding/implementation] | [insight gained] | [where to learn] |
| [Topic 2] | ... | ... | ... |

### Application Extension
| Direction | Description | Additional Skills Needed | Project Idea |
|-----------|-------------|------------------------|-------------|
| [Dir 1] | [what it involves] | [what else to learn] | [concrete project] |
| [Dir 2] | ... | ... | ... |

## Career-Based Path Selection Guide

Help the user choose which extension path to prioritize based on their career goals:

| Career Goal | Primary Path | Secondary Path | Rationale |
|-------------|-------------|----------------|-----------|
| Practitioner (use the tool daily) | Application | Horizontal | Focus on doing more with the tool |
| Specialist (deep expertise) | Vertical | Application | Focus on understanding deeply |
| Generalist (broad toolkit) | Horizontal | Application | Focus on knowing alternatives |
| Researcher/Academic | Vertical | Horizontal | Focus on fundamentals |
| Entrepreneur/Builder | Application | Horizontal | Focus on building products |

## The Feedback Loop: Extension → New Positioning

After the user explores an extension path, that new knowledge becomes the starting point for a new learning cycle:

1. The user learns NumPy + Pandas (core)
2. They explore the "Application → Machine Learning" extension
3. Machine Learning becomes the new core subject
4. Stage ⓪ positions ML within the broader AI/data science ecosystem
5. The cycle repeats with ML as the focus

This is why extension is not the "end" of learning but the bridge to the next cycle. Always end the extension section with:

> "When you're ready to go deeper into [extension topic], start a new learning cycle — this time, [extension topic] becomes your core, and the cycle begins again from knowledge positioning."

## Quality Gates for Extension Paths

Before finalizing the extension section, verify:
- [ ] All three paths (horizontal, vertical, application) are represented
- [ ] Each path has at least 2-3 concrete recommendations
- [ ] Recommendations are verified as current (via web search for fast-evolving fields)
- [ ] A visual diagram shows the three paths
- [ ] Career-based selection guidance is included
- [ ] The feedback loop to Stage ⓪ is mentioned
