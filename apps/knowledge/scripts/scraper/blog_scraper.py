"""Fetch AI/ML blog posts via httpx + readability extraction.

Scrapes a curated seed list of AI engineering blogs, extracts main content,
and converts to clean markdown.

Usage (as module):
    from scraper.blog_scraper import scrape_blogs
    articles = await scrape_blogs(limit=20)
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass

import httpx

log = logging.getLogger(__name__)

# Curated AI/ML engineering blog feeds and sitemaps
SEED_URLS: list[dict[str, str]] = [
    {"name": "HuggingFace Blog", "url": "https://huggingface.co/blog", "selector": "article"},
    {"name": "LangChain Blog", "url": "https://blog.langchain.dev/", "selector": "article"},
    {"name": "Weights & Biases", "url": "https://wandb.ai/fully-connected", "selector": "article"},
    {"name": "Anthropic Research", "url": "https://www.anthropic.com/research", "selector": "article"},
    {"name": "OpenAI Blog", "url": "https://openai.com/blog", "selector": "article"},
    {"name": "Chip Huyen", "url": "https://huyenchip.com/blog/", "selector": "article"},
    {"name": "Lilian Weng", "url": "https://lilianweng.github.io/", "selector": "article"},
    {"name": "Jay Alammar", "url": "https://jalammar.github.io/", "selector": "article"},
    {"name": "Sebastian Raschka", "url": "https://sebastianraschka.com/blog/", "selector": "article"},
    {"name": "Eugene Yan", "url": "https://eugeneyan.com/writing/", "selector": "article"},
    {"name": "Hamel Husain", "url": "https://hamel.dev/", "selector": "article"},
    {"name": "Simon Willison", "url": "https://simonwillison.net/", "selector": "article"},
    {"name": "MLX Community", "url": "https://ml-explore.github.io/mlx/", "selector": "article"},
    {"name": "vLLM Blog", "url": "https://blog.vllm.ai/", "selector": "article"},
    {"name": "DeepLearning.AI", "url": "https://www.deeplearning.ai/the-batch/", "selector": "article"},
]


@dataclass
class ScrapedArticle:
    """A scraped blog article."""
    title: str
    url: str
    source: str
    content: str  # raw HTML or text
    word_count: int


def extract_title(html: str) -> str:
    """Extract title from HTML."""
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.DOTALL | re.IGNORECASE)
    if m:
        title = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        # Clean up common suffixes
        for sep in [" | ", " - ", " — ", " :: "]:
            if sep in title:
                title = title.split(sep)[0].strip()
        return title
    return ""


def extract_article_text(html: str) -> str:
    """Extract main article text from HTML. Simple heuristic extraction."""
    # Try to find main content area
    for tag in ["<article", "<main", '<div class="post"', '<div class="content"',
                '<div class="entry"', '<div class="article"']:
        idx = html.lower().find(tag.lower())
        if idx != -1:
            # Find the closing tag
            depth = 0
            tag_name = tag.split("<")[1].split()[0].split(">")[0]
            pos = idx
            while pos < len(html):
                open_tag = html.lower().find(f"<{tag_name}", pos + 1)
                close_tag = html.lower().find(f"</{tag_name}", pos + 1)
                if close_tag == -1:
                    break
                if open_tag != -1 and open_tag < close_tag:
                    depth += 1
                    pos = open_tag
                elif depth > 0:
                    depth -= 1
                    pos = close_tag
                else:
                    html = html[idx:close_tag + len(f"</{tag_name}>")]
                    break

    # Strip HTML tags, keep text
    text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<nav[^>]*>.*?</nav>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<footer[^>]*>.*?</footer>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<header[^>]*>.*?</header>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)

    return text.strip()


def extract_links(html: str, base_url: str) -> list[str]:
    """Extract article links from a blog index page."""
    links = []
    for m in re.finditer(r'href="([^"]*)"', html):
        href = m.group(1)
        if href.startswith("/"):
            # Relative URL
            from urllib.parse import urljoin
            href = urljoin(base_url, href)
        if href.startswith("http") and base_url.split("/")[2] in href:
            # Same domain
            if any(skip in href.lower() for skip in ["#", "tag/", "category/", "page/", "author/", "login", "signup"]):
                continue
            if href not in links:
                links.append(href)
    return links


async def fetch_page(client: httpx.AsyncClient, url: str) -> str | None:
    """Fetch a page with error handling."""
    try:
        resp = await client.get(url, follow_redirects=True)
        if resp.status_code == 200:
            return resp.text
        log.warning("HTTP %d for %s", resp.status_code, url)
    except (httpx.HTTPError, httpx.TimeoutException) as e:
        log.warning("Failed to fetch %s: %s", url, e)
    return None


async def scrape_blog(
    client: httpx.AsyncClient,
    source: dict[str, str],
    limit: int = 10,
) -> list[ScrapedArticle]:
    """Scrape articles from a single blog source."""
    index_html = await fetch_page(client, source["url"])
    if not index_html:
        return []

    links = extract_links(index_html, source["url"])
    articles = []

    for link in links[:limit]:
        html = await fetch_page(client, link)
        if not html:
            continue

        title = extract_title(html)
        text = extract_article_text(html)
        word_count = len(text.split())

        if word_count < 200:
            continue

        articles.append(ScrapedArticle(
            title=title or link.split("/")[-1],
            url=link,
            source=source["name"],
            content=text,
            word_count=word_count,
        ))

    log.info("Scraped %d articles from %s", len(articles), source["name"])
    return articles


async def scrape_blogs(
    limit_per_source: int = 10,
    sources: list[dict[str, str]] | None = None,
) -> list[ScrapedArticle]:
    """Scrape articles from all blog sources."""
    sources = sources or SEED_URLS

    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": "KnowledgeBot/1.0 (AI training data collection)"},
    ) as client:
        tasks = [scrape_blog(client, src, limit_per_source) for src in sources]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    articles = []
    for result in results:
        if isinstance(result, list):
            articles.extend(result)
        elif isinstance(result, Exception):
            log.warning("Scrape task failed: %s", result)

    return articles
