#!/usr/bin/env python3
"""
score_candidates.py — LLM-based profile scorer for GitHub-sourced candidates.

Reads contacts from Neon tagged with an opportunity ID, scores each candidate
against the opportunity description using DeepSeek, and updates the ai_profile
JSON blob.

Usage:
    python scripts/score_candidates.py [--dry-run] [--opp-id OPP_ID] [--limit N]

Env vars:
    NEON_DATABASE_URL   Neon connection string (required)
    DEEPSEEK_API_KEY    DeepSeek API key (required)
    DEEPSEEK_BASE_URL   DeepSeek base URL (default: https://api.deepseek.com)
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    sys.exit("psycopg2 not installed. Run: pip install psycopg2-binary")

try:
    from openai import OpenAI
except ImportError:
    sys.exit("openai not installed. Run: pip install openai")


DEFAULT_OPP_ID = "opp_20260415_principal_ai_eng_ob"

OPPORTUNITY_CONTEXT = """Principal AI Engineer role hiring for a rapidly growing AI team
tackling real-world problems. Designing and scaling RAG pipelines, building
production-grade LLM workflows using Claude, CrewAI, and LangGraph. Leading
organizational strategy on AI engineering standards. Requires expertise with
LLMs, RAG systems, Python-based LLM frameworks, production workflow
orchestration. Hybrid 3 days in office, London area. Up to £145k."""

SCORING_PROMPT = """You are evaluating a GitHub user's profile for fit against a specific job opportunity.

## Opportunity
{opportunity}

## Candidate Profile
Name: {name}
GitHub: @{github_handle}
Location: {location}
Company: {company}
Bio: {bio}
Public repos: {public_repos}
Followers: {followers}
Skills (extracted): {skills}
Tags: {tags}

## Task
Score this candidate on these dimensions (0.0 to 1.0 each):

1. **rag_expertise**: Evidence of RAG pipeline work (repos, bio mentions, LangChain/LlamaIndex/vector DB experience)
2. **llm_frameworks**: Experience with Claude, CrewAI, LangGraph, or similar LLM orchestration frameworks
3. **python_depth**: Not just "uses Python" but production-grade Python (frameworks, packaging, testing)
4. **seniority_match**: Principal/Senior level signals (leadership language in bio, substantial repos, followers, company)
5. **london_commutable**: Confidence this person is in London area and could do hybrid 3 days/week

Return JSON only:
{{
  "rag_expertise": 0.0,
  "llm_frameworks": 0.0,
  "python_depth": 0.0,
  "seniority_match": 0.0,
  "london_commutable": 0.0,
  "overall_fit": 0.0,
  "rationale": "one sentence explaining the score"
}}"""


def fetch_candidates(conn, opp_id: str, limit: int) -> list[dict]:
    """Fetch contacts tagged with the opportunity."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, first_name, last_name, github_handle, email, company,
                   position, tags, ai_profile,
                   seniority, department, authority_score
            FROM contacts
            WHERE tags LIKE %s
            ORDER BY authority_score DESC NULLS LAST
            LIMIT %s
            """,
            (f"%{opp_id}%", limit),
        )
        return cur.fetchall()


def score_candidate(client: OpenAI, candidate: dict, model: str) -> dict | None:
    """Score a single candidate via DeepSeek."""
    tags = candidate.get("tags") or "[]"
    try:
        tag_list = json.loads(tags)
    except (json.JSONDecodeError, TypeError):
        tag_list = []

    # Extract skills from tags
    skills = [t.replace("skill:", "") for t in tag_list if t.startswith("skill:")]

    name = f"{candidate['first_name']} {candidate['last_name']}".strip()
    prompt = SCORING_PROMPT.format(
        opportunity=OPPORTUNITY_CONTEXT,
        name=name,
        github_handle=candidate.get("github_handle") or "-",
        location=next(
            (t.replace("location:", "") for t in tag_list if t.startswith("location:")),
            "-",
        ),
        company=candidate.get("company") or "-",
        bio="-",  # Bio not in contacts table; skills + tags are the proxy
        public_repos="-",
        followers="-",
        skills=", ".join(skills) if skills else "none extracted",
        tags=", ".join(t for t in tag_list if not t.startswith("opp:")),
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Return valid JSON only. No markdown."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=512,
        )
        raw = response.choices[0].message.content or "{}"
        return json.loads(raw)
    except Exception as e:
        print(f"  LLM scoring failed for {candidate.get('github_handle')}: {e}")
        return None


def update_ai_profile(conn, contact_id: int, scores: dict, dry_run: bool):
    """Update the ai_profile JSON blob on the contact."""
    profile = {
        "trigger": "github-candidate-search",
        "enriched_at": datetime.now(timezone.utc).isoformat(),
        "candidate_scores": scores,
        "specialization": None,
        "skills": [],
        "research_areas": [],
        "experience_level": "unknown",
        "synthesis_confidence": scores.get("overall_fit", 0),
        "synthesis_rationale": scores.get("rationale"),
    }
    profile_json = json.dumps(profile)

    if dry_run:
        print(f"  [DRY RUN] would update contact {contact_id} ai_profile")
        return

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE contacts SET ai_profile = %s, updated_at = now()::text WHERE id = %s",
            (profile_json, contact_id),
        )
    conn.commit()


def main():
    parser = argparse.ArgumentParser(description="Score GitHub-sourced candidates via LLM")
    parser.add_argument("--dry-run", action="store_true", help="Skip DB writes")
    parser.add_argument("--opp-id", default=DEFAULT_OPP_ID, help="Opportunity ID")
    parser.add_argument("--limit", type=int, default=100, help="Max candidates to score")
    parser.add_argument("--model", default="deepseek-chat", help="DeepSeek model name")
    args = parser.parse_args()

    db_url = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not db_url:
        sys.exit("NEON_DATABASE_URL env var is required")

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        sys.exit("DEEPSEEK_API_KEY env var is required")

    base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")

    print(f"Connecting to Neon...")
    conn = psycopg2.connect(db_url)

    print(f"Fetching candidates tagged with {args.opp_id}...")
    candidates = fetch_candidates(conn, args.opp_id, args.limit)
    print(f"Found {len(candidates)} candidates")

    if not candidates:
        print("No candidates to score. Run search_candidates first.")
        conn.close()
        return

    client = OpenAI(api_key=api_key, base_url=base_url)
    results = []

    for i, c in enumerate(candidates):
        name = f"{c['first_name']} {c['last_name']}".strip()
        handle = c.get("github_handle") or "?"
        print(f"[{i+1}/{len(candidates)}] Scoring {name} (@{handle})...", end=" ")

        scores = score_candidate(client, c, args.model)
        if scores:
            overall = scores.get("overall_fit", 0)
            print(f"overall={overall:.2f}")
            update_ai_profile(conn, c["id"], scores, args.dry_run)
            results.append((c, scores))
        else:
            print("FAILED")

    # Print ranked summary
    results.sort(key=lambda x: x[1].get("overall_fit", 0), reverse=True)

    print(f"\n{'='*70}")
    print(f" CANDIDATE RANKINGS — {args.opp_id}")
    print(f"{'='*70}")
    for rank, (c, s) in enumerate(results, 1):
        name = f"{c['first_name']} {c['last_name']}".strip()
        handle = c.get("github_handle") or "?"
        overall = s.get("overall_fit", 0)
        rag = s.get("rag_expertise", 0)
        llm = s.get("llm_frameworks", 0)
        python = s.get("python_depth", 0)
        seniority = s.get("seniority_match", 0)
        london = s.get("london_commutable", 0)
        rationale = s.get("rationale", "")

        print(f"\n#{rank:<3} {overall:.2f}  {name} (@{handle})")
        print(f"     RAG={rag:.1f}  LLM={llm:.1f}  Python={python:.1f}  "
              f"Seniority={seniority:.1f}  London={london:.1f}")
        if rationale:
            print(f"     {rationale[:100]}")

    print(f"\n{'='*70}")
    print(f"Scored {len(results)}/{len(candidates)} candidates")
    if args.dry_run:
        print("[DRY RUN — no DB updates written]")

    conn.close()


if __name__ == "__main__":
    main()
