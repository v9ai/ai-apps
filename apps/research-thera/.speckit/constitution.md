# Constitution

Principles governing Claude Code agent teams for research-thera.

## 1. Specification First

Team compositions, agent roles, and prompts are defined in `.speckit/` specs before spawning. Specs are the source of truth — ask Claude to "create a team from the spec" and it builds the exact team defined here.

## 2. Agents Own Files, Not Features

Each agent owns a set of files/directories. No two agents edit the same file. File ownership is declared in the spec and enforced by the agent prompt.

## 3. Plan Before Implement

Agents that touch code require plan approval from the lead. Research-only and review agents work freely.

## 4. Communicate Findings, Not Status

Agent messages should contain findings, challenges, or requests — never "I'm starting task X" noise. The task list tracks status.

## 5. Right-Size Teams

3-5 agents per team. 5-6 tasks per agent. If a task takes <2 minutes solo, don't create a team for it.

## 6. Model Selection by Role

- **Lead/coordinator**: sonnet (fast coordination, low cost)
- **Research/review agents**: sonnet (exploration, many tool calls)
- **Implementation agents**: opus (complex code changes)
- **Verification agents**: opus (deep reasoning)
