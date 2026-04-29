"""One-shot CLI: discover NEW companies similar to an existing row.

Reads the `companies` row for `--key`, deterministically builds a seed_query
plus facets (vertical / size_band / keywords) from its description, services,
industries, and tags, then invokes the `company_discovery` LangGraph
in-process. New candidates are INSERTed into `companies` with
tags=['discovery-candidate', ...].

Usage (from apps/lead-gen/backend/):
    uv run python scripts/invoke_company_discovery_lookalike.py
    uv run python scripts/invoke_company_discovery_lookalike.py --key acquisity-ai
    uv run python scripts/invoke_company_discovery_lookalike.py --key foo --dry-run
    uv run python scripts/invoke_company_discovery_lookalike.py --key foo --crawl

`--crawl` opts into a crawl4ai pass over the source company's website to
augment keywords. Useful when the DB row is sparse. Skipped by default since
most rows already have description + deep_analysis.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

# ── Load env vars ─────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[2]  # apps/lead-gen/
_env_local = _ROOT / ".env.local"
_env_backend = Path(__file__).resolve().parents[1] / ".env"

for _envfile in (_env_backend, _env_local):
    if _envfile.exists():
        for line in _envfile.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and v and not os.environ.get(k):
                os.environ[k] = v

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


# ── DB read ──────────────────────────────────────────────────────────────

def _fetch_company(key: str) -> dict | None:
    import psycopg

    dsn = os.environ.get("NEON_DATABASE_URL", "")
    if not dsn:
        raise RuntimeError("NEON_DATABASE_URL not set in .env / .env.local")

    with psycopg.connect(dsn, autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, key, name, canonical_domain, website,
                       category, ai_tier, tags, services, industries,
                       description, deep_analysis
                FROM companies
                WHERE key = %s
                """,
                (key,),
            )
            row = cur.fetchone()

    if not row:
        return None
    cols = [
        "id", "key", "name", "canonical_domain", "website",
        "category", "ai_tier", "tags", "services", "industries",
        "description", "deep_analysis",
    ]
    return dict(zip(cols, row))


def _parse_json_array(raw) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw if x]
    try:
        parsed = json.loads(raw)
        return [str(x) for x in parsed if x] if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


# ── Seed-query construction ──────────────────────────────────────────────

_SIZE_BAND_VALUES = {"seed", "startup", "smb", "midmarket", "enterprise"}
_TAG_PREFIXES_TO_DROP = ("pricing:", "market:", "funding:", "remote:")


def _extract_size_band(tags: list[str]) -> str | None:
    for t in tags:
        if isinstance(t, str) and t.startswith("market:"):
            v = t.split(":", 1)[1].strip().lower()
            v = {"smb": "smb", "mid_market": "midmarket", "midmarket": "midmarket",
                 "enterprise": "enterprise", "seed": "seed", "startup": "startup"}.get(v)
            if v in _SIZE_BAND_VALUES:
                return v
    return None


def _filter_tag_keywords(tags: list[str]) -> list[str]:
    out: list[str] = []
    for t in tags:
        if not isinstance(t, str):
            continue
        if any(t.startswith(p) for p in _TAG_PREFIXES_TO_DROP):
            continue
        out.append(t)
    return out


def _build_payload(company: dict, extra_keywords: list[str] | None = None) -> dict:
    name = company.get("name") or ""
    description = (company.get("description") or "").strip()
    tags = _parse_json_array(company.get("tags"))
    services = _parse_json_array(company.get("services"))
    industries = _parse_json_array(company.get("industries"))

    vertical = industries[0] if industries else None
    size_band = _extract_size_band(tags)
    tag_keywords = _filter_tag_keywords(tags)

    keywords: list[str] = []
    seen_lower: set[str] = set()
    for kw in services + industries + tag_keywords + (extra_keywords or []):
        kw_clean = (kw or "").strip()
        if not kw_clean:
            continue
        low = kw_clean.lower()
        if low in seen_lower:
            continue
        seen_lower.add(low)
        keywords.append(kw_clean)
    keywords = keywords[:12]

    services_blurb = ", ".join(services[:5]) if services else ""
    industries_blurb = ", ".join(industries[:3]) if industries else ""
    seed_parts = [f"Companies similar to {name}" if name else "Lookalike companies"]
    if description:
        seed_parts.append(f"({description})")
    if services_blurb:
        seed_parts.append(f"Services: {services_blurb}")
    if industries_blurb:
        seed_parts.append(f"Industries: {industries_blurb}")
    seed_query = " — ".join(seed_parts)

    return {
        "seed_query": seed_query,
        "vertical": vertical,
        "geography": None,
        "size_band": size_band,
        "keywords": keywords,
    }


# ── Optional crawl4ai augmentation ────────────────────────────────────────

async def _augment_with_crawl(website: str | None) -> list[str]:
    """Crawl the source company's site and pull extra keywords from headings/text.

    Lightweight: 4 pages max, depth 1. Mirrors the crawl4ai config in
    `consultancies/scrape_crawl4ai.py` but skips LLM extraction — we only
    need raw markdown to mine for additional topic keywords.
    """
    if not website:
        return []
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
    from crawl4ai.deep_crawling import BestFirstCrawlingStrategy
    from crawl4ai.deep_crawling.filters import DomainFilter, FilterChain
    from crawl4ai.deep_crawling.scorers import (
        CompositeScorer,
        KeywordRelevanceScorer,
        PathDepthScorer,
    )
    from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator

    domain = urlparse(website).netloc
    if not domain:
        return []

    keywords_topics = [
        "about", "product", "platform", "solution", "services",
        "use-cases", "customers", "pricing",
    ]
    scorer = CompositeScorer(scorers=[
        KeywordRelevanceScorer(keywords=keywords_topics, weight=0.7),
        PathDepthScorer(optimal_depth=1, weight=0.3),
    ])
    strategy = BestFirstCrawlingStrategy(
        max_depth=1,
        max_pages=4,
        filter_chain=FilterChain([DomainFilter(allowed_domains=[domain])]),
        url_scorer=scorer,
    )
    run_config = CrawlerRunConfig(
        deep_crawl_strategy=strategy,
        markdown_generator=DefaultMarkdownGenerator(),
        cache_mode=CacheMode.BYPASS,
        word_count_threshold=10,
        excluded_tags=["nav", "footer", "header", "aside", "script", "style", "form", "iframe"],
        verbose=False,
    )

    blob = ""
    async with AsyncWebCrawler(config=BrowserConfig(headless=True, verbose=False)) as crawler:
        results = await crawler.arun(url=website, config=run_config)
        if not isinstance(results, list):
            results = [results]
        for r in results:
            if r.success and r.markdown:
                blob += "\n" + (r.markdown.fit_markdown or r.markdown.raw_markdown or "")

    import re
    headings = re.findall(r"^#{1,3}\s+(.{3,80})$", blob, flags=re.MULTILINE)
    cleaned: list[str] = []
    seen: set[str] = set()
    for h in headings:
        h_clean = re.sub(r"[^\w\s/&-]", "", h).strip()
        low = h_clean.lower()
        if 6 <= len(h_clean) <= 60 and low not in seen:
            seen.add(low)
            cleaned.append(h_clean)
    return cleaned[:8]


# ── Reporting ─────────────────────────────────────────────────────────────

def _print_summary(payload: dict, result: dict) -> None:
    print("=" * 70)
    print("  company_discovery — lookalikes")
    print("-" * 70)
    print(f"  seed_query : {payload['seed_query']}")
    print(f"  vertical   : {payload.get('vertical')}")
    print(f"  size_band  : {payload.get('size_band')}")
    print(f"  keywords   : {', '.join(payload.get('keywords') or [])}")
    print("-" * 70)

    if result.get("_error"):
        print(f"  ERROR: {result['_error']}")
        print("=" * 70)
        return

    summary = result.get("summary") or {}
    candidates = result.get("candidates") or []
    scored = result.get("scored") or []
    inserted_ids = summary.get("inserted_ids") or []

    print(
        f"  candidates={summary.get('candidates_count', len(candidates))} | "
        f"after_dedupe={summary.get('filtered_count', 0)} | "
        f"after_score={summary.get('scored_count', len(scored))} | "
        f"inserted={summary.get('inserted_count', len(inserted_ids))} | "
        f"existing={len(summary.get('existing_ids') or [])} | "
        f"skipped_existing={summary.get('skipped_existing', 0)} | "
        f"skipped_blocked={summary.get('skipped_blocked', 0)}"
    )
    if scored:
        print("-" * 70)
        print(f"  inserted candidates ({len(scored)}):")
        for c in scored:
            mark = " *" if int(c.get("_id") or 0) in inserted_ids else ""
            print(f"    - {c.get('name'):<32}  {c.get('domain'):<40}  pre={c.get('pre_score', 0):.2f}{mark}")
            why = (c.get("why") or "").strip()
            if why:
                print(f"        why: {why}")
    if inserted_ids:
        print("-" * 70)
        print(f"  inserted_ids: {inserted_ids}")
    print("=" * 70)


# ── Main ──────────────────────────────────────────────────────────────────

async def _run_graph(payload: dict) -> dict:
    from leadgen_agent.company_discovery_graph import graph
    return await graph.ainvoke(payload)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Discover companies similar to an existing companies row.",
    )
    parser.add_argument("--key", default="acquisity-ai", help="Source company key (default: acquisity-ai)")
    parser.add_argument("--dry-run", action="store_true", help="Build payload, print, do NOT invoke graph")
    parser.add_argument("--crawl", action="store_true", help="Augment keywords via crawl4ai over the source site")
    parser.add_argument("--json", action="store_true", help="Emit full graph result as JSON")
    args = parser.parse_args()

    company = _fetch_company(args.key)
    if not company:
        print(f"ERROR: no companies row with key={args.key!r}", file=sys.stderr)
        return 2

    print(f"source: id={company['id']} key={company['key']} name={company['name']!r} "
          f"category={company['category']} ai_tier={company['ai_tier']}")

    extra_keywords: list[str] = []
    if args.crawl:
        try:
            extra_keywords = asyncio.run(_augment_with_crawl(company.get("website")))
            if extra_keywords:
                print(f"crawl4ai keywords: {', '.join(extra_keywords)}")
        except Exception as e:  # noqa: BLE001
            print(f"crawl4ai failed (continuing without): {e}", file=sys.stderr)

    payload = _build_payload(company, extra_keywords=extra_keywords)

    if args.dry_run:
        print("-" * 70)
        print("DRY RUN — payload that would be sent to graph:")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 0

    result = asyncio.run(_run_graph(payload))

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
    else:
        _print_summary(payload, result)
    return 1 if result.get("_error") else 0


if __name__ == "__main__":
    sys.exit(main())
