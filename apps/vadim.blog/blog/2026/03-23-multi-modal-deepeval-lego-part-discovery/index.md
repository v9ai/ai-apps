---
slug: multi-modal-deepeval-lego-part-discovery
title: "Multi-Modal Evaluation for AI-Generated LEGO Parts: A Production DeepEval Pipeline"
description: "How we evaluate an AI pipeline that extracts LEGO parts lists from MOC builds — using DeepEval's image coherence, reference accuracy, and helpfulness metrics with a custom DeepSeek judge, all wired through LangGraph."
date: 2026-03-23
authors: [v9ai]
tags:
  - deepeval
  - langgraph
  - multi-modal
  - lego
  - evaluation
  - deepseek
---

Your AI pipeline generates a parts list for a LEGO castle MOC. It says you need 12x "Brick 2 x 4" in Light Bluish Gray, 8x "Arch 1 x 4" in Dark Tan, and 4x "Slope 45 2 x 1" in Sand Green. The text looks plausible. But does the part image next to "Arch 1 x 4" actually show an arch? Does the quantity make sense for a castle build? Would this list genuinely help someone source bricks for the build?

These are multi-modal evaluation questions — they span text accuracy, image-text coherence, and practical usefulness. Standard unit tests cannot answer them. This article walks through a production evaluation pipeline built with [DeepEval](https://github.com/confident-ai/deepeval) that evaluates AI-generated LEGO parts lists across five axes, using image metrics that most teams haven't touched yet.

The system is real. It runs in Bricks, a LEGO MOC discovery platform built with Next.js 19, LangGraph, and Neon PostgreSQL. The evaluation judge is DeepSeek — not GPT-4o — because you don't need a frontier model to grade your outputs.

<!-- truncate -->

## Architecture Overview

The system has two halves: a **generation pipeline** that produces parts lists, and an **evaluation pipeline** that grades them. Both use the same LLM provider (DeepSeek) but at different temperatures — 0.2 for generation, 0.0 for evaluation.

```
                    Generation                         Evaluation
                    ──────────                         ──────────
  MOC ID ──→ [infer_build_type] ──→ build category
                    │                                  ┌─ G-Eval (text)
                    ▼                                  ├─ ImageCoherence
             [generate_parts] ──→ parts list ────────→ ├─ ImageReference
                    │              + images             ├─ ImageHelpfulness
                    ▼                                  ├─ AnswerRelevancy
             [validate_parts] ──→ final output         └─ Faithfulness (RAG)
                    │
                    ▼
              Next.js API ──→ PartsEditor UI
```

The generation pipeline is a compiled LangGraph `StateGraph`. The evaluation pipeline is a DeepEval test suite that runs the generation pipeline as a black box and measures the output across five axes. They share no state — evaluation treats the graph as an opaque function from MOC metadata to parts list.

## The Pipeline Under Test: Three-Step LEGO Part Extraction

Before evaluating, you need something to evaluate. The `moc_parts_graph` is a [LangGraph](https://langchain-ai.github.io/langgraph/) pipeline that takes a MOC (My Own Creation) identifier and produces a structured parts list. Three nodes, no external API calls:

```python
from langgraph.graph import END, START, StateGraph

class MocPartsState(TypedDict, total=False):
    moc_id: str
    moc_name: str
    designer: str
    image_url: str | None
    build_type: str       # "castle", "technic", "spaceship", ...
    build_notes: str      # colors, sub-assemblies, scale
    parts: list[dict]     # the output
    source: str
    error: str | None

def create_moc_parts_graph():
    builder = StateGraph(MocPartsState)
    builder.add_node("infer_build_type", infer_build_type)
    builder.add_node("generate_parts", generate_parts)
    builder.add_node("validate_parts", validate_parts)

    builder.add_edge(START, "infer_build_type")
    builder.add_edge("infer_build_type", "generate_parts")
    builder.add_edge("generate_parts", "validate_parts")
    builder.add_edge("validate_parts", END)

    return builder.compile()
```

**Node 1: `infer_build_type`** classifies the MOC from its name, designer, and image URL. The LLM returns structured JSON:

```json
{
  "build_type": "castle",
  "dominant_colors": ["Light Bluish Gray", "Dark Tan", "Sand Green"],
  "sub_assemblies": ["crenellated walls", "gatehouse", "tower"],
  "scale": "minifig",
  "notes": "Medieval fortress with modular wall sections..."
}
```

The `build_type` maps to one of 12 categories (castle, vehicle, spaceship, technic, mech, train, building, animal, city, pirate, modular, other). Everything else feeds into `build_notes` — a string that carries context to the next node.

**Node 2: `generate_parts`** is where the AI grounding happens. Instead of letting the LLM hallucinate part numbers, we constrain it with category-specific part pools — 140+ lines of real LEGO element numbers:

```python
_PART_HINTS: dict[str, str] = {
    "castle": (
        "Common castle parts: 3001 (Brick 2x4), 3004 (Brick 1x2), "
        "3005 (Brick 1x1), 3010 (Brick 1x4), 3009 (Brick 1x6), "
        "2357 (Brick 2x2 Corner), 3039 (Slope 45 2x2), "
        "3040 (Slope 45 2x1), 3659 (Arch 1x4), 6005 (Arch 1x3 Curved), "
        "3023 (Plate 1x2), 3020 (Plate 2x4), 3460 (Plate 1x8), "
        "3069b (Tile 1x2), 2412b (Tile 1x2 Grille), "
        "4589 (Cone 1x1), 30374 (Bar 4L). "
        "Dominant colors: Light Bluish Gray, Dark Bluish Gray, Tan, "
        "Dark Tan, Sand Green."
    ),
    "technic": (
        "Common Technic parts: 3713 (Bush), 32054 (Pin 3L), "
        "2780 (Pin), 6558 (Pin 3L with Friction), "
        "3648 (Gear 24T), 3647 (Gear 8T), "
        "32316 (Beam 5), 32524 (Beam 7), ..."
    ),
    # ... 10 more categories
}
```

The prompt constrains the LLM explicitly:

```python
"Generate a precise LEGO parts list (25-40 unique elements) for this MOC.\n"
"Rules:\n"
"- ONLY use part numbers from the hints above\n"
"- Match colors to the dominant colors in build context\n"
"- Structural parts: 6-20x, detail parts: 2-6x, accent parts: 1-3x\n"
"- Include bricks, plates, slopes, and tiles appropriate to the build type\n"
"- Vary the mix: avoid listing the same part number twice\n"
```

The output is 25-40 unique elements with realistic quantities, returned as structured JSON.

**Node 3: `validate_parts`** deduplicates by `(partNum, color)` and filters empty entries. Simple, deterministic, no LLM call.

A natural question: why not use a vision model to identify parts directly from the MOC image? Because vision models hallucinate part numbers. They can describe what they see — "grey bricks, arched doorway, crenellated wall" — but they cannot reliably map visual elements to the specific alphanumeric IDs that the LEGO ecosystem runs on (BrickLink, Rebrickable, building instructions). The `_PART_HINTS` approach trades visual precision for catalog grounding: the LLM picks from a curated pool of real parts rather than inventing plausible-looking codes.

The question is: how good is this output? Unit tests can verify the schema (every part has a `partNum`, `name`, `color`, `qty`). But they cannot tell you whether 12x "Brick 2 x 4" is realistic for a castle, or whether the Rebrickable CDN image for part 3001 actually shows a 2x4 brick. That's where DeepEval comes in.

## The Custom Judge: DeepSeek Instead of GPT-4o

Every DeepEval metric needs a judge model. The default is GPT-4o. We use DeepSeek-chat at temperature 0.0 — it's cheaper, it's fast, and for structured evaluation tasks it performs comparably:

```python
from deepeval.models import DeepEvalBaseLLM
from langchain_openai import ChatOpenAI

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

    def generate(self, prompt: str, schema=None) -> tuple[str, float]:
        llm = self.load_model()
        if schema:
            resp = llm.with_structured_output(
                schema, method="json_mode"
            ).invoke(prompt)
            return resp.model_dump_json(), 0.0
        return llm.invoke(prompt).content, 0.0

    async def a_generate(self, prompt: str, schema=None) -> tuple[str, float]:
        llm = self.load_model()
        if schema:
            resp = await llm.with_structured_output(
                schema, method="json_mode"
            ).ainvoke(prompt)
            return resp.model_dump_json(), 0.0
        return (await llm.ainvoke(prompt)).content, 0.0

judge = DeepSeekJudge()
```

The key design choice: `DeepEvalBaseLLM` requires both `generate` and `a_generate`. The async variant matters because `deepeval.evaluate()` runs metrics concurrently. Without it, your evaluation suite serializes every metric call.

Both methods support `schema` — a Pydantic model that DeepEval passes when it needs structured JSON output from the judge (e.g., for G-Eval scoring). We route these through `json_mode` on the LangChain wrapper.

## Five Evaluation Axes: Text, Image, and RAG

The evaluation suite spans three modalities: pure text evaluation (G-Eval), multi-modal image+text evaluation (three image metrics), and RAG grounding (faithfulness against a parts catalog).

### Axis 1: G-Eval — Are These Parts Structurally Plausible?

[G-Eval](https://docs.confident-ai.com/docs/metrics-g-eval) defines custom evaluation criteria as natural language steps. The judge model scores the output against each step independently, then produces a composite score:

```python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

def geval_metric() -> GEval:
    return GEval(
        name="LEGO Part Detection Accuracy",
        model=judge,
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        evaluation_steps=[
            "Check that each part entry has a real LEGO part number "
            "(numeric or alphanumeric: 3001, 3069b, 4265c). "
            "Penalise heavily for invented or placeholder IDs "
            "like '0000' or 'unknown'.",

            "Check that each part specifies a real LEGO color "
            "('Red', 'Black', 'Light Bluish Gray', 'Dark Tan'). "
            "Penalise if all parts share the same single generic "
            "color with no variety.",

            "Check that quantities are positive integers plausible "
            "for the build type: a castle MOC needs many "
            "plates/bricks; a Technic car needs many pins/gears.",

            "Check that part types match the MOC context: "
            "a castle should have wall plates, arches, slopes; "
            "a Technic car should have gears, axles, pins, beams.",

            "Award full marks only if there are >= 10 distinct parts "
            "with plausible real part numbers, varied realistic "
            "colors, and contextually appropriate part categories.",
        ],
        threshold=0.55,
    )
```

This is domain-specific evaluation logic that no generic metric captures. The five steps encode LEGO builder knowledge: real part numbers are alphanumeric (3069b, 4265c), not round numbers; LEGO colors have official names ("Light Bluish Gray", not "grey"); and castle builds need different parts than Technic cars.

The threshold is 0.55 — deliberately moderate. The AI is generating approximate parts lists, not exact bills of materials. We want to catch gross failures (all placeholder IDs, monochrome color scheme, wrong part categories) while accepting reasonable approximations.

### Axes 2-4: Multi-Modal Image Metrics

This is where DeepEval's image evaluation capabilities come in. The framework supports three image-specific metrics, and we use all of them.

The trick is how images get embedded into `LLMTestCase`. DeepEval requires `actual_output` to be a string, but image metrics need actual images. The solution: `MLLMImage` objects that serialize into inline placeholders:

```python
from deepeval.test_case import MLLMImage

def part_img(part_num: str) -> MLLMImage:
    return MLLMImage(
        url=f"https://rebrickable.com/media/parts/elements/{part_num}.jpg",
        local=False,
    )

def build_image_output_str(parts: list[dict], max_parts: int = 8) -> str:
    segments: list[str] = []
    for p in parts[:max_parts]:
        part_num = str(p.get("partNum", ""))
        name = p.get("name", "unknown part")
        color = p.get("color", "Any")
        qty = p.get("qty", 1)
        img = part_img(part_num) if part_num else None
        if img:
            # f"{img}" triggers MLLMImage.__format__
            # → "[DEEPEVAL:IMAGE:<id>]"
            segments.append(
                f"{name} ({color}) x{qty}\n"
                f"{img}\n"
                f"Part number: {part_num}"
            )
        else:
            segments.append(f"{name} ({color}) x{qty}")
    return "\n\n".join(segments)
```

When you write `f"{img}"`, Python calls `MLLMImage.__format__`, which returns `[DEEPEVAL:IMAGE:<id>]`. The metric internally calls `convert_to_multi_modal_array` to parse these placeholders back into image objects. The text context above and below each placeholder is what the metric uses for coherence evaluation.

The structure matters: name and color appear _above_ the image, part number appears _below_. This gives each image metric surrounding context to evaluate against.

**ImageCoherenceMetric** — Does each part image match its surrounding text labels?

```python
from deepeval.metrics import ImageCoherenceMetric

tc = LLMTestCase(
    input=f"LEGO parts list for {moc['moc_id']}",
    actual_output=image_output,
    multimodal=True,  # required for image metrics
)
metric = ImageCoherenceMetric(model=judge, threshold=0.4)
metric.measure(tc)
```

This catches the case where the text says "Arch 1 x 4" but the image shows a flat plate — a mismatch between what the AI claims and what the Rebrickable CDN actually serves for that part number.

**ImageReferenceMetric** — Is each part image accurately described by the text?

This is the inverse direction: given the image, does the text accurately reference what's in it? If the image shows a 2x4 brick and the text says "Slope 45 2 x 1", that's a reference failure.

**ImageHelpfulnessMetric** — Would this parts list with images genuinely help someone build the MOC?

This is the highest-level evaluation. A list could be coherent and accurately referenced but still unhelpful — for instance, if it only shows decorative elements and omits all structural bricks. The helpfulness metric judges the practical utility of the complete output.

All three image metrics use a threshold of 0.4. Lower than G-Eval's 0.55 because image evaluation is inherently noisier — CDN images vary in angle and lighting, and the judge model's vision capabilities add another layer of approximation.

The test classes follow a consistent pattern — run the pipeline, build the image-annotated string, skip if no images are available (graceful degradation), then measure:

```python
class TestImageCoherence:
    """Each part image should be coherent with its text labels."""

    async def test_moc_255784_part_images_coherent(self):
        moc = MOCS[0]
        _, parts = await extract(moc)
        image_output = build_image_output_str(parts)
        if not has_images(image_output):
            pytest.skip("No part images available")

        tc = LLMTestCase(
            input=f"LEGO parts list for {moc['moc_id']}",
            actual_output=image_output,
            multimodal=True,
        )
        metric = ImageCoherenceMetric(model=judge, threshold=0.4)
        metric.measure(tc)
        assert metric.score >= metric.threshold, (
            f"ImageCoherence {metric.score:.2f}: {metric.reason}"
        )
```

The `has_images()` check is a simple string search for `[DEEPEVAL:IMAGE:` — if the Rebrickable CDN didn't return images for any parts, the test skips rather than failing on a missing-data edge case. The assertion message includes both the numeric score and the judge's natural language reason, which makes debugging failures straightforward.

### Axis 5: RAG Metrics Against a LEGO Parts Catalog

The final axis treats the parts list as a RAG output, with a curated LEGO parts catalog as the retrieval context:

```python
PARTS_CATALOG = [
    "3001 — Brick 2 x 4 — Red, Blue, Yellow, Black, White, "
    "Light Bluish Gray, Dark Green",
    "3004 — Brick 1 x 2 — available in most standard colors",
    "3023 — Plate 1 x 2 — available in most standard colors",
    "2780 — Technic Pin with Friction Ridges — Black only",
    "6558 — Technic Pin 3L with Friction Ridges — Black, Blue",
    "3648 — Gear 24 Tooth — Light Bluish Gray, Tan",
    # ... 14 entries total
]
```

Two metrics evaluate against this context:

**AnswerRelevancyMetric** (threshold 0.5) — Is the output relevant to the query "What LEGO parts do I need to build this MOC?" A parts list that includes non-LEGO items or irrelevant commentary would score low.

**FaithfulnessMetric** (threshold 0.3) — Are the claims in the output grounded in the catalog? This is deliberately the lowest threshold. The AI generates approximate parts — many valid LEGO parts aren't in our 14-entry catalog, so we expect partial overlap, not full grounding. A score of 0.3 catches outputs that are completely ungrounded (invented part numbers, fictional colors) while accepting the inherent gap between a small catalog and the full LEGO element universe.

```python
tc = LLMTestCase(
    input=f"List LEGO parts for {moc['moc_id']}",
    actual_output=output_text,
    retrieval_context=PARTS_CATALOG,
)
metric = FaithfulnessMetric(
    model=judge, threshold=0.3, include_reason=True
)
```

## Test Cases: Three MOCs, Three Build Categories

The evaluation runs against three MOCs that cover distinct build categories:

```python
MOCS = [
    {"moc_id": "MOC-255784", "moc_name": "", "designer": ""},
    {"moc_id": "MOC-10000", "moc_name": "Mini Castle",
     "designer": "CastleBuilder"},
    {"moc_id": "MOC-20000", "moc_name": "Technic Race Car",
     "designer": "TechnicFan"},
]
```

MOC-255784 is the primary target — minimal metadata, forcing the pipeline to infer everything from the MOC ID and image URL. The castle and Technic car have explicit names, testing whether the pipeline correctly adapts its part selection to radically different build categories.

The pipeline runner invokes the full LangGraph graph asynchronously:

```python
async def extract(moc: dict) -> tuple[str, list[dict]]:
    result = await moc_parts_graph.ainvoke({
        "moc_id": moc["moc_id"],
        "moc_name": moc.get("moc_name") or moc["moc_id"],
        "designer": moc.get("designer") or "Unknown",
        "image_url": f"{REBRICKABLE_CDN}/mocs/"
                     f"{moc['moc_id'].lower()}.jpg",
    })
    parts = result.get("parts", [])
    source = result.get("source", "unknown")
    lines = [f"Source: {source}",
             f"Parts extracted: {len(parts)}", ""]
    for p in parts:
        lines.append(
            f"- Part {p.get('partNum', '?')}: "
            f"{p.get('name', '?')} "
            f"({p.get('color', '?')}) x{p.get('qty', 1)}"
        )
    return "\n".join(lines), parts
```

## Running the Suite: pytest and Standalone

The evaluation suite requires `deepeval`, `langchain-openai`, and a `DEEPSEEK_API_KEY` environment variable. The key dependencies from `pyproject.toml`:

```toml
[project]
dependencies = [
    "langgraph>=0.4",
    "langchain-openai>=0.3",
    "deepeval>=3.9",
]
```

The test classes are organized by metric axis. Each class contains tests for multiple MOCs:

```bash
# Run via pytest
cd backend && uv run pytest tests/test_moc_parts_deepeval.py -v

# Standalone with HTML report
cd backend && uv run python tests/test_moc_parts_deepeval.py
```

The standalone runner builds both text-only and image-annotated test cases for each MOC. The distinction matters — text metrics (G-Eval, AnswerRelevancy, Faithfulness) operate on the plain text output, while image metrics need the `MLLMImage`-embedded string:

```python
async def _build_all_test_cases() -> list[LLMTestCase]:
    cases: list[LLMTestCase] = []
    for moc in MOCS:
        output_text, parts = await extract(moc)
        image_output = build_image_output_str(parts)

        # Text case (G-Eval + RAG metrics)
        cases.append(LLMTestCase(
            name=f"text_{moc['moc_id']}",
            input=f"Extract LEGO parts for "
                  f"{moc.get('moc_name') or moc['moc_id']}",
            actual_output=output_text,
            retrieval_context=PARTS_CATALOG,
        ))

        # Image case (image metrics) — only if images exist
        if has_images(image_output):
            cases.append(LLMTestCase(
                name=f"image_{moc['moc_id']}",
                input=f"I want to build "
                      f"{moc.get('moc_name') or moc['moc_id']}. "
                      f"What parts?",
                actual_output=image_output,
                multimodal=True,
            ))
    return cases
```

Then the full metric suite runs across all cases:

```python
def main() -> None:
    test_cases = asyncio.run(_build_all_test_cases())
    evaluate(
        test_cases=test_cases,
        metrics=[
            geval_metric(),
            AnswerRelevancyMetric(model=judge, threshold=0.5),
            FaithfulnessMetric(model=judge, threshold=0.3),
            ImageCoherenceMetric(model=judge, threshold=0.4),
            ImageReferenceMetric(model=judge, threshold=0.4),
            ImageHelpfulnessMetric(model=judge, threshold=0.4),
        ],
        run_async=True,
        show_indicator=True,
    )
```

The `run_async=True` flag is critical — it runs all metric evaluations concurrently, cutting wall-clock time from minutes to seconds when you have 6 metrics across 3+ MOCs.

## From Evaluation to Production: The Frontend Loop

Evaluation doesn't exist in isolation. The pipeline feeds a production UI where users interact with AI-generated parts lists.

The `PartsEditor` React component renders extracted parts with images, quantities, and inline editing. When a user clicks "Extract Parts with AI", it hits a Next.js API route:

```typescript
// POST /api/favorites/[mocId]/extract-parts
const result = await runGraphAndWait("moc_parts", {
  moc_id: mocId,
  moc_name: row.name,
  designer: row.designer,
  image_url: `https://cdn.rebrickable.com/media/mocs/${mocId}.jpg`,
});

// Enrich parts with Rebrickable images (parallel, best-effort)
const parts = await Promise.all(
  rawParts.map(async (p) => {
    if (p.imageUrl) return p;
    const imgUrl = await fetchPartImage(p.partNum);
    return imgUrl ? { ...p, imageUrl: imgUrl } : p;
  })
);
```

The enrichment step is what makes the image metrics meaningful. After the LangGraph pipeline generates part numbers, the API route fetches actual part images from Rebrickable's CDN. These are the same images the evaluation suite tests for coherence — ensuring that what users see in the UI is what the evaluation validated.

The frontend also does lazy enrichment: parts that arrive without images get backfilled asynchronously via the Rebrickable API, then saved to the database without blocking the UI.

## Failure Modes the Suite Catches

Abstract metrics become concrete when you see what they reject. Here are real failure patterns each axis is designed to catch:

**G-Eval rejects: the "grey brick" monoculture.** Without color diversity constraints, the LLM defaults to generating 30 variants of "Light Bluish Gray" with no Dark Tan, Sand Green, or Reddish Brown accents. A castle MOC that's entirely one shade of grey fails the color variety step. The G-Eval criteria require varied realistic colors — a proxy for the builder's expectation that a parts list reflects the visual design of the MOC, not a warehouse order of generic bricks.

**ImageCoherence rejects: the part number / image mismatch.** Part number `3069b` is "Tile 1 x 2 with Groove." But Rebrickable's CDN occasionally serves a variant image — a printed tile, a different angle, or a color-specific render that doesn't visually match a generic "tile" description. When the text says "Tile 1 x 2 with Groove (Dark Tan)" and the image shows a blue printed tile, ImageCoherence scores drop. This is a real-world CDN inconsistency that text-only evaluation would never catch.

**ImageHelpfulness rejects: the decorative-only list.** If the pipeline generates a castle parts list with 25 decorative elements (flowers, flags, cones) and zero structural bricks (2x4, 1x4, plates), the list is coherent and accurately referenced — every image matches its label — but practically useless for building. ImageHelpfulness is the only metric that penalizes this failure.

**Faithfulness rejects: the plausible-but-invented part.** The LLM occasionally generates part numbers that look valid but aren't in the catalog: `3069c` instead of `3069b`, or `3042` (not a real LEGO element). These pass G-Eval because the format is correct and the name is plausible. But FaithfulnessMetric checks whether claims are grounded in the retrieval context — the parts catalog — and flags ungrounded entries.

## What We Learned

Here's the complete threshold map for reference:

| Metric | Threshold | What It Catches |
|---|---|---|
| G-Eval (custom) | 0.55 | Placeholder IDs, monochrome colors, wrong part categories |
| ImageCoherence | 0.40 | Image/text mismatches (arch label, plate image) |
| ImageReference | 0.40 | Inaccurate text descriptions of visible parts |
| ImageHelpfulness | 0.40 | Incomplete or impractical parts lists |
| AnswerRelevancy | 0.50 | Off-topic or non-LEGO output |
| Faithfulness | 0.30 | Completely ungrounded claims (fictional parts/colors) |

**Threshold calibration is domain-specific.** These thresholds weren't arbitrary — they came from running the suite against known-good and known-bad outputs and finding the cut points that catch real failures without flagging acceptable approximations.

**Image metrics catch failures text metrics miss.** A parts list can score perfectly on G-Eval (plausible part numbers, varied colors, correct categories) while failing ImageCoherence because the CDN serves a different part variant for that number. The multi-modal layer adds a ground-truth check that pure text evaluation cannot provide.

**DeepSeek as judge works.** At temperature 0.0 with structured output, DeepSeek-chat produces consistent, well-calibrated evaluation scores. The cost savings over GPT-4o are significant when you're running 6 metrics across multiple test cases in CI.

**Part hints are the real grounding mechanism.** The `_PART_HINTS` dictionary does more for output quality than any prompt engineering trick. By constraining the LLM to a curated pool of real part numbers per category, we eliminate the most common failure mode — hallucinated part numbers — before evaluation even runs.

**The evaluation suite is the specification.** The five axes define what "good" means for this system: structurally plausible parts (G-Eval), visually coherent images (ImageCoherence), accurately described images (ImageReference), practically helpful output (ImageHelpfulness), and grounded claims (Faithfulness). Any change to the pipeline that degrades these metrics is a regression, full stop.

## Adapt This to Your Domain

The LEGO domain is specific, but the evaluation pattern generalizes. If your AI pipeline produces multi-modal output — text paired with images, diagrams, or visual references — the same five-axis structure applies:

1. **G-Eval with domain criteria.** Replace LEGO part numbers with your domain's structured identifiers (ICD-10 codes, SKU numbers, chemical formulas). Write evaluation steps that encode expert knowledge about what "plausible" looks like in your field.

2. **Image metrics for visual output.** Any system that generates or references images alongside text — product catalogs, medical imaging reports, architectural plans — benefits from coherence and reference checks. The `MLLMImage` embedding pattern works with any image URL.

3. **RAG faithfulness against your catalog.** Replace `PARTS_CATALOG` with your canonical reference data. Set the faithfulness threshold based on how much of your catalog the AI is expected to cover — 0.3 for approximate outputs, 0.7+ for exact lookups.

4. **Custom judge economics.** The `DeepEvalBaseLLM` interface takes 30 lines of code. Any OpenAI-compatible API (DeepSeek, Mistral, local models via Ollama) can serve as judge. Match the judge model to your evaluation budget, not your generation model.

The full evaluation pipeline runs in under two minutes with DeepSeek as judge. It catches the failures that unit tests miss — the hallucinated identifier that looks valid, the mismatched image that users would notice, the output that's coherent but useless. If your AI pipeline produces multi-modal output, evaluate it multi-modally.
