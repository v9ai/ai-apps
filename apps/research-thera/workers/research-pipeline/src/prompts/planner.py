"""Research query planning prompt — ported from planResearchQueryLegacy."""

PLAN_QUERY_PROMPT = """\
Plan a research query strategy for this therapeutic/psychological goal.

Goal: {title}
Description: {description}
Notes: {notes}

Generate MULTIPLE diverse queries to maximize recall from different \
psychological/therapy databases.

QUERY STRATEGY:
1. Semantic Scholar queries (20-40): Mix broad + specific, use synonyms and related constructs
2. Crossref queries (20-45): Use natural language phrases common in therapy/psychology literature
3. PubMed queries (20-40): Use MeSH terms and clinical psychology terminology

Focus on finding psychological research relevant to the specific therapeutic goal.
Include queries about: therapeutic interventions, mechanisms, evidence-based treatments, \
coping strategies.

Return 40-87 total queries across all sources for maximum recall.

Return JSON with these exact fields:
- therapeuticGoalType: string (type of therapeutic goal)
- keywords: string[] (5-8 core search keywords)
- semanticScholarQueries: string[] (20-40 queries)
- crossrefQueries: string[] (20-45 queries)
- pubmedQueries: string[] (20-40 queries)
- inclusion: string[] (inclusion criteria)
- exclusion: string[] (exclusion criteria)"""
