"""Generate node — produces structured HowItWorksData JSON via DeepSeek."""

from __future__ import annotations

from typing import Any

from how_it_works.deepseek import chat_json
from how_it_works.models import HowItWorksData

SCHEMA = """\
{
  "title": "How It Works",
  "subtitle": "One sentence that captures the technical approach — mention 2-3 key technologies",
  "story": "3-5 sentences: complete end-to-end user journey + technical flow, named tools/functions",
  "papers": [
    {
      "slug": "kebab-case-id",
      "number": 1,
      "title": "Technology or Concept Name",
      "category": "Frontend | Database | Authentication | AI/LLM | API | Infrastructure | Storage | Search | Build Tool | State Management",
      "wordCount": 0,
      "readingTimeMin": 2,
      "authors": "Creator org (e.g. Vercel, Meta, Anthropic)",
      "year": 2024,
      "finding": "What makes this technology powerful — its core design principle or capability",
      "relevance": "How it is used in THIS specific app — mention actual component/function names",
      "url": "Official docs URL",
      "categoryColor": "var(--blue-9) | var(--green-9) | var(--purple-9) | var(--amber-9) | var(--orange-9) | var(--red-9) | var(--cyan-9) | var(--gray-9)"
    }
  ],
  "agents": [
    {
      "name": "Step Name",
      "description": "2-4 sentences with specific technical details — actual function/component names, data shapes, API calls",
      "researchBasis": "Underlying library or design pattern (optional)"
    }
  ],
  "stats": [
    {
      "number": "e.g. '4', '1024-dim', 'O(log n)', '< 100ms'",
      "label": "Short description of what this number means",
      "source": "Where this fact comes from"
    }
  ],
  "extraSections": [
    {
      "heading": "Section heading",
      "content": "3-5 sentences of technical deep-dive — actual table names, function names, security patterns"
    }
  ]
}"""

COLOR_GUIDE = """\
Category color guide:
- Frontend        → var(--blue-9)
- Database        → var(--green-9)
- Authentication  → var(--purple-9)
- AI/LLM          → var(--amber-9)
- API             → var(--orange-9)
- Infrastructure  → var(--red-9)
- Storage         → var(--cyan-9)
- Search          → var(--indigo-9)
- Build Tool      → var(--gray-9)
- State Management→ var(--teal-9)"""

SYSTEM_PROMPT = f"""\
You generate structured JSON for a HowItWorks React component that documents a web application.

The component renders:
- **papers** — "Technical Foundations": the key technologies/libraries/concepts the app is built on.
  Repurpose the Paper type — "title" = technology name, "finding" = its core capability,
  "relevance" = how THIS app uses it (be precise: name functions, routes, tables).
  Include 5–10 entries covering the most architecturally significant pieces.
- **agents** — "Pipeline Stages": 4–8 ordered steps showing how data flows through the system.
  Each step should name actual code artefacts (functions, components, server actions).
- **stats** — 3–6 key technical metrics, counts, or architectural facts.
- **story** — a flowing 3–5 sentence narrative of the complete end-to-end journey.
- **extraSections** — 3–6 deep-dive sections. Always include at least:
  System Architecture, Database Design (if app has a DB), Security & Auth, Deployment & Infrastructure.
  Add AI Integration section if the app uses LLMs or embeddings.

{COLOR_GUIDE}

Output ONLY valid JSON matching this exact schema (no markdown fences, no extra keys):
{SCHEMA}"""


async def generate_node(state: dict[str, Any]) -> dict[str, Any]:
    app = state["current_app"]

    print("  🏗   Generating HowItWorks data with DeepSeek...")

    raw = await chat_json(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"App name: {app.name}\n\n"
                    f"Technical analysis:\n{state['current_analysis']}"
                ),
            },
        ],
    )

    data = HowItWorksData.model_validate(raw)

    if not data.papers:
        raise ValueError(f"Generate output for {app.name} is missing papers array")

    print(
        f"  ✓   Generated: {len(data.papers)} foundations, "
        f"{len(data.agents)} pipeline steps, "
        f"{len(data.stats)} stats, "
        f"{len(data.extra_sections)} sections"
    )

    return {"current_data": data}
