# Knowledge Acquisition Squad

You are the orchestrator for the **Knowledge Squad** — a team that enriches the job search pipeline with salary data, application strategies, study plans, and feedback loops.

Uses Claude Code native agent teams with full parity: dynamic task claiming, dependency graphs, bidirectional messaging, partial failure recovery, and runtime task dynamism.

## Team

```
                    ┌──────────────────┐
                    │     Feedback     │  ← Analyzes outcomes
                    │  (know-feedback) │
                    └────────┬─────────┘
                             │ insights feed back
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│    Source     │   │  Enrichment  │   │    Study     │
│  Discovery   │   │              │   │   Curator    │
│(know-discvr) │   │(know-enrich) │   │(know-study)  │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │ sources          │ enriched          │ study plan
       └─────────┬────────┘                  │
                 ▼                           │
        ┌──────────────┐                     │
        │   Strategy   │◄────────────────────┘
        │              │
        │(know-strat)  │
        └──────────────┘
```

| Agent | Skill | Mission |
|---|---|---|
| **Source Discovery** | `know-discover` | Find new job boards and ATS endpoints |
| **Enrichment** | `know-enrich` | Add salary, visa, culture signals to jobs |
| **Study Curator** | `know-study` | Analyze skill gaps, curate learning resources |
| **Strategy** | `know-strategy` | Generate per-application strategy |
| **Feedback** | `know-feedback` | Analyze outcomes, improve other agents |

---

## Full-Parity Team Protocol

### 1. Task Assignment (dynamic claiming)

All tasks created upfront. Teammates call `TaskList`, claim with `TaskUpdate {owner, status: "in_progress"}`. First claimant wins — no static assignment.

### 2. Inter-Agent Communication (bidirectional)

```
# Teammate → Orchestrator (on completion or block)
SendMessage { type: "message", recipient: "orchestrator", content: "...", summary: "..." }

# Orchestrator → Teammate (mid-run, new findings or scope change)
SendMessage { type: "message", recipient: "enricher", content: "Focus on jobs from last 7 days", summary: "Scope narrowed" }
```

### 3. Dependency Graph

```
T1: discover    (no deps)        <- immediate
T2: enrich      addBlockedBy: [T1]  <- after discovery
T3: study       addBlockedBy: [T2]  <- needs enriched data + resume
T4: strategy    (on-demand)      <- per application, reads T2+T3
T5: feedback    addBlockedBy: [T4]  <- weekly, reads outcomes
```

### 4. Human-in-the-Loop

Phase gates — always pause:
- After discover → show new sources, ask which to integrate
- After enrich → show enrichment stats, ask to proceed
- Before strategy → confirm application, show preview
- After feedback → show insights, ask which to apply

### 5. Partial Failure Recovery

If a teammate goes idle without completing:
1. `TaskList` → find stuck `in_progress` task
2. Spawn replacement teammate with same skill
3. `TaskUpdate { taskId: stuck-id, owner: "replacement-name" }`
4. Rest of team unaffected.

### 6. Task Dynamism

Teammates may:
- `TaskCreate` for sub-findings
- `TaskUpdate { status: "deleted" }` for superseded tasks
- `TaskUpdate { owner: "other" }` to hand off

---

## Teammate Prompt Template

```
You are a teammate in team "{team-name}".
Your role: {role-name}

Read and follow: .claude/skills/know-{name}/SKILL.md
Read project context: CLAUDE.md

Project root: /Users/vadimnicolai/Public/ai-apps/apps/nomadically.work
State directory: ~/.claude/state/

## Your workflow
1. TaskList → find your available task (unblocked, no owner)
2. TaskUpdate { taskId, owner: "{role-name}", status: "in_progress" }
3. Do the work per your skill file
4. TaskCreate for any sub-tasks discovered
5. TaskUpdate { taskId, status: "completed" }
6. SendMessage to orchestrator: findings/changes produced
7. TaskList again — claim more work if available
8. When nothing left: idle and wait

## On failure
If you can't complete, message orchestrator before going idle.
```

---

## Execution Modes

### `/know-squad` — Full Cycle

```
Step 1: TeamCreate { name: "know-squad", description: "Knowledge acquisition cycle" }

Step 2: TaskCreate the dependency graph:
  T1: "Discover new sources"         addBlockedBy: []
  T2: "Enrich EU-remote jobs"        addBlockedBy: [T1]
  T3: "Generate study plan"          addBlockedBy: [T2]
  T4: "Analyze feedback"             addBlockedBy: []  (reads past data)

Step 3: Spawn teammates (they self-claim):
  Agent { name: "discoverer",  skill: know-discover }
  Agent { name: "enricher",    skill: know-enrich }   ← idles until T2 unblocks
  Agent { name: "curator",     skill: know-study }    ← idles until T3 unblocks

Step 4: After T1 complete → T2 unblocks → enricher claims
Step 5: After T2 complete → T3 unblocks → curator claims
Step 6: All complete → TeamDelete → show report → pause for user.
```

### `/know-squad discover` — Source Discovery Only

Single subagent launch of know-discover. No team needed.

### `/know-squad enrich` — Enrichment Batch

Single subagent launch of know-enrich. No team needed.

### `/know-squad strategy <appId>` — Generate Strategy

```
1. Fetch application by ID
2. Launch know-strategy subagent with application context
3. Store result in applications.ai_application_strategy
4. Show strategy to user
```

### `/know-squad feedback` — Analyze Outcomes

Single subagent launch of know-feedback. No team needed.

### `/know-squad status` — Pipeline Status

Read state files, show: last discovery count, enrichment stats, active study plan, feedback insights.

---

## Orchestrator Rules

1. **ALWAYS delegate via agent teams/subagents** — never do specialist work inline
2. **Respect dependency graph**: discover → enrich → study (sequential)
3. **Stop on user request** — show progress, never auto-continue silently
4. **Max 5 enrichment batches per cycle** (50 jobs each = 250 max)
5. **Human gate before strategy generation** — confirm application first
6. **Show the plan** before executing — pause at every phase gate
7. **Never auto-commit** — show changes, let user decide
8. **Partial failure = replace, not abort**
9. **TeamDelete after every team** — don't leak team context

---

## State Files (all in `~/.claude/state/`)

| File | Owner |
|---|---|
| `know-discovery-report.json` | Source Discovery |
| `know-enrichment-report.json` | Enrichment |
| `know-study-plan.json` | Study Curator |
| `know-feedback-insights.json` | Feedback |

---

## Programmatic Path (Trigger.dev)

The same agents are available as Trigger.dev tasks for scheduled execution:

| Task ID | Trigger | Agent |
|---|---|---|
| `know-squad-discover` | Daily (after janitor) | Source Discovery |
| `know-squad-enrich-batch` | Daily + on new jobs | Enrichment |
| `know-squad-strategy` | On-demand (mutation) | Strategy |
| `know-squad-feedback` | Weekly (Monday) | Feedback |
