# Team: claim-verification

Adversarial evidence review for claim cards.

## When to Use

- User runs `checkNoteClaims` or `buildClaimCards`
- Need to verify therapeutic claims against academic evidence
- Claims require cross-checking from multiple perspectives

## Team Composition

| Agent | Role | Model | Plan Required | Color |
|-------|------|-------|---------------|-------|
| `team-lead` | coordinator | sonnet | no | — |
| `evidence-hunter` | verifier | sonnet | no | blue |
| `counter-evidence` | verifier | sonnet | no | red |
| `judge` | verifier | opus | no | yellow |

## Agent Assignments

### evidence-hunter
**Task**: Find papers that SUPPORT each claim
**Sources**: PubMed, Crossref, Semantic Scholar
**Behavior**: Search aggressively for supporting evidence. Report findings with excerpts and relevance scores.

### counter-evidence
**Task**: Find papers that CONTRADICT each claim
**Sources**: Same sources as evidence-hunter
**Behavior**: Actively try to disprove claims. Look for conflicting results, failed replications, contradictory meta-analyses. Challenge the evidence-hunter's findings.

### judge
**Task**: Weigh evidence from both sides, assign verdict and confidence
**Sources**: None (works from teammate findings)
**Behavior**: Apply GRADE evidence framework. Consider study design, sample size, effect size, consistency. Assign verdict: supported/contradicted/mixed/insufficient.

## Task Structure

```
1. [pending] Extract claims from input text (→ lead)
   depends_on: []
2. [pending] Search for supporting evidence (→ evidence-hunter)
   depends_on: [1]
3. [pending] Search for contradicting evidence (→ counter-evidence)
   depends_on: [1]
4. [pending] Challenge evidence-hunter findings (→ counter-evidence)
   depends_on: [2]
5. [pending] Challenge counter-evidence findings (→ evidence-hunter)
   depends_on: [3]
6. [pending] Judge all evidence and assign verdicts (→ judge)
   depends_on: [4, 5]
7. [pending] Build final claim cards (→ lead)
   depends_on: [6]
```

## Lead Prompt

```
You are coordinating an adversarial claim verification team.

Process:
1. Extract claims from the input text/note
2. Broadcast claims to both verifiers simultaneously
3. After initial evidence gathering, have each verifier challenge the other's findings
4. Send all evidence to the judge for final verdicts
5. Build claim cards from the judge's output

Key files:
- src/tools/claim-cards.tools.ts — claim card generation
- src/tools/sources.tools.ts — academic source APIs
- src/db/schema.ts — claimCards table

The adversarial structure is the key mechanism. Two verifiers looking for opposite conclusions, then challenging each other, produces much higher confidence in the final verdict than a single pass.

Communication rules:
- Verifiers: message each other directly when challenging findings
- Judge: receives all messages, does not participate in debate
- Lead: only intervenes if verifiers deadlock
```

## Expected Output

Array of claim cards, each with:
- Claim text
- Verdict (supported/contradicted/mixed/insufficient)
- Confidence score (0-100)
- Evidence items from both sides
- Judge's rationale
