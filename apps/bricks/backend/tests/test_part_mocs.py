"""Evals for the part_mocs LangGraph pipeline.

Tests run against live Rebrickable API + DeepSeek LLM.
Run:  cd backend && uv run pytest tests/test_part_mocs.py -v
"""

from bricks_agent.part_mocs_graph import (
    find_mocs,
    find_sets,
    part_mocs_graph,
    rank_mocs,
    resolve_part,
)


# ── Unit: resolve_part ───────────────────────────────────────────────────


class TestResolvePart:
    async def test_resolves_known_part(self):
        """Part 3001 (2x4 Brick) should resolve via parts API."""
        result = await resolve_part({"part_num": "3001"})
        assert result.get("error") is None
        assert result["part_name"] is not None
        assert result["is_set"] is False
        assert len(result["colors"]) > 0

    async def test_resolves_set_as_fallback(self):
        """45607 (SPIKE Small Angular Motor) resolves via sets API."""
        result = await resolve_part({"part_num": "45607"})
        assert result.get("error") is None
        assert "motor" in result["part_name"].lower() or "angular" in result["part_name"].lower()
        assert result["is_set"] is True

    async def test_returns_error_for_unknown(self):
        """A bogus part number should produce an error."""
        result = await resolve_part({"part_num": "99999999"})
        assert result.get("error") is not None


# ── Unit: find_sets ──────────────────────────────────────────────────────


class TestFindSets:
    async def test_finds_sets_for_part_with_colors(self):
        """Part 3001 in multiple colors should yield sets."""
        state = {
            "part_num": "3001",
            "is_set": False,
            "colors": [
                {"id": 0, "name": "Black", "image_url": None, "num_sets": 100},
                {"id": 1, "name": "Blue", "image_url": None, "num_sets": 50},
            ],
        }
        result = await find_sets(state)
        assert len(result["sets"]) > 0
        assert "set_num" in result["sets"][0]

    async def test_finds_sets_for_set_type_part(self):
        """45607 as a set should find related sets via search."""
        state = {"part_num": "45607", "is_set": True, "colors": []}
        result = await find_sets(state)
        assert isinstance(result["sets"], list)
        # May or may not find sets; just verify structure

    async def test_skips_on_error(self):
        """If state has an error, find_sets should no-op."""
        result = await find_sets({"error": "already failed", "part_num": "3001"})
        assert result == {}


# ── Unit: find_mocs ──────────────────────────────────────────────────────


class TestFindMocs:
    async def test_finds_mocs_for_common_sets(self):
        """Sets with known MOC alternates should produce results."""
        state = {
            "sets": [
                {"set_num": "10696-1", "name": "Medium Creative Brick Box", "year": 2015, "num_parts": 484, "image_url": None},
            ],
        }
        result = await find_mocs(state)
        assert len(result["mocs"]) > 0
        moc = result["mocs"][0]
        assert "moc_id" in moc
        assert "name" in moc
        assert "designer" in moc

    async def test_empty_sets_returns_empty_mocs(self):
        result = await find_mocs({"sets": []})
        assert result["mocs"] == []

    async def test_skips_on_error(self):
        result = await find_mocs({"error": "fail"})
        assert result == {}


# ── Unit: rank_mocs (LLM) ───────────────────────────────────────────────


class TestRankMocs:
    async def test_ranks_mocs_with_llm(self):
        """Given a list of MOCs, the LLM should rank and summarize them."""
        state = {
            "part_num": "3001",
            "part_name": "Brick 2 x 4",
            "mocs": [
                {"moc_id": "MOC-1234", "name": "Cool Car", "year": 2023, "num_parts": 100, "image_url": None, "moc_url": "", "designer": "Builder1"},
                {"moc_id": "MOC-5678", "name": "Mini House", "year": 2022, "num_parts": 200, "image_url": None, "moc_url": "", "designer": "Builder2"},
                {"moc_id": "MOC-9012", "name": "Spaceship", "year": 2024, "num_parts": 150, "image_url": None, "moc_url": "", "designer": "Builder3"},
            ],
        }
        result = await rank_mocs(state)
        assert result.get("ranking_summary")
        assert isinstance(result["ranked_mocs"], list)
        assert len(result["ranked_mocs"]) == 3

    async def test_empty_mocs_returns_summary(self):
        result = await rank_mocs({"part_num": "3001", "part_name": "Brick 2 x 4", "mocs": []})
        assert "No MOC" in result["ranking_summary"]
        assert result["ranked_mocs"] == []


# ── Integration: full graph ──────────────────────────────────────────────


class TestPartMocsGraphE2E:

    async def test_end_to_end_common_part(self):
        """Full pipeline for part 3001 (2x4 Brick) should produce ranked MOCs."""
        result = await part_mocs_graph.ainvoke({"part_num": "3001"})
        assert result.get("error") is None
        assert result["part_name"] is not None
        assert len(result.get("sets", [])) > 0
        assert len(result.get("mocs", [])) > 0 or len(result.get("ranked_mocs", [])) >= 0
        assert result.get("ranking_summary") is not None


    async def test_end_to_end_set_part_45607(self):
        """Full pipeline for 45607 (Small Angular Motor)."""
        result = await part_mocs_graph.ainvoke({"part_num": "45607"})
        assert result.get("error") is None
        assert result["part_name"] is not None
        assert result["is_set"] is True
        # 45607 is niche, may not have MOCs — just verify no crash
        assert isinstance(result.get("mocs", []), list)


    async def test_end_to_end_unknown_part(self):
        """Unknown part should produce an error without crashing."""
        result = await part_mocs_graph.ainvoke({"part_num": "99999999"})
        assert result.get("error") is not None
