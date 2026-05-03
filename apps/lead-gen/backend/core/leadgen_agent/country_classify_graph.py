"""LinkedIn HQ string → ISO country-code classifier.

Single-node graph: ``{location}`` in, ``{country, confidence, reasons}`` out.

Used by ``country_classify_bulk_graph`` (and the nightly cron in ``_cron.py``)
to backfill ``companies.country`` from the existing ``companies.location`` text
for the sales-tech tab geo gate. The companion regex backfill in migration
``0084_add_companies_country.sql`` only handles the comma+country-name shape;
this graph mops up the residual: state-spelled-out forms ("San Francisco,
California"), parenthetical suffixes ("Cambridge, MA (remote-friendly)"),
non-English country names, and bare-region strings.

No web research — this is a pure text classifier on the stored location string.
For non-locations ("Remote (global)", industry strings) it returns ``country=None``.

Output codes are ISO 3166-1 alpha-2 (uppercase). The companies table accepts
any code; the sales-tech tab filters against the 33-country US+EU+UK+EEA
allowlist defined in ``src/lib/country-codes.ts``.
"""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import ClassifyCountryState

SYSTEM_PROMPT = (
    "You are a strict location-to-country classifier. Given a LinkedIn "
    "company HQ string, return the ISO 3166-1 alpha-2 country code in "
    "uppercase, or null if the string is not a real location or you cannot "
    "determine the country with high confidence.\n\n"
    "Rules:\n"
    "- Return only valid ISO 3166-1 alpha-2 codes (e.g. US, DE, GB, FR, NL).\n"
    "- US states (full name or 2-letter code) imply US.\n"
    "- UK regions (England, Scotland, Wales, Northern Ireland) imply GB.\n"
    "- Non-English country names (Deutschland, España, Italia) map to the "
    "  standard ISO code (DE, ES, IT).\n"
    "- Strip parenthetical suffixes like '(remote-friendly)' before deciding.\n"
    "- Return null for: 'Remote', 'Worldwide', 'Global', industry strings, "
    "  empty/whitespace input, or anything you cannot confidently map.\n\n"
    "Examples:\n"
    "'San Francisco, California' → US\n"
    "'San Francisco, California, United States' → US\n"
    "'Berlin, Berlin, Germany' → DE\n"
    "'Cambridge, MA (remote-friendly)' → US\n"
    "'Karlsruhe, Baden-Württemberg' → DE\n"
    "'Courbevoie, Île-de-France' → FR\n"
    "'London, England' → GB\n"
    "'Cork, Munster' → IE\n"
    "'Remote (global)' → null\n"
    "'Technology, Information and Internet' → null\n\n"
    "Return STRICT JSON, no prose: "
    '{"country": "XX" or null, "confidence": number_between_0_and_1, '
    '"reasons": [<=2 short strings]}'
)


_VALID_CODE_LEN = 2


async def classify(state: ClassifyCountryState) -> dict[str, Any]:
    location = (state.get("location") or "").strip()
    if not location:
        return {"country": None, "confidence": 0.0, "reasons": ["empty location"]}

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"LOCATION: {location}"},
    ]

    try:
        llm = make_llm(temperature=0.0)
        data = await ainvoke_json(llm, messages)
    except Exception as exc:  # noqa: BLE001 — surface failure as null + reason
        return {
            "country": None,
            "confidence": 0.0,
            "reasons": [f"classifier error: {type(exc).__name__}: {str(exc)[:120]}"],
        }

    raw_country = data.get("country") if isinstance(data, dict) else None
    country: str | None = None
    if isinstance(raw_country, str):
        norm = raw_country.strip().upper()
        if len(norm) == _VALID_CODE_LEN and norm.isalpha():
            country = norm

    try:
        confidence = float(data.get("confidence", 0.0)) if isinstance(data, dict) else 0.0
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    reasons_raw = data.get("reasons") if isinstance(data, dict) else None
    if not isinstance(reasons_raw, list):
        reasons_raw = []
    reasons = [str(r) for r in reasons_raw if isinstance(r, (str, int, float))][:2]

    return {"country": country, "confidence": confidence, "reasons": reasons}


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ClassifyCountryState)
    builder.add_node("classify", classify)
    builder.add_edge(START, "classify")
    builder.add_edge("classify", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
