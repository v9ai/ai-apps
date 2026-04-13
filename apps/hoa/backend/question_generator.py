"""
question_generator.py
─────────────────────
Generate blog-grounded interview questions using semantic search on embedded blog posts.

Usage:
    python question_generator.py peter-steinberger
    python question_generator.py peter-steinberger --dry-run   # print without saving
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from rich.console import Console
from rich.table import Table

from blog_embedder import search_blog_results, BLOG_DIR

console = Console()

ROOT = Path(__file__).parent
PROJECT_ROOT = ROOT.parent
RESEARCH_DIR = PROJECT_ROOT / "src" / "lib" / "research"

CATEGORIES = {
    "origin": {
        "label": "Origin & Turning Points",
        "queries": [
            "career turning point founding PSPDFKit retirement burnout identity",
            "came back from retirement AI discovery holy moment vibe coding",
            "finding my spark again motivation comeback story",
        ],
    },
    "technical_depth": {
        "label": "Technical Depth",
        "queries": [
            "architecture MCP server design tool building CLI Swift engineering",
            "Peekaboo screenshot automation GUI macOS agent screenshot",
            "code signing notarization build system hot reload Poltergeist",
        ],
    },
    "philosophy": {
        "label": "Philosophy & Beliefs",
        "queries": [
            "agentic engineering versus vibe coding AI future beliefs opinions",
            "ship beats perfect AI native development philosophy",
            "stop overthinking AI subscriptions developer tools opinions",
        ],
    },
    "collaboration": {
        "label": "Collaboration & Community",
        "queries": [
            "open source community Claude Code army commanding agents",
            "OpenClaw Anthropic OpenAI collaboration ecosystem",
            "team distributed hiring working together PSPDFKit",
        ],
    },
    "future": {
        "label": "Future & Predictions",
        "queries": [
            "predictions future AI agents development tools vision",
            "shipping at inference speed future of coding next year",
            "self hosting AI models personal agents everyone",
        ],
    },
}


def _gather_blog_context(slug: str) -> dict[str, list[dict]]:
    """For each category, search blog embeddings and return top chunks."""
    context: dict[str, list[dict]] = {}
    for cat, spec in CATEGORIES.items():
        results: list[dict] = []
        seen_titles: set[str] = set()
        for query in spec["queries"]:
            for r in search_blog_results(slug, query, top_k=3):
                if r["title"] not in seen_titles:
                    results.append(r)
                    seen_titles.add(r["title"])
        # Deduplicate and keep top 5 by score
        results.sort(key=lambda r: r["score"])
        context[cat] = results[:5]
    return context


def _load_research(slug: str) -> dict | None:
    path = RESEARCH_DIR / f"{slug}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def _generate_questions(slug: str, blog_context: dict[str, list[dict]], research: dict | None) -> list[dict]:
    """Generate interview questions grounded in blog content."""
    questions: list[dict] = []

    bio = research.get("bio", "") if research else ""
    contributions = research.get("key_contributions", []) if research else []

    for cat, spec in CATEGORIES.items():
        chunks = blog_context.get(cat, [])
        if not chunks:
            continue

        # Build question context from blog excerpts
        blog_excerpts = []
        for c in chunks:
            blog_excerpts.append(f"  [{c['title']}] {c['text'][:300]}")

        # Generate 2 questions per category based on blog content
        cat_questions = _craft_questions(cat, spec["label"], chunks, bio, contributions)
        questions.extend(cat_questions)

    return questions


def _craft_questions(
    category: str,
    label: str,
    chunks: list[dict],
    bio: str,
    contributions: list[dict],
) -> list[dict]:
    """Craft 2 specific questions per category from blog content."""
    questions = []

    # Extract unique blog post titles and key content
    posts = {}
    for c in chunks:
        title = c["title"]
        if title not in posts:
            posts[title] = {"title": title, "url": c["url"], "text": c["text"], "date": c.get("date", "")}
        else:
            posts[title]["text"] += " " + c["text"]

    post_list = list(posts.values())

    if category == "origin":
        # Focus on career transitions, burnout recovery, return to coding
        spark_posts = [p for p in post_list if any(kw in p["title"].lower() for kw in ["spark", "moving on", "reboot", "try this again"])]
        if spark_posts:
            p = spark_posts[0]
            questions.append({
                "category": category,
                "question": f"In '{p['title']}' you describe rediscovering your motivation after burnout. What specifically about AI-assisted development reignited your drive compared to everything you tried before?",
                "why_this_question": "Directly references his blog post about burnout recovery — reveals the emotional arc behind his prolific output",
                "expected_insight": "The specific moment or tool that made coding feel new again after years of burnout",
            })

        pspdfkit_posts = [p for p in post_list if any(kw in p["title"].lower() for kw in ["moving on", "pspdfkit", "visa"])]
        if pspdfkit_posts:
            p = pspdfkit_posts[0]
            questions.append({
                "category": category,
                "question": f"You wrote about how waiting for a visa was 'the best thing that ever happened.' After building PSPDFKit for a decade, what made you walk away — and what brought you back to shipping at this intensity?",
                "why_this_question": "References his own blog post about the visa-to-PSPDFKit origin story — connects past and present identity",
                "expected_insight": "How his relationship with building software fundamentally changed between PSPDFKit and the AI era",
            })

        # Ensure we have 2 questions
        if len(questions) < 2:
            p = post_list[0]
            questions.append({
                "category": category,
                "question": f"You went from 13+ years of native iOS to shipping web apps and CLI tools in days. What's the hardest habit from the PSPDFKit era that you had to unlearn?",
                "why_this_question": "Probes the cognitive shift from careful SDK development to rapid AI-assisted prototyping",
                "expected_insight": "Which engineering instincts serve vs. hinder in the AI-native workflow",
            })

    elif category == "technical_depth":
        mcp_posts = [p for p in post_list if any(kw in p["title"].lower() for kw in ["mcp", "peekaboo", "screenshot"])]
        cli_posts = [p for p in post_list if any(kw in p["title"].lower() for kw in ["poltergeist", "demark", "cli", "code signing"])]

        if mcp_posts:
            p = mcp_posts[0]
            questions.append({
                "category": category,
                "question": f"In '{p['title']}' you detail building MCP infrastructure for AI agents. What's the hardest design tradeoff you've hit — where agent convenience conflicts with system safety?",
                "why_this_question": "References his specific MCP work — surfaces real engineering tensions in agent-computer interaction",
                "expected_insight": "Concrete examples of where giving agents more capability creates security or reliability risks",
            })

        if cli_posts:
            p = cli_posts[0]
            questions.append({
                "category": category,
                "question": f"You ship CLI tools at extraordinary velocity — Poltergeist, Demark, Trimmy, dozens more. When you're building a new tool in a single session, what's your actual decision process for what to keep vs. cut?",
                "why_this_question": "Probes the rapid-shipping methodology behind his prolific output",
                "expected_insight": "The specific heuristics and shortcuts that enable shipping full tools in hours",
            })

        if len(questions) < 2:
            questions.append({
                "category": category,
                "question": "You've built tools across Swift, TypeScript, Go, and Shell. When you sit down to build a new CLI, what determines which language you reach for — and has AI changed that calculus?",
                "why_this_question": "His polyglot tool output suggests deliberate language choices worth exploring",
                "expected_insight": "How AI-assisted development changes language selection when the developer isn't writing most of the code",
            })

    elif category == "philosophy":
        vibe_posts = [p for p in post_list if any(kw in p["title"].lower() for kw in ["vibe", "agentic", "just talk", "slot machine"])]
        opinion_posts = [p for p in post_list if any(kw in p["title"].lower() for kw in ["slop", "overthinking", "claude code is my"])]

        if vibe_posts:
            p = vibe_posts[0]
            questions.append({
                "category": category,
                "question": f"You draw a sharp line between 'vibe coding' and 'agentic engineering.' Most people conflate them. What's the specific failure mode you've seen when someone treats agent-driven development as just faster autocomplete?",
                "why_this_question": "References his core philosophical distinction — this is his signature thesis",
                "expected_insight": "A concrete story of agentic engineering done wrong, and what 'right' looks like",
            })

        if opinion_posts:
            p = opinion_posts[0]
            questions.append({
                "category": category,
                "question": f"In '{p['title']}' you push back against common developer anxieties. As someone who bootstrapped a company to millions in ARR the old way — do you genuinely believe the old way of building software is dying, or just changing?",
                "why_this_question": "Creates productive tension between his bootstrapping past and AI-native present",
                "expected_insight": "Whether he sees continuity or rupture between traditional and AI-native engineering",
            })

        if len(questions) < 2:
            questions.append({
                "category": category,
                "question": "You describe yourself as 'polyagentmorous' — using multiple AI models simultaneously. Most developers are loyal to one model. What's your actual model-selection process for a given task, and when does multi-model create more noise than signal?",
                "why_this_question": "His GitHub profile term 'polyagentmorous' deserves unpacking — it's a real workflow choice",
                "expected_insight": "Practical multi-model strategy beyond the meme, including when it fails",
            })

    elif category == "collaboration":
        community_posts = [p for p in post_list if any(kw in p["title"].lower() for kw in ["claude code army", "commanding", "open source", "hiring"])]
        team_posts = [p for p in post_list if any(kw in p["title"].lower() for kw in ["how we work", "distributed", "team"])]

        if community_posts:
            p = community_posts[0]
            questions.append({
                "category": category,
                "question": f"'{p['title']}' describes orchestrating multiple Claude Code instances. You're essentially managing a team of AI agents. How does that compare to managing the human engineering team at PSPDFKit?",
                "why_this_question": "Connects his management experience to his agent-orchestration workflow — unique perspective",
                "expected_insight": "How managing humans vs. AI agents differs in practice — where each is harder",
            })

        if team_posts:
            p = team_posts[0]
            questions.append({
                "category": category,
                "question": f"At PSPDFKit you wrote about building a distributed team across time zones. Now you're a solo developer with AI agents as your team. What do you miss about human collaborators that no AI can replace?",
                "why_this_question": "Probes the human cost of the solo-with-AI model he champions",
                "expected_insight": "Honest reflection on what's lost when you replace a team with agents",
            })

        if len(questions) < 2:
            questions.append({
                "category": category,
                "question": "OpenClaw transitioned to an independent foundation. You went from sole founder to community steward. What's the hardest governance decision you've had to make when a project grows beyond one person?",
                "why_this_question": "Explores the tension between rapid individual shipping and community governance",
                "expected_insight": "Concrete governance challenges in fast-growing open source",
            })

    elif category == "future":
        future_posts = [p for p in post_list if any(kw in p["title"].lower() for kw in ["shipping at inference", "self-hosting", "future", "essential reading"])]

        if future_posts:
            p = future_posts[0]
            questions.append({
                "category": category,
                "question": f"In '{p['title']}' you explore where AI development is heading. You joined OpenAI to 'build an agent even my mum can use.' What specific interaction pattern are you betting on — and what current approaches are dead ends?",
                "why_this_question": "References his stated mission at OpenAI — forces specificity about the product vision",
                "expected_insight": "Concrete UX predictions for personal agents, not vague 'AI will change everything'",
            })

        questions.append({
            "category": category,
            "question": "You shipped 684,000 GitHub contributions in one year. At what point does AI-assisted velocity hit diminishing returns — where shipping faster stops being the bottleneck?",
            "why_this_question": "His extreme output volume raises questions about whether speed is always the goal",
            "expected_insight": "Where the real bottleneck shifts to — design, distribution, user research, or something else",
        })

        if len(questions) < 2:
            questions.append({
                "category": category,
                "question": "You've built tools for developers who already use AI. But your OpenAI role is about non-technical users. How do you bridge that gap without dumbing down the technology?",
                "why_this_question": "Probes the tension between his developer-tool roots and his new consumer-facing role",
                "expected_insight": "His mental model for making agents accessible without losing power",
            })

    return questions[:2]


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate blog-grounded interview questions")
    parser.add_argument("slug", help="Person slug")
    parser.add_argument("--dry-run", action="store_true", help="Print questions without saving")
    args = parser.parse_args()

    slug = args.slug
    console.print(f"\n[bold cyan]Generating questions for {slug}[/]")

    # Load research
    research = _load_research(slug)
    if research:
        console.print(f"  [green]✓[/] Research loaded ({len(research.get('bio', ''))} char bio)")

    # Gather blog context via semantic search
    console.print("  Searching blog embeddings...")
    blog_context = _gather_blog_context(slug)
    for cat, chunks in blog_context.items():
        titles = {c["title"] for c in chunks}
        console.print(f"    {cat}: {len(chunks)} chunks from {len(titles)} posts")

    # Generate questions
    questions = _generate_questions(slug, blog_context, research)
    console.print(f"\n  [green]✓[/] Generated {len(questions)} questions")

    # Display
    table = Table(title="Interview Questions", show_lines=True)
    table.add_column("Category", width=16)
    table.add_column("Question", width=80)

    for q in questions:
        table.add_row(q["category"], q["question"])
    console.print(table)

    if args.dry_run:
        console.print("\n  [yellow]Dry run — not saving.[/]")
        return

    # Save to research JSON
    if not research:
        console.print("[red]No research JSON to update.[/]")
        return

    research["questions"] = questions
    out_path = RESEARCH_DIR / f"{slug}.json"
    out_path.write_text(json.dumps(research, indent=2, ensure_ascii=False) + "\n")
    console.print(f"  [green]✓[/] Saved {len(questions)} questions to {out_path.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
