---
name: team
description: Create a Claude Code agent team from a predefined spec. Reads the team composition, agent roles, prompts, and task structure from .speckit/teams/ and spawns the exact team defined there.
argument-hint: <spec-name> [context]
---

Create an agent team from the spec at `.speckit/teams/$ARGUMENTS[0].md`.

## Steps

1. **Read the spec**: Load `.speckit/teams/$ARGUMENTS[0].md` to get the full team definition — agents, models, tasks, prompts, and file ownership.

2. **Read the constitution**: Load `.speckit/constitution.md` for governing principles that apply to all teams.

3. **Read agent definitions**: For each agent referenced in the spec, load its definition from `.claude/agents/<agent-name>.md` to get the full persona and capabilities.

4. **Create the team**: Spawn an agent team with the exact composition from the spec:
   - **Team name**: Use `$ARGUMENTS[0]` as the team name (e.g. `feature-build`, `code-review`)
   - **Lead agent**: Use sonnet model. Include the spec's "Lead Prompt" section as the coordination instructions. Also include the full Task Structure so the lead knows what tasks to create.
   - **Teammates**: For each agent listed in the spec's Team Composition table:
     - Use the model specified in the table
     - Set `planModeRequired` based on the "Plan Required" column
     - Include the agent's Assignment section from the spec in the spawn prompt
     - Include the agent's file ownership boundaries
     - Include the Communication Protocol from the agent's `.claude/agents/` definition
     - Reference the team config so teammates can discover each other

5. **Create initial tasks**: Based on the spec's Task Structure, create the shared task list with proper dependencies (the `blocks`/`blockedBy` relationships).

6. **Provide context**: If additional context was given after the spec name ($ARGUMENTS[1] and beyond), broadcast it to all teammates as the specific goal/feature/bug they're working on.

7. **Start coordination**: The lead begins executing the first tasks and assigning work per the spec.

## Available Specs

- `research-pipeline` — Parallel academic research (5 agents)
- `claim-verification` — Adversarial evidence review (4 agents)
- `feature-build` — Full-stack implementation (4 agents)
- `code-review` — Multi-lens PR review (4 agents)
- `debug-squad` — Competing hypothesis debugging (4 agents)
- `ux-review` — Live browser inspection + targeted fix (3 agents: inspector measures px, fixer patches code, lead verifies before/after)

## Example Usage

```
/team feature-build Add audio waveform visualization to the story player
/team code-review Review PR #42
/team debug-squad generateResearch returns NaN relevance scores
/team research-pipeline Goal: CBT techniques for childhood anxiety
/team claim-verification Note #15 claims about mindfulness efficacy
/team ux-review nav spacing looks off on /family
/team ux-review active menu item is misaligned
```
