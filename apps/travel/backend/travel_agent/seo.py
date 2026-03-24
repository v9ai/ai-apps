"""Isolated SEO node — generates metadata, OG tags, and JSON-LD structured data."""

from __future__ import annotations

import json

from deepseek_client import ChatMessage

from .state import TravelState


async def generate_seo(state: TravelState, *, get_client) -> dict:
    """Generate SEO metadata from city overview and enriched places.

    Runs after enrich_with_maps, in parallel with rank_places and
    translate_to_romanian.
    """
    city = state.get("city", "Katowice")
    overview = state.get("city_overview", "")
    places = state.get("places_with_maps", [])

    client = get_client()

    place_names = [p.get("name", "") for p in places]
    categories = sorted({p.get("category", "") for p in places})

    resp = await client.chat(
        [
            ChatMessage(
                role="system",
                content=(
                    "You are an SEO specialist for travel websites. "
                    "Generate search-engine-optimized metadata for a city travel guide page. "
                    "Return valid JSON only. No markdown."
                ),
            ),
            ChatMessage(
                role="user",
                content=(
                    f"City: {city}, Poland\n"
                    f"Overview (first 300 chars): {overview[:300]}\n"
                    f"Places: {json.dumps(place_names, ensure_ascii=False)}\n"
                    f"Categories: {json.dumps(categories, ensure_ascii=False)}\n\n"
                    "Generate SEO metadata with these fields:\n"
                    "- title: page title (50-60 chars, include city name)\n"
                    "- description: meta description (150-160 chars, compelling, include city)\n"
                    "- keywords: list of 8-12 SEO keywords/phrases\n"
                    "- og_title: OpenGraph title (can differ slightly from title)\n"
                    "- og_description: OpenGraph description (concise, shareable)\n"
                    "- canonical_slug: URL-friendly slug for the city page\n"
                    "- h1: main heading for the page\n"
                    "- breadcrumb: list of breadcrumb items [{\"name\": \"...\", \"slug\": \"...\"}]\n"
                    "- place_slugs: object mapping each place name to a URL-friendly slug\n\n"
                    'Return JSON: {"seo": {...}}'
                ),
            ),
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    text = resp.choices[0].message.content.strip()
    if text.startswith("```"):
        lines = text.split("\n")[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    seo = json.loads(text).get("seo", {})

    # Build JSON-LD structured data deterministically
    json_ld_destination = {
        "@context": "https://schema.org",
        "@type": "TouristDestination",
        "name": city,
        "description": seo.get("description", ""),
        "url": f"https://travel.example.com/{seo.get('canonical_slug', city.lower())}",
    }

    json_ld_list = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": f"Top places to visit in {city}",
        "numberOfItems": len(places),
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i + 1,
                "name": p.get("name", ""),
                "url": f"https://travel.example.com/{seo.get('canonical_slug', city.lower())}/{seo.get('place_slugs', {}).get(p.get('name', ''), '')}",
            }
            for i, p in enumerate(places)
        ],
    }

    seo["json_ld"] = [json_ld_destination, json_ld_list]

    return {"seo_metadata": seo}
