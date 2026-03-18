"""Analyze node — calls DeepSeek with source files for a 10-point technical analysis."""

from __future__ import annotations

from typing import Any

from how_it_works.deepseek import chat

SYSTEM_PROMPT = """\
You are a senior software architect performing a deep technical analysis of a web application codebase.

Analyze the provided source files and produce a comprehensive technical deep-dive covering:

1. **Purpose** — what problem does this app solve? Who uses it?
2. **Tech stack** — every framework, library, service, and tool (with versions where visible)
3. **Data flow** — step-by-step: how does data enter, get processed, get stored, and get returned?
4. **Architecture** — key structural decisions (App Router, server vs client components, monorepo role, etc.)
5. **Features** — each major feature and how it is technically implemented (name specific components, hooks, server actions, API routes)
6. **AI / LLM integration** — if any: which models, what prompts, embedding strategies, retrieval patterns
7. **Database & schema** — tables, columns, relationships, indexes, RPCs, migrations (if visible)
8. **API design** — key routes/endpoints, request/response shapes, auth patterns
9. **Auth & security** — authentication library, session handling, RLS policies, env secrets
10. **Unique patterns** — anything architecturally interesting or non-obvious

Rules:
- Be extremely specific: name actual files, functions, components, tables, API paths
- Explain HOW things work, not just WHAT exists
- If certain files are missing/truncated, say what you can infer and mark it clearly
- Do not pad with generic best-practice advice — only describe what is actually in the code"""


async def analyze_node(state: dict[str, Any]) -> dict[str, Any]:
    app = state["current_app"]
    current_files = state["current_files"]

    print("  🔬  Analyzing with DeepSeek...")

    files_text = "\n\n".join(
        f"### {f.relative_path}\n```\n{f.content}\n```" for f in current_files
    )

    analysis = await chat(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"App name: **{app.name}**\n\nSource files:\n\n{files_text}",
            },
        ],
        max_tokens=4_500,
    )

    if state.get("verbose"):
        print(f"\n{analysis[:600]}...\n")
    else:
        print(f"  ✓   Analysis done  ({len(analysis)} chars)")

    return {"current_analysis": analysis}
