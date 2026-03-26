"""Unit tests for individual node helper functions — no API calls, no LLM.

Covers pure logic in scan_node, read_node, process_next_node, write_node helpers,
and the analyst agent's should_refine edge function.

Run: uv run pytest evals/test_nodes.py -v
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

_src = Path(__file__).resolve().parent.parent / "src"
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

from how_it_works.agents.analyst import should_refine
from how_it_works.models import (
    AgentData,
    AppInfo,
    FileContent,
    HowItWorksData,
    PaperData,
    StatData,
    TechnicalDetail,
    TechnicalDetailItem,
)
from how_it_works.nodes.process_next import process_next_node
from how_it_works.nodes.read import (
    MAX_FILE_CHARS,
    _find_page_files,
    _read_file,
    _read_flat_dir,
)
from how_it_works.nodes.scan import _detect_app_dir, _detect_framework
from how_it_works.nodes.write import (
    _agent_to_ts,
    _ensure_ui_dep,
    _paper_to_ts,
    _stat_to_ts,
    _technical_detail_to_ts,
    _technical_detail_item_to_ts,
    _to_display_name,
    generate_client_tsx,
    generate_data_tsx,
    generate_page_tsx,
)

from fixtures import SAMPLE_GENERATED_JSON


# ═══════════════════════════════════════════════════════════════════════════════
# Scan node helpers
# ═══════════════════════════════════════════════════════════════════════════════


class TestDetectFramework:
    def test_nextjs_in_dependencies(self, tmp_path):
        (tmp_path / "package.json").write_text(
            json.dumps({"dependencies": {"next": "15.0.0"}})
        )
        assert _detect_framework(tmp_path) == "nextjs"

    def test_nextjs_in_dev_dependencies(self, tmp_path):
        (tmp_path / "package.json").write_text(
            json.dumps({"devDependencies": {"next": "^14.0.0"}})
        )
        assert _detect_framework(tmp_path) == "nextjs"

    def test_docusaurus(self, tmp_path):
        (tmp_path / "package.json").write_text(
            json.dumps({"dependencies": {"@docusaurus/core": "^3.0.0"}})
        )
        assert _detect_framework(tmp_path) == "docusaurus"

    def test_unknown_when_no_package_json(self, tmp_path):
        assert _detect_framework(tmp_path) == "unknown"

    def test_unknown_when_no_known_framework(self, tmp_path):
        (tmp_path / "package.json").write_text(
            json.dumps({"dependencies": {"react": "^18.0.0"}})
        )
        assert _detect_framework(tmp_path) == "unknown"

    def test_unknown_when_invalid_json(self, tmp_path):
        (tmp_path / "package.json").write_text("not json {{{")
        assert _detect_framework(tmp_path) == "unknown"

    def test_next_takes_priority_over_docusaurus(self, tmp_path):
        # next is checked first in _detect_framework
        (tmp_path / "package.json").write_text(
            json.dumps(
                {"dependencies": {"next": "15.0.0", "@docusaurus/core": "^3.0.0"}}
            )
        )
        assert _detect_framework(tmp_path) == "nextjs"


class TestDetectAppDir:
    def test_prefers_src_app(self, tmp_path):
        (tmp_path / "src" / "app").mkdir(parents=True)
        (tmp_path / "app").mkdir()
        assert _detect_app_dir(tmp_path) == tmp_path / "src" / "app"

    def test_falls_back_to_app(self, tmp_path):
        (tmp_path / "app").mkdir()
        assert _detect_app_dir(tmp_path) == tmp_path / "app"

    def test_returns_none_when_neither_exists(self, tmp_path):
        assert _detect_app_dir(tmp_path) is None

    def test_returns_path_object(self, tmp_path):
        (tmp_path / "app").mkdir()
        result = _detect_app_dir(tmp_path)
        assert isinstance(result, Path)


# ═══════════════════════════════════════════════════════════════════════════════
# Read node helpers
# ═══════════════════════════════════════════════════════════════════════════════


class TestReadFile:
    def test_reads_content_and_relative_path(self, tmp_path):
        f = tmp_path / "auth.ts"
        f.write_text("export const auth = {};")
        result = _read_file(f, tmp_path)
        assert result is not None
        assert result.content == "export const auth = {};"
        assert result.relative_path == "auth.ts"

    def test_truncates_large_file(self, tmp_path):
        f = tmp_path / "large.ts"
        f.write_text("x" * (MAX_FILE_CHARS + 500))
        result = _read_file(f, tmp_path)
        assert result is not None
        assert "truncated" in result.content
        assert len(result.content) < MAX_FILE_CHARS + 100

    def test_respects_custom_max_chars(self, tmp_path):
        f = tmp_path / "a.ts"
        f.write_text("hello world")
        result = _read_file(f, tmp_path, max_chars=5)
        assert result is not None
        assert "truncated" in result.content

    def test_returns_none_for_missing_file(self, tmp_path):
        assert _read_file(tmp_path / "ghost.ts", tmp_path) is None

    def test_preserves_relative_path_with_subdirectory(self, tmp_path):
        sub = tmp_path / "lib"
        sub.mkdir()
        f = sub / "auth.ts"
        f.write_text("// auth")
        result = _read_file(f, tmp_path)
        assert result is not None
        assert result.relative_path == "lib/auth.ts"


class TestFindPageFiles:
    def test_finds_page_tsx_in_root(self, tmp_path):
        p = tmp_path / "page.tsx"
        p.write_text("")
        assert p in _find_page_files(tmp_path)

    def test_finds_page_ts(self, tmp_path):
        p = tmp_path / "page.ts"
        p.write_text("")
        assert p in _find_page_files(tmp_path)

    def test_finds_nested_page(self, tmp_path):
        nested = tmp_path / "dashboard" / "page.tsx"
        nested.parent.mkdir()
        nested.write_text("")
        assert nested in _find_page_files(tmp_path)

    def test_skips_node_modules(self, tmp_path):
        p = tmp_path / "node_modules" / "pkg" / "page.tsx"
        p.parent.mkdir(parents=True)
        p.write_text("")
        assert p not in _find_page_files(tmp_path)

    def test_skips_how_it_works(self, tmp_path):
        p = tmp_path / "how-it-works" / "page.tsx"
        p.parent.mkdir()
        p.write_text("")
        assert p not in _find_page_files(tmp_path)

    def test_skips_next_dir(self, tmp_path):
        p = tmp_path / ".next" / "server" / "page.tsx"
        p.parent.mkdir(parents=True)
        p.write_text("")
        assert p not in _find_page_files(tmp_path)

    def test_skips_dist(self, tmp_path):
        p = tmp_path / "dist" / "page.tsx"
        p.parent.mkdir()
        p.write_text("")
        assert p not in _find_page_files(tmp_path)

    def test_respects_max_depth(self, tmp_path):
        deep = tmp_path / "a" / "b" / "c" / "d" / "page.tsx"
        deep.parent.mkdir(parents=True)
        deep.write_text("")
        # a/b/c/d is depth 4 — excluded at max_depth=3
        assert deep not in _find_page_files(tmp_path, max_depth=3)

    def test_ignored_extensions_excluded(self, tmp_path):
        p = tmp_path / "page.js"
        p.write_text("")
        assert p not in _find_page_files(tmp_path)


class TestReadFlatDir:
    def test_returns_ts_and_tsx(self, tmp_path):
        (tmp_path / "auth.ts").write_text("")
        (tmp_path / "db.tsx").write_text("")
        (tmp_path / "styles.css").write_text("")
        results = _read_flat_dir(tmp_path)
        names = {f.name for f in results}
        assert "auth.ts" in names
        assert "db.tsx" in names
        assert "styles.css" not in names

    def test_respects_max_files(self, tmp_path):
        for i in range(10):
            (tmp_path / f"file{i}.ts").write_text("")
        assert len(_read_flat_dir(tmp_path, max_files=3)) == 3

    def test_custom_ext_pattern(self, tmp_path):
        (tmp_path / "config.yaml").write_text("")
        (tmp_path / "data.json").write_text("")
        results = _read_flat_dir(tmp_path, ext_pattern=r"\.(yaml|yml)$")
        assert len(results) == 1
        assert results[0].name == "config.yaml"

    def test_returns_empty_for_missing_dir(self, tmp_path):
        assert _read_flat_dir(tmp_path / "nonexistent") == []

    def test_returns_empty_for_empty_dir(self, tmp_path):
        empty = tmp_path / "empty"
        empty.mkdir()
        assert _read_flat_dir(empty) == []


# ═══════════════════════════════════════════════════════════════════════════════
# Process-next node
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.fixture
def two_apps():
    return [
        AppInfo(name="app-a", path="/apps/app-a", app_dir="/apps/app-a/app"),
        AppInfo(name="app-b", path="/apps/app-b", app_dir="/apps/app-b/app"),
    ]


class TestProcessNextNode:
    async def test_pops_first_app(self, two_apps):
        result = await process_next_node({"pending_apps": two_apps})
        assert result["current_app"].name == "app-a"

    async def test_remaining_queue_is_correct(self, two_apps):
        result = await process_next_node({"pending_apps": two_apps})
        assert len(result["pending_apps"]) == 1
        assert result["pending_apps"][0].name == "app-b"

    async def test_empty_queue_returns_none(self):
        result = await process_next_node({"pending_apps": []})
        assert result["current_app"] is None
        assert result["pending_apps"] == []

    async def test_resets_current_files(self, two_apps):
        state = {
            "pending_apps": two_apps,
            "current_files": [FileContent(relative_path="old.ts", content="old")],
        }
        result = await process_next_node(state)
        assert result["current_files"] == []

    async def test_resets_current_analysis(self, two_apps):
        state = {"pending_apps": two_apps, "current_analysis": "stale analysis"}
        result = await process_next_node(state)
        assert result["current_analysis"] == ""

    async def test_resets_current_data(self, two_apps):
        state = {"pending_apps": two_apps, "current_data": {"something": "old"}}
        result = await process_next_node(state)
        assert result["current_data"] is None

    async def test_single_app_empties_queue(self, two_apps):
        result = await process_next_node({"pending_apps": [two_apps[0]]})
        assert result["pending_apps"] == []


# ═══════════════════════════════════════════════════════════════════════════════
# Analyst agent — should_refine edge
# ═══════════════════════════════════════════════════════════════════════════════


class TestShouldRefine:
    def test_passes_on_pass_verdict(self):
        assert should_refine({"critique": "PASS: All good.", "reflection_count": 0}) == "done"

    def test_refines_on_needs_refinement(self):
        assert (
            should_refine({"critique": "NEEDS_REFINEMENT: Missing file names.", "reflection_count": 0})
            == "refine"
        )

    def test_stops_when_max_reflections_reached(self):
        assert (
            should_refine({"critique": "NEEDS_REFINEMENT: Still vague.", "reflection_count": 2})
            == "done"
        )

    def test_still_refines_below_max(self):
        assert (
            should_refine({"critique": "NEEDS_REFINEMENT: Too generic.", "reflection_count": 1})
            == "refine"
        )

    def test_empty_critique_is_done(self):
        assert should_refine({"critique": "", "reflection_count": 0}) == "done"

    def test_pass_with_noise_is_done(self):
        # PASS anywhere in text should route to done
        critique = "PASS — analysis covers all 10 dimensions adequately."
        assert should_refine({"critique": critique, "reflection_count": 0}) == "done"


# ═══════════════════════════════════════════════════════════════════════════════
# Write node helpers — display name
# ═══════════════════════════════════════════════════════════════════════════════


class TestToDisplayName:
    def test_kebab_case(self):
        assert _to_display_name("my-app") == "My App"

    def test_snake_case(self):
        assert _to_display_name("my_app") == "My App"

    def test_dot_separated(self):
        assert _to_display_name("lead-gen") == "Lead Gen"

    def test_single_word(self):
        assert _to_display_name("bricks") == "Bricks"

    def test_mixed_separators(self):
        assert _to_display_name("real-estate.app") == "Real Estate App"

    def test_already_single_capitalized(self):
        assert _to_display_name("Knowledge") == "Knowledge"


# ═══════════════════════════════════════════════════════════════════════════════
# Write node helpers — _ensure_ui_dep
# ═══════════════════════════════════════════════════════════════════════════════


class TestEnsureUiDep:
    def test_adds_dep_when_missing(self, tmp_path):
        (tmp_path / "package.json").write_text(
            json.dumps({"name": "test", "dependencies": {"next": "15.0.0"}})
        )
        assert _ensure_ui_dep(tmp_path) is True
        updated = json.loads((tmp_path / "package.json").read_text())
        assert updated["dependencies"]["@ai-apps/ui"] == "workspace:*"

    def test_skips_when_already_present(self, tmp_path):
        (tmp_path / "package.json").write_text(
            json.dumps({"dependencies": {"@ai-apps/ui": "workspace:*"}})
        )
        assert _ensure_ui_dep(tmp_path) is False

    def test_returns_false_when_no_package_json(self, tmp_path):
        assert _ensure_ui_dep(tmp_path) is False

    def test_deps_are_sorted_after_adding(self, tmp_path):
        (tmp_path / "package.json").write_text(
            json.dumps({"dependencies": {"zod": "^3.0.0", "next": "15.0.0"}})
        )
        _ensure_ui_dep(tmp_path)
        updated = json.loads((tmp_path / "package.json").read_text())
        keys = list(updated["dependencies"].keys())
        assert keys == sorted(keys)

    def test_preserves_existing_dependencies(self, tmp_path):
        (tmp_path / "package.json").write_text(
            json.dumps({"dependencies": {"next": "15.0.0", "react": "^18.0.0"}})
        )
        _ensure_ui_dep(tmp_path)
        updated = json.loads((tmp_path / "package.json").read_text())
        assert updated["dependencies"]["next"] == "15.0.0"
        assert updated["dependencies"]["react"] == "^18.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# Write node helpers — TypeScript serialisers
# ═══════════════════════════════════════════════════════════════════════════════


class TestPaperToTs:
    def test_required_fields_present(self):
        p = PaperData(slug="nextjs-15", number=1, title="Next.js 15", category="Frontend")
        code = _paper_to_ts(p)
        assert 'slug: "nextjs-15"' in code
        assert "number: 1" in code
        assert 'title: "Next.js 15"' in code
        assert 'category: "Frontend"' in code

    def test_optional_fields_absent_when_none(self):
        p = PaperData(slug="x", number=1, title="X", category="Frontend")
        code = _paper_to_ts(p)
        assert "authors" not in code
        assert "url" not in code
        assert "year" not in code

    def test_optional_fields_included_when_set(self):
        p = PaperData(
            slug="nextjs-15", number=1, title="Next.js 15", category="Frontend",
            authors="Vercel", year=2024, url="https://nextjs.org",
            finding="React framework", relevance="Powers routing",
            category_color="var(--blue-9)",
        )
        code = _paper_to_ts(p)
        assert 'authors: "Vercel"' in code
        assert "year: 2024" in code
        assert 'url: "https://nextjs.org"' in code
        assert 'categoryColor: "var(--blue-9)"' in code

    def test_output_is_valid_object_syntax(self):
        p = PaperData(slug="x", number=1, title="X", category="Frontend")
        code = _paper_to_ts(p)
        assert code.startswith("  {")
        assert code.endswith("}")


class TestAgentToTs:
    def test_required_fields(self):
        a = AgentData(name="Auth", description="Validates the session cookie.")
        code = _agent_to_ts(a)
        assert 'name: "Auth"' in code
        assert 'description: "Validates the session cookie."' in code

    def test_code_snippet_included(self):
        a = AgentData(name="Auth", description="desc", code_snippet="auth.check(req)")
        assert 'codeSnippet: "auth.check(req)"' in _agent_to_ts(a)

    def test_data_flow_included(self):
        a = AgentData(name="Auth", description="desc", data_flow="req → session → user")
        assert "dataFlow:" in _agent_to_ts(a)

    def test_paper_indices_included(self):
        a = AgentData(name="Auth", description="desc", paper_indices=[0, 2, 4])
        assert "paperIndices: [0, 2, 4]" in _agent_to_ts(a)

    def test_none_paper_indices_omitted(self):
        a = AgentData(name="Auth", description="desc")
        assert "paperIndices" not in _agent_to_ts(a)


class TestStatToTs:
    def test_required_fields(self):
        s = StatData(number="2", label="Database tables")
        code = _stat_to_ts(s)
        assert 'number: "2"' in code
        assert 'label: "Database tables"' in code

    def test_source_included(self):
        s = StatData(number="2", label="Tables", source="src/db/schema.ts")
        assert 'source: "src/db/schema.ts"' in _stat_to_ts(s)

    def test_paper_index_included(self):
        s = StatData(number="2", label="Tables", paper_index=1)
        assert "paperIndex: 1" in _stat_to_ts(s)


# ═══════════════════════════════════════════════════════════════════════════════
# Write node helpers — TechnicalDetail serialisers
# ═══════════════════════════════════════════════════════════════════════════════


class TestTechnicalDetailItemToTs:
    def test_label_and_value(self):
        item = TechnicalDetailItem(label="GET /api/todos", value="List todos for user")
        code = _technical_detail_item_to_ts(item)
        assert 'label: "GET /api/todos"' in code
        assert 'value: "List todos for user"' in code

    def test_metadata_included(self):
        item = TechnicalDetailItem(label="L", value="V", metadata={"auth": "required"})
        code = _technical_detail_item_to_ts(item)
        assert "metadata:" in code
        assert "auth" in code

    def test_metadata_omitted_when_none(self):
        item = TechnicalDetailItem(label="L", value="V")
        assert "metadata" not in _technical_detail_item_to_ts(item)


class TestTechnicalDetailToTs:
    def test_type_and_heading(self):
        td = TechnicalDetail(type="table", heading="API Routes")
        code = _technical_detail_to_ts(td)
        assert 'type: "table"' in code
        assert 'heading: "API Routes"' in code

    def test_description_included(self):
        td = TechnicalDetail(type="table", heading="Routes", description="REST endpoints")
        assert 'description: "REST endpoints"' in _technical_detail_to_ts(td)

    def test_items_serialised(self):
        td = TechnicalDetail(
            type="table",
            heading="Routes",
            items=[TechnicalDetailItem(label="GET /todos", value="List todos")],
        )
        code = _technical_detail_to_ts(td)
        assert 'label: "GET /todos"' in code
        assert 'value: "List todos"' in code

    def test_code_field_included(self):
        td = TechnicalDetail(type="code", heading="Example", code="const x = 1;")
        assert 'code: "const x = 1;"' in _technical_detail_to_ts(td)

    def test_no_items_when_none(self):
        td = TechnicalDetail(type="diagram", heading="Arch")
        assert "items" not in _technical_detail_to_ts(td)


# ═══════════════════════════════════════════════════════════════════════════════
# Code generation — TechnicalDetail integration
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.fixture
def sample_data() -> HowItWorksData:
    return HowItWorksData.model_validate(json.loads(SAMPLE_GENERATED_JSON))


@pytest.fixture
def data_with_technical_details() -> HowItWorksData:
    base = json.loads(SAMPLE_GENERATED_JSON)
    base["technicalDetails"] = [
        {
            "type": "table",
            "heading": "API Routes",
            "items": [
                {"label": "GET /api/todos", "value": "List todos for authenticated user"},
                {"label": "POST /api/todos", "value": "Create todo; returns 201"},
            ],
        },
        {
            "type": "code",
            "heading": "Session-Gated Query",
            "code": "const session = await auth.api.getSession({ headers: req.headers });",
        },
    ]
    return HowItWorksData.model_validate(base)


class TestGenerateDataTsxTechnicalDetails:
    def test_technical_details_export_present(self, sample_data):
        assert "export const technicalDetails: TechnicalDetail[]" in generate_data_tsx(sample_data)

    def test_technical_details_type_in_import(self, sample_data):
        assert "TechnicalDetail" in generate_data_tsx(sample_data)

    def test_extra_section_type_in_import(self, sample_data):
        assert "ExtraSection" in generate_data_tsx(sample_data)

    def test_technical_detail_items_serialised(self, data_with_technical_details):
        code = generate_data_tsx(data_with_technical_details)
        assert 'heading: "API Routes"' in code
        assert 'label: "GET /api/todos"' in code

    def test_technical_detail_code_block_serialised(self, data_with_technical_details):
        code = generate_data_tsx(data_with_technical_details)
        assert 'heading: "Session-Gated Query"' in code
        assert "auth.api.getSession" in code

    def test_client_tsx_passes_technical_details_prop(self, sample_data):
        code = generate_client_tsx(sample_data)
        assert "technicalDetails={technicalDetails}" in code

    def test_client_tsx_imports_technical_details(self, sample_data):
        code = generate_client_tsx(sample_data)
        assert "technicalDetails" in code
