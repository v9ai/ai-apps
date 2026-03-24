"""CLI entrypoint — generates static places.json for the frontend."""

import asyncio
import json
import time
from pathlib import Path

from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)
# Also try the app-root .env.local
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env.local")

from travel_agent.graph import graph

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "data"


async def run():
    print("Generating Katowice travel guide...")
    print("Pipeline: research_city + discover_places -> enrich_with_maps -> save")
    print()

    t0 = time.time()
    result = await graph.ainvoke({
        "city": "Katowice",
        "num_places": 10,
    })
    elapsed = time.time() - t0

    output = {
        "city": "Katowice",
        "city_overview": result.get("city_overview", ""),
        "places": result.get("places_with_maps", []),
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / "places.json"
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))

    num_places = len(output["places"])
    print(f"Done! {num_places} places generated in {elapsed:.0f}s")
    print(f"Written to {out_path}")


def main():
    asyncio.run(run())


if __name__ == "__main__":
    main()
