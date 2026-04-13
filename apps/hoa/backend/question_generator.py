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
            "finding my spark again motivation comeback story reboot",
            "moving on visa waiting best thing that happened startup",
            "let's try this again blogging return writing",
        ],
        "question_templates": [
            {
                "template": "In '{title}' you describe {theme}. What specifically about AI-assisted development reignited your drive compared to everything you tried before?",
                "why": "Directly references his blog post about burnout recovery — reveals the emotional arc behind his prolific output",
                "insight": "The specific moment or tool that made coding feel new again after years of burnout",
                "keywords": ["spark", "finding", "reboot", "try this again"],
                "theme": "rediscovering your motivation after burnout",
            },
            {
                "template": "You wrote '{title}' about {theme}. After building PSPDFKit for a decade, what made you walk away — and what brought you back to shipping at this intensity?",
                "why": "References his own blog post about the visa-to-PSPDFKit origin story — connects past and present identity",
                "insight": "How his relationship with building software fundamentally changed between PSPDFKit and the AI era",
                "keywords": ["moving on", "visa", "pspdfkit", "best thing"],
                "theme": "how a visa wait became a career-defining moment",
            },
        ],
        "fallback": {
            "question": "You went from 13+ years of native iOS to shipping web apps and CLI tools in days. What's the hardest habit from the PSPDFKit era that you had to unlearn?",
            "why": "Probes the cognitive shift from careful SDK development to rapid AI-assisted prototyping",
            "insight": "Which engineering instincts serve vs. hinder in the AI-native workflow",
        },
    },
    "technical_depth": {
        "label": "Technical Depth",
        "queries": [
            "architecture MCP server design tool building CLI Swift engineering",
            "Peekaboo screenshot automation GUI macOS agent screenshot MCP",
            "code signing notarization build system hot reload Poltergeist",
            "Demark HTML markdown conversion CLI fast tool",
            "llm.codes Apple documentation AI readable developer",
        ],
        "question_templates": [
            {
                "template": "In '{title}' you detail building MCP infrastructure for AI agents. What's the hardest design tradeoff you've hit — where agent convenience conflicts with system safety?",
                "why": "References his specific MCP work — surfaces real engineering tensions in agent-computer interaction",
                "insight": "Concrete examples of where giving agents more capability creates security or reliability risks",
                "keywords": ["mcp", "peekaboo", "screenshot", "agent"],
                "theme": "MCP infrastructure for AI agents",
            },
            {
                "template": "You ship CLI tools at extraordinary velocity — Poltergeist, Demark, Trimmy, dozens more. When you're building a new tool in a single session, what's your actual decision process for what to keep vs. cut?",
                "why": "Probes the rapid-shipping methodology behind his prolific output",
                "insight": "The specific heuristics and shortcuts that enable shipping full tools in hours",
                "keywords": ["poltergeist", "demark", "cli", "tool"],
                "theme": "rapid CLI tool development",
            },
        ],
        "fallback": {
            "question": "You've built tools across Swift, TypeScript, Go, and Shell. When you sit down to build a new CLI, what determines which language you reach for — and has AI changed that calculus?",
            "why": "His polyglot tool output suggests deliberate language choices worth exploring",
            "insight": "How AI-assisted development changes language selection when the developer isn't writing most of the code",
        },
    },
    "philosophy": {
        "label": "Philosophy & Beliefs",
        "queries": [
            "agentic engineering versus vibe coding AI future beliefs opinions",
            "ship beats perfect AI native development philosophy",
            "stop overthinking AI subscriptions developer tools opinions",
            "don't read startup slop opinions hot take contrarian",
            "just talk to it no-bs agentic engineering approach",
        ],
        "question_templates": [
            {
                "template": "You draw a sharp line between 'vibe coding' and 'agentic engineering.' Most people conflate them. What's the specific failure mode you've seen when someone treats agent-driven development as just faster autocomplete?",
                "why": "References his core philosophical distinction — this is his signature thesis",
                "insight": "A concrete story of agentic engineering done wrong, and what 'right' looks like",
                "keywords": ["vibe", "agentic", "just talk", "slot machine"],
                "theme": "the distinction between vibe coding and agentic engineering",
            },
            {
                "template": "In '{title}' you push back against common developer anxieties. As someone who bootstrapped a company to millions in ARR the old way — do you genuinely believe the old way of building software is dying, or just changing?",
                "why": "Creates productive tension between his bootstrapping past and AI-native present",
                "insight": "Whether he sees continuity or rupture between traditional and AI-native engineering",
                "keywords": ["slop", "overthinking", "stop", "don't read"],
                "theme": "pushback against developer anxieties",
            },
        ],
        "fallback": {
            "question": "You describe yourself as 'polyagentmorous' — using multiple AI models simultaneously. Most developers are loyal to one model. What's your actual model-selection process for a given task, and when does multi-model create more noise than signal?",
            "why": "His GitHub profile term 'polyagentmorous' deserves unpacking — it's a real workflow choice",
            "insight": "Practical multi-model strategy beyond the meme, including when it fails",
        },
    },
    "collaboration": {
        "label": "Collaboration & Community",
        "queries": [
            "open source community Claude Code army commanding agents",
            "OpenClaw Anthropic OpenAI collaboration ecosystem",
            "team distributed hiring working together PSPDFKit",
            "how we work remote team culture process",
            "Slack communication team collaboration distributed",
        ],
        "question_templates": [
            {
                "template": "'{title}' describes orchestrating multiple Claude Code instances. You're essentially managing a team of AI agents. How does that compare to managing the human engineering team at PSPDFKit?",
                "why": "Connects his management experience to his agent-orchestration workflow — unique perspective",
                "insight": "How managing humans vs. AI agents differs in practice — where each is harder",
                "keywords": ["claude code army", "commanding", "army", "reloaded"],
                "theme": "orchestrating multiple AI agents",
            },
            {
                "template": "In '{title}' you wrote about building a distributed team across time zones. Now you're a solo developer with AI agents as your team. What do you miss about human collaborators that no AI can replace?",
                "why": "Probes the human cost of the solo-with-AI model he champions",
                "insight": "Honest reflection on what's lost when you replace a team with agents",
                "keywords": ["how we work", "distributed", "team", "hiring", "slack"],
                "theme": "distributed team management",
            },
        ],
        "fallback": {
            "question": "OpenClaw transitioned to an independent foundation. You went from sole founder to community steward. What's the hardest governance decision you've had to make when a project grows beyond one person?",
            "why": "Explores the tension between rapid individual shipping and community governance",
            "insight": "Concrete governance challenges in fast-growing open source",
        },
    },
    "future": {
        "label": "Future & Predictions",
        "queries": [
            "predictions future AI agents development tools vision",
            "shipping at inference speed future of coding next year",
            "self hosting AI models personal agents everyone",
            "essential reading agentic engineers future landscape",
            "OpenClaw OpenAI future agent personal assistant",
        ],
        "question_templates": [
            {
                "template": "In '{title}' you explore where AI development is heading. You joined OpenAI to 'build an agent even my mum can use.' What specific interaction pattern are you betting on — and what current approaches are dead ends?",
                "why": "References his stated mission at OpenAI — forces specificity about the product vision",
                "insight": "Concrete UX predictions for personal agents, not vague 'AI will change everything'",
                "keywords": ["essential reading", "shipping at inference", "future", "openclaw"],
                "theme": "the future of AI development",
            },
            {
                "template": "You shipped 684,000 GitHub contributions in one year. At what point does AI-assisted velocity hit diminishing returns — where shipping faster stops being the bottleneck?",
                "why": "His extreme output volume raises questions about whether speed is always the goal",
                "insight": "Where the real bottleneck shifts to — design, distribution, user research, or something else",
                "keywords": [],
                "theme": "AI-assisted velocity limits",
            },
        ],
        "fallback": {
            "question": "You've built tools for developers who already use AI. But your OpenAI role is about non-technical users. How do you bridge that gap without dumbing down the technology?",
            "why": "Probes the tension between his developer-tool roots and his new consumer-facing role",
            "insight": "His mental model for making agents accessible without losing power",
        },
    },
    "ios_engineering": {
        "label": "iOS & UIKit Engineering",
        "queries": [
            "UIKit UITableView UIScrollView UITextView iOS framework fixing Apple bugs",
            "SwiftUI state keyboard shortcut menu bar button tap gesture",
            "drag and drop rotation windows multiple iOS 8 iPad",
            "UIAppearance UIMenuItem UIAlertView keyboard shortcuts custom views",
            "fixing Apple iOS 7 search display controller text view scroll",
            "UIKit debug mode view hierarchy inspection third party apps",
            "observation tracking UIKit AppKit Swift automatic reactive",
        ],
        "question_templates": [
            {
                "template": "In '{title}' you document fixing what Apple ships broken. After years of patching UIKit and SwiftUI, what's the most important lesson about working around platform constraints that still applies in the AI era?",
                "why": "His prolific iOS bug-fixing posts reveal a philosophy about shipping despite platform limitations",
                "insight": "Whether the 'fix it yourself' iOS mindset transfers to AI-assisted development",
                "keywords": ["fixing", "uikit", "uitableview", "uitextview", "uisearch", "apple doesn't", "debug mode"],
                "theme": "fixing platform bugs that Apple ships",
            },
            {
                "template": "You wrote '{title}' about deep SwiftUI and UIKit internals. Now you build mostly with AI agents writing the code. Has that changed your relationship with framework-level debugging — do you still go as deep?",
                "why": "Explores whether AI-assisted development changes the depth of platform knowledge needed",
                "insight": "How the shift from framework expert to AI-assisted builder changes debugging practices",
                "keywords": ["swiftui", "keyboard", "menu", "tap", "long press", "observation", "hosting"],
                "theme": "deep framework internals",
            },
        ],
        "fallback": {
            "question": "You spent years as the person who fixed what Apple wouldn't — UITextView, UISearchDisplayController, UITableView. Now you're at OpenAI. Do you still file radars?",
            "why": "Connects his platform-warrior past to his current role — a playful but revealing question",
            "insight": "Whether he's moved on from Apple platform advocacy or still cares deeply",
        },
    },
    "swift_runtime": {
        "label": "Swift Runtime & Metaprogramming",
        "queries": [
            "swizzling Swift Objective-C method runtime hook intercept",
            "InterposeKit elegant swizzling Swift modern API",
            "Aspects aspect-oriented programming iOS hooks callbacks",
            "calling super runtime Swift Objective-C bridge",
            "binary frameworks Swift ABI stability module",
            "Swifty Objective-C interop bridging modern patterns",
            "extensions Swift surprises gotchas unexpected behavior",
        ],
        "question_templates": [
            {
                "template": "You wrote '{title}' and built InterposeKit for elegant method swizzling. That's deep Objective-C runtime work. Does any of that low-level runtime knowledge matter when AI writes most of the code — or is it actually more important?",
                "why": "Tests whether deep platform expertise is becoming more or less valuable with AI",
                "insight": "The value of runtime-level understanding when AI handles implementation but not architecture",
                "keywords": ["swizzling", "interposekit", "aspects", "super", "runtime"],
                "theme": "method swizzling and runtime manipulation",
            },
            {
                "template": "'{title}' explores bridging Objective-C and Swift idiomatically. You've lived through every Swift migration pain point. What's the AI-era equivalent of the ObjC-to-Swift transition?",
                "why": "Draws a parallel between past language transitions and the current AI-coding shift",
                "insight": "Which historical pattern best predicts how AI-assisted development evolves",
                "keywords": ["swifty", "objective-c", "even swiftier", "binary framework", "extensions"],
                "theme": "bridging legacy and modern paradigms",
            },
        ],
        "fallback": {
            "question": "You built Aspects, InterposeKit, and wrote extensively about Swift runtime internals. If you were building those today with AI assistance, would they even exist — or would you solve the problem differently?",
            "why": "Explores whether AI changes not just how you build but what you choose to build",
            "insight": "Whether AI-assisted development makes certain categories of tools obsolete",
        },
    },
    "debugging": {
        "label": "Debugging & Testing",
        "queries": [
            "LLDB debugging IRGen expression fix crash investigation",
            "core dump macOS kernel panic network debugging",
            "address sanitizer Clang testing memory safety",
            "UI testing iOS speed fast ludicrous busy waiting",
            "writing good bug reports quality debugging process",
            "hardcore debugging heavy weapons hard bugs techniques",
            "migrating tests Swift Testing XCTest conversion 700",
            "logging Swift privacy shenanigans os_log",
        ],
        "question_templates": [
            {
                "template": "'{title}' is a masterclass in low-level debugging. When you're pair-programming with an AI agent now, how do you debug together — does the agent help with the gnarly kernel-level stuff or just get in the way?",
                "why": "His hardcore debugging expertise meets AI-assisted development — a revealing intersection",
                "insight": "Where AI helps vs. hinders in deep debugging scenarios",
                "keywords": ["hardcore", "core dump", "kernel panic", "lldb", "heavy weapons"],
                "theme": "low-level debugging techniques",
            },
            {
                "template": "In '{title}' you tackled test infrastructure at scale. You migrated 700+ tests to Swift Testing. Now you ship projects in hours. What does testing look like when your build-test-ship cycle is measured in minutes?",
                "why": "Explores how rapid AI-assisted development changes testing philosophy",
                "insight": "Whether traditional test-driven development survives in the age of AI-speed shipping",
                "keywords": ["migrating", "tests", "swift testing", "ui testing", "ludicrous", "address sanitizer", "junit"],
                "theme": "testing at scale and speed",
            },
        ],
        "fallback": {
            "question": "You wrote about writing good bug reports and hardcore debugging with heavy weapons. In the AI era, is meticulous bug reporting still a superpower — or do you just paste the stack trace into Claude?",
            "why": "Tests whether AI changes the fundamental debugging workflow he's advocated for years",
            "insight": "The evolving role of structured debugging discipline in AI-assisted development",
        },
    },
    "build_systems": {
        "label": "Build Systems & CI",
        "queries": [
            "ccache build cache compilation speed optimization",
            "zld faster linker Apple link time optimization",
            "continuous integration Mac Mini Apple Silicon CI runner",
            "Xcode test JUnit conversion build pipeline",
            "code signing notarization sparkle distribution macOS",
            "Swift trunk development snapshots nightly builds",
            "Poltergeist hot reload ghost keeps builds fresh",
        ],
        "question_templates": [
            {
                "template": "You wrote '{title}' about optimizing build infrastructure. You've spent years fighting Xcode build times with ccache and zld. Now AI generates code faster than compilers can build it. What's the new bottleneck?",
                "why": "His deep build-system expertise creates a unique lens on AI-speed development",
                "insight": "Whether build infrastructure becomes more or less important when AI writes the code",
                "keywords": ["ccache", "zld", "linker", "build", "trunk", "poltergeist"],
                "theme": "build system optimization",
            },
            {
                "template": "In '{title}' you describe the pain of code signing and notarization. You fought Apple's distribution requirements for years. Now you ship open-source tools globally. How has your relationship with Apple's walled garden changed?",
                "why": "His code signing struggles are legendary in the iOS community — connects to his current open-source focus",
                "insight": "Whether the move from commercial SDK to open-source AI tools is partly a reaction to platform constraints",
                "keywords": ["code signing", "notarization", "sparkle", "mac mini", "ci", "continuous integration"],
                "theme": "code signing and macOS distribution",
            },
        ],
        "fallback": {
            "question": "From ccache hacks to zld to Poltergeist — you've always optimized the developer feedback loop. Is the AI agent itself now the fastest feedback loop, making traditional CI less relevant?",
            "why": "Draws a thread from his build-optimization past to his agent-orchestration present",
            "insight": "How AI agents change the build-test-deploy cycle he spent years optimizing",
        },
    },
    "apple_platform": {
        "label": "Apple Platform & Hardware",
        "queries": [
            "Mac Catalyst Marzipan porting iOS apps Mac desktop",
            "Apple Silicon M1 developer perspective performance",
            "Hackintosh macOS updating non-Apple hardware",
            "LG UltraFine 5K kernel_task thermal throttling",
            "menu bar macOS settings showing SwiftUI AppKit",
            "Forbidden Controls Catalyst optimize interface Mac",
            "jailbreaking iOS developers research reverse engineering",
            "ResearchKit HealthKit Apple medical research",
            "cross-platform pragmatic approach multi-platform",
        ],
        "question_templates": [
            {
                "template": "In '{title}' you explored pushing Apple hardware and software to its limits. You've jailbroken iPhones, built Hackintoshes, and fought kernel_task. That hacker mentality — does it show up in how you approach AI agents?",
                "why": "Connects his hardware-hacking roots to his current agent-orchestration work",
                "insight": "Whether the 'break it to understand it' mindset applies to AI development",
                "keywords": ["hackintosh", "jailbreak", "kernel_task", "ultrafine", "m1", "apple silicon"],
                "theme": "pushing Apple hardware to its limits",
            },
            {
                "template": "You wrote '{title}' about bringing iOS apps to the Mac. You lived through Catalyst, Marzipan, and SwiftUI's cross-platform promise. Now you build cross-platform with TypeScript and AI. What did Apple get wrong about cross-platform?",
                "why": "His unique perspective spanning Apple's cross-platform attempts and modern AI-native development",
                "insight": "What Apple's cross-platform failures teach about the AI-native approach to multi-platform",
                "keywords": ["marzipan", "catalyst", "forbidden", "cross-platform", "pragmatic", "menu bar"],
                "theme": "cross-platform development on Apple platforms",
            },
        ],
        "fallback": {
            "question": "You went from debugging kernel panics on Hackintoshes to orchestrating 50 AI agents on a Dell ultrawide. What does your hardware setup tell us about where development is heading?",
            "why": "His hardware journey from Apple loyalist to Dell ultrawide mirrors his software journey",
            "insight": "Whether the move away from Apple hardware reflects a deeper philosophical shift",
        },
    },
    "ai_tools": {
        "label": "AI Developer Tools",
        "queries": [
            "Claude Code is my computer AI workflow daily usage",
            "Vibe Meter monitor AI costs token counting usage",
            "VibeTunnel browser terminal Mac remote access",
            "stats.store privacy-first Sparkle analytics tracking",
            "llm.codes Apple docs AI readable documentation",
            "Live Coding Session Building Arena AI development",
            "My Current AI Dev Workflow understanding codebase",
            "Signature Flicker animation UI detail polish",
            "Claude Code Anonymous confessions tips community",
        ],
        "question_templates": [
            {
                "template": "In '{title}' you describe your daily AI development setup. You've built Vibe Meter, VibeTunnel, llm.codes, stats.store — an entire ecosystem around AI-assisted coding. When do your own tools surprise you vs. when do they fall short?",
                "why": "He's uniquely positioned as both a power user and tool builder in the AI dev space",
                "insight": "Where the gap is between the tools that exist and the tools AI-native developers actually need",
                "keywords": ["vibe meter", "vibetunnel", "llm.codes", "stats.store", "claude code is", "ai workflow", "current ai"],
                "theme": "building an AI development toolkit",
            },
            {
                "template": "'{title}' shows you building and shipping live with AI. You've done multiple live coding sessions where you build entire apps in one sitting. What's the biggest difference between shipping solo on stream vs. shipping solo in private?",
                "why": "His live coding sessions reveal the raw, unfiltered process — including failures",
                "insight": "How public accountability and audience feedback change the AI-assisted development process",
                "keywords": ["live coding", "arena", "anonymous", "signature flicker"],
                "theme": "live coding and building in public",
            },
        ],
        "fallback": {
            "question": "You built Vibe Meter to track AI costs, VibeTunnel for remote access, llm.codes for Apple docs — you're essentially building the developer infrastructure for a world where AI writes the code. What's still missing?",
            "why": "Catalogs his tool ecosystem and asks what the next gap is",
            "insight": "The unsolved problems in AI-native developer tooling from someone building the solutions",
        },
    },
    "social_media": {
        "label": "Building in Public",
        "queries": [
            "Gardening Twitter curating timeline growing followers social media",
            "WWDC first-timers Apple conference networking community",
            "writing blogging sharing knowledge community building",
            "real-time collaboration Apple developers working together",
            "efficient iOS version checking pragmatic engineering shortcuts",
            "NSURLCache disk cache iOS networking performance",
            "willChangeValueForKey KVO Objective-C unnecessary calls",
        ],
        "question_templates": [
            {
                "template": "You wrote '{title}' about strategically building your Twitter audience. You now have 385K followers. How much of your current influence comes from that deliberate social media strategy vs. just shipping impressive things?",
                "why": "His Twitter gardening posts predate his AI fame — reveals how deliberate his brand-building has been",
                "insight": "The relationship between strategic audience-building and organic virality from shipping",
                "keywords": ["gardening", "twitter", "curating", "followers", "growing"],
                "theme": "strategic social media growth",
            },
            {
                "template": "In '{title}' you captured the details that most developers skip — the deep iOS internals, the edge cases, the undocumented behaviors. Now you blog about AI. Has your writing process changed, or is it the same obsessive detail applied to a new domain?",
                "why": "Connects his meticulous iOS blogging to his current AI-focused writing",
                "insight": "Whether the blogging craft transfers across domains or requires reinvention",
                "keywords": ["nsurlcache", "efficient", "version checking", "willchange", "real-time"],
                "theme": "capturing the details most developers miss",
            },
        ],
        "fallback": {
            "question": "You went from 'Gardening Your Twitter' to 385K followers and 356K GitHub stars. For developers who want to build in public in the AI era, what advice from your pre-AI social media strategy still holds?",
            "why": "His social media expertise predates and informs his current AI-era influence",
            "insight": "Which audience-building principles are timeless vs. era-specific",
        },
    },
}


def _gather_blog_context(slug: str) -> dict[str, list[dict]]:
    """For each category, search blog embeddings and return top chunks."""
    context: dict[str, list[dict]] = {}
    for cat, spec in CATEGORIES.items():
        results: list[dict] = []
        seen_titles: set[str] = set()
        for query in spec["queries"]:
            for r in search_blog_results(slug, query, top_k=5):
                if r["title"] not in seen_titles:
                    results.append(r)
                    seen_titles.add(r["title"])
        # Deduplicate and keep top 8 by score
        results.sort(key=lambda r: r["score"])
        context[cat] = results[:8]
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

        cat_questions = _craft_questions(cat, spec, chunks, bio, contributions)
        questions.extend(cat_questions)

    return questions


def _craft_questions(
    category: str,
    spec: dict,
    chunks: list[dict],
    bio: str,
    contributions: list[dict],
) -> list[dict]:
    """Craft 2 specific questions per category from blog content."""
    questions = []

    # Build post lookup from chunks
    posts = {}
    for c in chunks:
        title = c["title"]
        if title not in posts:
            posts[title] = {"title": title, "url": c["url"], "text": c["text"], "date": c.get("date", "")}
        else:
            posts[title]["text"] += " " + c["text"]

    post_list = list(posts.values())

    # Try each template — match by keywords in post titles
    for tmpl in spec.get("question_templates", []):
        if len(questions) >= 2:
            break

        matched_post = None
        for p in post_list:
            title_lower = p["title"].lower()
            if any(kw in title_lower for kw in tmpl["keywords"]):
                matched_post = p
                break

        if matched_post:
            question_text = tmpl["template"].format(
                title=matched_post["title"],
                theme=tmpl.get("theme", "this topic"),
            )
            questions.append({
                "category": category,
                "question": question_text,
                "why_this_question": tmpl["why"],
                "expected_insight": tmpl["insight"],
            })
        elif not tmpl["keywords"]:
            # Template with no keywords — always include
            questions.append({
                "category": category,
                "question": tmpl["template"].format(title="", theme=tmpl.get("theme", "")),
                "why_this_question": tmpl["why"],
                "expected_insight": tmpl["insight"],
            })

    # Fill remaining with fallback
    if len(questions) < 2 and spec.get("fallback"):
        fb = spec["fallback"]
        questions.append({
            "category": category,
            "question": fb["question"],
            "why_this_question": fb["why"],
            "expected_insight": fb["insight"],
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

    all_post_titles: set[str] = set()
    for cat, chunks in blog_context.items():
        titles = {c["title"] for c in chunks}
        all_post_titles.update(titles)
        console.print(f"    {cat}: {len(chunks)} chunks from {len(titles)} posts")

    # Load all blog posts to check coverage
    blog_file = PROJECT_ROOT / "src" / "lib" / "blogs" / f"{slug}.json"
    if blog_file.exists():
        all_blogs = json.loads(blog_file.read_text())
        total = len(all_blogs)
        console.print(f"\n  Blog coverage: {len(all_post_titles)}/{total} posts surfaced by semantic search")
    else:
        total = 0

    # Generate questions
    questions = _generate_questions(slug, blog_context, research)
    console.print(f"\n  [green]✓[/] Generated {len(questions)} questions across {len(CATEGORIES)} categories")

    # Display
    table = Table(title="Interview Questions", show_lines=True)
    table.add_column("Category", width=18)
    table.add_column("Question", width=78)

    for q in questions:
        label = CATEGORIES.get(q["category"], {}).get("label", q["category"])
        table.add_row(label, q["question"])
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
