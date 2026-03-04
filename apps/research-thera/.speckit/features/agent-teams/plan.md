# Agent Teams — Implementation Plan

## Architecture

```
.speckit/
  constitution.md              ← Principles governing all teams
  features/agent-teams/
    spec.md                    ← This system's specification
    plan.md                    ← This file
    tasks.md                   ← Task breakdown
  teams/
    research-pipeline.md       ← Team spec: parallel research
    claim-verification.md      ← Team spec: adversarial verification
    feature-build.md           ← Team spec: full-stack implementation
    code-review.md             ← Team spec: multi-lens review
    debug-squad.md             ← Team spec: competing hypotheses

.claude/
  agents/
    research-analyst.md        ← [existing] Research-focused agent
    backend-dev.md             ← Backend developer (schema, resolvers, DB)
    frontend-dev.md            ← Frontend developer (components, pages)
    qa-engineer.md             ← Quality engineer (tests, validation)
    security-reviewer.md       ← Security review specialist
    evidence-hunter.md         ← Finds supporting evidence for claims
    counter-evidence.md        ← Finds contradicting evidence for claims
    evidence-judge.md          ← Weighs evidence, assigns verdicts
  settings.local.json          ← [existing] Project permissions
```

## How It Works

1. **Specs drive teams**: Each `.speckit/teams/*.md` file defines a complete team — agents, tasks, prompts, file ownership.

2. **Agent files are reusable**: `.claude/agents/*.md` files define agent personas that can be used across different teams. The team spec references agents by name.

3. **Claude reads the spec**: When you say "Create a team from the feature-build spec", Claude reads `.speckit/teams/feature-build.md`, creates the team with the specified agents, models, and prompts, and assigns the initial tasks.

4. **Hooks enforce quality**: `TeammateIdle` and `TaskCompleted` hooks can gate agent work against project standards.

## Usage Patterns

### Spawn a team from spec
```
Create an agent team from the research-pipeline spec for goal #42.
```

### Spawn with overrides
```
Create a team from the feature-build spec, but use opus for all agents
and add a 5th agent for database migrations.
```

### Ad-hoc team (no spec)
```
Create an agent team with 3 investigators to debug why generateResearch
fails with "NaN relevance score" errors.
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent files in `.claude/agents/` | Standard Claude Code location | Agents auto-load, visible in `/agents` command |
| Team specs in `.speckit/teams/` | Separate from agent definitions | Teams are compositions of agents; decoupled for reuse |
| Specs are plain Markdown | No custom tooling needed | Claude reads them natively; human-readable |
| Models per role, not per agent | Defined in team spec | Same agent (e.g. `backend-dev`) can run on sonnet or opus depending on team |
| File ownership in spec | Prevents conflicts | Two agents never edit the same file |
| Plan mode for implementation agents | In team spec, not agent file | Research agents roam free; code agents need approval |
