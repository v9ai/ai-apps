"""CLI entrypoint — generates static places.json for the frontend."""

import asyncio
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

# Load shared .env from monorepo root
_root = Path(__file__).resolve().parent.parent.parent.parent.parent
load_dotenv(_root / ".env")

from travel_agent.graph import graph, close_client, _get_client

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "data"


async def run():
    print("Generating Katowice travel guide...")
    print("Pipeline: research_city + discover_places -> enrich_with_maps -> rank_places + translate_to_romanian + generate_seo + booking -> save")
    print()

    try:
        t0 = time.time()
        result = await graph.ainvoke({
            "city": "Katowice",
            "num_places": 10,
        })
        elapsed = time.time() - t0

        # Merge booking data into translated places
        translated = result.get("places_translated", result.get("places_with_maps", []))
        booking_places = result.get("places_with_booking", [])
        booking_by_name = {p["name"]: p.get("booking", {}) for p in booking_places}
        places_final = []
        for p in translated:
            places_final.append({
                **p,
                "booking": booking_by_name.get(p.get("name", ""), {}),
            })

        output = {
            "city": "Katowice",
            "city_overview": result.get("city_overview", ""),
            "city_overview_ro": result.get("city_overview_ro", ""),
            "places": places_final,
            "rankings": result.get("rankings", {}),
            "seo": result.get("seo_metadata", {}),
            "booking_summary": result.get("booking_summary", {}),
        }

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        out_path = OUTPUT_DIR / "places.json"
        out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))

        num_places = len(output["places"])
        has_ro = bool(output.get("city_overview_ro"))
        print(f"Done! {num_places} places generated in {elapsed:.0f}s")
        has_rankings = bool(output.get("rankings"))
        has_seo = bool(output.get("seo"))
        has_booking = bool(output.get("booking_summary"))
        print(f"Romanian translation: {'yes' if has_ro else 'no'}")
        print(f"Rankings: {'yes' if has_rankings else 'no'}")
        print(f"SEO metadata: {'yes' if has_seo else 'no'}")
        print(f"Booking info: {'yes' if has_booking else 'no'}")
        print(f"Written to {out_path}")
    finally:
        await close_client()


async def run_seo():
    """Run only the SEO node against existing places.json."""
    from travel_agent.seo import generate_seo

    data_path = OUTPUT_DIR / "places.json"
    if not data_path.exists():
        print(f"Error: {data_path} not found. Run the full pipeline first.")
        sys.exit(1)

    data = json.loads(data_path.read_text())
    state = {
        "city": data.get("city", "Katowice"),
        "city_overview": data.get("city_overview", ""),
        "places_with_maps": data.get("places", []),
    }

    print(f"Running SEO node for {state['city']} ({len(state['places_with_maps'])} places)...")
    try:
        t0 = time.time()
        result = await generate_seo(state, get_client=_get_client)
        elapsed = time.time() - t0

        data["seo"] = result["seo_metadata"]
        data_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))

        print(f"Done in {elapsed:.0f}s")
        print(json.dumps(result["seo_metadata"], indent=2, ensure_ascii=False))
        print(f"Written to {data_path}")
    finally:
        await close_client()


def main():
    if "--eval" in sys.argv:
        from travel_agent.evals import main as eval_main
        eval_main()
    elif "--seo" in sys.argv:
        asyncio.run(run_seo())
    else:
        asyncio.run(run())


if __name__ == "__main__":
    main()
