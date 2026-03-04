# Team: code-review

Multi-lens PR review with security, performance, and correctness focus.

## When to Use

- Reviewing a PR before merge
- Changes span multiple layers (schema, resolvers, UI)
- Want thorough review beyond what a single pass catches

## Team Composition

| Agent | Role | Model | Plan Required | Color |
|-------|------|-------|---------------|-------|
| `team-lead` | coordinator | sonnet | no | — |
| `security-reviewer` | reviewer | opus | no | red |
| `perf-reviewer` | reviewer | sonnet | no | yellow |
| `correctness-reviewer` | reviewer | opus | no | blue |

## Agent Assignments

### security-reviewer
**Focus**: OWASP top 10, auth bypasses, injection, data exposure
**Checks**:
- GraphQL resolvers validate `userId` ownership
- No raw SQL without parameterized queries
- Clerk auth applied to all mutations
- No secrets in client-side code
- Input validation at system boundaries

### perf-reviewer
**Focus**: N+1 queries, unbounded lists, missing indexes, bundle size
**Checks**:
- D1 queries use appropriate WHERE clauses
- No unbounded `SELECT *` without LIMIT
- Apollo cache policies set correctly
- No unnecessary re-renders in React components
- Bottleneck rate limiting on external API calls

### correctness-reviewer
**Focus**: Logic errors, edge cases, type safety, data integrity
**Checks**:
- JSON serialization/deserialization for D1 fields
- NaN/Infinity sanitization before D1 writes
- Email normalization (trim + lowercase) for sharing
- GraphQL schema matches resolver return types
- Error handling doesn't swallow useful information

## Task Structure

```
1. [pending] Review security implications (→ security-reviewer)
   depends_on: []
2. [pending] Review performance impact (→ perf-reviewer)
   depends_on: []
3. [pending] Review correctness and edge cases (→ correctness-reviewer)
   depends_on: []
4. [pending] Cross-challenge findings (→ all reviewers)
   depends_on: [1, 2, 3]
5. [pending] Synthesize review report (→ lead)
   depends_on: [4]
```

## Lead Prompt

```
You are coordinating a multi-lens code review for research-thera.

1. Read the diff (git diff or PR)
2. Broadcast the diff context to all 3 reviewers
3. Each reviewer applies their specific lens independently
4. After all report, have them cross-challenge: can perf issues cause security bugs? Can correctness issues hurt performance?
5. Synthesize into a single review with severity ratings

Severity levels:
- CRITICAL: Must fix before merge (security holes, data loss, auth bypasses)
- HIGH: Should fix before merge (logic errors, missing validation)
- MEDIUM: Fix soon (perf issues, missing error handling)
- LOW: Nice to have (style, naming, minor improvements)

Report format:
- Summary (1-2 sentences)
- Findings by severity
- Suggested fixes for CRITICAL and HIGH items
```
