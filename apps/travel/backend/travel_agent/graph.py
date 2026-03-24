"""LangGraph pipeline — Katowice travel guide with top places to visit."""

from __future__ import annotations

import json
from pathlib import Path

from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph

from deepseek_client import DeepSeekClient, ChatMessage

from .state import TravelState

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

_client: DeepSeekClient | None = None


def _get_client() -> DeepSeekClient:
    global _client
    if _client is None:
        _client = DeepSeekClient()
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
        "Keep it informative but exciting.",
        system_prompt=(
            "You are a travel expert and cultural guide specializing in Polish cities. "
            "Write an engaging, concise overview of the given city for travelers."
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
                    "Include real coordinates (lat/lng) for each place. "
                    "Return valid JSON only."
                ),
            ),
            ChatMessage(
                role="user",
                content=(
                    f"List the top {num} must-visit places in {city}, Poland. "
                    "Include a mix of categories: culture, architecture, nature, food, nightlife. "
                    "For each place provide:\n"
                    "- name: official name\n"
                    "- description: 2-3 sentences about why it's worth visiting\n"
                    "- category: one of culture/nature/food/nightlife/architecture/history/entertainment\n"
                    "- address: full street address in Katowice\n"
                    "- lat: latitude coordinate (precise to 4 decimals)\n"
                    "- lng: longitude coordinate (precise to 4 decimals)\n"
                    "- rating: rating out of 5\n"
                    "- visit_duration: suggested time to spend\n"
                    "- tips: one practical tip for visitors\n"
                    "- image_query: a search term to find photos of this place\n\n"
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


# ── Graph wiring ──────────────────────────────────────────────────────────


def create_travel_graph():
    builder = StateGraph(TravelState)
    builder.add_node("research_city", research_city)
    builder.add_node("discover_places", discover_places)
    builder.add_node("enrich_with_maps", enrich_with_maps)

    builder.add_edge(START, "research_city")
    builder.add_edge(START, "discover_places")
    builder.add_edge("discover_places", "enrich_with_maps")
    builder.add_edge("research_city", END)
    builder.add_edge("enrich_with_maps", END)

    return builder.compile()


graph = create_travel_graph()
