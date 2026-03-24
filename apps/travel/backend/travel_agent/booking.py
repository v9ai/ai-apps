"""Booking node — generates booking links, price estimates, and reservation info."""

from __future__ import annotations

import json
from urllib.parse import quote_plus

from deepseek_client import ChatMessage

from .state import TravelState

# Curated Booking.com affiliate hotel links for Katowice
CURATED_HOTELS = [
    {
        "name": "Flow Świętego Pawła 10",
        "property_id": "13562120",
        "address": "ul. Świętego Pawła 10, Katowice",
        "url": (
            "https://www.booking.com/hotel/pl/flow-swietego-pawla-10.ro.html"
            "?aid=2428369"
            "&checkin=2026-04-04&checkout=2026-04-07"
            "&group_adults=2&group_children=1&age=7&no_rooms=1"
        ),
    },
    {
        "name": "Flow Apartments - przy Mariackiej",
        "property_id": "13562397",
        "address": "ul. Mariacka, Katowice",
        "url": (
            "https://www.booking.com/hotel/pl/flow-stanislawa-7.ro.html"
            "?aid=2428369"
            "&checkin=2026-04-04&checkout=2026-04-07"
            "&group_adults=2&group_children=1&age=7&no_rooms=1"
        ),
    },
    {
        "name": "Parkcity Centrum",
        "property_id": "9573635",
        "address": "Katowice Centrum",
        "url": (
            "https://www.booking.com/hotel/pl/parkcity-centrum.ro.html"
            "?aid=2428369"
            "&checkin=2026-04-04&checkout=2026-04-07"
            "&group_adults=2&group_children=1&age=7&no_rooms=1"
        ),
    },
]


def _build_booking_urls(place_name: str, city: str) -> dict:
    """Build search URLs for major booking platforms."""
    query = quote_plus(f"{place_name} {city} Poland")
    city_q = quote_plus(f"{city} Poland")
    return {
        "google_maps": f"https://www.google.com/maps/search/?api=1&query={query}",
        "tripadvisor": f"https://www.tripadvisor.com/Search?q={query}",
        "getyourguide": f"https://www.getyourguide.com/s/?q={query}",
        "booking_hotels": f"https://www.booking.com/searchresults.html?ss={city_q}",
        "google_hotels": f"https://www.google.com/travel/hotels/{city_q}",
    }


async def generate_booking(state: TravelState, *, get_client) -> dict:
    """Generate booking info, price estimates, and reservation links for each place.

    Runs after enrich_with_maps, in parallel with rank_places,
    translate_to_romanian, and generate_seo.
    """
    city = state.get("city", "Katowice")
    places = state.get("places_with_maps", [])
    client = get_client()

    summaries = []
    for p in places:
        summaries.append({
            "name": p.get("name", ""),
            "category": p.get("category", ""),
            "price_level": p.get("price_level", "moderate"),
            "address": p.get("address", ""),
        })

    resp = await client.chat(
        [
            ChatMessage(
                role="system",
                content=(
                    "You are a travel booking assistant with expertise in Polish tourism. "
                    "For each place, generate practical booking and visit-planning information. "
                    "Return valid JSON only. No markdown."
                ),
            ),
            ChatMessage(
                role="user",
                content=(
                    f"City: {city}, Poland\n"
                    f"Places: {json.dumps(summaries, ensure_ascii=False)}\n\n"
                    "For each place, generate:\n"
                    "- name: exact place name (must match input)\n"
                    "- booking_type: one of 'ticket', 'reservation', 'free_entry', 'guided_tour'\n"
                    "- needs_reservation: boolean — whether advance booking is recommended\n"
                    "- best_time_to_visit: best time of day or season\n"
                    "- estimated_cost_pln: estimated cost per person in PLN (0 if free)\n"
                    "- estimated_cost_eur: same in EUR\n"
                    "- nearby_hotel_area: neighborhood or street name to search hotels near this place\n"
                    "- combined_with: list of 1-2 other place names from this list that pair well for a day trip\n"
                    "- advance_booking_days: how many days ahead to book (0 if walk-in)\n\n"
                    'Return JSON: {"bookings": [...]}'
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
    bookings_list = json.loads(text).get("bookings", [])

    # Index bookings by place name for merging
    bookings_by_name = {b["name"]: b for b in bookings_list}

    # Merge booking data + platform URLs into each place
    places_with_booking = []
    for place in places:
        name = place.get("name", "")
        booking_info = bookings_by_name.get(name, {})
        platform_urls = _build_booking_urls(name, city)

        places_with_booking.append({
            **place,
            "booking": {
                "type": booking_info.get("booking_type", "free_entry"),
                "needs_reservation": booking_info.get("needs_reservation", False),
                "best_time_to_visit": booking_info.get("best_time_to_visit", ""),
                "estimated_cost": {
                    "pln": booking_info.get("estimated_cost_pln", 0),
                    "eur": booking_info.get("estimated_cost_eur", 0),
                },
                "nearby_hotel_area": booking_info.get("nearby_hotel_area", ""),
                "combined_with": booking_info.get("combined_with", []),
                "advance_booking_days": booking_info.get("advance_booking_days", 0),
                "platform_urls": platform_urls,
            },
        })

    # Build a summary with totals
    total_pln = sum(
        p["booking"]["estimated_cost"]["pln"] for p in places_with_booking
    )
    total_eur = sum(
        p["booking"]["estimated_cost"]["eur"] for p in places_with_booking
    )
    needs_advance = [
        p["name"] for p in places_with_booking
        if p["booking"]["needs_reservation"]
    ]

    booking_summary = {
        "total_estimated_cost": {"pln": total_pln, "eur": total_eur},
        "places_needing_reservation": needs_advance,
        "hotel_search_url": f"https://www.booking.com/searchresults.html?ss={quote_plus(city + ' Poland')}",
        "curated_hotels": CURATED_HOTELS,
    }

    return {
        "places_with_booking": places_with_booking,
        "booking_summary": booking_summary,
    }
