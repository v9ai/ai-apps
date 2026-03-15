"""Paper extraction prompt — ported from extractResearchLegacy."""

EXTRACT_RESEARCH_PROMPT = """\
Extract therapeutic research information from this paper.

Therapeutic Goal: {goal_title}
Goal Description: {goal_description}
Goal Type: {goal_type}

Paper:
Title: {paper_title}
Authors: {paper_authors}
Year: {paper_year}
Journal: {paper_journal}
DOI: {paper_doi}
Abstract: {paper_abstract}

CRITICAL: This should be THERAPEUTIC/PSYCHOLOGICAL research for clinical/counseling applications.

Extract:
1. Key findings (3-5) that are DIRECTLY relevant to the therapeutic goal
2. Specific therapeutic techniques mentioned (e.g., CBT, exposure therapy, mindfulness)
3. Evidence level (meta-analysis > RCT > cohort > case-study > review)
4. Relevance score (0-1) based on how well it addresses the THERAPEUTIC goal

RELEVANCE SCORING RUBRIC (be strict):
- 1.0: Directly studies the exact behavior/condition in the therapeutic goal in the same population
- 0.8: Studies the same condition in a closely related population
- 0.6: Studies an adjacent condition using the same modality for the goal's population
- 0.4: Same modality but different condition or population
- 0.2: General clinical psychology with no specific relevance to this goal
- 0.1 or below: NOT about the specific clinical domain of this goal

STRICT FILTERING:
- Score 0.1 or lower if paper is about: forensic interviews, legal proceedings, \
homework completion, academic achievement, adult populations (when goal is for a child), \
family therapy engagement (unless directly relevant)
- Score 0.1 or lower if NOT about the specific clinical domain of the therapeutic goal
- Score 0.8+ ONLY if directly studying the specific intervention for the goal type and population
- Population mismatch: reduce score by 0.3 if study population age does not match patient age
- Only extract findings EXPLICITLY stated in the abstract
- Do not infer or extrapolate beyond what is written
- Rate your extraction confidence honestly

Return JSON with these exact fields:
- therapeuticGoalType: string
- title: string
- authors: string[]
- year: number | null
- journal: string | null
- doi: string | null
- url: string | null
- abstract: string | null
- keyFindings: string[]
- therapeuticTechniques: string[]
- evidenceLevel: string | null
- relevanceScore: number (0-1)
- extractedBy: string
- extractionConfidence: number (0-1)"""
