# Team: debug-squad

Competing hypothesis investigation for bugs with unclear root cause.

## When to Use

- Bug report with unclear root cause
- Multiple possible explanations
- Sequential debugging would anchor on first hypothesis

## Team Composition

| Agent | Role | Model | Plan Required | Color |
|-------|------|-------|---------------|-------|
| `team-lead` | coordinator | sonnet | no | — |
| `investigator-1` | debugger | opus | no | blue |
| `investigator-2` | debugger | opus | no | green |
| `investigator-3` | debugger | opus | no | yellow |

## Coordination Pattern

This team uses **adversarial investigation**:

1. Lead reads the bug report and formulates 3 competing hypotheses
2. Each investigator gets ONE hypothesis to prove/disprove
3. Investigators actively try to disprove each other's theories
4. The hypothesis that survives challenge is the root cause
5. The winning investigator proposes the fix

## Task Structure (Template)

```
1. [pending] Formulate 3 competing hypotheses (→ lead)
   depends_on: []
2. [pending] Investigate hypothesis A (→ investigator-1)
   depends_on: [1]
3. [pending] Investigate hypothesis B (→ investigator-2)
   depends_on: [1]
4. [pending] Investigate hypothesis C (→ investigator-3)
   depends_on: [1]
5. [pending] Cross-challenge: try to disprove other hypotheses (→ all investigators)
   depends_on: [2, 3, 4]
6. [pending] Determine root cause from surviving hypothesis (→ lead)
   depends_on: [5]
7. [pending] Implement fix (→ winning investigator)
   depends_on: [6]
```

## Lead Prompt

```
You are coordinating a debug investigation using competing hypotheses.

Read the bug report, reproduce if possible, then:
1. Formulate 3 distinct hypotheses for the root cause
   - Each hypothesis should be testable and falsifiable
   - Cover different layers: data, logic, infrastructure
2. Assign one hypothesis per investigator
3. Each investigator gathers evidence for/against their hypothesis
4. After initial investigation, have investigators challenge each other:
   - "Your hypothesis doesn't explain X because..."
   - "If your hypothesis were true, we'd also see Y, but we don't"
5. The hypothesis that survives challenge is the root cause
6. The winning investigator implements the fix

Key debugging resources:
- D1 database: wrangler d1 execute research-thera-db
- GraphQL playground: localhost:3000/api/graphql
- Trigger.dev dashboard: for async job failures
- Logs: check generation_jobs table for error field

Communication rules:
- Investigators: message each other directly during challenge phase
- Lead: don't pick a winner until challenge phase completes
- If all hypotheses are disproven, formulate new ones
```
