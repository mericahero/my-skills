# Systematic Learning Skills

> A meta-learning skill system for AI coding agents — systematically learn **ANY** knowledge domain, from underlying principles to practical mastery.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)

## What This Does

When you tell your AI agent "我想学 NumPy" or "teach me machine learning", instead of dumping a generic tutorial, these skills:

1. **Interview you first** (pre-flight) — one question at a time, each with a recommendation, until your scope/level/goals/preferences are crystal clear
2. **Position the knowledge** — map where the subject sits in the broader ecosystem (prerequisites, applications, parallel topics)
3. **Research the best resources** — proactively web-search for books, courses, docs, practice platforms
4. **Produce a complete learning guide** — 8-stage cycle with modules, diagrams, code examples, 3-tier exercises, capstone project, review schedule
5. **Suggest extension paths** — horizontal (alternatives), vertical (deeper principles), application (where to use it next)

## Skills Included

### systematic-learning

The main learning skill. Triggers on phrases like "系统学习", "我想学", "教我", "teach me", "learning path", "how to learn X".

**8-Stage Learning Cycle:**

| Stage | Name | What Happens |
|-------|------|-------------|
| ⓪ | Knowledge Positioning | Map the subject in the broader ecosystem |
| ① | Self-Assessment | Diagnose current level, set Bloom's targets |
| ② | Decomposition & Planning | Break into modules, build dependency graph |
| ③ | Deep Understanding | Explain principles, design rationale, mental models |
| ④ | Deliberate Practice | 3-tier exercises (basic → comprehensive → challenge) |
| ⑤ | Integration & Creation | Capstone project combining multiple modules |
| ⑥ | Review & Iteration | Spaced repetition schedule (1/3/7/14/30 days) |
| ⑦ | Extension | Three paths: horizontal, vertical, application |

### pre-flight

A Socratic requirement clarification skill. Triggers on "追问", "先问我问题", "clarify", "帮我理清需求".

- One question at a time — never batch
- Every question includes a recommended answer
- Dynamic questioning capped at 10 questions
- User can skip at any time ("直接开始" → uses best-practice defaults)
- Outputs a Decision Snapshot before execution begins
- Can be used standalone or invoked by other skills

## Installation

### Trae

```bash
# Import via Settings > Skills & Commands > Import
# Upload the .zip file or point to the skill directory
```

### Claude Code

```bash
# Option 1: Manual install
cp -r systematic-learning/ ~/.claude/commands/
cp -r pre-flight/ ~/.claude/commands/

# Option 2: Via skills.sh (when published)
npx skills@latest add your-username/systematic-learning-skills
```

### Cursor

```bash
# Copy SKILL.md files to .cursor/rules/ directory
cp systematic-learning/SKILL.md .cursor/rules/systematic-learning.mdc
cp pre-flight/SKILL.md .cursor/rules/pre-flight.mdc
```

### Manual (any agent)

Copy the `systematic-learning/` and `pre-flight/` directories into your agent's skill/command directory.

## Project Structure

```
systematic-learning-skills/
├── package.json                    # Project metadata
├── CHANGELOG.md                    # Version history
├── LICENSE                         # MIT
├── README.md                       # This file
├── pre-flight/                     # Socratic clarification skill
│   └── SKILL.md
└── systematic-learning/            # Main learning skill
    ├── SKILL.md
    └── references/
        ├── learning-intake.md      # Pre-flight questioning template
        ├── knowledge-positioning.md # Stage ⓪ — Knowledge ecosystem mapping
        ├── learning-methodology.md  # Stages ①-⑥ — Detailed methodology
        ├── resource-curation.md     # Learning resource research & curation
        ├── output-formats.md        # Output format selection guide
        └── extension-paths.md       # Stage ⑦ — Extension path design
```

## Key Design Decisions

### Why pre-flight exists as a separate skill

Users requesting to learn something often haven't fully articulated their own needs. "我想学编程" hides critical decisions: which language? what depth? what timeframe? pre-flight interviews the user before any work begins, producing a Decision Snapshot that becomes the execution contract.

### Why 8 stages (not 6)

The original 6-stage cycle (assess → plan → understand → practice → integrate → review) was expanded with:
- **Stage ⓪ (before)**: Knowledge Positioning — where does this knowledge sit in the ecosystem?
- **Stage ⑦ (after)**: Extension — where to go next after mastery?

### Why multi-format output

Different knowledge types need different presentation. Memory models need interactive SVG diagrams. Procedural knowledge needs runnable code. Broad overviews need navigable HTML reports. The skill selects the format based on knowledge type, not a one-size-fits-all default.

## Quality Standards

This project follows the quality standards from [Anthropic's official skill guide](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) and [Trae's skill best practices](https://docs.trae.cn/ide_best-practice-for-how-to-write-a-good-skill):

- ✅ Clear positive AND negative trigger conditions in description
- ✅ Structured Input/Output/On-Failure interface specification
- ✅ Progressive disclosure (frontmatter → SKILL.md body → references/)
- ✅ Single responsibility (each skill does one thing)
- ✅ Quality gates checklist in SKILL.md
- ✅ SKILL.md body under 500 lines (systematic-learning: ~460 lines, pre-flight: ~300 lines)

## Compatibility

| Platform | Status | Notes |
|----------|--------|-------|
| Trae | ✅ Native | Designed for Trae's `.trae/skills/` directory |
| Claude Code | ✅ Compatible | Uses standard SKILL.md format |
| Cursor | ✅ Compatible | Adapt as .mdc rules |
| Codex | ✅ Compatible | Standard markdown format |

## License

MIT — see [LICENSE](LICENSE)

## Changelog

See [CHANGELOG.md](CHANGELOG.md)
