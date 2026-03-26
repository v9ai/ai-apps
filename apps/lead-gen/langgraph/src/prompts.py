from langchain_core.messages import HumanMessage, SystemMessage

from .models import Job

SYSTEM_PROMPT = """You are a job posting classifier. For each posting determine:

1. Is this an AI company? (core product is AI/ML — models, APIs, infrastructure, tooling)
   HIGH confidence: builds foundation models, LLM APIs, MLOps tools, vector DBs, AI agents
   MEDIUM confidence: AI heavily embedded in core product, AI-first SaaS
   NOT AI: legacy enterprise adding AI features, traditional companies with an AI team

2. Is this fully remote? (genuinely work-from-anywhere, no office requirement)
   HIGH confidence: "fully remote", "100% remote", "work from anywhere", distributed team
   MEDIUM confidence: "remote-first", "remote-friendly" without hybrid requirement
   NOT remote: hybrid, on-site, specific city/country required

Return JSON only — no markdown, no preamble:
{
  "is_ai_company": true | false,
  "is_fully_remote": true | false,
  "ai_confidence": "high" | "medium" | "low",
  "remote_confidence": "high" | "medium" | "low",
  "ai_reason": "one sentence",
  "remote_reason": "one sentence"
}"""


def build_messages(job: Job) -> list:
    url_line = f"Apply URL: {job['url']}" if job.get("url") else ""
    body = f"""Title: {job.get("title", "N/A")}
Company: {job.get("company_name", "Unknown")}
Location: {job.get("location") or "Not specified"}
Workplace type: {job.get("workplace_type") or "Not specified"}
{url_line}
Description:
{(job.get("description") or "No description provided")[:4000]}"""

    return [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=body)]
