# Output Formats Guide (输出形式指南)

> Guides the selection and production of learning deliverables in the most appropriate format based on knowledge type, learning stage, and user preference.

## Core Principle

**Form follows function.** The output format should serve the knowledge, not the other way around. A memory model is best shown as an interactive diagram. A coding workflow is best shown as runnable code. A conceptual framework is best shown as a structured document with diagrams.

## Knowledge Type → Format Decision Matrix

### 1. Spatial / Structural Knowledge
**Examples**: Memory layouts, system architecture, network topology, data structures, molecule geometry

**Best formats**:
- Interactive HTML with SVG diagrams (allow exploration)
- Inline dynamic-ui widgets (for conversation context)
- Annotated diagrams with labels and callouts

**Why**: Spatial concepts require spatial representation. Text descriptions of 3D structures or memory layouts are cognitively expensive to parse. Visual diagrams reduce cognitive load by offloading spatial reasoning to the visual cortex.

**Production guidance**:
- Use SVG for custom diagrams (full control over layout)
- Use Mermaid for standard diagram types (flowchart, sequence, class)
- For HTML reports: embed inline SVG with interactive hover states
- For inline conversation: use `dynamic-ui` skill with PureShowWidget

### 2. Procedural / Algorithmic Knowledge
**Examples**: Algorithms, sorting, search, data processing pipelines, cooking recipes, assembly instructions

**Best formats**:
- Step-by-step guide with runnable code
- Interactive notebook (Jupyter-style) with executable cells
- Flowchart showing decision points

**Why**: Procedures are learned by doing, not by reading. The format should enable the learner to execute each step and see the result immediately.

**Production guidance**:
- Show code blocks with expected output inline
- Use numbered steps with clear inputs/outputs at each stage
- Include "try it yourself" prompts with modified inputs
- For HTML reports: use syntax-highlighted code blocks with copy buttons

### 3. Conceptual / Theoretical Knowledge
**Examples**: Machine learning theory, economic models, psychological frameworks, design patterns, architectural patterns

**Best formats**:
- Structured document with layered explanation (simple → complex)
- Diagrams showing relationships between concepts
- Analogy boxes connecting new concepts to known domains
- Comparison tables for related concepts

**Why**: Concepts build on each other. The format should allow the learner to see how each concept connects to others and builds on prior knowledge.

**Production guidance**:
- Start with a high-level overview diagram
- Then drill into each concept with explanation + visual
- Use analogy boxes: "Think of this like [familiar concept] because [reason]"
- End with a concept map showing all relationships

### 4. Data-Heavy / Comparative Knowledge
**Examples**: Performance benchmarks, feature comparisons, statistical data, market analysis

**Best formats**:
- Charts (bar, line, scatter, radar) for trends and comparisons
- Tables for precise data
- Dashboards for multi-dimensional data
- Infographics for summary data

**Why**: Data relationships are processed faster visually than numerically. A bar chart reveals a ranking instantly; a table of numbers requires mental parsing.

**Production guidance**:
- Use ECharts (via html-report) for interactive charts in HTML reports
- Use tables for precise data that needs to be referenced
- Use comparison cards for side-by-side feature analysis
- Always caption charts with what they show and the key takeaway

### 5. Skill-Based / Tool Knowledge
**Examples**: Programming languages, software tools, musical instruments, sports techniques

**Best formats**:
- Interactive practice environment
- Quick reference card / cheat sheet
- Progressive exercises (easy → hard)
- Video/animation demonstrations (for physical skills)

**Why**: Skills require muscle memory and repetition. The format should facilitate practice, not just information delivery.

**Production guidance**:
- Include a cheat sheet section in the learning guide
- Design exercises that can be done in a practice environment
- For tools: include setup instructions and "hello world" verification
- For physical skills: use illustrations showing correct form

### 6. Broad Overview / Learning Path Knowledge
**Examples**: "Learn web development", "Understand machine learning", "Master data engineering"

**Best formats**:
- HTML report with navigable sections (sidebar TOC)
- Learning path diagram showing the journey
- Slide deck for high-level overview
- Interactive roadmap with milestones

**Why**: Broad topics need structure and navigation. The learner needs to see the whole path and jump to specific sections.

**Production guidance**:
- Use `html-report` with sidebar navigation for comprehensive guides
- Include a visual learning path at the top
- Use milestone markers to show progress points
- Break into clearly delineated parts/modules

## Multi-Format Combination Strategy

For comprehensive learning guides, combine formats:

### Standard Combination (Recommended)
```
Main Deliverable: HTML Report (html-report skill)
├── Knowledge Map: Inline SVG diagram
├── Learning Path: Mermaid or SVG flowchart
├── Module Content:
│   ├── Explanation: Prose with diagrams
│   ├── Examples: Syntax-highlighted code blocks
│   ├── Exercises: Structured with solutions
│   └── Visuals: Inline SVG/Mermaid per module
├── Capstone Project: Structured project description
├── Resources: Curated table with links
├── Extension: Visual path diagram
└── Review: Schedule table + recall prompts
```

### Presentation Combination
When the user wants a presentation:
```
Main Deliverable: HTML Deck (html-deck skill)
├── Slide 1: Title + knowledge positioning
├── Slide 2-3: Learning path overview
├── Slide 4-N: One slide per module (key concept + visual)
├── Slide N+1: Capstone project
├── Slide N+2: Resources
└── Slide N+3: Extension paths
```

### Interactive Combination
When interactivity is core to learning:
```
Main Deliverable: Custom HTML with JavaScript
├── Interactive knowledge map (clickable nodes)
├── Step-by-step tutorial with runnable code
├── Interactive exercises with feedback
└── Progress tracking
```

## Artifact Skill Selection Guide

### When to use `html-report`
- **Default choice** for comprehensive learning guides
- Multi-module guides with 3+ sections
- When the user says "写个文档", "做个指南", "learning guide"
- When content benefits from navigation (sidebar, TOC)
- When you need charts (ECharts integration)

### When to use `html-deck`
- When the user says "演示文稿", "slides", "deck", "presentation"
- When content is better presented as a sequence of slides
- For high-level overviews rather than deep dives
- When the user wants to present the learning path to others

### When to use `pptx`
- When the user explicitly says "PPT" or "ppt"
- When the user needs a .pptx file for compatibility
- Otherwise prefer `html-deck` for better visual quality

### When to use `docx`
- When the user explicitly requests Word format
- When the content will be edited collaboratively in Word
- When the user needs a downloadable document file

### When to use `pdf`
- When the user explicitly requests PDF
- When the content is meant for printing or archival
- When the user needs a fixed-layout document

### When to use `xlsx`
- When the content is inherently tabular (comparison matrices, schedules)
- When the user wants to track progress in a spreadsheet
- For practice exercises that involve data manipulation

### When to use `dynamic-ui` (PureShowWidget)
- For inline visual explanations in conversation
- When the user asks to "show me" or "visualize" a concept
- For quick concept diagrams that don't need a full report
- For interactive demonstrations of a concept

### When to use `GenerateImage`
- When a custom illustration would enhance understanding
- For hero images in reports
- For visual metaphors that can't be expressed as diagrams
- When the user requests a specific visual style (绘画, 插画, 绘本)

## Special Format: Picture Book / Visual Story (绘本形式)

When the knowledge can be effectively communicated through a visual narrative (especially for beginners or abstract concepts):

**When to consider**:
- The target audience is beginners or children
- The concept is abstract and benefits from metaphor
- The user requests "绘本" or visual storytelling

**How to produce**:
1. Use `GenerateImage` to create illustration-style images for key concepts
2. Combine with narrative text in an `html-report` or `html-deck`
3. Structure as: concept → illustration → explanation → analogy
4. Keep text minimal, let visuals carry the explanation

## Special Format: Interactive Web Application

When the knowledge requires hands-on interaction to truly understand:

**When to consider**:
- The user requests an interactive experience
- The concept involves cause-and-effect that's best explored by doing
- Simulation or experimentation accelerates learning

**How to produce**:
1. Create a custom HTML file with JavaScript
2. Include interactive elements (sliders, buttons, drag-drop)
3. Provide immediate visual feedback for user actions
4. Include "what if" scenarios the learner can explore

## Format Selection Decision Tree

```
1. Did the user specify a format?
   → YES: Use that format
   → NO: Continue

2. Is the subject simple (1-2 concepts)?
   → YES: Answer inline with dynamic-ui visual
   → NO: Continue

3. Is the subject broad/complex (8+ modules)?
   → YES: HTML report + supplementary materials
   → NO: Continue

4. What's the dominant knowledge type?
   → Spatial/Structural: HTML report with SVG diagrams
   → Procedural: HTML report with runnable code examples
   → Conceptual: HTML report with diagrams + analogies
   → Data-heavy: HTML report with ECharts
   → Skill-based: HTML report + practice exercises
   → Overview: HTML report with learning path diagram

5. Default: html-report with appropriate visuals
```

## Quality Criteria for All Formats

Regardless of format, every learning deliverable must:
- Have clear navigation (TOC, sidebar, or slide numbers)
- Include visual elements (not text-only walls)
- Use the user's language throughout
- Be self-contained (no broken links or missing assets)
- Be responsive (works on desktop and mobile)
- Include practice exercises (not just information)
- Have a clear beginning (knowledge map) and end (extension paths)
