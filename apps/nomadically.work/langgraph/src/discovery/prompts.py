QUERY_GENERATION_PROMPT = """You are an expert recruiter specializing in fully remote AI/ML engineering roles in Europe.

Given the seed topics below, generate 5-8 diverse web search queries designed to discover companies that:
- Build AI/ML as their core product (foundation models, LLM APIs, MLOps, vector DBs, AI agents, AI infrastructure)
- Hire fully remote engineers in the EU or worldwide
- Have active job boards (Greenhouse, Lever, or Ashby ATS platforms)

Vary your queries across these strategies:
- Direct company discovery ("remote AI startups hiring engineers Europe")
- ATS-specific ("site:boards.greenhouse.io AI remote")
- Directory/list queries ("YC batch 2024 AI companies remote")
- Role-specific ("senior ML engineer fully remote EU hiring")
- Ecosystem queries ("European AI companies Series A B remote-first")

Return JSON only — no markdown, no preamble:
{
  "queries": ["query1", "query2", ...]
}"""


COMPANY_CLASSIFICATION_PROMPT = """You are an expert at classifying whether a company is an AI company and whether it supports fully remote work.

Analyze the evidence below and classify this company.

AI tier levels:
- TIER 2 (AI-core): builds foundation models, LLM APIs, MLOps platforms, vector databases, AI agents, AI infrastructure
- TIER 1 (AI-adjacent): AI heavily embedded in core product, AI-first SaaS, significant ML team
- TIER 0 (not AI): traditional company with an ML team, legacy enterprise adding AI features

Remote classification:
- FULLY REMOTE: "fully remote", "100% remote", "work from anywhere", distributed team, no office requirement
- NOT REMOTE: hybrid, on-site, specific office required, "remote-friendly" with hybrid expectation

Return JSON only — no markdown, no preamble:
{
  "is_ai_company": true | false,
  "is_fully_remote": true | false,
  "ai_tier": 0 | 1 | 2,
  "confidence": "high" | "medium" | "low",
  "reasons": ["reason1", "reason2"]
}"""


def build_query_generation_messages(seed_topics: list[str]) -> list[dict]:
    from langchain_core.messages import HumanMessage, SystemMessage

    return [
        SystemMessage(content=QUERY_GENERATION_PROMPT),
        HumanMessage(content=f"Seed topics:\n{chr(10).join(f'- {t}' for t in seed_topics)}"),
    ]


def build_classification_messages(
    name: str,
    domain: str,
    website_snippet: str,
    ats_evidence: str,
) -> list[dict]:
    from langchain_core.messages import HumanMessage, SystemMessage

    body = f"""Company: {name}
Domain: {domain}

Website content:
{website_snippet[:3000]}

ATS board evidence:
{ats_evidence or "No ATS boards detected"}"""

    return [
        SystemMessage(content=COMPANY_CLASSIFICATION_PROMPT),
        HumanMessage(content=body),
    ]
