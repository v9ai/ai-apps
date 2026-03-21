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
@click.option("--topic", required=True, help="Article topic")
@click.option("--input", "input_file", default=None, help="Source markdown (enables deep-dive mode: 2500-3500w + paper search)")
@click.option("--output-dir", default="./articles", help="Output directory")
@click.option("--publish", is_flag=True, help="Publish to vadim.blog")
@click.option("--git-push", is_flag=True, help="Git commit+push then deploy to Vercel")
def article(topic: str, input_file: str | None, output_dir: str, publish: bool, git_push: bool):
    """Write an article. Add --input for deep-dive mode (2500-3500w), omit for journalism (1200-1800w)."""
    asyncio.run(_article(topic, input_file, output_dir, publish, git_push))


async def _article(
    topic: str, input_file: str | None, output_dir: str, publish: bool, git_push: bool
):
    from press.graphs.article import build_article_graph
    from press.models import ModelPool

    pool = ModelPool.from_env()
    graph = build_article_graph(pool)

    state: dict = {
        "topic": topic,
        "title": topic,
        "niche": topic,
        "output_dir": output_dir,
        "publish": publish,
        "git_push": git_push,
        "revision_rounds": 0,
    }
    if input_file:
        state["input_file"] = input_file
        state["enable_paper_search"] = True

    mode = "deep-dive" if input_file else "journalism"
    result = await graph.ainvoke(state)

    print("\n╔══════════════════════════════════════╗")
    print(f"║   press article [{mode:^12}] done  ║")
    print("╚══════════════════════════════════════╝")
    print(f"\nModels: {pool.label()}")

    status = "APPROVED" if result.get("approved") else "NEEDS REVISION"
    words = len(result.get("draft", "").split())
    rounds = result.get("revision_rounds", 0)
    papers = result.get("paper_count", 0)
    papers_info = f"  |  papers: {papers}" if papers else ""

    li_lines = len(result.get("linkedin", "").splitlines()) if result.get("linkedin") else 0
    li_info = f"  |  linkedin: {li_lines} lines" if li_lines else ""

    broken = result.get("broken_links", [])
    links_info = f"  |  broken links: {len(broken)}" if broken else "  |  links: ✓"
    print(
        f"\n  [{topic}]\n"
        f"  mode: {mode}  |  draft: ~{words} words  |  "
        f"status: {status}  |  revisions: {rounds}{papers_info}{li_info}{links_info}"
    )
    if broken:
        print("\n  Broken links:")
        for url in broken:
            print(f"    ✗ {url}")


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


@main.command()
@click.option("--input", "input_file", required=True, help="Path to article draft markdown")
@click.option("--research", "research_file", default=None, help="Path to research brief")
@click.option("--seo", "seo_file", default=None, help="Path to SEO strategy")
@click.option("--output-dir", default="./articles", help="Output directory for review reports")
def review(
    input_file: str,
    research_file: str | None,
    seo_file: str | None,
    output_dir: str,
):
    """Review a draft against all 20 publications: fit scoring, evals, editorial review."""
    asyncio.run(_review(input_file, research_file, seo_file, output_dir))


async def _review(
    input_file: str,
    research_file: str | None,
    seo_file: str | None,
    output_dir: str,
):
    from press.graphs.review import build_review_graph
    from press.models import ModelPool

    pool = ModelPool.from_env()
    graph = build_review_graph(pool)

    state: dict = {
        "input_file": input_file,
        "output_dir": output_dir,
    }
    if research_file:
        state["research_file"] = research_file
    if seo_file:
        state["seo_file"] = seo_file

    result = await graph.ainvoke(state)

    print("\n╔══════════════════════════════════════╗")
    print("║       press — Review Complete        ║")
    print("╚══════════════════════════════════════╝")
    print(f"\nModels: {pool.label()}")

    if result.get("publication_fit"):
        print(f"\n{'─' * 40}")
        print(result["publication_fit"])

    if result.get("eval_summary"):
        print(f"\n{'─' * 40}")
        print("Automated Eval Scores:")
        print(result["eval_summary"])

    if result.get("review_report"):
        print(f"\n{'─' * 40}")
        print(result["review_report"])

    broken = result.get("broken_links", [])
    if broken:
        print(f"\nBroken links ({len(broken)}):")
        for url in broken:
            print(f"  ✗ {url}")


@main.command()
@click.option(
    "--pipeline", required=True,
    type=click.Choice(["blog", "article", "counter", "review"]),
    help="Which pipeline to run",
)
@click.option("--topic", default=None, help="Article topic (article, counter)")
@click.option("--title", default=None, help="Article title override")
@click.option("--niche", default=None, help="Content niche (blog)")
@click.option("--input", "input_file", default=None, help="Source markdown (article deep-dive mode, review)")
@click.option("--url", default=None, help="Source URL to counter (counter)")
@click.option("--count", default=1, help="Number of topics (blog)")
@click.option("--output-dir", default="./articles", help="Output directory")
@click.option("--publish", is_flag=True, help="Publish to vadim.blog")
@click.option("--git-push", is_flag=True, help="Git commit+push then deploy")
@click.option("--research", "research_file", default=None, help="Research brief (review)")
@click.option("--seo", "seo_file", default=None, help="SEO strategy (review)")
def run(
    pipeline: str,
    topic: str | None,
    title: str | None,
    niche: str | None,
    input_file: str | None,
    url: str | None,
    count: int,
    output_dir: str,
    publish: bool,
    git_push: bool,
    research_file: str | None,
    seo_file: str | None,
):
    """Run any pipeline through the unified orchestrator graph."""
    asyncio.run(_run_orchestrator(
        pipeline, topic, title, niche, input_file, url, count,
        output_dir, publish, git_push, research_file, seo_file,
    ))


async def _run_orchestrator(
    pipeline: str,
    topic: str | None,
    title: str | None,
    niche: str | None,
    input_file: str | None,
    url: str | None,
    count: int,
    output_dir: str,
    publish: bool,
    git_push: bool,
    research_file: str | None,
    seo_file: str | None,
):
    from press.graphs.main import build_main_graph
    from press.models import ModelPool

    pool = ModelPool.from_env()
    graph = build_main_graph(pool)

    state: dict = {
        "pipeline": pipeline,
        "output_dir": output_dir,
        "publish": publish,
        "git_push": git_push,
    }

    # Pipeline-specific fields
    if topic:
        state["topic"] = topic
    if title:
        state["title"] = title
        state["niche"] = niche or title
    if niche:
        state["niche"] = niche
    if input_file:
        state["input_file"] = input_file
    if url:
        state["source_url"] = url
    if count > 1:
        state["count"] = count
    if research_file:
        state["research_file"] = research_file
    if seo_file:
        state["seo_file"] = seo_file

    # Defaults for revision-based pipelines
    if pipeline in ("article", "counter"):
        state.setdefault("revision_rounds", 0)

    result = await graph.ainvoke(state)

    print("\n╔══════════════════════════════════════╗")
    print(f"║  press run [{pipeline:^16}] done  ║")
    print("╚══════════════════════════════════════╝")
    print(f"\nModels: {pool.label()}")

    # Pipeline-specific output
    if pipeline == "blog":
        topics = result.get("topics", [])
        print(f"\nProduced {len(topics)} topic(s):")
        for t in topics:
            print(f"  - {t.get('topic', '?')} ({t.get('slug', '?')})")

    elif pipeline in ("article", "counter"):
        status = "APPROVED" if result.get("approved") else "NEEDS REVISION"
        words = len(result.get("draft", "").split())
        rounds = result.get("revision_rounds", 0)
        papers = result.get("paper_count", 0)
        broken = result.get("broken_links", [])
        label = title or topic or "article"
        print(f"\n  [{label}]")
        print(f"  draft: ~{words} words  |  status: {status}  |  revisions: {rounds}")
        if papers:
            print(f"  papers: {papers}")
        if result.get("linkedin"):
            print(f"  linkedin: {len(result['linkedin'].splitlines())} lines")
        if broken:
            print(f"  broken links: {len(broken)}")
            for link in broken:
                print(f"    ✗ {link}")
        else:
            print("  links: ✓")

    elif pipeline == "review":
        if result.get("publication_fit"):
            print(f"\n{'─' * 40}")
            print(result["publication_fit"])
        if result.get("eval_summary"):
            print(f"\n{'─' * 40}")
            print("Eval Scores:")
            print(result["eval_summary"])
        if result.get("review_report"):
            print(f"\n{'─' * 40}")
            print(result["review_report"])
        broken = result.get("broken_links", [])
        if broken:
            print(f"\nBroken links ({len(broken)}):")
            for link in broken:
                print(f"  ✗ {link}")


@main.command(name="graphs")
def list_graphs():
    """List all available pipeline graphs."""
    from press.graphs import GRAPH_REGISTRY

    print("\nAvailable graphs:")
    print(f"{'─' * 50}")
    for name, path in sorted(GRAPH_REGISTRY.items()):
        print(f"  {name:<16} {path}")
    print(f"\nUse: press run --pipeline <name>")
    print(f"  or: press <name> (for dedicated commands)")


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
