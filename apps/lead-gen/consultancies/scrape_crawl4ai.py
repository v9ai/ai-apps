"""
Crawl4AI Company Scraper
========================
Deep-crawl a company website using Crawl4AI, extract structured data.

Usage:
    python scrape_crawl4ai.py https://satalia.com/          # Full crawl + LLM extraction
    python scrape_crawl4ai.py https://satalia.com/ --no-llm  # Markdown only, no LLM
    python scrape_crawl4ai.py https://satalia.com/ --pages 5  # Limit pages
"""

import asyncio
import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

LOG_FMT = "%(asctime)s [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log = logging.getLogger("crawl4ai-scrape")


from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, BrowserConfig, CacheMode
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
from crawl4ai.content_filter_strategy import BM25ContentFilter
from crawl4ai.deep_crawling import BestFirstCrawlingStrategy
from crawl4ai.deep_crawling.filters import FilterChain, DomainFilter
from crawl4ai.deep_crawling.scorers import KeywordRelevanceScorer


RELEVANCE_KEYWORDS = [
    "about", "services", "solutions", "team", "leadership",
    "case-studies", "clients", "technology", "industries",
    "careers", "contact", "partners", "expertise",
]


async def crawl_site(
    url: str,
    max_pages: int = 15,
    max_depth: int = 2,
    use_llm: bool = False,
    llm_provider: str = "anthropic/claude-sonnet-4-6",
) -> dict:
    domain = urlparse(url).netloc

    browser_config = BrowserConfig(
        headless=True,
        verbose=False,
    )

    content_filter = BM25ContentFilter(
        user_query="AI optimization consultancy services team industries technology",
        bm25_threshold=1.0,
    )

    markdown_generator = DefaultMarkdownGenerator(
        content_filter=content_filter,
    )

    crawl_strategy = BestFirstCrawlingStrategy(
        max_depth=max_depth,
        max_pages=max_pages,
        filter_chain=FilterChain([
            DomainFilter(allowed_domains=[domain]),
        ]),
        url_scorer=KeywordRelevanceScorer(keywords=RELEVANCE_KEYWORDS),
    )

    run_config = CrawlerRunConfig(
        deep_crawl_strategy=crawl_strategy,
        markdown_generator=markdown_generator,
        cache_mode=CacheMode.BYPASS,
        word_count_threshold=10,
        verbose=False,
    )

    pages = []

    log.info(f"Starting deep crawl of {url} (max_pages={max_pages}, max_depth={max_depth})")

    async with AsyncWebCrawler(config=browser_config) as crawler:
        results = await crawler.arun(url=url, config=run_config)

        if not isinstance(results, list):
            results = [results]

        for i, result in enumerate(results):
            if not result.success:
                log.warning(f"Failed: {result.url} — {result.error_message}")
                continue

            raw_md = result.markdown.raw_markdown if result.markdown else ""
            fit_md = result.markdown.fit_markdown if result.markdown else ""

            page_data = {
                "url": result.url,
                "status_code": result.status_code,
                "raw_markdown_len": len(raw_md),
                "fit_markdown": fit_md or raw_md[:3000],
                "links_internal": len(result.links.get("internal", [])) if result.links else 0,
                "links_external": len(result.links.get("external", [])) if result.links else 0,
            }
            pages.append(page_data)
            log.info(f"  [{i+1}] {result.url} — {result.status_code} — "
                     f"raw={len(raw_md)} fit={len(fit_md)} chars")

    log.info(f"Crawled {len(pages)} pages from {domain}")

    output = {
        "domain": domain,
        "url": url,
        "pages_crawled": len(pages),
        "pages": pages,
    }

    if use_llm and pages:
        log.info(f"Running LLM extraction with {llm_provider}...")
        extraction = await extract_with_llm(url, pages, llm_provider)
        output["extraction"] = extraction

    return output


async def extract_with_llm(
    url: str,
    pages: list[dict],
    provider: str,
) -> dict:
    from crawl4ai.extraction_strategy import LLMExtractionStrategy
    from crawl4ai.async_configs import LLMConfig
    from pydantic import BaseModel

    class CompanyProfile(BaseModel):
        name: str = ""
        description: str = ""
        services: list[str] = []
        industries: list[str] = []
        technologies: list[str] = []
        ai_capabilities: list[str] = []
        office_locations: list[str] = []
        employee_range: str = ""
        founding_year: Optional[int] = None
        parent_company: Optional[str] = None
        key_clients: list[str] = []
        team_leaders: list[dict] = []

    combined_md = "\n\n---\n\n".join(
        f"## Page: {p['url']}\n\n{p['fit_markdown']}"
        for p in pages
        if p["fit_markdown"]
    )

    if not combined_md.strip():
        return {"error": "No content to extract from"}

    strategy = LLMExtractionStrategy(
        llm_config=LLMConfig(
            provider=provider,
            api_token=f"env:ANTHROPIC_API_KEY",
        ),
        schema=CompanyProfile.model_json_schema(),
        extraction_type="schema",
        instruction=(
            "Extract a comprehensive company profile from the crawled pages. "
            "Merge information across all pages into a single profile. "
            "Focus on: what the company does, services offered, industries served, "
            "AI/ML capabilities, team leaders, and office locations."
        ),
        chunk_token_threshold=4096,
        overlap_rate=0.1,
        force_json_response=True,
    )

    async with AsyncWebCrawler(config=BrowserConfig(headless=True)) as crawler:
        result = await crawler.arun(
            url=f"raw://{combined_md}",
            config=CrawlerRunConfig(
                extraction_strategy=strategy,
                cache_mode=CacheMode.BYPASS,
            ),
        )

    if result.extracted_content:
        try:
            data = json.loads(result.extracted_content)
            return data if isinstance(data, dict) else data[0] if data else {}
        except (json.JSONDecodeError, IndexError):
            return {"raw": result.extracted_content}

    return {"error": "LLM extraction returned no content"}


def print_results(output: dict):
    print("\n" + "=" * 70)
    print(f"  CRAWL RESULTS: {output['domain']}")
    print(f"  Pages crawled: {output['pages_crawled']}")
    print("=" * 70)

    for i, page in enumerate(output["pages"]):
        print(f"\n{'─' * 60}")
        print(f"  Page {i+1}: {page['url']}")
        print(f"  Status: {page['status_code']} | "
              f"Raw: {page['raw_markdown_len']} chars | "
              f"Links: {page['links_internal']} int / {page['links_external']} ext")
        print(f"{'─' * 60}")

        md = page.get("fit_markdown", "")
        if md:
            lines = md.strip().split("\n")
            preview = "\n".join(lines[:50])
            print(preview)
            if len(lines) > 50:
                print(f"\n  ... ({len(lines) - 50} more lines)")
        else:
            print("  (no content)")

    if "extraction" in output:
        print(f"\n{'=' * 70}")
        print("  LLM EXTRACTION")
        print(f"{'=' * 70}")
        print(json.dumps(output["extraction"], indent=2, ensure_ascii=False))


async def main():
    parser = argparse.ArgumentParser(description="Crawl4AI Company Scraper")
    parser.add_argument("url", help="Company website URL to crawl")
    parser.add_argument("--no-llm", action="store_true", help="Skip LLM extraction")
    parser.add_argument("--pages", type=int, default=15, help="Max pages to crawl")
    parser.add_argument("--depth", type=int, default=2, help="Max crawl depth")
    parser.add_argument("--provider", default="anthropic/claude-sonnet-4-6",
                        help="LLM provider for extraction")
    parser.add_argument("--json", action="store_true", help="Output raw JSON only")
    args = parser.parse_args()

    output = await crawl_site(
        url=args.url,
        max_pages=args.pages,
        max_depth=args.depth,
        use_llm=not args.no_llm,
        llm_provider=args.provider,
    )

    if args.json:
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        print_results(output)


if __name__ == "__main__":
    asyncio.run(main())
