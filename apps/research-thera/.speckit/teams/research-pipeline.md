# Team: research-pipeline

Parallel academic research across 7 sources with synthesis.

## When to Use

- User triggers research generation for a therapeutic goal
- Need to search multiple academic databases simultaneously
- Goal has complex therapeutic requirements spanning multiple domains

## Team Composition

| Agent | Role | Model | Plan Required | Color |
|-------|------|-------|---------------|-------|
| `team-lead` | coordinator | sonnet | no | — |
| `bio-researcher` | researcher | sonnet | no | blue |
| `social-researcher` | researcher | sonnet | no | green |
| `meta-researcher` | researcher | sonnet | no | yellow |
| `synthesizer` | synthesizer | opus | no | purple |

## Agent Assignments

### bio-researcher
**Sources**: PubMed, Europe PMC, Semantic Scholar
**Focus**: Biomedical and clinical evidence — RCTs, systematic reviews, meta-analyses
**File ownership**: Read-only (research agents don't write code)

### social-researcher
**Sources**: Crossref, OpenAlex, DataCite
**Focus**: Social science, psychology, behavioral research, therapeutic techniques
**File ownership**: Read-only

### meta-researcher
**Sources**: arXiv, Semantic Scholar (citation graph), OpenAlex (concepts)
**Focus**: Cross-domain connections, methodology papers, emerging techniques
**File ownership**: Read-only

### synthesizer
**Sources**: None (works from teammate findings)
**Focus**: Deduplicate, rank by evidence level, extract therapeutic techniques, produce final structured output
**File ownership**: Read-only

## Task Structure

```
1. [pending] Search biomedical sources (→ bio-researcher)
   depends_on: []
2. [pending] Search social science sources (→ social-researcher)
   depends_on: []
3. [pending] Search cross-domain sources (→ meta-researcher)
   depends_on: []
4. [pending] Synthesize findings into ranked research set (→ synthesizer)
   depends_on: [1, 2, 3]
5. [pending] Quality gate — verify top 10 papers have valid DOIs (→ lead)
   depends_on: [4]
```

## Lead Prompt

```
You are coordinating a parallel academic research team for a therapeutic goal.

Read the goal and its context from the database, then:
1. Create the 5 tasks listed in the team spec
2. Assign researchers to their source clusters
3. Wait for all 3 researchers to complete
4. Assign the synthesizer to merge findings
5. Run the quality gate yourself
6. Report the final ranked research set

Key files:
- src/tools/sources.tools.ts — API integrations for all 7 sources
- src/tools/extractor.tools.ts — LLM extraction with scoring
- src/db/schema.ts — therapyResearch table schema

Communication rules:
- Researchers: message the lead with findings as structured JSON
- Synthesizer: message the lead with the merged, deduplicated, ranked set
- Lead: broadcast the goal context to all researchers at start
```

## Expected Output

The lead reports to the user:
- Total papers found per source
- Top 10 ranked papers with titles, DOIs, evidence levels
- Therapeutic techniques extracted
- Confidence scores
