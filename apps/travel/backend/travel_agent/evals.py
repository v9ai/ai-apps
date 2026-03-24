"""
Evals for the travel guide pipeline.

Run:
    python -m travel_agent.cli --eval
    python -m travel_agent.cli --eval --unit-only   (deterministic checks only, no LLM)

Three phases:
1. Hard assertions — deterministic checks on discover_places output
   (coordinates in city bounds, valid categories, required fields, no markdown)
2. deepeval GEval — LLM-judged place accuracy (real venues, currently open,
   actually in the correct city)
"""

from dotenv import load_dotenv

load_dotenv()

import asyncio
import json
import os
import re
import sys
from pathlib import Path

from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from langchain_openai import ChatOpenAI

from .graph import graph, close_client

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_CATEGORIES = {"culture", "nature", "food", "nightlife", "architecture", "history", "entertainment"}

REQUIRED_PLACE_FIELDS = {"name", "description", "category", "address", "lat", "lng", "rating"}

# Katowice bounding box (generous — covers Nikiszowiec to Silesian Park)
KATOWICE_BOUNDS = {
    "lat_min": 50.20,
    "lat_max": 50.32,
    "lng_min": 18.92,
    "lng_max": 19.15,
}

_MARKDOWN_RE = re.compile(r"(\*\*|__|\*|_|#{1,6}\s|```)")


# ---------------------------------------------------------------------------
# DeepSeek judge model
# ---------------------------------------------------------------------------


class DeepSeekJudge(DeepEvalBaseLLM):
    def __init__(self):
        self._model = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.0,
        )

    def load_model(self):
        return self._model

    def generate(self, prompt: str, **kwargs) -> str:
        return self._model.invoke(prompt).content

    async def a_generate(self, prompt: str, **kwargs) -> str:
        return (await self._model.ainvoke(prompt)).content

    def get_model_name(self) -> str:
        return os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


# ---------------------------------------------------------------------------
# Phase 1: Hard assertions (deterministic, no LLM)
# ---------------------------------------------------------------------------


def _assert_required_fields(place: dict, label: str):
    missing = REQUIRED_PLACE_FIELDS - set(place.keys())
    assert not missing, f"[{label}] Missing fields: {missing}"


def _assert_valid_category(place: dict, label: str):
    cat = place.get("category", "")
    assert cat in VALID_CATEGORIES, (
        f"[{label}] Invalid category '{cat}'. Must be one of: {VALID_CATEGORIES}"
    )


def _assert_coords_in_bounds(place: dict, label: str):
    b = KATOWICE_BOUNDS
    lat, lng = place.get("lat", 0), place.get("lng", 0)
    assert b["lat_min"] <= lat <= b["lat_max"], (
        f"[{label}] Latitude {lat} out of Katowice bounds [{b['lat_min']}, {b['lat_max']}]"
    )
    assert b["lng_min"] <= lng <= b["lng_max"], (
        f"[{label}] Longitude {lng} out of Katowice bounds [{b['lng_min']}, {b['lng_max']}]"
    )


def _assert_valid_rating(place: dict, label: str):
    rating = place.get("rating", 0)
    assert 1.0 <= rating <= 5.0, f"[{label}] Rating {rating} out of range [1.0, 5.0]"


def _assert_no_markdown(place: dict, label: str):
    for field in ("description", "tips"):
        text = place.get(field, "")
        match = _MARKDOWN_RE.search(text)
        assert match is None, (
            f"[{label}] Markdown found in '{field}': '{match.group()}'\n"
            f"  Text: {text[:120]}"
        )


_VAGUE_ADDRESS_RE = re.compile(r"(various|multiple|around|throughout|across)\s", re.IGNORECASE)


def _assert_specific_address(place: dict, label: str):
    addr = place.get("address", "")
    assert not _VAGUE_ADDRESS_RE.search(addr), (
        f"[{label}] Address is not specific: '{addr}'"
    )


def _assert_address_contains_city(place: dict, label: str, city: str):
    addr = place.get("address", "")
    # Strip parenthetical notes like "(adjacent to Katowice)" before checking
    clean_addr = re.sub(r"\([^)]*\)", "", addr).strip()
    assert city.lower() in clean_addr.lower(), (
        f"[{label}] Address does not mention '{city}': {addr}"
    )


def run_hard_assertions(places: list[dict], city: str = "Katowice") -> tuple[int, int]:
    """Run deterministic checks on all places. Returns (passed, total)."""
    print("--- Phase 1: Hard Assertions ---\n")
    passed = 0
    failed = 0
    checks = [
        _assert_required_fields,
        _assert_valid_category,
        _assert_coords_in_bounds,
        _assert_valid_rating,
        _assert_no_markdown,
        _assert_specific_address,
    ]

    for i, place in enumerate(places):
        name = place.get("name", f"place-{i}")
        label = f"{i+1}. {name}"
        place_ok = True

        for check in checks:
            try:
                check(place, label)
            except AssertionError as e:
                print(f"  FAIL {e}")
                place_ok = False
                failed += 1

        # Address check needs city param
        try:
            _assert_address_contains_city(place, label, city)
        except AssertionError as e:
            print(f"  FAIL {e}")
            place_ok = False
            failed += 1

        if place_ok:
            print(f"  PASS {label}")
            passed += 1

    total = passed + failed
    print(f"\nHard assertions: {passed}/{len(places)} places passed ({failed} check failures)")
    return passed, len(places)


# ---------------------------------------------------------------------------
# Phase 2: deepeval GEval — LLM-judged place accuracy
# ---------------------------------------------------------------------------

_place_validity_metric = None


def _get_place_validity_metric():
    """Single per-place metric: is this a real, currently-open venue in the right city?"""
    global _place_validity_metric
    if _place_validity_metric is None:
        _place_validity_metric = GEval(
            name="Place Validity",
            criteria=(
                "You are evaluating a SINGLE place from a travel guide for accuracy.\n"
                "Use YOUR OWN KNOWLEDGE to verify — do NOT say 'the output does not prove it'.\n\n"
                "Check these four things using what you know about the city:\n"
                "1. REAL: Does this place actually exist? (not a made-up or hallucinated name)\n"
                "2. NOT CLOSED: Based on your knowledge, is this place still operating? "
                "Public spaces (parks, squares, monuments) and major institutions (museums, "
                "concert halls) should be assumed open unless you specifically know they closed. "
                "Only score 0 if you have concrete knowledge that the venue permanently closed.\n"
                "3. CORRECT CITY: Is the place actually in the city from the input? "
                "(e.g. Stary Browar is in Poznan not Katowice)\n"
                "4. VALID ADDRESS: Is the address plausible for that city?\n\n"
                "SCORING: 1.0 if all checks pass. 0.0 only if you know the place is "
                "fake, permanently closed, or in the wrong city."
            ),
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT,
            ],
            threshold=0.7,
            model=DeepSeekJudge(),
        )
    return _place_validity_metric


def build_deepeval_cases(places: list[dict], city: str = "Katowice") -> list[LLMTestCase]:
    """Build one deepeval test case per place for granular pass/fail."""
    cases = []
    for i, p in enumerate(places):
        name = p.get("name", f"place-{i}")
        input_text = (
            f"City: {city}, Poland\n"
            f"Verify this place is real, currently open, and in {city}."
        )
        actual_output = json.dumps(
            {
                "name": name,
                "category": p.get("category"),
                "address": p.get("address"),
                "lat": p.get("lat"),
                "lng": p.get("lng"),
                "rating": p.get("rating"),
                "description": p.get("description", "")[:200],
            },
            ensure_ascii=False,
        )
        cases.append(
            LLMTestCase(
                input=input_text,
                actual_output=actual_output,
                name=f"{i+1}. {name}",
            )
        )
    return cases


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------


def main() -> None:
    unit_only = "--unit-only" in sys.argv
    offline = "--offline" in sys.argv
    city = "Katowice"

    if offline:
        # Evaluate the existing places.json without calling the LLM pipeline
        data_path = (
            Path(__file__).resolve().parent.parent.parent / "src" / "data" / "places.json"
        )
        print(f"Offline mode — loading {data_path}\n")
        data = json.loads(data_path.read_text())
        places = data.get("places", [])
    else:
        # Run the pipeline to get fresh places
        print(f"Running discover_places pipeline for {city}...\n")

        async def _run():
            try:
                result = await graph.ainvoke({"city": city, "num_places": 10})
                return result.get("places_with_maps", result.get("places", []))
            finally:
                await close_client()

        places = asyncio.run(_run())

    print(f"Got {len(places)} places.\n")

    # Phase 1: hard assertions
    hard_passed, hard_total = run_hard_assertions(places, city)

    if unit_only:
        print("\n--unit-only: skipping deepeval LLM judge.\n")
        return

    # Phase 2: deepeval
    print("\n--- Phase 2: deepeval LLM Judge ---\n")
    cases = build_deepeval_cases(places, city)

    metric = _get_place_validity_metric()
    results = evaluate(test_cases=cases, metrics=[metric])

    # Summary
    passed_cases = sum(1 for r in results.test_results if r.success)
    print(f"\n--- Eval Summary ---")
    print(f"  Hard assertions: {hard_passed}/{hard_total} places passed")
    print(f"  Place validity (deepeval): {passed_cases}/{len(cases)} places passed")


if __name__ == "__main__":
    main()
