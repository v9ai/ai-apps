# Agent Teams — Unified Dispatcher

You are the orchestrator for all agent teams in lead-gen. Route to the correct team based on the user's `$ARGUMENTS`.

## Routing

Parse `$ARGUMENTS` and dispatch:

| Pattern | Team | Action |
|---|---|---|
| `pipeline` | Pipeline | Full batch cycle |
| `pipeline discover [vertical]` | Pipeline | Discovery-only |
| `pipeline enrich` | Pipeline | Enrich pending companies |
| `pipeline outreach` | Pipeline | Draft + send for ready contacts |
| `pipeline status` | Pipeline | Funnel metrics |
| `research {company}` | Research | Full competing-hypotheses research |
| `research batch {c1} {c2} ...` | Research | Parallel squads, comparative summary |
| `research score {company}` | Research | Quick ICP scoring (single agent) |
| `improve` | Improve | Full self-improvement cycle |
| `improve status` | Improve | Pipeline health check |
| `improve discover` | Improve | Expand job sources |
| `improve classify` | Improve | Tune classification |
| `improve skills` | Improve | Optimize skill matching |
| `codefix` | Codefix | Full codebase quality cycle |
| `codefix audit [target]` | Codefix | Targeted audit |
| `codefix apply` | Codefix | Implement pending findings |
| `codefix verify` | Codefix | Verify recent changes |
| `codefix status` | Codefix | Show meta-state |
| (empty / help) | — | Show this routing table |

If `$ARGUMENTS` is empty, show the routing table and ask what to run.

---

## Shared Team Protocol

All teams use Claude Code native agent teams with full parity.

### Primitives

- **TeamCreate** / **TeamDelete** — lifecycle per run
- **TaskCreate** with `addBlockedBy` — dependency graphs
- **TaskList** / **TaskUpdate** — dynamic claiming (first claimant wins)
- **SendMessage** — bidirectional inter-agent communication
- **Partial failure** — spawn replacement, reassign task, never abort

### Teammate Prompt Template

```
You are a teammate in team "{team-name}".
Your role: {role-name}

Read and follow: .claude/skills/{skill-name}/SKILL.md
Read project context: CLAUDE.md

Project root: /Users/vadimnicolai/Public/ai-apps/apps/lead-gen
State directory: ~/.claude/state/

## Your workflow
1. TaskList → find your available task (unblocked, no owner)
2. TaskUpdate { taskId, owner: "{role-name}", status: "in_progress" }
3. Do the work per your skill file
4. TaskCreate for any sub-tasks discovered (link with addBlockedBy if sequential)
5. TaskUpdate { taskId, status: "completed" }
6. SendMessage to orchestrator: results produced, where state was written
7. TaskList again — claim more work if available
8. When nothing left: idle and wait

## On failure
Message orchestrator before going idle. Describe what's incomplete and where partial output is.
```

### Universal Rules

1. **ALWAYS delegate via agent teams** — never do specialist work inline
2. **Show the plan** before executing — pause at every phase gate
3. **Never auto-commit** — show changes, let user decide
4. **Partial failure = replace, not abort**
5. **TeamDelete after every team** — don't leak team context

---

# Team: Pipeline

B2B lead generation pipeline: discover → enrich → contacts → outreach → QA.

## Agents

```
            ┌──────────────┐
            │   Pipeline   │
            │  Coordinator │
            │(pipeline-meta)│
            └──────┬───────┘
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌────────┐  ┌──────────┐  ┌─────────┐
│ Scout  │  │ Enricher │  │ Hunter  │
│(discov)│  │ (enrich) │  │(contact)│
└───┬────┘  └────┬─────┘  └────┬────┘
    └──────┬─────┘              │
           ▼                    │
    ┌──────────┐                │
    │ Outreach │◄───────────────┘
    │(compose) │
    └────┬─────┘
         ▼
    ┌─────────┐
    │   QA    │
    │(audit)  │
    └─────────┘
```

| Agent | Skill | Mission |
|---|---|---|
| **Discovery Scout** | `pipeline-discover` | Find companies matching ICP |
| **Enrichment Specialist** | `pipeline-enrich` | Classify, score, enrich |
| **Contact Hunter** | `pipeline-contacts` | Find + verify decision-maker contacts |
| **Outreach Composer** | `pipeline-outreach` | Draft + schedule campaigns (plan-approval required) |
| **QA Auditor** | `pipeline-qa` | Dedup, validate, clean |
| **Pipeline Coordinator** | `pipeline-meta` | Batch strategy + priorities |

## Dependency Graph

```
T1: discover     (no deps)              ← immediate
T2: enrich       addBlockedBy: [T1]     ← needs discovered companies
T3: contacts     addBlockedBy: [T2]     ← needs enriched companies
T4: outreach     addBlockedBy: [T3]     ← needs verified contacts
T5: qa-audit     addBlockedBy: [T2]     ← parallel with T3/T4
```

## Execution: `pipeline`

```
Step 1: Launch pipeline-meta subagent → batch plan
Step 2: Show plan. Pause for approval.
Step 3: TeamCreate { name: "pipeline" }
Step 4: TaskCreate dependency graph from plan
Step 5: Spawn scout (claims T1)
Step 6: T1 done → spawn enricher (T2)
Step 7: T2 done → spawn contact-hunter (T3) + qa-auditor (T5) in parallel
Step 8: T3 done → spawn outreach-composer (T4)
Step 9: Outreach drafts ready → PAUSE FOR USER APPROVAL before sends
Step 10: All done → TeamDelete → show report
```

## Execution: `pipeline discover [vertical]`

```
TeamCreate { name: "pipeline-discover" }
T1: "Discover: {vertical}" (no deps)
Spawn scout. On complete → TeamDelete → show companies. Pause.
```

## Execution: `pipeline enrich`

```
TeamCreate { name: "pipeline-enrich" }
T1: "Enrich batch"              (no deps)
T2: "QA audit enrichment"       addBlockedBy: [T1]
Spawn enricher → on T1 done spawn QA → TeamDelete → show results.
```

## Execution: `pipeline outreach`

```
TeamCreate { name: "pipeline-outreach" }
T1: "Draft outreach campaigns" (no deps)
Spawn outreach-composer. On complete → PAUSE FOR APPROVAL → TeamDelete.
```

## Execution: `pipeline status`

Launch pipeline-meta subagent in read-only mode. Show funnel metrics.

## Pipeline Rules

1. **OUTREACH REQUIRES EXPLICIT USER APPROVAL** — never auto-send
2. **Check blocked-companies** before enrichment and outreach
3. **Max batch**: discovery 50, enrichment 30, contacts 20, outreach 10
4. **Budget tracking** — respect API call and email send limits
5. **Stop on critical QA findings** — pause, show issues, ask user

## Pipeline State (all `~/.claude/state/`)

| File | Owner |
|---|---|
| `pipeline-discovery-report.json` | Discovery Scout |
| `pipeline-enrichment-report.json` | Enrichment Specialist |
| `pipeline-contacts-report.json` | Contact Hunter |
| `pipeline-outreach-report.json` | Outreach Composer |
| `pipeline-qa-report.json` | QA Auditor |
| `pipeline-meta-state.json` | Pipeline Coordinator |

---

# Team: Research

Competing-hypotheses research squad. Created per target, destroyed after synthesis.

## Agents

```
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Company  │  │  Hiring  │  │   ICP    │
    │ Analyst  │  │  Intel   │  │ Matcher  │
    └────┬─────┘  └────┬─────┘  └────┬─────┘
         └─────────────┼──────────────┘
                       ▼
              ┌──────────────┐
              │   Debate +   │
              │  Synthesize  │
              └──────────────┘
```

| Agent | Skill | Mission |
|---|---|---|
| **Company Analyst** | `research-analyst` | Tech stack, funding, growth, AI adoption |
| **Hiring Intel** | `research-hiring` | Open roles, ATS boards, team growth, org structure |
| **ICP Matcher** | `research-icp` | Score against ICP: remote? EU? AI? Stage? DM access? |

## Debate Protocol

After initial research completes:
1. Agents cross-read each other's findings
2. Challenge claims with conflicting evidence via SendMessage
3. Challenged agent responds with stronger evidence or revises
4. All confidence scores updated to account for challenges
5. Every challenge + resolution logged

## Dependency Graph

```
T1: company analysis       (no deps)
T2: hiring intel           (no deps)
T3: ICP scoring            (no deps)
T4: debate phase           addBlockedBy: [T1, T2, T3]
T5: synthesize verdict     addBlockedBy: [T4]
```

## Execution: `research {company}`

```
Step 1: Parse company name. Check DB for existing data.
Step 2: TeamCreate { name: "research-{slug}" }
Step 3: TaskCreate T1-T5
Step 4: Spawn 3 agents in parallel (self-claim T1/T2/T3)
Step 5: T1+T2+T3 done → activate debate phase (T4)
Step 6: Debate settles or 2min timeout → synthesize (T5, orchestrator-inline)
Step 7: TeamDelete → write ~/.claude/state/research-{slug}.json → show results
```

## Execution: `research batch {c1} {c2} ...`

One team per company, all spawned in parallel. After all complete, show comparative ranking.

## Execution: `research score {company}`

Single subagent with `research-icp` skill. No team, no debate.

## Verdict Rules

| Condition | Verdict |
|---|---|
| `icp_match >= 0.7 AND no deal-breakers AND confidence >= 0.6` | **GO** |
| `any deal-breaker` | **NO-GO** |
| `icp_match >= 0.5 AND confidence < 0.6` | **NEEDS-MORE-INFO** |
| `icp_match < 0.5` | **NO-GO** |

## Research Rules

1. **TeamCreate per target** — never reuse teams
2. **Debate is mandatory** (except `/research score`)
3. **Never trigger outreach** — research feeds pipeline, user decides
4. **Seed from DB** — check existing company data before web research
5. **Debate timeout**: 2 minutes of silence → close debate

---

# Team: Improve

Job search self-improvement. Goal: fully remote EU AI engineering role.

Agents: `improve-mine` (Pipeline Monitor), `improve-audit` (Discovery Expander), `improve-evolve` (Classifier Tuner), `improve-apply` (Skill Optimizer), `improve-meta` (Strategy Brain).

## Dependency Graph

```
T1: mine       (no deps)                ← immediate
T2: audit      (no deps)                ← parallel with T1
T3: evolve     addBlockedBy: [T1, T2]
T4: apply      addBlockedBy: [T1, T2]   ← parallel with T3
T5: verify     addBlockedBy: [T4]
```

## Execution: `improve`

```
Step 1: Launch improve-meta subagent → phase + action plan
Step 2: Show plan. Pause.
Step 3: TeamCreate { name: "improve" }
Step 4: TaskCreate T1-T5
Step 5: Spawn monitor + expander (claim T1/T2)
Step 6: T1+T2 done → spawn skill-optimizer + tuner (claim T3/T4)
Step 7: T4 done → spawn verifier (T5)
Step 8: TeamDelete → show report
```

Sub-modes: `improve status`, `improve discover`, `improve classify`, `improve skills` — each creates a small team for the targeted task. See `.claude/commands/improve.md` for full details.

## Improve Rules

1. **Goal-first**: every action must help Vadim get hired
2. **Max 3 file-modifying tasks + 2 skill evolutions per cycle**
3. **Measure before and after** — track metric changes

---

# Team: Codefix

Codebase quality self-improvement (independent of business goals).

Agents: `codefix-mine` (Trajectory Miner), `codefix-audit` (Codebase Auditor), `codefix-evolve` (Skill Evolver), `codefix-apply` (Code Improver), `codefix-verify` (Verification Gate), `codefix-meta` (Meta-Optimizer).

## Dependency Graph

```
T1: mine       (no deps)                ← immediate
T2: audit      (no deps)                ← parallel with T1
T3: apply      addBlockedBy: [T1, T2]
T4: evolve     addBlockedBy: [T1, T2]   ← parallel with T3
T5: verify     addBlockedBy: [T3]
```

Full execution details in `.claude/commands/codefix.md`.

## Codefix Rules

1. **Verification MANDATORY** after any write operation
2. **Max 3 code changes + 2 skill evolutions per cycle**
3. Phase detection: IMPROVEMENT / SATURATION / COLLAPSE_RISK
