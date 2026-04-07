"""
Natural Language Company Discovery (Landbase-Style)
====================================================
Qwen-powered NL → structured JSON filter → Neon SQL → results.
With --discover: also generates Brave Search queries, scrapes + classifies
new companies via Qwen, and merges results.

Requires: mlx_lm.server running on port 8080 (make ft-serve TASK=role-tag)

Usage:
    python nl_search.py --query "AI SaaS companies in sales tech"
    python nl_search.py --query "healthcare NLP consultancy" --discover
    python nl_search.py --query "large enterprise martech" --dry-run
    python nl_search.py --repl
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
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

NL_SEARCH_PROMPT = """You are a B2B lead database query parser AND web search query generator.
Convert the natural language query into a JSON object with two parts:
1. Database filters to search existing companies
2. Brave Search queries to discover NEW companies matching the intent

Respond ONLY with valid JSON, no other text.

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
- min_intent_score: 0-100 — minimum buying intent score
- has_hiring_intent: true — companies with hiring signals
- has_tech_adoption: true — companies adopting new tech
- has_decision_makers: true — has senior decision-maker contacts
- min_contacts: int — minimum number of contacts
- min_github_ai_score: float 0-1 — minimum GitHub AI activity score
- has_recent_jobs: true — has LinkedIn job postings in last 60 days
- never_contacted: true — companies not yet contacted
- name_contains: "substring" — search company name

Rules:
- Only include filters the user explicitly or implicitly requested
- "AI companies" -> min_ai_tier: 1
- "SaaS" or "software" -> category: "PRODUCT"
- "consulting" -> category: "CONSULTANCY"
- "large" -> employee_range: "500+" or "201-500"
- "small" or "startup" -> employee_range: "1-10" or "11-50"
- "hiring" or "growing team" -> has_hiring_intent: true
- "buying signals" or "in-market" -> min_intent_score: 30
- "with contacts" or "reachable" -> min_contacts: 1
- "untouched" or "new leads" -> never_contacted: true
- If user mentions specific tech (e.g. "LangChain", "RAG"), put in tags_contain
- If user mentions services (e.g. "email automation", "lead scoring"), put in services_contain
- brave_queries: ALWAYS generate 2-3 targeted Brave Search queries to find company websites (not articles or listicles) matching the user's intent
- sort_by: "score" (default) | "ai_tier" | "intent" | "name"
- limit: default 20

Query: "{user_query}"

Return:
{{"filters": {{}}, "brave_queries": ["query1", "query2"], "sort_by": "score", "limit": 20}}
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
        "max_tokens": 400,
        "temperature": 0.1,
    }).encode()
    headers = {"Content-Type": "application/json"}

    req = urllib.request.Request(chat_url, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read())
    return body["choices"][0]["message"]["content"]


def parse_nl_query(user_query: str) -> dict:
    """Send NL query to Qwen, get structured JSON filter + brave queries."""
    prompt = NL_SEARCH_PROMPT.replace("{user_query}", user_query)
    t0 = time.time()
    response = call_qwen(prompt)
    qwen_ms = int((time.time() - t0) * 1000)
    log.info(f"Qwen response in {qwen_ms}ms")

    json_match = re.search(r"\{[\s\S]*\}", response)
    if not json_match:
        log.warning(f"No JSON in Qwen response: {response[:200]}")
        return {"filters": {}, "brave_queries": [], "sort_by": "score", "limit": 20}

    try:
        parsed = json.loads(json_match.group())
    except json.JSONDecodeError:
        log.warning(f"Invalid JSON from Qwen: {json_match.group()[:200]}")
        return {"filters": {}, "brave_queries": [], "sort_by": "score", "limit": 20}

    if "filters" not in parsed:
        parsed = {"filters": parsed, "brave_queries": [], "sort_by": "score", "limit": 20}
    if "brave_queries" not in parsed:
        parsed["brave_queries"] = []
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

    # -- Direct company columns --

    if "category" in filters:
        clauses.append("category = %s")
        params.append(filters["category"])

    if "min_ai_tier" in filters:
        clauses.append("ai_tier >= %s")
        params.append(int(filters["min_ai_tier"]))

    if "industry" in filters:
        clauses.append("industries::text ILIKE %s")
        params.append(f"%{filters['industry']}%")

    if "funding_stage" in filters:
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

    # -- Intent signals (aggregated on companies table) --

    if "min_intent_score" in filters:
        clauses.append("intent_score >= %s")
        params.append(int(filters["min_intent_score"]))

    # -- Intent signal subqueries --

    if filters.get("has_hiring_intent"):
        clauses.append(
            "id IN (SELECT DISTINCT company_id FROM intent_signals "
            "WHERE signal_type = 'hiring_intent' AND confidence > 0.5)"
        )

    if filters.get("has_tech_adoption"):
        clauses.append(
            "id IN (SELECT DISTINCT company_id FROM intent_signals "
            "WHERE signal_type = 'tech_adoption' AND confidence > 0.5)"
        )

    # -- Contact subqueries --

    if "min_contacts" in filters:
        clauses.append(
            "id IN (SELECT company_id FROM contacts "
            "WHERE do_not_contact = false "
            "GROUP BY company_id HAVING COUNT(*) >= %s)"
        )
        params.append(int(filters["min_contacts"]))

    if filters.get("has_decision_makers"):
        clauses.append(
            "id IN (SELECT company_id FROM contacts "
            "WHERE is_decision_maker = true AND do_not_contact = false)"
        )

    # -- GitHub scores (direct columns) --

    if "min_github_ai_score" in filters:
        clauses.append("github_ai_score >= %s")
        params.append(float(filters["min_github_ai_score"]))

    # -- LinkedIn subquery --

    if filters.get("has_recent_jobs"):
        clauses.append(
            "id IN (SELECT company_id FROM linkedin_posts "
            "WHERE type = 'job' AND posted_at > (NOW() - INTERVAL '60 days')::text)"
        )

    # -- Engagement subquery --

    if filters.get("never_contacted"):
        clauses.append(
            "id NOT IN (SELECT DISTINCT c.company_id FROM contacts c "
            "JOIN contact_emails ce ON ce.contact_id = c.id)"
        )

    where = " AND ".join(clauses)

    sort_map = {
        "score": "score DESC",
        "ai_tier": "ai_tier DESC, score DESC",
        "intent": "intent_score DESC NULLS LAST, score DESC",
        "name": "name ASC",
    }
    order_clause = sort_map.get(sort_by, "score DESC")

    sql = f"""
        SELECT id, name, canonical_domain, category, ai_tier, score, size,
               description, services, tags, industries,
               intent_score, intent_signals_count, intent_top_signal,
               github_ai_score, github_hiring_score, github_activity_score
        FROM companies
        WHERE {where}
        ORDER BY {order_clause} NULLS LAST
        LIMIT %s
    """
    params.append(limit)
    return sql, params


def build_id_sql(company_ids: list) -> tuple:
    """Build SQL to fetch specific company IDs (for discovered companies)."""
    placeholders = ",".join(["%s"] * len(company_ids))
    sql = f"""
        SELECT id, name, canonical_domain, category, ai_tier, score, size,
               description, services, tags, industries,
               intent_score, intent_signals_count, intent_top_signal,
               github_ai_score, github_hiring_score, github_activity_score
        FROM companies
        WHERE id IN ({placeholders})
        ORDER BY score DESC NULLS LAST
    """
    return sql, company_ids


# ---------------------------------------------------------------------------
# Neon helpers
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


def get_existing_domains() -> set:
    """Get all canonical_domain values from Neon for dedup."""
    conn = get_neon_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT canonical_domain FROM companies WHERE canonical_domain IS NOT NULL")
        domains = {row[0].lower() for row in cur.fetchall() if row[0]}
    conn.close()
    return domains


# ---------------------------------------------------------------------------
# Discovery pipeline (Brave Search → Scrape → Qwen classify → Neon)
# ---------------------------------------------------------------------------

def discover_from_brave(brave_queries: list, existing_domains: set) -> list:
    """Run Brave Search, scrape, classify with Qwen, insert into Neon. Returns new company IDs."""
    # Import from sibling modules
    sys.path.insert(0, str(Path(__file__).parent))
    from discover_brave import search_brave, extract_companies, normalize_domain, domain_to_key
    from enrich_brave import (
        scrape_all, classify_companies, update_neon,
        CompanyRecord,
    )

    # 1. Brave Search
    log.info(f"Discovery: running {len(brave_queries)} Brave queries...")
    raw_results = search_brave(brave_queries, count=5)
    if not raw_results:
        log.info("Discovery: no Brave results")
        return []

    # 2. Extract companies + dedup against existing Neon domains
    companies = extract_companies(raw_results)
    new_companies = []
    for c in companies:
        domain = normalize_domain(c.website)
        if domain and domain not in existing_domains:
            new_companies.append(c)
    log.info(f"Discovery: {len(new_companies)} new companies (after dedup vs {len(existing_domains)} existing)")

    if not new_companies:
        return []

    # 3. Insert stub records into Neon
    conn = get_neon_conn()
    now = datetime.now(timezone.utc).isoformat()
    new_ids = []
    new_records = []

    with conn.cursor() as cur:
        for c in new_companies:
            domain = normalize_domain(c.website)
            key = domain_to_key(domain)
            try:
                cur.execute(
                    """INSERT INTO companies (key, name, website, canonical_domain, category, ai_tier, score, created_at, updated_at, blocked)
                       VALUES (%s, %s, %s, %s, 'UNKNOWN', 0, 0.5, %s, %s, false)
                       ON CONFLICT (key) DO NOTHING
                       RETURNING id""",
                    (key, c.name, c.website, domain, now, now),
                )
                row = cur.fetchone()
                if row:
                    new_ids.append(row[0])
                    new_records.append(CompanyRecord(
                        id=row[0], key=key, name=c.name,
                        website=c.website, canonical_domain=domain,
                    ))
                    # Add discovery provenance fact
                    cur.execute(
                        """INSERT INTO company_facts (company_id, field, value_text, confidence, source_type, observed_at, method)
                           VALUES (%s, 'discovery_source', %s, 0.9, 'BRAVE_SEARCH', %s, 'NL_SEARCH')""",
                        (row[0], f"nl_search: {c.name}", now),
                    )
            except Exception as e:
                log.warning(f"Insert error for {c.name}: {e}")
                conn.rollback()
                continue
        conn.commit()
    conn.close()

    log.info(f"Discovery: inserted {len(new_ids)} new companies into Neon")

    if not new_records:
        return new_ids

    # 4. Scrape + classify with Qwen
    log.info(f"Discovery: scraping {len(new_records)} websites...")
    scraped = asyncio.run(scrape_all(new_records))

    log.info("Discovery: classifying with Qwen...")
    classified = classify_companies(scraped)

    # 5. Update Neon with enrichment
    enriched = [c for c in classified if c.enrichment]
    if enriched:
        update_neon(classified)
        log.info(f"Discovery: enriched {len(enriched)}/{len(new_records)} companies")

    return new_ids


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def format_company_line(i: int, r: dict, tag: str = "") -> str:
    """Format a single company result line."""
    name = (r.get("name") or r.get("canonical_domain") or "?")[:30]
    domain = (r.get("canonical_domain") or "?")[:22]
    category = (r.get("category") or "?")[:12]
    score = r.get("score") or 0
    ai_tier = r.get("ai_tier") or 0
    size = (r.get("size") or "?")[:8]
    tag_str = f"  {tag}" if tag else ""

    line = f"  {i:3d}  {score:5.2f}  {ai_tier:2d}  {name:<30} {domain:<22} {category:<12} {size:<8}{tag_str}"

    # Intent signals
    intent_score = r.get("intent_score")
    signals_count = r.get("intent_signals_count") or 0
    github_ai = r.get("github_ai_score")

    extras = []
    if intent_score and intent_score > 0:
        extras.append(f"intent={int(intent_score)}")
    if signals_count > 0:
        extras.append(f"{signals_count} signals")
    if github_ai and github_ai > 0:
        extras.append(f"gh_ai={github_ai:.2f}")

    desc = r.get("description") or ""
    if extras:
        line += f"\n       [{', '.join(extras)}]"
    if desc:
        line += f"\n       {desc[:80]}"

    return line


def print_results(existing: list, discovered: list, parsed: dict, user_query: str):
    """Print search results with existing and discovered sections."""
    filters = parsed.get("filters", {})
    brave_queries = parsed.get("brave_queries", [])

    print(f"\n{'='*70}")
    print(f"  NL Search: \"{user_query}\"")
    print(f"{'='*70}")

    if filters:
        print(f"\n  Parsed filters:")
        for k, v in filters.items():
            print(f"    {k} = {v}")

    if brave_queries:
        print(f"\n  Brave queries:")
        for q in brave_queries:
            print(f"    \"{q}\"")

    # Existing results
    if existing:
        print(f"\n  -- Existing (Neon) -- {len(existing)} companies\n")
        print(f"  {'#':>3}  {'Score':>5}  {'AI':>2}  {'Company':<30} {'Domain':<22} {'Category':<12} {'Size':<8}")
        for i, r in enumerate(existing, 1):
            print(format_company_line(i, r))
    else:
        print(f"\n  -- Existing (Neon) -- 0 companies")

    # Discovered results
    if discovered:
        offset = len(existing)
        print(f"\n  -- Discovered (Brave + Qwen) -- {len(discovered)} new companies\n")
        for i, r in enumerate(discovered, offset + 1):
            print(format_company_line(i, r, tag="[NEW]"))

    total = len(existing) + len(discovered)
    if total == 0:
        print(f"\n  No matching companies found.\n")
    else:
        print(f"\n  Total: {total} companies", end="")
        if discovered:
            print(f" ({len(existing)} existing + {len(discovered)} discovered)")
        else:
            print()
    print()


def print_dry_run(parsed: dict, sql: str, params: list):
    """Print parsed filter and SQL without executing."""
    print(f"\n{'='*70}")
    print(f"  DRY RUN")
    print(f"{'='*70}\n")
    print(f"  Parsed:\n  {json.dumps(parsed, indent=2)}")
    print(f"\n  SQL:\n  {sql.strip()}")
    print(f"\n  Params: {params}")

    brave = parsed.get("brave_queries", [])
    if brave:
        print(f"\n  Brave queries (would run with --discover):")
        for q in brave:
            print(f"    \"{q}\"")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_query(user_query: str, dry_run: bool = False, discover: bool = False):
    """Parse NL query, search existing DB, optionally discover new companies."""
    log.info(f"Parsing: \"{user_query}\"")
    parsed = parse_nl_query(user_query)
    log.info(f"Filters: {json.dumps(parsed.get('filters', {}))}")

    brave_queries = parsed.get("brave_queries", [])
    if brave_queries:
        log.info(f"Brave queries: {brave_queries}")

    sql, params = build_sql(parsed)

    if dry_run:
        print_dry_run(parsed, sql, params)
        return

    # Path 1: Existing companies
    t0 = time.time()
    existing = execute_search(sql, params)
    sql_ms = int((time.time() - t0) * 1000)
    log.info(f"Neon: {len(existing)} existing results in {sql_ms}ms")

    # Path 2: Web discovery
    discovered = []
    if discover and brave_queries:
        existing_domains = get_existing_domains()
        new_ids = discover_from_brave(brave_queries, existing_domains)
        if new_ids:
            id_sql, id_params = build_id_sql(new_ids)
            discovered = execute_search(id_sql, id_params)
            # Remove any that are already in existing (by domain)
            existing_domains_set = {r.get("canonical_domain", "").lower() for r in existing}
            discovered = [r for r in discovered if r.get("canonical_domain", "").lower() not in existing_domains_set]
    elif discover and not brave_queries:
        log.info("Discovery skipped: Qwen did not generate brave_queries")

    print_results(existing, discovered, parsed, user_query)


def run_repl(discover: bool = False):
    """Interactive REPL loop."""
    mode = "search+discover" if discover else "search"
    print(f"\n  NL Company Search (Qwen @ {QWEN_SERVER_URL}) [{mode}]")
    print(f"  Type a query, or 'quit' to exit.")
    if not discover:
        print(f"  Prefix with 'd ' to discover: d AI healthcare consultancy")
    print()

    while True:
        try:
            raw = input("  search> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not raw or raw.lower() in ("quit", "exit", "q"):
            break

        # 'd ' prefix triggers discovery in non-discover mode
        do_discover = discover
        query = raw
        if raw.startswith("d "):
            do_discover = True
            query = raw[2:].strip()

        try:
            run_query(query, discover=do_discover)
        except Exception as e:
            print(f"  Error: {e}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Natural language company discovery via Qwen + Brave Search"
    )
    parser.add_argument("--query", type=str, help="NL search query")
    parser.add_argument("--discover", action="store_true",
                        help="Enable Brave Search discovery + Qwen enrichment for new companies")
    parser.add_argument("--repl", action="store_true", help="Interactive REPL mode")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show parsed filter + SQL + brave queries, don't execute")
    parser.add_argument("--server-url", type=str, default=None,
                        help="Qwen server URL (default: QWEN_SERVER_URL or localhost:8080)")
    args = parser.parse_args()

    if args.server_url:
        global QWEN_SERVER_URL
        QWEN_SERVER_URL = args.server_url

    if args.repl:
        run_repl(discover=args.discover)
    elif args.query:
        run_query(args.query, dry_run=args.dry_run, discover=args.discover)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
