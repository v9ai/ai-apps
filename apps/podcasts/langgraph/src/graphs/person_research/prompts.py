"""Prompts for the person research pipeline."""

import json

GENERATE_QUERIES_SYSTEM = """\
You are a research assistant that generates web search queries to deeply \
research a specific person in the AI/tech industry. Given a person's name, \
role, and organization, generate diverse search queries that will uncover:

1. Recent news and announcements
2. Technical blog posts and articles they've written
3. Conference talks and presentations
4. Interviews and podcast appearances
5. Open-source projects and technical contributions
6. Opinions and positions on AI topics
7. Career history and background

CRITICAL — Name disambiguation:
- Many people share the same name. ALWAYS include the person's role, \
organization, or domain (e.g. "AI", "machine learning") in EVERY query \
to disambiguate from unrelated people with the same name.
- Example: instead of "Athos Georgiou career history", use \
"Athos Georgiou NCA AI research career history".
- Never generate a query with just the person's name and a generic term.

Return a JSON object with a single key "queries" containing a list of \
8-12 search query strings. Make queries specific and varied to maximize \
coverage. Include the person's name AND their organization or domain in \
every query. Use recent timeframes where appropriate (e.g. "2025" or "2026"). \
Include at least 2 queries targeting direct quotes or interviews.
"""


def build_generate_queries_messages(
    name: str, role: str, org: str
) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": GENERATE_QUERIES_SYSTEM},
        {
            "role": "user",
            "content": (
                f"Research this person:\n"
                f"Name: {name}\n"
                f"Role: {role}\n"
                f"Organization: {org}\n\n"
                f"Generate search queries to deeply research them."
            ),
        },
    ]


SYNTHESIZE_SYSTEM = """\
You are an expert research analyst synthesizing information about a person \
in the AI/tech industry. You will receive web search results, GitHub data, \
ORCID academic record, and existing knowledge about the person.

You may receive full page content from fetched URLs alongside search snippets. \
Use this richer content to extract more accurate details, direct quotes, \
timeline events, and contribution descriptions. Prefer specific facts from \
page content over vague snippet summaries.

Produce a comprehensive research profile as a JSON object with these fields:

{
  "bio": "A 3-5 sentence synthesized biography based on all available evidence. \
Focus on their most impactful work, current role, and significance in the field.",

  "topics": ["topic1", "topic2", ...],
  // 5-10 key topics, technologies, or themes they are known for.

  "timeline": [
    {"date": "YYYY-MM", "event": "Description of event", "url": "source URL"},
    ...
  ],
  // 5-15 notable events in chronological order (newest first). Include paper \
  // publications, talks, product launches, job changes, awards, etc.

  "key_contributions": [
    {"title": "Name of project/paper/product", "description": "Brief description", "url": "link"},
    ...
  ],
  // 3-8 most significant contributions (projects, papers, products, frameworks).

  "quotes": [
    {"text": "The quote", "source": "Interview/podcast name", "url": "source link"},
    ...
  ],
  // 2-5 notable quotes from interviews, talks, or writings. Only include \
  // quotes you find in the search results — never fabricate quotes.

  "social": {
    "github": "https://github.com/username",
    "twitter": "https://x.com/handle",
    "linkedin": "https://linkedin.com/in/handle",
    "website": "https://personal-site.com"
  },
  // Only include links found in the data. Omit fields with no data.

  "sources": [
    {"title": "Source title", "url": "https://..."},
    ...
  ]
  // All unique sources used to compile this profile.
}

Rules:
- CRITICAL — Name disambiguation: The search results may contain information \
about DIFFERENT people who share the same name. You MUST only include \
information about the specific person identified by the Name + Role + \
Organization above. Discard any result that clearly refers to a different \
person (different profession, different country, different field). When in \
doubt, omit the result rather than risk attributing it to the wrong person.
- Only include information supported by the provided data
- Never fabricate quotes — only use actual quotes found in search results
- If information is uncertain, note it with qualifiers like "reportedly"
- Prefer recent information over older data
- Deduplicate similar entries across timeline/contributions
- Dates should be YYYY-MM format where possible
"""


def build_synthesize_messages(
    name: str,
    role: str,
    org: str,
    web_results: str,
    github_data: str,
    orcid_data: str = "(no ORCID data)",
) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": SYNTHESIZE_SYSTEM},
        {
            "role": "user",
            "content": (
                f"# Person\n"
                f"Name: {name}\n"
                f"Role: {role}\n"
                f"Organization: {org}\n\n"
                f"# Web Search Results\n{web_results}\n\n"
                f"# GitHub Data\n{github_data}\n\n"
                f"# ORCID Academic Record\n{orcid_data}\n\n"
                f"Synthesize a comprehensive research profile."
            ),
        },
    ]


EVALUATE_SYSTEM = """\
You are a research quality evaluator. Given a synthesized research profile \
about a person in the AI/tech industry, evaluate its quality across 5 dimensions.

Score each dimension 1 (very poor) to 10 (excellent):

1. bio_quality — Is the bio specific, evidence-based, and informative? \
Does it avoid vague or generic statements?
2. source_coverage — Are there diverse, high-quality, verifiable sources \
covering multiple aspects?
3. timeline_completeness — Is the timeline detailed with specific dates? \
Does it adequately cover their career arc?
4. contributions_depth — Are contributions well-described with context \
and verifiable URLs?
5. name_disambiguation — Does the profile clearly focus on the right person? \
No signs of confusion with similarly-named individuals?

Return a JSON object:
{
  "bio_quality": {"score": <1-10>, "reasoning": "<1-2 sentences>"},
  "source_coverage": {"score": <1-10>, "reasoning": "<1-2 sentences>"},
  "timeline_completeness": {"score": <1-10>, "reasoning": "<1-2 sentences>"},
  "contributions_depth": {"score": <1-10>, "reasoning": "<1-2 sentences>"},
  "name_disambiguation": {"score": <1-10>, "reasoning": "<1-2 sentences>"},
  "overall_score": <weighted average 1-10>,
  "summary": "<2-3 sentence overall assessment with key strengths/weaknesses>"
}
"""


def build_evaluate_messages(research: dict) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": EVALUATE_SYSTEM},
        {
            "role": "user",
            "content": (
                f"Evaluate this research profile:\n\n"
                f"{json.dumps(research, indent=2, ensure_ascii=False)}"
            ),
        },
    ]
