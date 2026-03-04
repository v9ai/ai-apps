# Agent Teams — Specification

## Overview

Predefined Claude Code agent team configurations for research-thera. Each team spec defines a reusable team composition that can be spawned by telling Claude: "Create a team from the [team-name] spec."

## Team Catalog

### 1. `research-pipeline` — Parallel Academic Research
**When**: User triggers `generateResearch` for a goal
**Size**: 1 lead + 3 researchers + 1 synthesizer = 5 agents
**Duration**: ~2-5 minutes
**Parallel value**: 7 academic sources searched simultaneously instead of sequentially

### 2. `claim-verification` — Adversarial Evidence Review
**When**: User runs `checkNoteClaims` or `buildClaimCards`
**Size**: 1 lead + 2 verifiers + 1 devil's advocate = 4 agents
**Parallel value**: Competing hypotheses tested simultaneously; adversarial challenge improves confidence scores

### 3. `feature-build` — Full-Stack Feature Implementation
**When**: Adding a new feature (schema + resolvers + UI + tests)
**Size**: 1 lead + 1 backend dev + 1 frontend dev + 1 QA = 4 agents
**Parallel value**: Backend and frontend built simultaneously; QA writes tests while devs implement

### 4. `code-review` — Multi-Lens PR Review
**When**: Reviewing a PR before merge
**Size**: 1 lead + 3 reviewers = 4 agents
**Parallel value**: Security, performance, and correctness reviewed simultaneously

### 5. `debug-squad` — Competing Hypothesis Investigation
**When**: Bug with unclear root cause
**Size**: 1 lead + 3 investigators = 4 agents
**Parallel value**: Each investigator tests a different theory; adversarial debate converges faster

## Agent Definitions

Agent `.md` files live in `.claude/agents/`. Each defines:
- `name` — unique identifier
- `description` — when to use this agent (drives auto-selection)
- `tools` — allowed tool set
- `model` — claude model to use

## File Ownership Convention

To prevent conflicts, each team spec declares which directories/files each agent owns:

```
backend-dev:  schema/, src/db/, src/trigger/
frontend-dev: app/components/, app/goals/, app/notes/, app/stories/
qa:           __tests__/, *.test.ts, *.spec.ts
lead:         CLAUDE.md, .speckit/, package.json (coordination only)
```

## How to Use

1. Define the team in `.speckit/teams/[name].md`
2. Create agent personas in `.claude/agents/[role].md`
3. Tell Claude: "Create a team from the [name] spec"
4. Claude reads the spec, spawns the team with exact roles/prompts/models
5. Lead coordinates using the shared task list
6. When done, tell the lead to clean up
