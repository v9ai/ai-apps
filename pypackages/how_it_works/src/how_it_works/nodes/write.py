"""Write node — generates and writes the how-it-works page files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from how_it_works.models import (
    AgentData,
    HowItWorksData,
    PaperData,
    ProcessResult,
    StatData,
    TechnicalDetail,
    TechnicalDetailItem,
)


def _paper_to_ts(p: PaperData) -> str:
    lines = [
        f"    slug: {json.dumps(p.slug)},",
        f"    number: {p.number},",
        f"    title: {json.dumps(p.title)},",
        f"    category: {json.dumps(p.category)},",
        f"    wordCount: 0,",
        f"    readingTimeMin: {p.reading_time_min},",
    ]
    if p.authors:
        lines.append(f"    authors: {json.dumps(p.authors)},")
    if p.year:
        lines.append(f"    year: {p.year},")
    if p.venue:
        lines.append(f"    venue: {json.dumps(p.venue)},")
    if p.finding:
        lines.append(f"    finding: {json.dumps(p.finding)},")
    if p.relevance:
        lines.append(f"    relevance: {json.dumps(p.relevance)},")
    if p.url:
        lines.append(f"    url: {json.dumps(p.url)},")
    if p.category_color:
        lines.append(f"    categoryColor: {json.dumps(p.category_color)},")
    return "  {\n" + "\n".join(lines) + "\n  }"


def _agent_to_ts(a: AgentData) -> str:
    lines = [
        f"    name: {json.dumps(a.name)},",
        f"    description: {json.dumps(a.description)},",
    ]
    if a.research_basis:
        lines.append(f"    researchBasis: {json.dumps(a.research_basis)},")
    if a.paper_indices:
        lines.append(f"    paperIndices: [{', '.join(str(i) for i in a.paper_indices)}],")
    if a.code_snippet:
        lines.append(f"    codeSnippet: {json.dumps(a.code_snippet)},")
    if a.data_flow:
        lines.append(f"    dataFlow: {json.dumps(a.data_flow)},")
    return "  {\n" + "\n".join(lines) + "\n  }"


def _technical_detail_item_to_ts(item: TechnicalDetailItem) -> str:
    lines = [
        f"      label: {json.dumps(item.label)},",
        f"      value: {json.dumps(item.value)},",
    ]
    if item.metadata:
        lines.append(f"      metadata: {json.dumps(item.metadata)},")
    return "    {\n" + "\n".join(lines) + "\n    }"


def _technical_detail_to_ts(td: TechnicalDetail) -> str:
    lines = [
        f"    type: {json.dumps(td.type)},",
        f"    heading: {json.dumps(td.heading)},",
    ]
    if td.description:
        lines.append(f"    description: {json.dumps(td.description)},")
    if td.items:
        items_str = ",\n".join(_technical_detail_item_to_ts(item) for item in td.items)
        lines.append(f"    items: [\n{items_str},\n    ],")
    if td.code:
        lines.append(f"    code: {json.dumps(td.code)},")
    return "  {\n" + "\n".join(lines) + "\n  }"


def _stat_to_ts(s: StatData) -> str:
    lines = [
        f"    number: {json.dumps(s.number)},",
        f"    label: {json.dumps(s.label)},",
    ]
    if s.source:
        lines.append(f"    source: {json.dumps(s.source)},")
    if s.paper_index is not None:
        lines.append(f"    paperIndex: {s.paper_index},")
    return "  {\n" + "\n".join(lines) + "\n  }"


def _to_display_name(app_name: str) -> str:
    import re

    return " ".join(
        w.capitalize() for w in re.split(r"[-_.]", app_name)
    )


def generate_data_tsx(data: HowItWorksData) -> str:
    papers_str = ",\n".join(_paper_to_ts(p) for p in data.papers)
    stats_str = ",\n".join(_stat_to_ts(s) for s in data.stats)
    agents_str = ",\n".join(_agent_to_ts(a) for a in data.agents)
    def _section_to_ts(s):
        lines = [
            f"    heading: {json.dumps(s.heading)},",
            f"    content: {json.dumps(s.content)},",
        ]
        if s.code_block:
            lines.append(f"    codeBlock: {json.dumps(s.code_block)},")
        return "  {\n" + "\n".join(lines) + "\n  }"

    sections_str = ",\n".join(_section_to_ts(s) for s in data.extra_sections)
    technical_details_str = ",\n".join(
        _technical_detail_to_ts(td) for td in data.technical_details
    )

    return f'''import type {{ Paper, PipelineAgent, Stat, TechnicalDetail, ExtraSection }} from "@ai-apps/ui/how-it-works";

// ─── Technical Foundations ──────────────────────────────────────────

export const papers: Paper[] = [
{papers_str},
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
{stats_str},
];

// ─── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
{agents_str},
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  {json.dumps(data.story)};

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: ExtraSection[] = [
{sections_str},
];

// ─── Technical Details ────────────────────────────────────────────

export const technicalDetails: TechnicalDetail[] = [
{technical_details_str},
];
'''


def generate_client_tsx(data: HowItWorksData) -> str:
    return f'''"use client";

import {{ HowItWorks }} from "@ai-apps/ui/how-it-works";
import {{ papers, researchStats, pipelineAgents, story, extraSections, technicalDetails }} from "./data";

export function HowItWorksClient() {{
  return (
    <HowItWorks
      papers={{papers}}
      title="How It Works"
      subtitle={{{json.dumps(data.subtitle)}}}
      stats={{researchStats}}
      agents={{pipelineAgents}}
      story={{story}}
      extraSections={{extraSections}}
      technicalDetails={{technicalDetails}}
    />
  );
}}
'''


def generate_page_tsx(data: HowItWorksData, app_name: str) -> str:
    display_name = _to_display_name(app_name)
    return f'''import type {{ Metadata }} from "next";
import {{ HowItWorksClient }} from "./how-it-works-client";

export const metadata: Metadata = {{
  title: "How It Works | {display_name}",
  description: {json.dumps(data.subtitle)},
}};

export default function HowItWorksPage() {{
  return <HowItWorksClient />;
}}
'''


def _ensure_ui_dep(app_path: Path) -> bool:
    pkg_path = app_path / "package.json"
    try:
        raw = pkg_path.read_text()
        pkg = json.loads(raw)
        deps = pkg.get("dependencies", {})
        if "@ai-apps/ui" in deps:
            return False
        deps["@ai-apps/ui"] = "workspace:*"
        pkg["dependencies"] = dict(sorted(deps.items()))
        pkg_path.write_text(json.dumps(pkg, indent=2) + "\n")
        return True
    except (OSError, json.JSONDecodeError):
        return False


async def write_node(state: dict[str, Any]) -> dict[str, Any]:
    app = state["current_app"]
    app_dir = Path(app.app_dir)
    how_it_works_dir = app_dir / "how-it-works"
    action = "updated" if app.has_how_it_works else "written"

    data: HowItWorksData = state["current_data"]

    try:
        how_it_works_dir.mkdir(parents=True, exist_ok=True)

        gen_files = [
            ("data.tsx", generate_data_tsx(data)),
            ("how-it-works-client.tsx", generate_client_tsx(data)),
        ]

        # Skip page.tsx when app already has a custom how-it-works page
        if not app.has_how_it_works:
            gen_files.append(("page.tsx", generate_page_tsx(data, app.name)))
        else:
            print("  ⏭   Skipping page.tsx (custom page exists)")

        written_paths: list[str] = []
        for name, content in gen_files:
            file_path = how_it_works_dir / name
            file_path.write_text(content, encoding="utf-8")
            written_paths.append(str(file_path))
            icon = "↺" if action == "updated" else "+"
            print(f"  ✓   {icon} {name}")

        added_ui = _ensure_ui_dep(Path(app.path))
        if added_ui:
            print("  📦  Added @ai-apps/ui to package.json — run pnpm install to link")

        return {
            "results": [
                ProcessResult(app_name=app.name, status=action, files=written_paths)
            ]
        }
    except Exception as exc:
        error = str(exc)
        print(f"  ✗   Error: {error}")
        return {
            "results": [
                ProcessResult(app_name=app.name, status="error", error=error)
            ]
        }
