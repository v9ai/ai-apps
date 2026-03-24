"""Generate Mermaid diagrams for all LangGraph graphs.

Usage:
    cd evals && uv run python visualize_graphs.py
    cd evals && uv run python visualize_graphs.py --output ../README-graphs.md
"""

import argparse
import sys


def editorial_mermaid() -> str:
    return """graph TD
    START((Start)) --> research_entry
    research_entry --> researcher
    research_entry --> seo
    research_entry --> intro_strategist
    researcher --> writer
    seo --> writer
    intro_strategist --> writer
    writer --> editor
    editor -->|APPROVE or max rounds| END((End))
    editor -->|REVISE| writer

    style research_entry fill:#f9f,stroke:#333
    style writer fill:#bbf,stroke:#333
    style editor fill:#fbb,stroke:#333"""


def redteam_mermaid() -> str:
    return """graph TD
    START((Start)) --> plan_attacks
    plan_attacks -->|"Send() per attack"| attack_worker_1[attack_worker]
    plan_attacks -->|"Send() per attack"| attack_worker_2[attack_worker]
    plan_attacks -->|"Send() per attack"| attack_worker_n[attack_worker ...]
    attack_worker_1 --> report
    attack_worker_2 --> report
    attack_worker_n --> report
    report --> END((End))

    style plan_attacks fill:#f9f,stroke:#333
    style report fill:#bfb,stroke:#333"""


def rag_mermaid() -> str:
    return """graph TD
    START((Start)) --> route_query
    route_query -->|"classify intent"| retrieve
    retrieve -->|"FTS / vector / hybrid"| format_context
    format_context --> generate
    generate --> END((End))

    style route_query fill:#ff9,stroke:#333
    style retrieve fill:#9cf,stroke:#333
    style generate fill:#bbf,stroke:#333"""


GRAPHS = {
    "Editorial Pipeline": editorial_mermaid,
    "Red-Team Orchestrator": redteam_mermaid,
    "RAG Pipeline": rag_mermaid,
}


def main():
    parser = argparse.ArgumentParser(description="Generate Mermaid diagrams for LangGraph graphs")
    parser.add_argument("--output", "-o", help="Write output to file instead of stdout")
    args = parser.parse_args()

    lines = []
    for name, fn in GRAPHS.items():
        lines.append(f"### {name}\n")
        lines.append(f"```mermaid\n{fn()}\n```\n")

    output = "\n".join(lines)

    if args.output:
        with open(args.output, "w") as f:
            f.write(output)
        print(f"Written to {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
