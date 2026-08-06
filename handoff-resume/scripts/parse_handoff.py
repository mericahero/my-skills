#!/usr/bin/env python3
"""Parse a handoff document (produced by the task-handoff-doc skill) into structured JSON.

Usage:
    python parse_handoff.py <path-to-handoff.md> [--pretty]

Output: JSON to stdout with keys:
    sections     - raw text per numbered section (1..5)
    tools        - rows of the §2 tool/asset table
    decisions    - rows of the §3 decision-log table
    risks        - rows of the §4 risk table
    tasks        - rows of the §4 high-priority task table
    verification - checklist items from §5 (with checked status)
    metadata     - last-updated / agent-id / handoff-to footer fields

The parser is tolerant: if a section or table is missing or free-form, it still
returns the raw section text so the agent can read it directly.
"""
import argparse
import json
import re
import sys

SECTION_RE = re.compile(r"^##\s+(\d+)\.\s+(.+?)\s*$", re.MULTILINE)
TABLE_ROW_RE = re.compile(r"^\s*\|(.+)\|\s*$")
SEP_RE = re.compile(r"^[\s|:\-]+$")
CHECK_RE = re.compile(r"^[-*]\s+\[([ xX])\]\s+(.*)$")
FOOTER_RE = {
    "updated": re.compile(r"最后更新时间\**\s*[:：]\s*(.+)$", re.I | re.MULTILINE),
    "agent_id": re.compile(r"生成智能体标识\**\s*[:：]\s*(.+)$", re.I | re.MULTILINE),
    "handoff_to": re.compile(r"指定交接人\**\s*[:：]\s*(.+)$", re.I | re.MULTILINE),
}


def split_tables(block: str):
    """Return list of tables; each table is list of rows (list of cells)."""
    lines = block.splitlines()
    tables = []
    cur = None
    for ln in lines:
        m = TABLE_ROW_RE.match(ln)
        if m:
            cells = [c.strip() for c in m.group(1).split("|")]
            if SEP_RE.match(m.group(1).replace("|", "-")):
                continue
            if cells and set(cells[0]) <= set("-: "):
                continue
            if cur is None:
                cur = []
                tables.append(cur)
            cur.append(cells)
        else:
            cur = None
    return tables


def parse_doc(text: str):
    sections = {}
    matches = list(SECTION_RE.finditer(text))
    for i, m in enumerate(matches):
        num = m.group(1)
        title = m.group(2).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        sections[num] = {"title": title, "body": body}

    def first_table(num):
        sec = sections.get(num, {}).get("body", "")
        tables = split_tables(sec)
        return tables[0] if tables else []

    def rows_to_dicts(table):
        if not table:
            return []
        header = [h for h in table[0]]
        out = []
        for r in table[1:]:
            # pad/truncate to header length
            r = (r + [""] * len(header))[: len(header)]
            out.append(dict(zip(header, r)))
        return out

    tools = rows_to_dicts(first_table("2"))
    decisions = rows_to_dicts(first_table("3"))
    risks = rows_to_dicts(first_table("4"))
    tasks = rows_to_dicts(first_table("4"))  # §4 contains both risk + task tables

    # §4 may have two tables; pick the one whose header mentions 验收/动作/截止
    task_table = None
    for tbl in split_tables(sections.get("4", {}).get("body", "")):
        hdr = " ".join(tbl[0]) if tbl else ""
        if any(k in hdr for k in ("动作", "验收", "截止", "预期输出")):
            task_table = tbl
            break
    if task_table:
        tasks = rows_to_dicts(task_table)

    # §5 verification checklist
    verification = []
    sec5 = sections.get("5", {}).get("body", "")
    for ln in sec5.splitlines():
        cm = CHECK_RE.match(ln.strip())
        if cm:
            verification.append(
                {"item": cm.group(2).strip(), "checked": cm.group(1).lower() == "x"}
            )

    metadata = {}
    for key, rx in FOOTER_RE.items():
        fm = rx.search(text)
        if fm:
            metadata[key] = fm.group(1).strip()

    return {
        "sections": sections,
        "tools": tools,
        "decisions": decisions,
        "risks": risks,
        "tasks": tasks,
        "verification": verification,
        "metadata": metadata,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", help="path to handoff markdown document")
    ap.add_argument("--pretty", action="store_true", help="pretty-print JSON")
    args = ap.parse_args()

    try:
        with open(args.path, "r", encoding="utf-8") as f:
            text = f.read()
    except OSError as e:
        sys.stderr.write(f"ERROR: cannot read {args.path}: {e}\n")
        sys.exit(2)

    data = parse_doc(text)
    out = json.dumps(data, ensure_ascii=False, indent=2 if args.pretty else None)
    print(out)


if __name__ == "__main__":
    main()
