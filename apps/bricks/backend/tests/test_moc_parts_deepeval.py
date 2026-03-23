"""DeepEval evaluation pipeline for LEGO part detection.

Evaluates the ``moc_parts_graph`` AI extraction pipeline across five axes:

1. **G-Eval** — custom criteria: are parts structurally plausible?

2. **ImageCoherenceMetric** — does each extracted part image match the text
   description around it (e.g. "Brick 2 x 4" text ↔ 2x4 brick image)?

3. **ImageReferenceMetric** — is each part image accurately described /
   referred to in the surrounding text?

4. **ImageHelpfulnessMetric** — would this parts list genuinely help
   someone build the described MOC?

5. **AnswerRelevancyMetric / FaithfulnessMetric** — text-only RAG eval
   against a LEGO parts catalog as retrieval context.

Image embedding format (deepeval 3.9.2)
----------------------------------------
``LLMTestCase`` requires ``input`` and ``actual_output`` to be strings.
Images are embedded inline via f-strings::

    img = MLLMImage(url="https://...", local=False)
    actual_output = f"Brick 2 x 4 {img} Part number: 3001"

``MLLMImage.__format__`` returns ``[DEEPEVAL:IMAGE:<id>]``. The image
metrics call ``convert_to_multi_modal_array`` internally to parse those
placeholders back into ``MLLMImage`` objects.

Run
---
    cd backend && uv run pytest tests/test_moc_parts_deepeval.py -v
    # standalone with deepeval HTML report:
    cd backend && uv run python tests/test_moc_parts_deepeval.py
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any

import pytest
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ── DeepEval imports ──────────────────────────────────────────────────────

from deepeval import evaluate
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    GEval,
    ImageCoherenceMetric,
    ImageHelpfulnessMetric,
    ImageReferenceMetric,
)
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams, MLLMImage

# ── Local pipeline ────────────────────────────────────────────────────────

from bricks_agent.moc_parts_graph import moc_parts_graph

# ── Image helpers ─────────────────────────────────────────────────────────

REBRICKABLE_CDN = "https://cdn.rebrickable.com/media"


def moc_img(moc_id: str) -> MLLMImage:
    """MOC thumbnail from Rebrickable CDN."""
    return MLLMImage(url=f"{REBRICKABLE_CDN}/mocs/{moc_id.lower()}.jpg", local=False)


def part_img(part_num: str) -> MLLMImage:
    """Part render from Rebrickable CDN."""
    return MLLMImage(
        url=f"https://rebrickable.com/media/parts/elements/{part_num}.jpg",
        local=False,
    )


# ── Custom DeepSeek judge ─────────────────────────────────────────────────


class DeepSeekJudge(DeepEvalBaseLLM):
    """Use DeepSeek-chat as the evaluation judge instead of GPT-4o."""

    def get_model_name(self) -> str:
        return "deepseek-chat"

    def load_model(self) -> ChatOpenAI:
        return ChatOpenAI(
            model="deepseek-chat",
            api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
            base_url="https://api.deepseek.com/v1",
            temperature=0.0,
        )

    def generate(
        self, prompt: str, schema: type[BaseModel] | None = None
    ) -> tuple[str, float]:
        llm = self.load_model()
        if schema:
            resp = llm.with_structured_output(schema, method="json_mode").invoke(prompt)
            return resp.model_dump_json(), 0.0
        return llm.invoke(prompt).content, 0.0

    async def a_generate(
        self, prompt: str, schema: type[BaseModel] | None = None
    ) -> tuple[str, float]:
        llm = self.load_model()
        if schema:
            resp = await llm.with_structured_output(
                schema, method="json_mode"
            ).ainvoke(prompt)
            return resp.model_dump_json(), 0.0
        return (await llm.ainvoke(prompt)).content, 0.0


judge = DeepSeekJudge()

# ── MOCs under test ───────────────────────────────────────────────────────

MOCS: list[dict[str, Any]] = [
    # Primary target — the MOC the user is trying to extract parts for
    {"moc_id": "MOC-255784", "moc_name": "", "designer": ""},
    # Castle MOC — dominated by wall plates, arch bricks, grey tones
    {"moc_id": "MOC-10000", "moc_name": "Mini Castle", "designer": "CastleBuilder"},
    # Technic race car — gears, pins, axles
    {"moc_id": "MOC-20000", "moc_name": "Technic Race Car", "designer": "TechnicFan"},
]

# ── Part variant resolution — Rebrickable uses suffixes (3040→3040b) ─────

# Parts whose bare numbers 404 on Rebrickable but resolve with a suffix.
# Used by TestPartVariantResolution to verify the pipeline produces valid IDs.
VARIANT_PARTS: dict[str, list[str]] = {
    "3040": ["3040a", "3040b"],  # Slope 45° 2×1
    "3039": ["3039a", "3039b"],  # Slope 45° 2×2
    "3069": ["3069a", "3069b"],  # Tile 1×2
}

# ── LEGO parts catalog — retrieval context for RAG metrics ────────────────

PARTS_CATALOG = [
    "3001 — Brick 2 x 4 — Red, Blue, Yellow, Black, White, Light Bluish Gray, Dark Green",
    "3004 — Brick 1 x 2 — available in most standard colors",
    "3005 — Brick 1 x 1 — available in most standard colors",
    "3010 — Brick 1 x 4 — available in most standard colors",
    "3009 — Brick 1 x 6 — available in most standard colors",
    "3008 — Brick 1 x 8 — available in most standard colors",
    "3023 — Plate 1 x 2 — available in most standard colors",
    "3024 — Plate 1 x 1 — available in most standard colors",
    "3020 — Plate 2 x 4 — available in most standard colors",
    "3710 — Plate 1 x 4 — available in most standard colors",
    "3460 — Plate 1 x 8 — available in most standard colors",
    "3832 — Plate 2 x 10 — available in most standard colors",
    "3040 — Slope 45° 2 x 1 — Red, Black, White, Light Bluish Gray (Rebrickable: 3040a/3040b)",
    "3039 — Slope 45° 2 x 2 — available in most standard colors (Rebrickable: 3039a/3039b)",
    "3069b — Tile 1 x 2 with Groove — available in most standard colors",
    "87079 — Tile 2 x 4 — available in most standard colors",
    "3622 — Brick 1 x 3 — available in most standard colors",
    "2357 — Brick 2 x 2 Corner — available in most standard colors",
    "3659 — Arch 1 x 4 — available in most standard colors",
    "2780 — Technic Pin with Friction Ridges — Black only",
    "6558 — Technic Pin 3L with Friction Ridges — Black, Blue",
    "3648 — Gear 24 Tooth — Light Bluish Gray, Tan",
    "4265c — Technic Bush — Light Bluish Gray",
    "32054 — Technic Pin 3L — Black, Light Bluish Gray",
    "43093 — Technic Axle Pin — Light Bluish Gray",
    "11477 — Slope Curved 2 x 1 — available in most standard colors",
    "4589 — Cone 1 x 1 — available in most standard colors",
    "99780 — Bracket 1 x 2 - 1 x 2 — available in most standard colors",
]

# Extract bare part numbers from catalog for validation
PARTS_CATALOG_NUMS = {line.split(" — ")[0].strip() for line in PARTS_CATALOG}

# ── Pipeline runner ───────────────────────────────────────────────────────


async def extract(moc: dict[str, Any]) -> tuple[str, list[dict]]:
    """Run moc_parts_graph → (formatted text, raw parts list)."""
    result = await moc_parts_graph.ainvoke(
        {
            "moc_id": moc["moc_id"],
            "moc_name": moc.get("moc_name") or moc["moc_id"],
            "designer": moc.get("designer") or "Unknown",
            "image_url": f"{REBRICKABLE_CDN}/mocs/{moc['moc_id'].lower()}.jpg",
        }
    )
    parts: list[dict] = result.get("parts", [])
    source: str = result.get("source", "unknown")
    lines = [f"Source: {source}", f"Parts extracted: {len(parts)}", ""]
    for p in parts:
        lines.append(
            f"- Part {p.get('partNum', '?')}: {p.get('name', '?')} "
            f"({p.get('color', '?')}) ×{p.get('qty', 1)}"
        )
    return "\n".join(lines), parts


def build_image_output_str(parts: list[dict], max_parts: int = 8) -> str:
    """Build a string with embedded MLLMImage placeholders.

    Format for each part (so ImageCoherenceMetric has context_above and below):
        <name> (<color>) ×<qty>
        [DEEPEVAL:IMAGE:<id>]   ← f"{img}" expands to this automatically
        Part number: <partNum>

    The metric parses the string using ``convert_to_multi_modal_array``.
    """
    segments: list[str] = []
    for p in parts[:max_parts]:
        part_num = str(p.get("partNum", ""))
        name = p.get("name", "unknown part")
        color = p.get("color", "Any")
        qty = p.get("qty", 1)
        img = part_img(part_num) if part_num else None
        if img:
            # f"{img}" triggers MLLMImage.__format__ → "[DEEPEVAL:IMAGE:<id>]"
            segments.append(
                f"{name} ({color}) ×{qty}\n{img}\nPart number: {part_num}"
            )
        else:
            segments.append(f"{name} ({color}) ×{qty}")
    return "\n\n".join(segments)


def has_images(s: str) -> bool:
    return "[DEEPEVAL:IMAGE:" in s


# ═════════════════════════════════════════════════════════════════════════════
# 1. G-Eval: LEGO Part Detection Accuracy
# ═════════════════════════════════════════════════════════════════════════════


def geval_metric() -> GEval:
    """Factory — returns a fresh GEval instance (it is stateful after measure)."""
    return GEval(
        name="LEGO Part Detection Accuracy",
        model=judge,
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        evaluation_steps=[
            "Check that each part entry has a real LEGO part number "
            "(numeric or alphanumeric: 3001, 3069b, 4265c). "
            "Penalise heavily for invented or placeholder IDs like '0000' or 'unknown'.",
            "Check that each part specifies a real LEGO color "
            "('Red', 'Black', 'Light Bluish Gray', 'Dark Tan', 'Bright Yellow'). "
            "Penalise if all parts share the same single generic color with no variety.",
            "Check that quantities are positive integers plausible for the build type: "
            "a castle MOC needs many plates/bricks; a Technic car needs many pins/gears.",
            "Check that part types match the MOC context in the input: "
            "a castle should have wall plates, arches, slopes; "
            "a Technic car should have gears, axles, pins, beams.",
            "Award full marks only if there are ≥ 10 distinct parts with "
            "plausible real part numbers, varied realistic colors, and "
            "contextually appropriate part categories.",
        ],
        threshold=0.55,
    )


class TestGEvalPartDetection:
    """G-Eval: is the extracted parts text structurally plausible?"""

    async def test_moc_255784_plausible(self):
        moc = MOCS[0]
        output_text, _ = await extract(moc)
        tc = LLMTestCase(
            input=(
                f"Extract LEGO parts for MOC {moc['moc_id']} "
                f"(thumbnail: {REBRICKABLE_CDN}/mocs/{moc['moc_id'].lower()}.jpg)"
            ),
            actual_output=output_text,
        )
        metric = geval_metric()
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"G-Eval {metric.score:.2f} < {metric.threshold}: {metric.reason}"
        )

    async def test_castle_moc_plausible(self):
        moc = MOCS[1]
        output_text, _ = await extract(moc)
        tc = LLMTestCase(
            input=f"Extract LEGO parts for '{moc['moc_name']}' by {moc['designer']}",
            actual_output=output_text,
        )
        metric = geval_metric()
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"G-Eval {metric.score:.2f}: {metric.reason}"
        )

    async def test_technic_car_plausible(self):
        moc = MOCS[2]
        output_text, _ = await extract(moc)
        tc = LLMTestCase(
            input=f"Extract LEGO parts for '{moc['moc_name']}' by {moc['designer']}",
            actual_output=output_text,
        )
        metric = geval_metric()
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"G-Eval {metric.score:.2f}: {metric.reason}"
        )


# ═════════════════════════════════════════════════════════════════════════════
# 2. ImageCoherenceMetric
# actual_output string contains embedded [DEEPEVAL:IMAGE:<id>] placeholders.
# The metric parses them and checks that each image is coherent with the
# text directly above and below it.
# ═════════════════════════════════════════════════════════════════════════════


def _multimodal_judge():
    """Return a multimodal-capable judge, or None if unavailable.

    deepeval's image metrics require a model from its whitelist
    (GPTModel, AnthropicModel, GeminiModel, …). DeepSeek is text-only.
    """
    try:
        from deepeval.models import AnthropicModel as _AM
        key = os.environ.get("ANTHROPIC_API_KEY", "")
        if key:
            return _AM(model="claude-sonnet-4-20250514")
    except Exception:
        pass
    return None


class TestImageCoherence:
    """Each part image should be coherent with its surrounding text labels."""

    async def test_moc_255784_part_images_coherent(self):
        mm_judge = _multimodal_judge()
        if mm_judge is None:
            pytest.skip("No multimodal judge available (set ANTHROPIC_API_KEY)")
        moc = MOCS[0]
        _, parts = await extract(moc)
        image_output = build_image_output_str(parts)
        if not has_images(image_output):
            pytest.skip("No part images available — skipping image coherence test")

        tc = LLMTestCase(
            input=f"LEGO parts list for {moc['moc_id']}",
            actual_output=image_output,
            multimodal=True,
        )
        metric = ImageCoherenceMetric(model=mm_judge, threshold=0.4)
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"ImageCoherence {metric.score:.2f}: {metric.reason}"
        )

    async def test_castle_part_images_coherent(self):
        mm_judge = _multimodal_judge()
        if mm_judge is None:
            pytest.skip("No multimodal judge available (set ANTHROPIC_API_KEY)")
        moc = MOCS[1]
        _, parts = await extract(moc)
        image_output = build_image_output_str(parts)
        if not has_images(image_output):
            pytest.skip("No part images available")

        tc = LLMTestCase(
            input=f"LEGO parts list for {moc['moc_name']}",
            actual_output=image_output,
            multimodal=True,
        )
        metric = ImageCoherenceMetric(model=mm_judge, threshold=0.4)
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"ImageCoherence {metric.score:.2f}: {metric.reason}"
        )


# ═════════════════════════════════════════════════════════════════════════════
# 3. ImageReferenceMetric
# Is each part image accurately described by the text?
# ═════════════════════════════════════════════════════════════════════════════


class TestImageReference:
    """Part images should be accurately described in the accompanying text."""

    async def test_moc_255784_parts_described_accurately(self):
        mm_judge = _multimodal_judge()
        if mm_judge is None:
            pytest.skip("No multimodal judge available (set ANTHROPIC_API_KEY)")
        moc = MOCS[0]
        _, parts = await extract(moc)
        image_output = build_image_output_str(parts)
        if not has_images(image_output):
            pytest.skip("No part images available")

        tc = LLMTestCase(
            input=f"List the LEGO parts visible in this MOC: {moc['moc_id']}",
            actual_output=image_output,
            multimodal=True,
        )
        metric = ImageReferenceMetric(model=mm_judge, threshold=0.4)
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"ImageReference {metric.score:.2f}: {metric.reason}"
        )

    async def test_castle_parts_described_accurately(self):
        mm_judge = _multimodal_judge()
        if mm_judge is None:
            pytest.skip("No multimodal judge available (set ANTHROPIC_API_KEY)")
        moc = MOCS[1]
        _, parts = await extract(moc)
        image_output = build_image_output_str(parts)
        if not has_images(image_output):
            pytest.skip("No part images available")

        tc = LLMTestCase(
            input=f"Describe the LEGO parts for '{moc['moc_name']}'",
            actual_output=image_output,
            multimodal=True,
        )
        metric = ImageReferenceMetric(model=mm_judge, threshold=0.4)
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"ImageReference {metric.score:.2f}: {metric.reason}"
        )


# ═════════════════════════════════════════════════════════════════════════════
# 4. ImageHelpfulnessMetric
# Would these part images + text genuinely help someone build the MOC?
# ═════════════════════════════════════════════════════════════════════════════


class TestImageHelpfulness:
    """The parts list with images should be genuinely useful for builders."""

    async def test_moc_255784_helpful(self):
        mm_judge = _multimodal_judge()
        if mm_judge is None:
            pytest.skip("No multimodal judge available (set ANTHROPIC_API_KEY)")
        moc = MOCS[0]
        _, parts = await extract(moc)
        image_output = build_image_output_str(parts)
        if not has_images(image_output):
            pytest.skip("No part images available")

        tc = LLMTestCase(
            input=f"I want to build {moc['moc_id']}. What LEGO parts do I need?",
            actual_output=image_output,
            multimodal=True,
        )
        metric = ImageHelpfulnessMetric(model=mm_judge, threshold=0.4)
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"ImageHelpfulness {metric.score:.2f}: {metric.reason}"
        )

    async def test_castle_helpful(self):
        mm_judge = _multimodal_judge()
        if mm_judge is None:
            pytest.skip("No multimodal judge available (set ANTHROPIC_API_KEY)")
        moc = MOCS[1]
        _, parts = await extract(moc)
        image_output = build_image_output_str(parts)
        if not has_images(image_output):
            pytest.skip("No part images available")

        tc = LLMTestCase(
            input=f"I want to build '{moc['moc_name']}'. What LEGO parts do I need?",
            actual_output=image_output,
            multimodal=True,
        )
        metric = ImageHelpfulnessMetric(model=mm_judge, threshold=0.4)
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"ImageHelpfulness {metric.score:.2f}: {metric.reason}"
        )


# ═════════════════════════════════════════════════════════════════════════════
# 5. Text-only RAG: AnswerRelevancy + Faithfulness
# Treats the LEGO parts catalog as retrieval context.
# ═════════════════════════════════════════════════════════════════════════════


class TestTextRAGMetrics:
    """Answer relevancy and faithfulness against the LEGO parts catalog."""

    async def test_moc_255784_answer_relevant(self):
        moc = MOCS[0]
        output_text, _ = await extract(moc)
        tc = LLMTestCase(
            input=f"What LEGO parts do I need to build {moc['moc_id']}?",
            actual_output=output_text,
        )
        metric = AnswerRelevancyMetric(model=judge, threshold=0.5, include_reason=True)
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"AnswerRelevancy {metric.score:.2f}: {metric.reason}"
        )

    async def test_moc_255784_faithful_to_catalog(self):
        moc = MOCS[0]
        output_text, _ = await extract(moc)
        tc = LLMTestCase(
            input=f"List LEGO parts for {moc['moc_id']}",
            actual_output=output_text,
            retrieval_context=PARTS_CATALOG,
        )
        # Faithfulness checks whether the output's claims are grounded in
        # the catalog. Since the AI generates approximate parts, a moderate
        # threshold (0.3) is appropriate — we expect some overlap.
        metric = FaithfulnessMetric(model=judge, threshold=0.3, include_reason=True)
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"Faithfulness {metric.score:.2f}: {metric.reason}"
        )

    async def test_castle_answer_relevant(self):
        moc = MOCS[1]
        output_text, _ = await extract(moc)
        tc = LLMTestCase(
            input=f"What LEGO parts do I need to build '{moc['moc_name']}'?",
            actual_output=output_text,
        )
        metric = AnswerRelevancyMetric(model=judge, threshold=0.5, include_reason=True)
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"AnswerRelevancy {metric.score:.2f}: {metric.reason}"
        )

    async def test_technic_car_answer_relevant(self):
        moc = MOCS[2]
        output_text, _ = await extract(moc)
        tc = LLMTestCase(
            input=f"What LEGO parts do I need to build '{moc['moc_name']}'?",
            actual_output=output_text,
        )
        metric = AnswerRelevancyMetric(model=judge, threshold=0.5, include_reason=True)
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"AnswerRelevancy {metric.score:.2f}: {metric.reason}"
        )


# ═════════════════════════════════════════════════════════════════════════════
# 6. Part Variant Resolution — pipeline should produce Rebrickable-valid IDs
# ═════════════════════════════════════════════════════════════════════════════


class TestPartVariantResolution:
    """Verify that AI-generated part numbers map to real Rebrickable entries.

    Many common LEGO parts exist only with letter suffixes on Rebrickable
    (e.g. 3040b, 3069b). The pipeline should either produce valid IDs
    directly, or the downstream enrichment layer should resolve them.
    """

    async def test_generated_parts_have_valid_numbers(self):
        """At least 60% of generated part numbers should be real Rebrickable IDs
        or resolvable via known variant suffixes."""
        moc = MOCS[0]
        _, parts = await extract(moc)
        assert len(parts) > 0, "Pipeline produced no parts"

        all_known = set(PARTS_CATALOG_NUMS)
        # Also accept variant forms
        for base, variants in VARIANT_PARTS.items():
            all_known.add(base)
            all_known.update(variants)

        matched = sum(
            1
            for p in parts
            if p.get("partNum", "") in all_known
            or any(f"{p.get('partNum', '')}{s}" in all_known for s in ["a", "b", "c"])
        )
        ratio = matched / len(parts)
        assert ratio >= 0.6, (
            f"Only {matched}/{len(parts)} ({ratio:.0%}) parts matched known IDs"
        )

    async def test_castle_parts_category_appropriate(self):
        """Castle MOC should include wall/arch/slope parts, not mainly Technic."""
        moc = MOCS[1]
        _, parts = await extract(moc)
        part_names = " ".join(p.get("name", "") for p in parts).lower()
        castle_terms = ["brick", "plate", "slope", "arch", "tile", "wall"]
        technic_terms = ["gear", "axle", "pin", "beam"]
        castle_hits = sum(1 for t in castle_terms if t in part_names)
        technic_hits = sum(1 for t in technic_terms if t in part_names)
        assert castle_hits > technic_hits, (
            f"Castle MOC has more Technic terms ({technic_hits}) than castle terms ({castle_hits})"
        )

    async def test_technic_parts_category_appropriate(self):
        """Technic MOC should include gears/pins/axles, not mainly bricks."""
        moc = MOCS[2]
        _, parts = await extract(moc)
        part_names = " ".join(p.get("name", "") for p in parts).lower()
        technic_terms = ["gear", "axle", "pin", "beam", "bush", "technic"]
        technic_hits = sum(1 for t in technic_terms if t in part_names)
        assert technic_hits >= 2, (
            f"Technic MOC has too few Technic terms ({technic_hits})"
        )


# ═════════════════════════════════════════════════════════════════════════════
# 7. Image Enrichment — parts should get valid Rebrickable CDN image URLs
# ═════════════════════════════════════════════════════════════════════════════


class TestImageEnrichment:
    """Verify that extracted parts can be enriched with Rebrickable images."""

    async def test_image_urls_are_rebrickable_cdn(self):
        """build_image_output_str should produce valid CDN-pattern URLs."""
        moc = MOCS[0]
        _, parts = await extract(moc)
        image_output = build_image_output_str(parts)
        # Should contain at least some image placeholders
        assert has_images(image_output), (
            "No image placeholders found — part_img helper may be broken"
        )

    async def test_part_images_use_correct_format(self):
        """Each part_img() call should produce a rebrickable.com media URL."""
        test_nums = ["3001", "3004", "2780"]
        for num in test_nums:
            img = part_img(num)
            assert "rebrickable.com/media/parts" in img.url, (
                f"part_img({num}) URL doesn't point to Rebrickable CDN: {img.url}"
            )

    async def test_moc_parts_have_color_variety(self):
        """AI-generated parts should include at least 3 distinct colors."""
        moc = MOCS[0]
        _, parts = await extract(moc)
        colors = {p.get("color", "Any") for p in parts}
        assert len(colors) >= 3, (
            f"Only {len(colors)} distinct colors: {colors}"
        )


# ═════════════════════════════════════════════════════════════════════════════
# Standalone runner — deepeval.evaluate() produces an HTML report
# ═════════════════════════════════════════════════════════════════════════════


async def _build_all_test_cases() -> list[LLMTestCase]:
    """Build text + image-annotated cases for each MOC."""
    cases: list[LLMTestCase] = []
    for moc in MOCS:
        output_text, parts = await extract(moc)
        image_output = build_image_output_str(parts)

        # Text case (G-Eval + RAG metrics)
        cases.append(
            LLMTestCase(
                name=f"text_{moc['moc_id']}",
                input=f"Extract LEGO parts for {moc.get('moc_name') or moc['moc_id']}",
                actual_output=output_text,
                retrieval_context=PARTS_CATALOG,
            )
        )

        # Image-annotated case (image metrics)
        if has_images(image_output):
            cases.append(
                LLMTestCase(
                    name=f"image_{moc['moc_id']}",
                    input=f"I want to build {moc.get('moc_name') or moc['moc_id']}. What parts?",
                    actual_output=image_output,
                    multimodal=True,
                )
            )

    return cases


def main() -> None:
    """Run the full evaluate() suite and print a summary report."""
    test_cases = asyncio.run(_build_all_test_cases())
    metrics: list = [
        geval_metric(),
        AnswerRelevancyMetric(model=judge, threshold=0.5),
        FaithfulnessMetric(model=judge, threshold=0.3),
    ]
    mm = _multimodal_judge()
    if mm:
        metrics += [
            ImageCoherenceMetric(model=mm, threshold=0.4),
            ImageReferenceMetric(model=mm, threshold=0.4),
            ImageHelpfulnessMetric(model=mm, threshold=0.4),
        ]
    else:
        print("⚠ Skipping multimodal metrics (no ANTHROPIC_API_KEY)")
    evaluate(
        test_cases=test_cases,
        metrics=metrics,
        run_async=True,
        show_indicator=True,
    )


if __name__ == "__main__":
    main()
