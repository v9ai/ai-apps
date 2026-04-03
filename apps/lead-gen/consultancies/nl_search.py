"""
Natural Language Company Search (Landbase-Style)
=================================================
Qwen-powered NL → structured JSON filter → Neon SQL → results.

Requires: mlx_lm.server running on port 8080 (make ft-serve TASK=role-tag)

Usage:
    python nl_search.py --query "AI SaaS companies with series B funding"
    python nl_search.py --query "large enterprise martech" --dry-run
    python nl_search.py --repl
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

LOG_FMT = "%(asctime)s [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log = logging.getLogger("nl-search")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

QWEN_SERVER_URL = os.environ.get("QWEN_SERVER_URL", "http://localhost:8080/v1")

NL_SEARCH_PROMPT = """You are a B2B lead database query parser. Convert the natural language query into a JSON filter. Respond ONLY with valid JSON, no other text.

Available filter fields and their allowed values:
- category: "PRODUCT" | "CONSULTANCY" | "AGENCY" | "STAFFING"
- min_ai_tier: 0 (any) | 1 (AI-first+) | 2 (AI-native only)
- industry: "sales_tech" | "martech" | "hr_tech" | "fintech" | "devtools" | "cybersecurity" | "healthcare" | "edtech" | "ecommerce"
- funding_stage: "bootstrapped" | "seed" | "series_a" | "series_b" | "series_c_plus" | "public"
- employee_range: "1-10" | "11-50" | "51-200" | "201-500" | "500+"
- remote_policy: "remote" | "hybrid" | "onsite"
- target_market: "smb" | "mid_market" | "enterprise" | "all"
- services_contain: ["keyword1", "keyword2"] — match services the company offers
- tags_contain: ["keyword1"] — match technology or feature tags
- min_score: float 0.0 to 1.0 — minimum enrichment quality score
- name_contains: "substring" — search company name

Rules:
- Only include filters the user explicitly or implicitly requested
- "AI companies" → min_ai_tier: 1
- "SaaS" or "software" → category: "PRODUCT"
- "consulting" → category: "CONSULTANCY"
- "large" → employee_range: "500+" or "201-500"
- "small" or "startup" → employee_range: "1-10" or "11-50"
- If user mentions specific tech (e.g. "LangChain", "RAG"), put in tags_contain
- If user mentions services (e.g. "email automation", "lead scoring"), put in services_contain
- sort_by: "score" (default) | "ai_tier" | "name"
- limit: default 20

Query: "{user_query}"

Return:
{{"filters": {{}}, "sort_by": "score", "limit": 20}}
/no_think"""


# ---------------------------------------------------------------------------
# Qwen HTTP client
# ---------------------------------------------------------------------------

def call_qwen(prompt: str, server_url: str = QWEN_SERVER_URL) -> str:
    """Call Qwen via OpenAI-compatible HTTP endpoint."""
    chat_url = server_url.rstrip("/") + "/chat/completions"
    payload = json.dumps({
        "model": "default",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 300,
        "temperature": 0.1,
    }).encode()
    headers = {"Content-Type": "application/json"}

    req = urllib.request.Request(chat_url, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read())
    return body["choices"][0]["message"]["content"]


def parse_nl_query(user_query: str) -> dict:
    """Send NL query to Qwen, get structured JSON filter back."""
    prompt = NL_SEARCH_PROMPT.replace("{user_query}", user_query)
    response = call_qwen(prompt)

    # Extract JSON from response
    json_match = re.search(r"\{[\s\S]*\}", response)
    if not json_match:
        log.warning(f"No JSON in Qwen response: {response[:200]}")
        return {"filters": {}, "sort_by": "score", "limit": 20}

    try:
        parsed = json.loads(json_match.group())
    except json.JSONDecodeError:
        log.warning(f"Invalid JSON from Qwen: {json_match.group()[:200]}")
        return {"filters": {}, "sort_by": "score", "limit": 20}

    # Normalise structure
    if "filters" not in parsed:
        parsed = {"filters": parsed, "sort_by": "score", "limit": 20}
    return parsed


# ---------------------------------------------------------------------------
# SQL generation
# ---------------------------------------------------------------------------

def build_sql(parsed: dict) -> tuple:
    """Convert parsed JSON filter to parameterized SQL. Returns (sql, params)."""
    filters = parsed.get("filters", {})
    sort_by = parsed.get("sort_by", "score")
    limit = min(parsed.get("limit", 20), 100)

    clauses = ["blocked = false", "category != 'UNKNOWN'"]
    params = []

    if "category" in filters:
        clauses.append("category = %s")
        params.append(filters["category"])

    if "min_ai_tier" in filters:
        clauses.append("ai_tier >= %s")
        params.append(int(filters["min_ai_tier"]))

    if "industry" in filters:
        # industries is stored as JSON array: '["sales_tech"]'
        clauses.append("industries::text ILIKE %s")
        params.append(f"%{filters['industry']}%")

    if "funding_stage" in filters:
        # funding stored as tag: funding:series_b
        clauses.append("tags::text ILIKE %s")
        params.append(f"%funding:{filters['funding_stage']}%")

    if "employee_range" in filters:
        clauses.append("size = %s")
        params.append(filters["employee_range"])

    if "remote_policy" in filters:
        clauses.append("tags::text ILIKE %s")
        params.append(f"%{filters['remote_policy']}%")

    if "target_market" in filters:
        clauses.append("tags::text ILIKE %s")
        params.append(f"%market:{filters['target_market']}%")

    if "services_contain" in filters:
        for kw in filters["services_contain"]:
            clauses.append("services::text ILIKE %s")
            params.append(f"%{kw}%")

    if "tags_contain" in filters:
        for kw in filters["tags_contain"]:
            clauses.append("tags::text ILIKE %s")
            params.append(f"%{kw}%")

    if "min_score" in filters:
        clauses.append("score >= %s")
        params.append(float(filters["min_score"]))

    if "name_contains" in filters:
        clauses.append("name ILIKE %s")
        params.append(f"%{filters['name_contains']}%")

    where = " AND ".join(clauses)

    sort_col = {"score": "score", "ai_tier": "ai_tier", "name": "name"}.get(sort_by, "score")
    order = "DESC" if sort_col in ("score", "ai_tier") else "ASC"

    sql = f"""
        SELECT id, name, canonical_domain, category, ai_tier, score, size,
               description, services, tags, industries
        FROM companies
        WHERE {where}
        ORDER BY {sort_col} {order} NULLS LAST
        LIMIT %s
    """
    params.append(limit)
    return sql, params


# ---------------------------------------------------------------------------
# Neon query
# ---------------------------------------------------------------------------

def get_neon_conn():
    import psycopg2
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        print("ERROR: Set NEON_DATABASE_URL", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url, sslmode="require")


def execute_search(sql: str, params: list) -> list:
    """Run SQL against Neon, return list of dicts."""
    conn = get_neon_conn()
    with conn.cursor() as cur:
        cur.execute(sql, params)
        columns = [desc[0] for desc in cur.description]
        rows = [dict(zip(columns, row)) for row in cur.fetchall()]
    conn.close()
    return rows


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def print_results(results: list, parsed: dict, user_query: str):
    """Print search results in a formatted table."""
    filters = parsed.get("filters", {})

    print(f"\n{'='*70}")
    print(f"  NL Search: \"{user_query}\"")
    print(f"{'='*70}")

    if filters:
        print(f"\n  Parsed filters:")
        for k, v in filters.items():
            print(f"    {k} = {v}")

    print(f"\n  Results: {len(results)} companies\n")

    if not results:
        print("  No matching companies found.\n")
        return

    # Header
    print(f"  {'#':>3}  {'Score':>5}  {'AI':>2}  {'Company':<30} {'Domain':<25} {'Category':<12} {'Size':<8}")
    print(f"  {'':>3}  {'':>5}  {'':>2}  {'':30s} {'':25s} {'':12s} {'':8s}")

    for i, r in enumerate(results, 1):
        name = (r.get("name") or r.get("canonical_domain") or "?")[:30]
        domain = (r.get("canonical_domain") or "?")[:25]
        category = (r.get("category") or "?")[:12]
        score = r.get("score") or 0
        ai_tier = r.get("ai_tier") or 0
        size = (r.get("size") or "?")[:8]

        print(f"  {i:3d}  {score:5.2f}  {ai_tier:2d}  {name:<30} {domain:<25} {category:<12} {size:<8}")

        # Description on second line
        desc = r.get("description") or ""
        if desc:
            print(f"       {desc[:80]}")

    print()


def print_dry_run(parsed: dict, sql: str, params: list):
    """Print parsed filter and SQL without executing."""
    print(f"\n{'='*70}")
    print(f"  DRY RUN — Parsed Filter")
    print(f"{'='*70}\n")
    print(f"  {json.dumps(parsed, indent=2)}")
    print(f"\n  SQL:\n  {sql.strip()}")
    print(f"\n  Params: {params}\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_query(user_query: str, dry_run: bool = False):
    """Parse NL query, build SQL, execute, print results."""
    log.info(f"Parsing: \"{user_query}\"")
    parsed = parse_nl_query(user_query)
    log.info(f"Filters: {json.dumps(parsed.get('filters', {}))}")

    sql, params = build_sql(parsed)

    if dry_run:
        print_dry_run(parsed, sql, params)
        return

    results = execute_search(sql, params)
    print_results(results, parsed, user_query)


def run_repl():
    """Interactive REPL loop."""
    print(f"\n  NL Company Search (Qwen @ {QWEN_SERVER_URL})")
    print(f"  Type a query, or 'quit' to exit.\n")

    while True:
        try:
            query = input("  search> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not query or query.lower() in ("quit", "exit", "q"):
            break
        try:
            run_query(query)
        except Exception as e:
            print(f"  Error: {e}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Natural language company search via Qwen"
    )
    parser.add_argument("--query", type=str, help="NL search query")
    parser.add_argument("--repl", action="store_true", help="Interactive REPL mode")
    parser.add_argument("--dry-run", action="store_true", help="Show parsed filter + SQL, don't execute")
    parser.add_argument("--server-url", type=str, default=None, help="Qwen server URL (default: QWEN_SERVER_URL or localhost:8080)")
    args = parser.parse_args()

    if args.server_url:
        global QWEN_SERVER_URL
        QWEN_SERVER_URL = args.server_url

    if args.repl:
        run_repl()
    elif args.query:
        run_query(args.query, dry_run=args.dry_run)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
