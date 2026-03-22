"""Structural tests — validate models, graph wiring, and code generation (no API calls).

Run: uv run pytest evals/test_structural.py -v
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

# Allow imports from the source tree
_src = Path(__file__).resolve().parent.parent / "src"
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

from how_it_works.models import (
    AgentData,
    AppInfo,
    ExtraSection,
    FileContent,
    HowItWorksData,
    PaperData,
    ProcessResult,
    StatData,
)
from how_it_works.nodes.write import (
    generate_client_tsx,
    generate_data_tsx,
    generate_page_tsx,
)

from fixtures import SAMPLE_ANALYSIS, SAMPLE_GENERATED_JSON


# ═══════════════════════════════════════════════════════════════════════════════
# Model validation tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestModels:
    def test_app_info_creation(self):
        app = AppInfo(
            name="test-app",
            path="/tmp/test-app",
            app_dir="/tmp/test-app/app",
            has_how_it_works=False,
            framework="nextjs",
        )
        assert app.name == "test-app"
        assert app.framework == "nextjs"

    def test_file_content_creation(self):
        fc = FileContent(relative_path="src/index.ts", content="export default {};")
        assert fc.relative_path == "src/index.ts"

    def test_paper_data_defaults(self):
        p = PaperData(slug="test", number=1, title="Test", category="Frontend")
        assert p.word_count == 0
        assert p.reading_time_min == 2
        assert p.authors is None

    def test_how_it_works_data_from_json(self):
        raw = json.loads(SAMPLE_GENERATED_JSON)
        data = HowItWorksData.model_validate(raw)
        assert data.title == "How It Works"
        assert len(data.papers) == 6
        assert len(data.agents) == 5
        assert len(data.stats) == 4
        assert len(data.extra_sections) == 4

    def test_how_it_works_data_papers_have_required_fields(self):
        raw = json.loads(SAMPLE_GENERATED_JSON)
        data = HowItWorksData.model_validate(raw)
        for paper in data.papers:
            assert paper.slug
            assert paper.number > 0
            assert paper.title
            assert paper.category

    def test_process_result_variants(self):
        ok = ProcessResult(app_name="app", status="written", files=["/a/b.tsx"])
        assert ok.error is None
        err = ProcessResult(app_name="app", status="error", error="boom")
        assert err.error == "boom"


# ═══════════════════════════════════════════════════════════════════════════════
# Code generation tests
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.fixture
def sample_data() -> HowItWorksData:
    return HowItWorksData.model_validate(json.loads(SAMPLE_GENERATED_JSON))


class TestCodeGeneration:
    def test_data_tsx_imports(self, sample_data: HowItWorksData):
        code = generate_data_tsx(sample_data)
        assert 'import type { Paper, PipelineAgent, Stat }' in code
        assert 'from "@ai-apps/ui/how-it-works"' in code

    def test_data_tsx_exports_papers(self, sample_data: HowItWorksData):
        code = generate_data_tsx(sample_data)
        assert "export const papers: Paper[]" in code
        for paper in sample_data.papers:
            assert paper.slug in code

    def test_data_tsx_exports_stats(self, sample_data: HowItWorksData):
        code = generate_data_tsx(sample_data)
        assert "export const researchStats: Stat[]" in code

    def test_data_tsx_exports_agents(self, sample_data: HowItWorksData):
        code = generate_data_tsx(sample_data)
        assert "export const pipelineAgents: PipelineAgent[]" in code

    def test_data_tsx_exports_story(self, sample_data: HowItWorksData):
        code = generate_data_tsx(sample_data)
        assert "export const story =" in code

    def test_data_tsx_exports_extra_sections(self, sample_data: HowItWorksData):
        code = generate_data_tsx(sample_data)
        assert "export const extraSections" in code

    def test_client_tsx_is_client_component(self, sample_data: HowItWorksData):
        code = generate_client_tsx(sample_data)
        assert code.startswith('"use client"')

    def test_client_tsx_imports_how_it_works(self, sample_data: HowItWorksData):
        code = generate_client_tsx(sample_data)
        assert 'from "@ai-apps/ui/how-it-works"' in code
        assert 'from "./data"' in code

    def test_client_tsx_renders_component(self, sample_data: HowItWorksData):
        code = generate_client_tsx(sample_data)
        assert "<HowItWorks" in code
        assert "papers={papers}" in code

    def test_page_tsx_has_metadata(self, sample_data: HowItWorksData):
        code = generate_page_tsx(sample_data, "todo-app")
        assert "export const metadata: Metadata" in code
        assert "How It Works | Todo App" in code

    def test_page_tsx_default_export(self, sample_data: HowItWorksData):
        code = generate_page_tsx(sample_data, "todo-app")
        assert "export default function HowItWorksPage" in code
        assert "<HowItWorksClient />" in code


# ═══════════════════════════════════════════════════════════════════════════════
# JSON schema validation
# ═══════════════════════════════════════════════════════════════════════════════


class TestJsonSchema:
    def test_paper_slugs_are_kebab_case(self, sample_data: HowItWorksData):
        for p in sample_data.papers:
            assert re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", p.slug), f"Bad slug: {p.slug}"

    def test_paper_numbers_sequential(self, sample_data: HowItWorksData):
        numbers = [p.number for p in sample_data.papers]
        assert numbers == list(range(1, len(numbers) + 1))

    def test_paper_categories_valid(self, sample_data: HowItWorksData):
        valid = {
            "Frontend", "Database", "Authentication", "AI/LLM", "API",
            "Infrastructure", "Storage", "Search", "Build Tool", "State Management",
        }
        for p in sample_data.papers:
            assert p.category in valid, f"Invalid category: {p.category}"

    def test_category_colors_valid(self, sample_data: HowItWorksData):
        valid_colors = {
            "var(--blue-9)", "var(--green-9)", "var(--purple-9)", "var(--amber-9)",
            "var(--orange-9)", "var(--red-9)", "var(--cyan-9)", "var(--indigo-9)",
            "var(--gray-9)", "var(--teal-9)",
        }
        for p in sample_data.papers:
            if p.category_color:
                assert p.category_color in valid_colors, f"Bad color: {p.category_color}"

    def test_papers_count_range(self, sample_data: HowItWorksData):
        assert 5 <= len(sample_data.papers) <= 10

    def test_agents_count_range(self, sample_data: HowItWorksData):
        assert 4 <= len(sample_data.agents) <= 8

    def test_stats_count_range(self, sample_data: HowItWorksData):
        assert 3 <= len(sample_data.stats) <= 6

    def test_extra_sections_count_range(self, sample_data: HowItWorksData):
        assert 3 <= len(sample_data.extra_sections) <= 6

    def test_story_length(self, sample_data: HowItWorksData):
        sentences = [s.strip() for s in sample_data.story.split(".") if s.strip()]
        assert 3 <= len(sentences) <= 6

    def test_required_extra_sections(self, sample_data: HowItWorksData):
        headings = {s.heading.lower() for s in sample_data.extra_sections}
        assert any("architecture" in h for h in headings)
        assert any("security" in h or "auth" in h for h in headings)


# ═══════════════════════════════════════════════════════════════════════════════
# Markdown structural validation (fast, no API)
# ═══════════════════════════════════════════════════════════════════════════════


class TestMarkdownStructure:
    """Validate markdown formatting rules that can be checked without LLM."""

    def test_has_10_numbered_sections(self):
        for i in range(1, 11):
            assert f"### {i}." in SAMPLE_ANALYSIS, f"Missing section {i}"

    def test_heading_hierarchy_no_skips(self):
        lines = SAMPLE_ANALYSIS.splitlines()
        for line in lines:
            # Should not have H4 (####) since we only use ## and ###
            assert not line.startswith("#### "), f"Unexpected H4: {line}"

    def test_tech_stack_uses_bold(self):
        """Tech stack items should bold the technology name."""
        in_stack = False
        bold_count = 0
        for line in SAMPLE_ANALYSIS.splitlines():
            if "Tech Stack" in line or "Tech stack" in line:
                in_stack = True
                continue
            if in_stack and line.startswith("### "):
                break
            if in_stack and line.startswith("- **"):
                bold_count += 1
        assert bold_count >= 3, f"Only {bold_count} bolded tech stack items"

    def test_inline_code_for_file_paths(self):
        """File paths like lib/auth.ts should be in backticks."""
        assert "`lib/auth.ts`" in SAMPLE_ANALYSIS or "`src/db/schema.ts`" in SAMPLE_ANALYSIS

    def test_inline_code_for_functions(self):
        """Function names should be in backticks."""
        assert "`getSession()`" in SAMPLE_ANALYSIS or "`auth.api.getSession()`" in SAMPLE_ANALYSIS

    def test_inline_code_for_api_paths(self):
        """API paths should be in backticks."""
        assert "`/api/todos`" in SAMPLE_ANALYSIS

    def test_data_flow_uses_numbered_list(self):
        """Data flow section should use numbered steps."""
        in_flow = False
        numbered_count = 0
        for line in SAMPLE_ANALYSIS.splitlines():
            if "Data Flow" in line or "Data flow" in line:
                in_flow = True
                continue
            if in_flow and line.startswith("### "):
                break
            if in_flow and re.match(r"^\d+\.", line.strip()):
                numbered_count += 1
        assert numbered_count >= 3, f"Only {numbered_count} numbered flow steps"

    def test_consistent_list_markers(self):
        """All unordered lists should use the same marker."""
        markers = set()
        for line in SAMPLE_ANALYSIS.splitlines():
            stripped = line.lstrip()
            if stripped.startswith("- "):
                markers.add("-")
            elif stripped.startswith("* "):
                markers.add("*")
        # Should only use one type of marker
        assert len(markers) <= 1, f"Mixed list markers: {markers}"

    def test_no_bare_urls(self):
        """URLs should be in markdown links or backticks, not bare."""
        for line in SAMPLE_ANALYSIS.splitlines():
            # Skip code blocks
            if line.strip().startswith("```"):
                continue
            # Check for bare http(s) URLs not inside [] or ``
            bare = re.findall(r"(?<!\[)(?<!`)https?://\S+(?!\])", line)
            assert not bare, f"Bare URL found: {bare}"

    def test_no_markdown_rendering_artifacts(self):
        """No broken markdown like unmatched ** or unclosed backticks."""
        for line in SAMPLE_ANALYSIS.splitlines():
            # Count backticks — should be even (paired)
            backtick_count = line.count("`") - line.count("```") * 3
            if backtick_count > 0:
                assert backtick_count % 2 == 0, f"Unmatched backtick in: {line}"

    def test_database_section_bolds_table_names(self):
        """Database section should bold table names."""
        in_db = False
        for line in SAMPLE_ANALYSIS.splitlines():
            if "Database" in line and line.startswith("### "):
                in_db = True
                continue
            if in_db and line.startswith("### "):
                break
            if in_db and ("**user**" in line or "**todo**" in line):
                return  # Found at least one
        pytest.fail("Database section should bold table names")

    def test_sections_not_empty(self):
        """No section should be just a heading with no content."""
        lines = SAMPLE_ANALYSIS.splitlines()
        for i, line in enumerate(lines):
            if line.startswith("### ") and i + 1 < len(lines):
                next_non_empty = ""
                for j in range(i + 1, min(i + 5, len(lines))):
                    if lines[j].strip():
                        next_non_empty = lines[j]
                        break
                assert not next_non_empty.startswith("### "), (
                    f"Empty section: {line}"
                )


# ═══════════════════════════════════════════════════════════════════════════════
# Graph wiring (imports only — no execution)
# ═══════════════════════════════════════════════════════════════════════════════


class TestGraphImports:
    def test_orchestrator_builds(self):
        from how_it_works.graph import build_how_it_works_graph
        graph = build_how_it_works_graph()
        assert graph is not None

    def test_all_agent_subgraphs_build(self):
        from how_it_works.agents import (
            build_analyst_graph,
            build_app_pipeline,
            build_generator_graph,
            build_reader_graph,
            build_scanner_graph,
            build_writer_graph,
        )
        for builder in [
            build_analyst_graph,
            build_app_pipeline,
            build_generator_graph,
            build_reader_graph,
            build_scanner_graph,
            build_writer_graph,
        ]:
            graph = builder()
            assert graph is not None

    def test_deepseek_client_importable(self):
        from how_it_works.deepseek import chat, chat_json
        assert callable(chat)
        assert callable(chat_json)

    def test_state_types_importable(self):
        from how_it_works.state import (
            AnalystState,
            AppProcessingState,
            GeneratorState,
            OrchestratorState,
            ReaderState,
            ScannerState,
            WriterState,
        )
        for state_cls in [
            AnalystState, AppProcessingState, GeneratorState,
            OrchestratorState, ReaderState, ScannerState, WriterState,
        ]:
            assert state_cls is not None

    def test_prompts_importable(self):
        from how_it_works.prompts import (
            ANALYSIS_SYSTEM_PROMPT,
            CRITIQUE_PROMPT,
            FIX_VALIDATION_PROMPT,
            GENERATION_SYSTEM_PROMPT,
            REFINE_PROMPT,
        )
        for prompt in [
            ANALYSIS_SYSTEM_PROMPT, CRITIQUE_PROMPT,
            FIX_VALIDATION_PROMPT, GENERATION_SYSTEM_PROMPT, REFINE_PROMPT,
        ]:
            assert len(prompt) > 50
