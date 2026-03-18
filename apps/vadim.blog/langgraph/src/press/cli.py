"""CLI entry point."""

from __future__ import annotations

import asyncio
import logging
import os

import click
from dotenv import load_dotenv


@click.group()
def main():
    """Press — LangGraph content pipeline."""
    load_dotenv()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )


@main.command()
@click.option("--title", required=True, help="Blog post title")
@click.option("--input", "input_file", required=True, help="Path to source markdown")
@click.option("--output-dir", default="./articles", help="Output directory")
@click.option("--publish", is_flag=True, help="Publish to vadim.blog")
@click.option("--git-push", is_flag=True, help="Git commit+push then deploy to Vercel")
def deep_dive(title: str, input_file: str, output_dir: str, publish: bool, git_push: bool):
    """Run the deep-dive pipeline."""
    asyncio.run(_deep_dive(title, input_file, output_dir, publish, git_push))


async def _deep_dive(
    title: str, input_file: str, output_dir: str, publish: bool, git_push: bool
):
    from press.graphs.deep_dive import build_deep_dive_graph
    from press.models import ModelPool

    ds_key = os.environ.get("DEEPSEEK_API_KEY")
    logging.info("DEEPSEEK_API_KEY: %s", "set" if ds_key else "NOT SET")

    pool = ModelPool.from_env()
    graph = build_deep_dive_graph(pool)

    result = await graph.ainvoke({
        "title": title,
        "niche": title,
        "input_file": input_file,
        "output_dir": output_dir,
        "publish": publish,
        "git_push": git_push,
        "enable_paper_search": True,
        "revision_rounds": 0,
    })

    print("\n╔══════════════════════════════════════╗")
    print("║         press — Run Complete         ║")
    print("╚══════════════════════════════════════╝")
    print(f"\nModels: {pool.label()}")

    status = "APPROVED" if result.get("approved") else "NEEDS REVISION"
    words = len(result.get("draft", "").split())
    li_lines = len(result.get("linkedin", "").splitlines())
    rounds = result.get("revision_rounds", 0)
    papers = result.get("paper_count", 0)
    papers_info = f"  |  papers: {papers}" if papers else ""

    broken = result.get("broken_links", [])
    links_info = f"  |  broken links: {len(broken)}" if broken else "  |  links: ✓"
    print(
        f"\n  [{title}]\n"
        f"  draft: ~{words} words  |  linkedin: {li_lines} lines  |  "
        f"status: {status}  |  revisions: {rounds}{papers_info}{links_info}"
    )
    if broken:
        print("\n  Broken links:")
        for url in broken:
            print(f"    ✗ {url}")


@main.command()
@click.option("--topic", required=True, help="Article topic")
@click.option("--output-dir", default="./articles", help="Output directory")
@click.option("--publish", is_flag=True, help="Publish to vadim.blog")
@click.option("--git-push", is_flag=True, help="Git commit+push then deploy to Vercel")
def journalism(topic: str, output_dir: str, publish: bool, git_push: bool):
    """Run the journalism pipeline."""
    asyncio.run(_journalism(topic, output_dir, publish, git_push))


async def _journalism(topic: str, output_dir: str, publish: bool, git_push: bool):
    from press.graphs.journalism import build_journalism_graph
    from press.models import ModelPool

    pool = ModelPool.from_env()
    graph = build_journalism_graph(pool)

    result = await graph.ainvoke({
        "topic": topic,
        "output_dir": output_dir,
        "publish": publish,
        "git_push": git_push,
        "revision_rounds": 0,
    })

    status = "APPROVED" if result.get("approved") else "NEEDS REVISION"
    words = len(result.get("draft", "").split())
    rounds = result.get("revision_rounds", 0)
    broken = result.get("broken_links", [])
    links_info = f" — broken links: {len(broken)}" if broken else " — links: ✓"
    print(f"\n[{topic}] — {status} — ~{words} words — {rounds} revision(s){links_info}")
    if broken:
        for url in broken:
            print(f"  ✗ {url}")


@main.command()
@click.option("--niche", required=True, help="Content niche")
@click.option("--count", default=1, help="Number of topics to produce")
@click.option("--output-dir", default="./drafts", help="Output directory")
@click.option("--publish", is_flag=True, help="Publish to vadim.blog")
@click.option("--git-push", is_flag=True, help="Git commit+push then deploy to Vercel")
def blog(niche: str, count: int, output_dir: str, publish: bool, git_push: bool):
    """Run the blog pipeline."""
    asyncio.run(_blog(niche, count, output_dir, publish, git_push))


async def _blog(niche: str, count: int, output_dir: str, publish: bool, git_push: bool):
    from press.graphs.blog import build_blog_graph
    from press.models import ModelPool

    pool = ModelPool.from_env()
    graph = build_blog_graph(pool)

    result = await graph.ainvoke({
        "niche": niche,
        "count": max(1, count),
        "output_dir": output_dir,
        "publish": publish,
        "git_push": git_push,
    })

    topics = result.get("topics", [])
    print(f"\nProduced {len(topics)} topic(s):")
    for t in topics:
        print(f"  - {t['topic']} ({t['slug']})")


@main.command()
@click.option("--url", required=True, help="URL of the article to counter")
@click.option("--topic", required=True, help="Counter-article topic/angle")
@click.option("--output-dir", default="./articles", help="Output directory")
@click.option("--publish", is_flag=True, help="Publish to vadim.blog")
@click.option("--git-push", is_flag=True, help="Git commit+push then deploy to Vercel")
def counter(url: str, topic: str, output_dir: str, publish: bool, git_push: bool):
    """Run the counter-article pipeline against a source URL."""
    asyncio.run(_counter(url, topic, output_dir, publish, git_push))


async def _counter(url: str, topic: str, output_dir: str, publish: bool, git_push: bool):
    from press.graphs.counter_article import build_counter_article_graph
    from press.models import ModelPool

    pool = ModelPool.from_env()
    graph = build_counter_article_graph(pool)

    result = await graph.ainvoke({
        "source_url": url,
        "topic": topic,
        "output_dir": output_dir,
        "publish": publish,
        "git_push": git_push,
        "revision_rounds": 0,
    })

    print("\n╔══════════════════════════════════════╗")
    print("║     press — Counter Complete         ║")
    print("╚══════════════════════════════════════╝")
    print(f"\nModels: {pool.label()}")

    status = "APPROVED" if result.get("approved") else "NEEDS REVISION"
    words = len(result.get("draft", "").split())
    li_lines = len(result.get("linkedin", "").splitlines())
    rounds = result.get("revision_rounds", 0)
    papers = result.get("paper_count", 0)
    papers_info = f"  |  papers: {papers}" if papers else ""

    broken = result.get("broken_links", [])
    links_info = f"  |  broken links: {len(broken)}" if broken else "  |  links: ✓"
    print(
        f"\n  [{topic}]\n"
        f"  draft: ~{words} words  |  linkedin: {li_lines} lines  |  "
        f"status: {status}  |  revisions: {rounds}{papers_info}{links_info}"
    )
    if broken:
        print("\n  Broken links:")
        for link in broken:
            print(f"    ✗ {link}")
    print(f"\n  Countering: {url}")


@main.command(name="eval")
@click.option("--input", "input_file", required=True, help="Path to article markdown")
@click.option("--research", "research_file", default=None, help="Path to research brief")
@click.option("--seo", "seo_file", default=None, help="Path to SEO strategy")
@click.option(
    "--metrics", default=None,
    help="Comma-separated metric names to run (default: all 7). "
         "Options: source_citation, anti_hallucination, writing_quality, "
         "journalistic_standards, seo_alignment, structural_completeness, lead_quality",
)
def eval_cmd(input_file: str, research_file, seo_file, metrics):
    """Evaluate article quality against journalism metrics (requires deepeval)."""
    asyncio.run(_eval_article(input_file, research_file, seo_file, metrics))


async def _eval_article(
    input_file: str,
    research_file: str | None,
    seo_file: str | None,
    metrics: str | None,
):
    from pathlib import Path
    from press.evals import evaluate_file

    metrics_list = [m.strip() for m in metrics.split(",")] if metrics else None
    result = await evaluate_file(
        Path(input_file),
        Path(research_file) if research_file else None,
        Path(seo_file) if seo_file else None,
        metrics_to_run=metrics_list,
    )

    print("\n╔══════════════════════════════════════╗")
    print("║       press eval — Results           ║")
    print("╚══════════════════════════════════════╝\n")
    print(result.summary())


if __name__ == "__main__":
    main()
