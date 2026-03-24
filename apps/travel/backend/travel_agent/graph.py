"""LangGraph pipeline — Katowice travel guide with top places to visit."""

from __future__ import annotations

import json
from functools import partial
from pathlib import Path

from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph

from deepseek_client import DeepSeekClient, DeepSeekConfig, ChatMessage

from .booking import generate_booking
from .seo import generate_seo
from .state import TravelState

# Load shared .env from monorepo root
_root = Path(__file__).resolve().parent.parent.parent.parent.parent
load_dotenv(_root / ".env")

_client: DeepSeekClient | None = None


def _get_client() -> DeepSeekClient:
    global _client
    if _client is None:
        _client = DeepSeekClient(DeepSeekConfig(timeout=180.0))
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


def _parse_json(text: str) -> dict | list:
    """Extract JSON from LLM response, handling markdown code fences."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    return json.loads(text)


# ── Node 1: Research the city ────────────────────────────────────────────


async def research_city(state: TravelState) -> dict:
    city = state.get("city", "Katowice")
    client = _get_client()
    content = await client.chat_simple(
        f"Write a 3-4 paragraph overview of {city}, Poland for travelers. "
        "Cover its history, culture, what makes it unique, and the vibe of the city. "
        "Mention its transformation from an industrial city to a cultural hub. "
        "Keep it informative but exciting. "
        "Do NOT use any markdown formatting — no bold, no italics, no headers. "
        "Write in plain text only.",
        system_prompt=(
            "You are a travel expert and cultural guide specializing in Polish cities. "
            "Write an engaging, concise overview of the given city for travelers. "
            "Never use markdown formatting like ** or * or # in your response."
        ),
        temperature=0.3,
    )
    return {"city_overview": content}


# ── Node 2: Discover top places ──────────────────────────────────────────


async def discover_places(state: TravelState) -> dict:
    city = state.get("city", "Katowice")
    num = state.get("num_places", 10)
    client = _get_client()
    resp = await client.chat(
        [
            ChatMessage(
                role="system",
                content=(
                    "You are a travel expert with deep knowledge of Polish cities. "
                    "Return detailed information about the best places to visit. "
                    "CRITICAL RULES:\n"
                    "1. Only recommend places that are CURRENTLY OPEN and operating.\n"
                    "2. Never recommend places that have permanently closed, moved, or do not exist.\n"
                    "3. Every place MUST actually be located in the specified city — do not confuse "
                    "places from other Polish cities (e.g. Stary Browar is in Poznan, not Katowice).\n"
                    "4. Use the official, well-known name of each place — not a generic English "
                    "translation or a made-up name. For example, use 'Muzeum Historii Katowic' "
                    "not 'Katowice History Museum'. Use the name a local would recognize.\n"
                    "5. Prefer well-known landmarks, institutions, and established venues over "
                    "obscure or niche businesses that may be hard to verify.\n"
                    "6. Every place must have a SPECIFIC street address within the city limits. "
                    "Do NOT include places that are in neighboring cities (e.g. Park Śląski is "
                    "in Chorzów, not Katowice). Do NOT use 'various locations' as an address.\n"
                    "7. Each entry must be a specific, named venue — not a general concept like "
                    "'street art' or 'food trucks'.\n"
                    "Include real, accurate coordinates (lat/lng) for each place. "
                    "Do NOT use any markdown formatting in text fields — plain text only. "
                    "Return valid JSON only."
                ),
            ),
            ChatMessage(
                role="user",
                content=(
                    f"List the top {num} must-visit places in {city}, Poland. "
                    "Include a mix of categories: culture, architecture, nature, food, nightlife. "
                    "IMPORTANT: Every place must be currently open and operating as of 2025. "
                    "Do NOT include any place that has permanently closed or does not exist in this city. "
                    "For each place provide:\n"
                    "- name: official name of a real, currently operating place\n"
                    "- description: 2-3 sentences about why it's worth visiting (plain text, no markdown)\n"
                    "- category: one of culture/nature/food/nightlife/architecture/history/entertainment\n"
                    f"- address: full street address in {city}\n"
                    "- lat: latitude coordinate (precise to 4 decimals)\n"
                    "- lng: longitude coordinate (precise to 4 decimals)\n"
                    "- rating: rating out of 5\n"
                    "- visit_duration: suggested time to spend\n"
                    "- tips: one practical tip for visitors (plain text)\n"
                    "- image_query: a search term to find photos of this place\n"
                    "- price_level: one of budget/moderate/premium "
                    "(budget = free or under 10 PLN, moderate = 10-50 PLN, premium = 50+ PLN)\n"
                    '- price_display: price indicator ("\u20ac" for budget, '
                    '"\u20ac\u20ac" for moderate, "\u20ac\u20ac\u20ac" for premium)\n\n'
                    'Return JSON: {"places": [...]}'
                ),
            ),
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    data = _parse_json(resp.choices[0].message.content)
    return {"places": data.get("places", [])}


# ── Node 3: Enrich with Google Maps data ─────────────────────────────────


async def enrich_with_maps(state: TravelState) -> dict:
    places = state.get("places", [])
    enriched = []
    for place in places:
        name = place.get("name", "")
        city = state.get("city", "Katowice")
        query = f"{name}, {city}, Poland"
        maps_url = f"https://www.google.com/maps/search/?api=1&query={query.replace(' ', '+')}"
        embed_query = query.replace(" ", "+")
        enriched.append(
            {
                **place,
                "maps_url": maps_url,
                "maps_embed_query": embed_query,
            }
        )
    return {"places_with_maps": enriched}


# ── Node 4: Rank places (best + cheapest) ────────────────────────────────


async def rank_places(state: TravelState) -> dict:
    places = state.get("places_with_maps", [])
    client = _get_client()

    summaries = []
    for p in places:
        summaries.append({
            "name": p.get("name", ""),
            "category": p.get("category", ""),
            "rating": p.get("rating", 0),
            "price_level": p.get("price_level", "moderate"),
            "description": p.get("description", "")[:120],
        })

    resp = await client.chat(
        [
            ChatMessage(
                role="system",
                content=(
                    "You are a travel expert. Rank the given places into two ordered lists. "
                    "Return valid JSON only. No markdown."
                ),
            ),
            ChatMessage(
                role="user",
                content=(
                    "Given these places, produce two ranked lists containing ALL place names:\n"
                    "1. 'best': ordered by overall quality, cultural significance, "
                    "and visitor experience (best first)\n"
                    "2. 'cheapest': ordered by affordability (cheapest first), "
                    "breaking ties by value-for-money\n\n"
                    f"{json.dumps(summaries, ensure_ascii=False)}\n\n"
                    'Return JSON: {"best": ["Place Name 1", ...], '
                    '"cheapest": ["Place Name 1", ...]}'
                ),
            ),
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    rankings = _parse_json(resp.choices[0].message.content)
    return {"rankings": rankings}


# ── Node 5: Translate to Romanian ────────────────────────────────────────


async def translate_to_romanian(state: TravelState) -> dict:
    client = _get_client()

    # Translate city overview
    overview = state.get("city_overview", "")
    overview_ro = await client.chat_simple(
        f"Translate the following travel guide text to Romanian. "
        f"Keep the same tone — engaging, editorial, travel-magazine style. "
        f"Do NOT use any markdown formatting. Plain text only.\n\n{overview}",
        system_prompt="You are a professional Romanian translator specializing in travel content.",
        temperature=0.2,
    )

    # Translate place descriptions and tips
    places = state.get("places_with_maps", [])
    # Build a single batch translation request for efficiency
    items = []
    for p in places:
        items.append({
            "name": p.get("name", ""),
            "description": p.get("description", ""),
            "tips": p.get("tips", ""),
            "visit_duration": p.get("visit_duration", ""),
        })

    resp = await client.chat(
        [
            ChatMessage(
                role="system",
                content=(
                    "You are a professional Romanian translator. "
                    "Translate the travel content to Romanian. "
                    "Keep place names in their original form. "
                    "Do NOT use markdown. Return valid JSON only."
                ),
            ),
            ChatMessage(
                role="user",
                content=(
                    "Translate the description, tips, and visit_duration fields to Romanian. "
                    "Keep the name field unchanged. Return the same JSON structure.\n\n"
                    f'{json.dumps(items, ensure_ascii=False)}\n\n'
                    'Return JSON: {"translations": [{"name": "...", "description_ro": "...", "tips_ro": "...", "visit_duration_ro": "..."}]}'
                ),
            ),
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    translations = _parse_json(resp.choices[0].message.content)
    trans_list = translations.get("translations", [])

    # Merge translations back into places
    translated = []
    for i, place in enumerate(places):
        t = trans_list[i] if i < len(trans_list) else {}
        translated.append({
            **place,
            "description_ro": t.get("description_ro", ""),
            "tips_ro": t.get("tips_ro", ""),
            "visit_duration_ro": t.get("visit_duration_ro", place.get("visit_duration", "")),
        })

    return {
        "city_overview_ro": overview_ro,
        "places_translated": translated,
    }


# ── Graph wiring ──────────────────────────────────────────────────────────


def create_travel_graph():
    builder = StateGraph(TravelState)
    builder.add_node("research_city", research_city)
    builder.add_node("discover_places", discover_places)
    builder.add_node("enrich_with_maps", enrich_with_maps)
    builder.add_node("rank_places", rank_places)
    builder.add_node("translate_to_romanian", translate_to_romanian)
    builder.add_node("generate_seo", partial(generate_seo, get_client=_get_client))
    builder.add_node("generate_booking", partial(generate_booking, get_client=_get_client))

    # research_city and discover_places run in parallel from START
    builder.add_edge(START, "research_city")
    builder.add_edge(START, "discover_places")
    builder.add_edge("discover_places", "enrich_with_maps")

    # After enrichment, rank_places, translate_to_romanian, generate_seo, and generate_booking run in parallel
    builder.add_edge("enrich_with_maps", "rank_places")
    builder.add_edge("enrich_with_maps", "translate_to_romanian")
    builder.add_edge("enrich_with_maps", "generate_seo")
    builder.add_edge("enrich_with_maps", "generate_booking")
    builder.add_edge("research_city", "translate_to_romanian")
    builder.add_edge("research_city", "generate_seo")

    builder.add_edge("rank_places", END)
    builder.add_edge("translate_to_romanian", END)
    builder.add_edge("generate_seo", END)
    builder.add_edge("generate_booking", END)

    return builder.compile()


graph = create_travel_graph()
