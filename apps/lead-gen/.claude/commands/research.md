# Competing Hypotheses Research Squad

You are the orchestrator for an **ad-hoc research team** that deeply investigates a target company from multiple angles using a competing-hypotheses protocol. Agents don't just investigate independently -- they actively debate and challenge each other's findings before a final synthesis.

This team is created per research target and destroyed after synthesis. Never reuse teams.

## Team

```
                    ┌──────────────────┐
                    │    Research      │  <- Synthesizes go/no-go
                    │     Lead         │
                    │   (orchestrator) │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Company    │   │   Hiring     │   │     ICP      │
│   Analyst    │   │    Intel     │   │   Matcher    │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                   │
       └──────────────────┼───────────────────┘
                          ▼
                 ┌──────────────┐
                 │  Synthesizer │  <- go/no-go + outreach strategy
                 └──────────────┘
```

| Agent | Skill | Mission |
|---|---|---|
| **Company Analyst** | `research-analyst` | Tech stack, funding, growth, AI adoption, recent news |
| **Hiring Intel** | `research-hiring` | Open roles, team growth, ATS boards, org structure, recent hires |
| **ICP Matcher** | `research-icp` | Score against ICP criteria: remote? EU? AI? Right stage? Accessible DMs? |
| **Synthesizer** | (orchestrator) | Merge findings, resolve conflicts, produce go/no-go verdict |

---

## The Debate Protocol

This is what differentiates research from simple parallel investigation. After each agent completes initial research:

1. **Cross-read**: Each agent reviews other agents' findings (posted in task descriptions)
2. **Challenge**: Agents message each other directly to dispute claims backed by conflicting evidence
3. **Resolve**: The challenged agent must respond with either stronger evidence or an updated position
4. **Update**: All agents revise confidence scores to account for challenges received
5. **Log**: Every challenge and resolution is recorded in the debate log

**Example debate exchange:**
```
Hiring Intel -> Company Analyst:
  "You claim Series B funded in 2024, but their Greenhouse board shows only 3 open roles
   and 2 are backfills. This doesn't match a post-funding hiring surge. Revise growth assessment?"

Company Analyst -> Hiring Intel:
  "Accepted. The TechCrunch article confirmed Series B but I found a follow-up showing
   they pivoted to profitability focus. Revising growth trajectory from 'aggressive' to 'selective'.
   Growth health score: 0.8 -> 0.5"
```

---

## Dependency Graph

```
T1: "Analyze {company}: tech stack, funding, growth, AI adoption"    (no deps)
T2: "Map {company}: hiring activity, open roles, ATS boards, org"   (no deps)
T3: "Score {company} against ICP criteria"                           (no deps)
T4: "Debate: cross-check findings and challenge weak claims"         addBlockedBy: [T1, T2, T3]
T5: "Synthesize: produce go/no-go verdict with outreach strategy"    addBlockedBy: [T4]
```

---

## Full-Parity Team Protocol

### 1. Task Assignment (dynamic claiming)

All tasks created upfront. Teammates call `TaskList`, claim with `TaskUpdate {owner, status: "in_progress"}`. First claimant wins.

### 2. Inter-Agent Communication (bidirectional)

```
# Agent -> Agent (debate challenge)
SendMessage { recipient: "company-analyst", content: "Challenge: your funding data conflicts with...", summary: "Debate challenge on funding" }

# Agent -> Orchestrator (completion)
SendMessage { recipient: "orchestrator", content: "Findings: {...}", summary: "Company analysis complete" }

# Orchestrator -> Agent (scope update)
SendMessage { recipient: "hiring-intel", content: "Also check their Lever board, analyst found a Lever reference", summary: "Additional ATS to check" }
```

### 3. Partial Failure Recovery

If an agent goes idle without completing:
1. `TaskList` to find stuck `in_progress` task
2. Spawn replacement with same skill
3. `TaskUpdate { taskId: stuck-id, owner: "replacement-name" }`
4. Rest of team unaffected

---

## Teammate Prompt Template

```
You are a teammate in team "research-{company-slug}".
Your role: {role-name}

Read and follow: .claude/skills/research-{skill}/SKILL.md
Read project context: CLAUDE.md

Target company: {company-name}
Company domain: {domain} (if known)
Project root: /Users/vadimnicolai/Public/ai-apps/apps/lead-gen
State directory: ~/.claude/state/

## Your workflow
1. TaskList -> find your available task (unblocked, no owner)
2. TaskUpdate { taskId, owner: "{role-name}", status: "in_progress" }
3. Do the work per your skill file
4. Post findings in task description for other agents to read
5. TaskUpdate { taskId, status: "completed" }
6. SendMessage to orchestrator with findings summary
7. Wait for debate phase (T4) to unblock
8. During debate: read other agents' findings, challenge weak claims via SendMessage
9. Update your findings based on challenges received
10. When nothing left: idle and wait

## On failure
If you can't complete, message orchestrator. Describe what's incomplete and where partial output is.
```

---

## Execution Modes

### `/research {company}` -- Full Research Squad

```
Step 1: Parse company name from arguments. Slugify for team name.
        If a domain/URL is provided, extract it.

Step 2: Check if company exists in DB (query companies table by name/domain).
        Gather any existing data to seed the research.

Step 3: TeamCreate { name: "research-{slug}", description: "Competing hypotheses research: {company}" }

Step 4: TaskCreate the full dependency graph:
  T1: "Analyze {company}: tech stack, funding, growth trajectory, AI adoption, recent news"
      description: "Company: {company}. Domain: {domain}. Existing DB data: {summary}"
      addBlockedBy: []

  T2: "Map {company}: hiring activity, open roles, ATS boards, team structure, recent hires"
      description: "Company: {company}. Domain: {domain}. Known ATS boards: {summary}"
      addBlockedBy: []

  T3: "Score {company} against ICP: remote-friendly? EU? AI focus? Right stage? DM accessible?"
      description: "Company: {company}. Domain: {domain}. DB category: {cat}. AI tier: {tier}"
      addBlockedBy: []

  T4: "Debate phase: review all findings, challenge weak claims, resolve conflicts"
      description: "Read T1/T2/T3 findings. Challenge any claims with conflicting evidence. Update confidence scores."
      addBlockedBy: [T1, T2, T3]

  T5: "Synthesize: produce go/no-go verdict with outreach strategy and confidence scores"
      description: "Merge all findings + debate resolutions into final verdict."
      addBlockedBy: [T4]

Step 5: Spawn 3 research agents in parallel (they self-claim T1/T2/T3):
  Agent { name: "company-analyst", skill: research-analyst,
    prompt: [teammate template with role=Company Analyst, skill=analyst] }

  Agent { name: "hiring-intel", skill: research-hiring,
    prompt: [teammate template with role=Hiring Intel, skill=hiring] }

  Agent { name: "icp-matcher", skill: research-icp,
    prompt: [teammate template with role=ICP Matcher, skill=icp] }

Step 6: Monitor T1/T2/T3 completion. When all 3 complete:
  - Collect findings from each agent's messages
  - Update T4 description with all three agents' findings
  - Tell all agents: "Debate phase active. Read T4 description. Challenge via SendMessage."

Step 7: Monitor debate exchanges. After debate settles (agents stop messaging) or timeout (2 min):
  - Collect all debate messages
  - Mark T4 complete
  - Proceed to synthesis (T5)

Step 8: Synthesize (orchestrator does this inline -- no separate agent):
  - Merge all findings
  - Resolve any remaining conflicts (favor higher-evidence claims)
  - Compute final scores
  - Determine verdict: GO / NO-GO / NEEDS-MORE-INFO
  - Draft outreach strategy if GO
  - Build debate log from challenge/resolution messages

Step 9: TeamDelete { name: "research-{slug}" }

Step 10: Write results to ~/.claude/state/research-{slug}.json

Step 11: Display results to user in structured format.
```

### `/research batch {company1} {company2} ...` -- Parallel Research Squads

```
Step 1: Parse company names from arguments.

Step 2: For each company, run the full `/research {company}` flow.
        Teams are independent -- spawn them all, then monitor.
        Each gets its own team: "research-{slug1}", "research-{slug2}", etc.

Step 3: After all complete, show comparative summary:
  - Ranked by weighted ICP score
  - Side-by-side verdict comparison
  - Top recommended target with reasoning

Step 4: Write batch summary to ~/.claude/state/research-batch-{timestamp}.json
```

### `/research score {company}` -- Quick ICP Score Only

```
Step 1: Parse company name.

Step 2: No team needed. Launch single subagent:
  Agent { name: "icp-scorer", skill: research-icp,
    prompt: "Quick ICP scoring only. No debate phase. Score {company} against all ICP criteria.
             Write results to task completion. No team -- just score and return." }

Step 3: Display ICP scores. No debate, no synthesis.
        Write to ~/.claude/state/research-score-{slug}.json
```

---

## Synthesis Protocol (Step 8)

The orchestrator performs synthesis by merging all agent outputs:

### Score Aggregation

```
tech_fit      = company_analyst.scores.tech_fit * 0.7 + icp_matcher.criteria_scores.ai_focus.score * 0.3
hiring_signal = hiring_intel.scores.hiring_signal * 0.6 + hiring_intel.scores.role_relevance * 0.4
icp_match     = icp_matcher.weighted_total
accessibility = icp_matcher.criteria_scores.decision_maker_accessibility.score * 0.5
              + hiring_intel.org_structure.key_leaders_found * 0.5

confidence    = mean(all_hypothesis_confidences) * debate_factor
  where debate_factor = 1.0 if no challenges, 0.9 if challenges resolved, 0.7 if unresolved conflicts
```

### Verdict Rules

| Condition | Verdict |
|---|---|
| `icp_match >= 0.7 AND no deal-breakers AND confidence >= 0.6` | **GO** |
| `any deal-breaker` | **NO-GO** |
| `icp_match >= 0.5 AND confidence < 0.6` | **NEEDS-MORE-INFO** |
| `icp_match < 0.5` | **NO-GO** |
| `unresolved debate conflicts on critical claims` | **NEEDS-MORE-INFO** |

### Outreach Strategy (GO verdict only)

Build from merged findings:
- **Target contacts**: from ICP Matcher's decision_makers + Hiring Intel's key_leaders
- **Angle**: strongest alignment signal from all three agents
- **Timing**: based on Company Analyst's growth trajectory + Hiring Intel's velocity
- **Risks**: all agents' data_gaps + challenged hypotheses with low resolution confidence
- **Channel**: cold email if DM email found, LinkedIn if not, warm intro if mutual connections

---

## Output Format

Final research report written to `~/.claude/state/research-{slug}.json`:

```json
{
  "company": "...",
  "domain": "...",
  "researched_at": "ISO timestamp",
  "verdict": "GO|NO-GO|NEEDS-MORE-INFO",
  "confidence": 0.85,
  "scores": {
    "tech_fit": 0.9,
    "hiring_signal": 0.7,
    "icp_match": 0.85,
    "accessibility": 0.6
  },
  "outreach_strategy": {
    "target_contacts": [
      { "name": "...", "title": "CTO", "channel": "linkedin", "accessibility": "public profile" }
    ],
    "angle": "Their recent hiring for ML engineers + our AI consultancy focus",
    "timing": "Now -- they just raised Series B and are scaling AI team",
    "risks": ["Large company, may have internal recruiters", "No direct email found for CTO"],
    "recommended_template": "ai-scaling-consultancy"
  },
  "deal_breakers": [],
  "agent_findings": {
    "company_analyst": { "...full output..." },
    "hiring_intel": { "...full output..." },
    "icp_matcher": { "...full output..." }
  },
  "debate_log": [
    {
      "from": "hiring_intel",
      "to": "company_analyst",
      "challenge": "Funding data conflicts with hiring velocity...",
      "response": "Accepted. Revised growth trajectory...",
      "resolution": "Growth health downgraded from 0.8 to 0.5",
      "scores_affected": ["growth_health"]
    }
  ],
  "data_gaps": ["Could not verify exact employee count", "No engineering blog found"],
  "next_steps": "Feed into /pipeline outreach if GO"
}
```

---

## Orchestrator Rules

1. **TeamCreate per research target** -- never reuse teams across companies
2. **All 3 research agents run in parallel** (T1/T2/T3 have no dependencies)
3. **Debate phase is mandatory** -- skip only for `/research score`
4. **Synthesis waits for debate** to complete before producing verdict
5. **Never send outreach based on research alone** -- research feeds into pipeline outreach
6. **TeamDelete after synthesis** -- do not leak team context
7. **Write results to state** -- `~/.claude/state/research-{slug}.json`
8. **Respect DB data** -- if company exists in DB, seed agents with existing data
9. **Partial failure = replace** -- if an agent stalls, spawn replacement, do not abort team
10. **Debate timeout**: if no new messages for 2 minutes, close debate phase
11. **Show results to user** after synthesis -- formatted summary, not raw JSON
12. **Never auto-commit** -- research produces state files only, no code changes

---

## State Files (all in `~/.claude/state/`)

| File | Purpose |
|---|---|
| `research-{slug}.json` | Full research report for a single company |
| `research-score-{slug}.json` | Quick ICP score (no debate) |
| `research-batch-{timestamp}.json` | Batch comparison summary |

---

## Integration with Pipeline

Research results are consumed by other pipeline stages:
- **Outreach**: `/pipeline outreach` reads research reports to prioritize targets
- **Discovery**: Research findings can feed back into `improve-audit` for new source discovery
- **Enrichment**: Company data discovered during research can be written back to DB via GraphQL mutations

Research does NOT directly trigger outreach. The user must explicitly decide.
