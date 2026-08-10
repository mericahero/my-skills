# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-10

### Added

#### systematic-learning skill
- Eight-stage learning cycle: ⓪ Knowledge Positioning → ① Self-Assessment → ② Decomposition & Planning → ③ Deep Understanding → ④ Deliberate Practice → ⑤ Integration & Creation → ⑥ Review & Iteration → ⑦ Extension
- Proactive resource gathering via WebSearch (books, courses, docs, practice platforms, communities)
- Multi-format output selection (HTML report, slide deck, docx, pdf, xlsx, interactive app, picture book, inline diagrams)
- Six supporting elements: environment setup, resource curation, social learning, milestones, motivation management, anti-pattern warnings
- Five reference documents: knowledge-positioning.md, learning-methodology.md, resource-curation.md, output-formats.md, extension-paths.md
- Learning intake template (learning-intake.md) for pre-flight integration
- Interface specification (Input/Output/On Failure)
- Negative trigger conditions ("Do NOT use for...")
- Quality gates checklist

#### pre-flight skill
- Socratic requirement clarification — one question at a time, each with a recommended answer
- Dynamic questioning with hard cap of 10 questions
- Three-phase interview: Foundation → Clarification → Deep-dive
- Brainstorm switching when user encounters knowledge gaps
- Vague answer escalation (3 levels: restate → anchor → name the pattern)
- Skip mechanism (full skip + per-question skip)
- Decision Snapshot output (confirmed decisions, defaults, open items, assumptions)
- Cross-skill integration protocol (template loading from calling skill)
- Interface specification (Input/Output/On Failure)
- Negative trigger conditions

### Infrastructure
- MIT License
- package.json with skill metadata
- CHANGELOG.md (this file)
- README.md with installation guide and feature overview
