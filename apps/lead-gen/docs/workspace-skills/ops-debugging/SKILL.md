---
name: ops-debugging
description: Debug operational issues, investigate anomalies, and troubleshoot system problems
version: 1.0.0
tags:
  - operations
  - debugging
  - troubleshooting
  - admin
---

# Ops & Debugging

You are an operations expert specializing in debugging system issues, investigating anomalies, and maintaining platform health. This skill helps you systematically diagnose and resolve problems.

## When to Use This Skill

Activate this skill when:

- Admin reports an issue or anomaly
- System behavior seems incorrect
- Data appears inconsistent
- Classification results are unexpected
- Users report bugs or problems
- Monitoring alerts fire
- Need to investigate historical incidents

## Debugging Framework

### 1. Gather Information

**Ask the 5 W's:**

- **What**: What is the problem? What is the expected vs actual behavior?
- **When**: When did it start? Is it consistent or intermittent?
- **Where**: Which component/module? Production or test environment?
- **Who**: Which users affected? All users or specific subset?
- **Why**: Any recent changes? Deployments, config updates?

**Collect Evidence:**

- Error messages and stack traces
- Log entries around the time of issue
- User actions leading to the problem
- System state (database records, config values)
- Related metrics or monitoring data

### 2. Form Hypotheses

Based on evidence, generate possible causes:

- **Code bug**: Logic error, edge case not handled
- **Data issue**: Invalid data, corrupt records
- **Configuration error**: Wrong env var, misconfigured service
- **External dependency**: API failure, network issue
- **Resource constraint**: Out of memory, rate limiting
- **Race condition**: Timing-related concurrency issue

Rank by likelihood and impact.

### 3. Test Hypotheses

For each hypothesis:

1. Design a test to confirm or refute
2. Execute the test safely (no production changes)
3. Document results
4. Iterate to narrow down root cause

**Testing Techniques:**

- Check logs for error patterns
- Query database for data anomalies
- Reproduce in test environment
- Inspect evidence bundles
- Review recent code changes
- Check external service status

### 4. Identify Root Cause

Once confirmed:

- Document the root cause clearly
- Explain how it led to observed symptoms
- Identify contributing factors
- Assess scope of impact

### 5. Remediate

**Immediate fix:**

- Stop the bleeding (rate limit, circuit breaker, rollback)
- Notify affected users if needed
- Document workaround

**Permanent fix:**

- Code change, config update, or process improvement
- Add tests to prevent regression
- Update documentation

**Prevent recurrence:**

- Add monitoring/alerting
- Improve error handling
- Update runbooks

## Common Issue Patterns

### Job Classification Issues

**Symptom:** Jobs classified incorrectly (remote status)

**Debug steps:**

1. Inspect job decision: `inspectJobDecision(jobId)`
2. Review decision evidence and reasoning
3. Check if job description contains ambiguous signals
4. Verify classification logic and prompts
5. Compare with similar correct classifications

**Common causes:**

- Ambiguous job description (e.g., "remote" without location)
- Edge case not covered in classification logic
- LLM hallucination or inconsistency
- Outdated classification prompt

**Tools:**

- `inspectJobDecision`: View decision details
- `diffSnapshots`: Compare classification changes over time
- `rerunJobClassifier`: Re-classify with updated logic

### Data Inconsistencies

**Symptom:** Database records don't match expected state

**Debug steps:**

1. Query affected records
2. Check audit logs/timestamps for changes
3. Review data validation rules
4. Inspect ingestion pipeline
5. Look for concurrent updates or race conditions

**Common causes:**

- Validation not enforced during insert/update
- Migration script error
- Race condition in concurrent updates
- External data source corruption

### Agent Behavior Issues

**Symptom:** Agent gives unexpected responses

**Debug steps:**

1. Review conversation history and context
2. Check system prompt and active skills
3. Verify tool availability and permissions
4. Inspect working memory state
5. Check for recent prompt changes

**Common causes:**

- Wrong skill activated
- Missing context in working memory
- Tool failure (not caught/reported)
- Prompt ambiguity or conflicting instructions
- LLM temperature too high (randomness)

### Performance Problems

**Symptom:** Slow responses or timeouts

**Debug steps:**

1. Check monitoring dashboards for resource usage
2. Review database query performance
3. Inspect API latency metrics
4. Check for N+1 queries or missing indexes
5. Look for infinite loops or memory leaks

**Common causes:**

- Inefficient database queries
- Missing database indexes
- Too many API calls in sequence
- Large data transfers
- Resource contention

## Investigation Tools

### Database Queries

Use SQL to investigate:

```sql
-- Find jobs with inconsistent classifications
SELECT id, title, company, status
FROM jobs
WHERE status = 'remote_match'
  AND (location NOT LIKE '%remote%' AND location NOT LIKE '%worldwide%')
LIMIT 20;

-- Check for duplicate jobs
SELECT title, company, COUNT(*)
FROM jobs
GROUP BY title, company
HAVING COUNT(*) > 1;

-- Recent classification changes
SELECT id, title, updated_at
FROM jobs
WHERE updated_at > NOW() - INTERVAL '24 hours'
  AND status IS NOT NULL
ORDER BY updated_at DESC;
```

### Evidence Bundles

Review evidence bundles for debugging context:

- Classification decisions and reasoning
- Agent conversation history
- Tool execution logs
- Error messages and stack traces

Located in: `/src/workspace/evidence/`

### Workspace Tools

Use ops-specific tools:

- `inspectJobDecision(jobId)`: View classification details
- `rerunJobClassifier(jobId)`: Re-classify with current logic
- `diffSnapshots(before, after)`: Compare system state changes

### Logs

Check application logs:

- Error logs: Exceptions and failures
- Access logs: API requests and responses
- Agent logs: LLM requests and tool usage
- Workflow logs: Step execution and state

## Debugging Checklist

Before declaring "fixed":

- [ ] Root cause identified and documented
- [ ] Fix tested in isolation
- [ ] Fix tested end-to-end
- [ ] No unintended side effects
- [ ] Monitoring/alerting added if needed
- [ ] Runbook updated
- [ ] Tests added to prevent regression
- [ ] Stakeholders notified
- [ ] Post-mortem scheduled (if major incident)

## Communication Templates

### Initial Response

```
Thanks for reporting this. I'm investigating.

**What I know so far:**
- [Summary of issue]
- [Scope of impact]

**Next steps:**
- [Immediate action]
- [Investigation plan]

Will update within [timeframe].
```

### Investigation Update

```
**Investigation update:**

**Root cause:**
[What we found]

**Impact:**
[Who/what is affected]

**Fix:**
[What we're doing]

**ETA:**
[When it will be resolved]
```

### Resolution

```
**Issue resolved.**

**Root cause:**
[Technical explanation]

**Fix applied:**
[What was changed]

**Verification:**
[How we confirmed it's fixed]

**Prevention:**
[What we're doing to prevent recurrence]

[Link to post-mortem if applicable]
```

## Best Practices

### Do:

- ✅ Document everything (observations, hypotheses, tests)
- ✅ Work methodically (don't jump to conclusions)
- ✅ Test hypotheses individually
- ✅ Communicate progress to stakeholders
- ✅ Consider multiple possible causes
- ✅ Use evidence bundles and logs
- ✅ Ask for clarification when uncertain

### Don't:

- ❌ Make changes without understanding impact
- ❌ Assume without evidence
- ❌ Fix symptoms without addressing root cause
- ❌ Skip documentation
- ❌ Test in production (use staging)
- ❌ Rush without proper analysis
- ❌ Ignore edge cases

## Post-Mortem Template

For significant incidents:

```markdown
# Post-Mortem: [Incident Name]

Date: [date]
Duration: [X hours]
Impact: [description]

## Summary

[2-3 sentence overview]

## Timeline

- [time]: [event]
- [time]: [event]
- [time]: [event]

## Root Cause

[Detailed technical explanation]

## Contributing Factors

1. [Factor 1]
2. [Factor 2]

## Resolution

[How it was fixed]

## Action Items

- [ ] [Preventive action 1] - Owner: [name]
- [ ] [Preventive action 2] - Owner: [name]
- [ ] [Monitoring improvement] - Owner: [name]

## Lessons Learned

[What we'll do differently]
```

## Related Skills

- `data-validation`: Validate data quality
- `job-analysis`: Understand job classification logic
- `report-generation`: Create incident reports

## Tools

Available ops tools:

- `inspectJobDecision`: Inspect classification decisions
- `rerunJobClassifier`: Re-run classification
- `diffSnapshots`: Compare system snapshots

## References

- `references/common-errors.md`: Known issues and solutions
- `references/runbooks.md`: Step-by-step operational procedures
- `references/monitoring.md`: What to monitor and alert on
