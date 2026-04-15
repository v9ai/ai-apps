"""
blog_embedder.py
────────────────
Scrape blog posts → save JSON → embed into LanceDB.

Usage:
    python blog_embedder.py scrape peter-steinberger    # scrape steipete.me/posts
    python blog_embedder.py embed peter-steinberger     # JSON → LanceDB
    python blog_embedder.py search peter-steinberger "agentic engineering"
    python blog_embedder.py all peter-steinberger       # scrape + embed
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import time
from pathlib import Path
from typing import Any

import httpx
import lancedb
import pyarrow as pa
from rich.console import Console
from rich.progress import track
from sentence_transformers import SentenceTransformer

console = Console()

ROOT = Path(__file__).parent
PROJECT_ROOT = ROOT.parent
BLOG_DIR = PROJECT_ROOT / "src" / "lib" / "blogs"
LANCE_DIR = PROJECT_ROOT / "lance_blogs"

CHUNK_SIZE = 500
CHUNK_OVERLAP = 80
EMBED_MODEL = "all-MiniLM-L6-v2"

BLOG_SOURCES: dict[str, dict[str, str]] = {
    "peter-steinberger": {
        "base_url": "https://steipete.me",
        "posts_url": "https://steipete.me/posts",
        "name": "Peter Steinberger",
    },
    "athos-georgiou": {
        "base_url": "https://athrael.net",
        "posts_url": "https://athrael.net/posts",
        "name": "Athos Georgiou",
    },
}


# ── Helpers ───────────────────────────────────────────────


def _split_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start : start + chunk_size])
        start += chunk_size - overlap
    return chunks


def _clean_markdown(md: str) -> str:
    """Strip nav/footer boilerplate, collapse whitespace."""
    # Remove image markdown
    md = re.sub(r"!\[.*?\]\(.*?\)", "", md)
    # Remove HTML tags
    md = re.sub(r"<[^>]+>", "", md)
    # Collapse whitespace
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip()


# ── Scraper ───────────────────────────────────────────────


POST_URLS: dict[str, list[str]] = {
    "athos-georgiou": [
        "/posts/diminishing-returns-benchmark-optimization",
        "/posts/closing-the-ai-value-gap",
        "/posts/spatially-grounded-document-retrieval",
        "/posts/snappy",
        "/posts/the-most-beautiful-vision-rag",
        "/posts/you-too-can-run-the-vidore-benchmark",
        "/posts/colqwen_fastapi",
        "/posts/colqwen-omni-audio-rag",
        "/posts/colnomic-qdrant-rag",
        "/posts/mapping-worlds-into-graphs-with-rf-detr-blip-2-and-kung-fu",
        "/posts/down-the-rabbit-hole-with-graph-rag",
        "/posts/graphrag-with-qdrant-neo4j-and-ollama",
        "/posts/crazy-good-observability-using-grafana-alloy",
        "/posts/superfast-telemetry-setup",
        "/posts/it-must-have-been-love-is-it-over-now",
        "/posts/raising-artificial-intelligence",
        "/posts/is-generative-ai-the-answer-to-everything",
        "/posts/how-much-would-vtt-rag-cost",
        "/posts/naive-no-sql-historical-retrieval",
        "/posts/ive-been-doing-stuff",
        "/posts/brief-analysis-on-rag-with-pinecone-and-unstructured-io",
        "/posts/integrate-vision",
        "/posts/thoughts-on-the-latest-openai-api-and-starting-a-new-project",
        "/posts/integrate-multi-user-assistants",
        "/posts/integrate-next-js-authentication",
        "/posts/openai-law-copilot",
        "/posts/create-a-customized-input-component-in-mui",
        "/posts/add-markdown-to-streaming-chat",
        "/posts/welcome",
    ],
    "peter-steinberger": [
        "/posts/2026/openclaw",
        "/posts/2025/shipping-at-inference-speed",
        "/posts/2025/signature-flicker",
        "/posts/just-talk-to-it",
        "/posts/2025/claude-code-anonymous",
        "/posts/2025/live-coding-session-building-arena",
        "/posts/2025/optimal-ai-development-workflow",
        "/posts/2025/essential-reading-august-2025",
        "/posts/just-one-more-prompt",
        "/posts/2025/poltergeist-ghost-keeps-builds-fresh",
        "/posts/2025/startup-slop",
        "/posts/2025/essential-reading-july-2025",
        "/posts/2025/self-hosting-ai-models",
        "/posts/2025/logging-privacy-shenanigans",
        "/posts/2025/vibetunnel-first-anniversary",
        "/posts/2025/applescript-cli-macos-complete-guide",
        "/posts/2025/peekaboo-2-freeing-the-cli-from-its-mcp-shackles",
        "/posts/command-your-claude-code-army-reloaded",
        "/posts/2025/essential-reading",
        "/posts/2025/when-ai-meets-madness-peters-16-hour-days",
        "/posts/2025/understanding-codebases-with-ai-gemini-workflow",
        "/posts/2025/stats-store-privacy-first-sparkle-analytics",
        "/posts/2025/showing-settings-from-macos-menu-bar-items",
        "/posts/2025/vibetunnel-turn-any-browser-into-your-mac-terminal",
        "/posts/2025/vibe-meter-2-claude-code-usage-calculation",
        "/posts/2025/llm-codes-transform-developer-docs",
        "/posts/2025/automatic-observation-tracking-uikit-appkit",
        "/posts/2025/peekaboo-mcp-lightning-fast-macos-screenshots-for-ai-agents",
        "/posts/2025/migrating-700-tests-to-swift-testing",
        "/posts/2025/commanding-your-claude-code-army",
        "/posts/2025/code-signing-and-notarization-sparkle-and-tears",
        "/posts/2025/vibe-meter-monitor-your-ai-costs",
        "/posts/2025/claude-code-is-my-computer",
        "/posts/2025/stop-overthinking-ai-subscriptions",
        "/posts/2025/introducing-demark-html-to-markdown-in-swift",
        "/posts/2025/the-future-of-vibe-coding",
        "/posts/2025/mcp-best-practices",
        "/posts/2025/finding-my-spark-again",
        "/posts/2021/top-level-menu-visibility-in-swiftui",
        "/posts/2021/fixing-keyboardshortcut-in-swiftui",
        "/posts/2021/supporting-both-tap-and-longpress-on-button-in-swiftui",
        "/posts/2020/apple-silicon-mac-mini-for-ci",
        "/posts/2020/apple-silicon-m1-a-developer-perspective",
        "/posts/2020/curating-your-twitter-timeline",
        "/posts/2020/growing-your-twitter-followers",
        "/posts/2020/forbidden-controls-in-catalyst-mac-idiom",
        "/posts/2020/disabling-keyboard-avoidance-in-swiftui-uihostingcontroller",
        "/posts/2020/state-of-swiftui",
        "/posts/2020/logging-in-swift",
        "/posts/2020/building-with-swift-trunk",
        "/posts/2020/calling-super-at-runtime",
        "/posts/2020/zld-a-faster-linker",
        "/posts/2020/couldnt-irgen-expression",
        "/posts/2020/updating-a-hackintosh",
        "/posts/2020/interposekit",
        "/posts/2020/mac-catalyst-crash-hunt",
        "/posts/2020/jailbreaking-for-ios-developers",
        "/posts/2020/network-kernel-core-dump",
        "/posts/2020/how-to-macos-core-dump",
        "/posts/2020/kernel-panic-surprise-boot-args",
        "/posts/2020/the-lg-ultrafine5k-kerneltask-and-me",
        "/posts/2020/lets-try-this-again",
        "/posts/2019/how-we-work",
        "/posts/2019/swizzling-in-swift",
        "/posts/2019/wwdc-tips-2019-edition",
        "/posts/2018/challenges-of-drag-and-drop",
        "/posts/2018/porting-ios-apps-to-mac-marzipan-iosmac-uikit-appkit",
        "/posts/2018/how-to-use-slack-and-not-go-crazy",
        "/posts/2018/hardcore-debugging",
        "/posts/2018/binary-frameworks-swift",
        "/posts/2017/even-swiftier-objective-c",
        "/posts/2017/the-case-for-deprecating-uitableview",
        "/posts/2016/test-with-asan",
        "/posts/2016/ui-testing-revisited",
        "/posts/2016/hiring-a-distributed-team",
        "/posts/2016/writing-good-bug-reports",
        "/posts/2016/real-time-collaboration",
        "/posts/2016/converting-xcode-test-results-the-fast-way",
        "/posts/2016/efficient-ios-version-checking",
        "/posts/2016/investigating-thread-safety-of-uiimage",
        "/posts/2016/swifty-objective-c",
        "/posts/2016/running-ui-tests-with-ludicrous-speed",
        "/posts/2016/a-pragmatic-approach-to-cross-platform",
        "/posts/2016/surprises-with-swift-extensions",
        "/posts/2015/ccache-for-fun-and-profit",
        "/posts/2015/uitableviewcontroller-designated-initializer-woes",
        "/posts/2015/researching-researchkit",
        "/posts/2015/rotation-multiple-windows-bug",
        "/posts/2015/uikit-debug-mode",
        "/posts/2014/retrofitting-containsstring-on-ios-7",
        "/posts/2014/a-story-about-swizzling-the-right-way-and-touch-forwarding",
        "/posts/2014/hacking-with-aspects",
        "/posts/2014/fixing-uitextview-on-ios-7",
        "/posts/2014/fixing-what-apple-doesnt",
        "/posts/2013/how-to-inspect-the-view-hierarchy-of-3rd-party-apps",
        "/posts/2013/fixing-uisearchdisplaycontroller-on-ios-7",
        "/posts/2013/smart-proxy-delegation",
        "/posts/2013/adding-keyboard-shortcuts-to-uialertview",
        "/posts/2013/how-to-center-uiscrollview",
        "/posts/2013/uiappearance-for-custom-views",
        "/posts/2012/hacking-block-support-into-uimenuitem",
        "/posts/2012/using-subscripting-with-xcode-4_4-and-ios-4_3",
        "/posts/2012/pimping-recursivedescription",
        "/posts/2012/nsurlcache-uses-a-disk-cache-as-of-ios5",
        "/posts/2012/moving-on",
        "/posts/2012/dont-call-willchangevalueforkey",
        "/posts/2012/reboot",
    ],
}


async def _fetch_post(client: httpx.AsyncClient, base_url: str, path: str) -> dict[str, Any] | None:
    """Fetch a single blog post and extract content as markdown."""
    url = f"{base_url}{path}"
    try:
        resp = await client.get(url, follow_redirects=True)
        if resp.status_code != 200:
            console.print(f"  [yellow]⚠[/] {path} → {resp.status_code}")
            return None

        html = resp.text

        # Extract title from <title> or <h1>
        title_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.DOTALL)
        title = title_m.group(1).strip() if title_m else path.split("/")[-1]
        # Clean title (remove site suffix)
        title = re.sub(r"\s*[|–—-]\s*steipete\.me.*$", "", title, flags=re.I).strip()

        # Extract date from meta or URL
        date = ""
        date_m = re.search(r'<time[^>]*datetime="([^"]+)"', html)
        if date_m:
            date = date_m.group(1)[:10]
        else:
            year_m = re.search(r"/posts/(\d{4})/", path)
            if year_m:
                date = year_m.group(1)

        # Extract main content — look for <article> or <main>
        article_m = re.search(r"<article[^>]*>(.*?)</article>", html, re.DOTALL)
        if not article_m:
            article_m = re.search(r"<main[^>]*>(.*?)</main>", html, re.DOTALL)

        content_html = article_m.group(1) if article_m else html

        # Convert HTML to plain text (simple approach)
        text = content_html
        # Remove script/style
        text = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", text, flags=re.DOTALL | re.I)
        # Convert headers
        text = re.sub(r"<h[1-6][^>]*>(.*?)</h[1-6]>", r"\n\n\1\n\n", text, flags=re.DOTALL | re.I)
        # Convert paragraphs
        text = re.sub(r"<p[^>]*>(.*?)</p>", r"\n\1\n", text, flags=re.DOTALL | re.I)
        # Convert list items
        text = re.sub(r"<li[^>]*>(.*?)</li>", r"\n- \1", text, flags=re.DOTALL | re.I)
        # Convert links — keep text
        text = re.sub(r"<a[^>]*>(.*?)</a>", r"\1", text, flags=re.DOTALL | re.I)
        # Convert <br>
        text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
        # Convert code blocks
        text = re.sub(r"<pre[^>]*><code[^>]*>(.*?)</code></pre>", r"\n```\n\1\n```\n", text, flags=re.DOTALL | re.I)
        text = re.sub(r"<code[^>]*>(.*?)</code>", r"`\1`", text, flags=re.DOTALL | re.I)
        # Remove remaining tags
        text = re.sub(r"<[^>]+>", "", text)
        # Decode entities
        text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
        text = text.replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " ")
        # Collapse whitespace
        text = re.sub(r"\n{3,}", "\n\n", text).strip()

        if len(text) < 50:
            console.print(f"  [yellow]⚠[/] {path} → too short ({len(text)} chars)")
            return None

        return {
            "slug": path.split("/")[-1],
            "path": path,
            "url": url,
            "title": title,
            "date": date,
            "content": text,
        }

    except Exception as e:
        console.print(f"  [red]✗[/] {path} → {e}")
        return None


async def scrape_blog(slug: str) -> list[dict[str, Any]]:
    """Scrape all posts for a given blog source."""
    source = BLOG_SOURCES.get(slug)
    if not source:
        console.print(f"[red]Unknown blog source: {slug}[/]")
        return []

    paths = POST_URLS.get(slug, [])
    if not paths:
        console.print(f"[red]No post URLs for: {slug}[/]")
        return []

    base_url = source["base_url"]
    console.print(f"\n[bold cyan]Scraping {source['name']}[/] — {len(paths)} posts")

    posts: list[dict[str, Any]] = []
    sem = asyncio.Semaphore(8)  # max 8 concurrent requests

    async def fetch_with_sem(client: httpx.AsyncClient, path: str) -> dict[str, Any] | None:
        async with sem:
            return await _fetch_post(client, base_url, path)

    async with httpx.AsyncClient(timeout=30) as client:
        tasks = [fetch_with_sem(client, p) for p in paths]
        results = await asyncio.gather(*tasks)

    for r in results:
        if r:
            posts.append(r)

    console.print(f"  [green]✓[/] Scraped {len(posts)}/{len(paths)} posts")

    # Sort by date descending
    posts.sort(key=lambda p: p.get("date", ""), reverse=True)

    # Save JSON
    BLOG_DIR.mkdir(parents=True, exist_ok=True)
    out_path = BLOG_DIR / f"{slug}.json"
    out_path.write_text(json.dumps(posts, indent=2) + "\n")
    console.print(f"  [green]✓[/] Saved to {out_path.relative_to(PROJECT_ROOT)}")

    return posts


# ── Embedder ──────────────────────────────────────────────


def embed_blog(slug: str) -> None:
    """Load scraped posts, chunk, embed, and store in LanceDB."""
    json_path = BLOG_DIR / f"{slug}.json"
    if not json_path.exists():
        console.print(f"[red]No scraped data at {json_path}. Run scrape first.[/]")
        return

    posts = json.loads(json_path.read_text())
    console.print(f"\n[bold cyan]Embedding {len(posts)} posts for {slug}[/]")

    # Load embedding model
    console.print(f"  Loading model: {EMBED_MODEL}")
    model = SentenceTransformer(EMBED_MODEL)
    dim = model.get_sentence_embedding_dimension()
    console.print(f"  Dimension: {dim}")

    # Chunk all posts
    records: list[dict[str, Any]] = []
    for post in track(posts, description="  Chunking..."):
        chunks = _split_text(post["content"])
        for i, chunk in enumerate(chunks):
            records.append({
                "slug": post["slug"],
                "blog": slug,
                "title": post["title"],
                "url": post["url"],
                "date": post.get("date", ""),
                "chunk_index": i,
                "text": chunk,
            })

    console.print(f"  {len(records)} chunks from {len(posts)} posts")

    # Embed all chunks
    texts = [r["text"] for r in records]
    console.print(f"  Embedding {len(texts)} chunks...")
    t0 = time.time()
    vectors = model.encode(texts, show_progress_bar=True, batch_size=64)
    elapsed = time.time() - t0
    console.print(f"  [green]✓[/] Embedded in {elapsed:.1f}s ({len(texts)/elapsed:.0f} chunks/s)")

    for r, v in zip(records, vectors):
        r["vector"] = v.tolist()

    # Store in LanceDB
    LANCE_DIR.mkdir(parents=True, exist_ok=True)
    db = lancedb.connect(str(LANCE_DIR))
    table_name = f"blog_{slug.replace('-', '_')}"

    if table_name in db.table_names():
        db.drop_table(table_name)

    tbl = db.create_table(table_name, records)
    console.print(f"  [green]✓[/] LanceDB table '{table_name}': {len(records)} rows")
    console.print(f"  [green]✓[/] Stored at {LANCE_DIR.relative_to(PROJECT_ROOT)}")


# ── Search ────────────────────────────────────────────────


def search_blog_results(slug: str, query: str, top_k: int = 5) -> list[dict[str, Any]]:
    """Semantic search returning results as a list."""
    db = lancedb.connect(str(LANCE_DIR))
    table_name = f"blog_{slug.replace('-', '_')}"

    if table_name not in db.table_names():
        return []

    model = SentenceTransformer(EMBED_MODEL)
    q_vec = model.encode(query).tolist()

    tbl = db.open_table(table_name)
    rows = tbl.search(q_vec).metric("cosine").limit(top_k).to_list()
    return [
        {
            "title": r["title"],
            "url": r["url"],
            "date": r.get("date", ""),
            "text": r["text"],
            "score": r.get("_distance", 0),
        }
        for r in rows
    ]


def search_blog(slug: str, query: str, top_k: int = 5) -> None:
    """Semantic search across embedded blog posts."""
    db = lancedb.connect(str(LANCE_DIR))
    table_name = f"blog_{slug.replace('-', '_')}"

    if table_name not in db.table_names():
        console.print(f"[red]Table '{table_name}' not found. Run embed first.[/]")
        return

    model = SentenceTransformer(EMBED_MODEL)
    q_vec = model.encode(query).tolist()

    tbl = db.open_table(table_name)
    results = tbl.search(q_vec).metric("cosine").limit(top_k).to_list()

    from rich.table import Table as RTable

    table = RTable(title=f'Search: "{query}"', show_lines=True)
    table.add_column("#", width=3)
    table.add_column("Score", width=6)
    table.add_column("Title", width=40)
    table.add_column("Date", width=10)
    table.add_column("Chunk", width=60)

    for i, r in enumerate(results):
        score = f"{r.get('_distance', 0):.3f}"
        table.add_row(
            str(i + 1),
            score,
            r["title"],
            r.get("date", ""),
            r["text"][:120] + "...",
        )

    console.print(table)


# ── CLI ───────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(description="Blog scraper + LanceDB embedder")
    sub = parser.add_subparsers(dest="command")

    p_scrape = sub.add_parser("scrape", help="Scrape blog posts")
    p_scrape.add_argument("slug", help="Blog source slug")

    p_embed = sub.add_parser("embed", help="Embed posts into LanceDB")
    p_embed.add_argument("slug", help="Blog source slug")

    p_search = sub.add_parser("search", help="Search embedded posts")
    p_search.add_argument("slug", help="Blog source slug")
    p_search.add_argument("query", help="Search query")
    p_search.add_argument("--top-k", type=int, default=5, help="Number of results")

    p_all = sub.add_parser("all", help="Scrape + embed")
    p_all.add_argument("slug", help="Blog source slug")

    args = parser.parse_args()

    if args.command == "scrape":
        asyncio.run(scrape_blog(args.slug))
    elif args.command == "embed":
        embed_blog(args.slug)
    elif args.command == "search":
        search_blog(args.slug, args.query, args.top_k)
    elif args.command == "all":
        asyncio.run(scrape_blog(args.slug))
        embed_blog(args.slug)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
