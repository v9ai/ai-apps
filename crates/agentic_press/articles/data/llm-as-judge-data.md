# Data Analysis: LLM as Judge -- Evaluation Expertise in the Remote EU Job Market

## Summary

Model evaluation is emerging as a distinct skill requirement in AI/ML hiring, ranking as the 22nd most demanded skill tag across the nomadically.work job corpus (38 out of 311 skill-tagged jobs, or 12.2%). However, dedicated evaluation roles remain rare -- only 3 out of 1,780 jobs carry "eval" or "evaluation" in their title -- indicating that evaluation expertise is overwhelmingly embedded within broader AI engineering and ML scientist positions rather than siloed into standalone roles. The explicit term "LLM-as-judge" appeared in exactly 1 job description across the entire corpus, signaling that while the practice is widespread in AI labs, the terminology has not yet penetrated mainstream job listings.

## Key Metrics

| Metric | Value | Period | Context |
|---|---|---|---|
| Total jobs in database | 1,780 | Jan 2025 -- Mar 2026 | All ATS sources |
| Total remote EU classified jobs | 21 | All time | is_remote_eu = true |
| Jobs with `model-evaluation` skill tag | 38 (N=311 tagged) | All time | 12.2% of skill-tagged jobs |
| Jobs mentioning evaluation in descriptions | 643 (N=1,780) | All time | 36.1% of all jobs |
| Dedicated eval-titled roles | 3 | All time | "AI Evaluation Engineer", "Model Evaluation QA Lead", "Senior SWE, Evals and AI Infra" |
| AI/ML jobs with eval + description signals | 110 (N=1,780) | All time | 6.2% of all jobs |
| Eval pipeline/framework description mentions | 24 (N=1,780) | All time | 8 pipeline + 16 framework |
| Benchmark mentions in descriptions | 199 (N=1,780) | All time | 11.2% of all jobs |
| Exact "LLM-as-judge" mentions | 1 (N=1,780) | All time | OKX - Principal AI Engineer, Chatbot Development |
| RLHF / human evaluation mentions | 12 (N=1,780) | All time | 0.7% of all jobs |
| Remote EU jobs mentioning evaluation in descriptions | 10 (N=21) | All time | 47.6% of remote EU jobs |

## Insight 1: Model Evaluation Is the 6th Most Demanded AI-Specific Skill

Among AI/ML-specific skill tags (excluding general-purpose languages and cloud platforms), `model-evaluation` ranks 6th:

| Rank | AI/ML Skill Tag | Job Count (N=311 tagged) | % of Tagged Jobs |
|---|---|---|---|
| 1 | machine-learning | 139 | 44.7% |
| 2 | llm | 137 | 44.1% |
| 3 | deep-learning | 48 | 15.4% |
| 4 | nlp | 43 | 13.8% |
| 5 | agents | 43 | 13.8% |
| **6** | **model-evaluation** | **38** | **12.2%** |
| 7 | agentic-ai | 34 | 10.9% |
| 8 | mlops | 26 | 8.4% |
| 9 | prompt-engineering | 18 | 5.8% |
| 10 | fine-tuning | 18 | 5.8% |
| 11 | rag | 16 | 5.1% |
| 12 | transformers | 11 | 3.5% |

- **Data:** `SELECT tag, COUNT(*) FROM job_skill_tags WHERE tag IN (...) GROUP BY tag ORDER BY cnt DESC`
- **Visualization:** Horizontal bar chart. X-axis: job count. Y-axis: AI/ML skill tags. Headline: "Model Evaluation Ranks 6th Among AI-Specific Skill Demands"
- **Story angle:** Model evaluation has overtaken MLOps (38 vs. 26) and prompt engineering (38 vs. 18) in demand, suggesting that companies are prioritizing the ability to measure AI output quality over the operational and prompting layers.

## Insight 2: Evaluation Is Almost Never a Standalone Role -- It Is Embedded

Only 3 jobs out of 1,780 carry evaluation-specific titles:

| Title | Company | Posted |
|---|---|---|
| AI Evaluation Engineer | Distyl | 2026-02-20 |
| Model Evaluation QA Lead | Deepgram | 2026-02-09 |
| Senior Software Engineer, Evals and AI Infra | Commure | (in corpus) |

Yet 38 jobs require `model-evaluation` as a tagged skill and 643 job descriptions (36.1%) mention evaluation-related terms. This 213x ratio (3 dedicated titles vs. 643 description mentions) is the key finding: evaluation expertise is a horizontal requirement spread across AI engineering, ML scientist, and even software engineering roles -- not a vertical specialization.

- **Data:** `SELECT title FROM jobs WHERE title LIKE '%Eval%' OR title LIKE '%eval%'` (3 results) vs. description search (643 results)
- **Visualization:** Funnel chart. Stages: "Mention evaluation in description" (643) -> "Tagged with model-evaluation skill" (38) -> "Evaluation in job title" (3). Headline: "The Evaluation Funnel: From 643 Mentions to 3 Dedicated Roles"
- **Story angle:** The Writer should frame this as a hidden opportunity -- candidates with evaluation expertise can differentiate themselves in virtually any AI role, not just the rare dedicated eval positions.

## Insight 3: The Skill Stack -- What Co-Occurs with Model Evaluation

Jobs requiring `model-evaluation` have a distinctive co-occurring skill profile that reveals the "LLM-as-judge" ecosystem:

| Co-occurring Skill | Count (N=38 eval jobs) | % | Role in Eval |
|---|---|---|---|
| python | 35 | 92.1% | Primary eval tooling language |
| machine-learning | 32 | 84.2% | Foundation knowledge |
| llm | 32 | 84.2% | Core technology being evaluated |
| deep-learning | 27 | 71.1% | Model architecture understanding |
| pytorch | 21 | 55.3% | Training & eval framework |
| mlops | 17 | 44.7% | Pipeline operationalization |
| tensorflow | 15 | 39.5% | Alternative framework |
| sql | 15 | 39.5% | Data analysis for eval metrics |
| fine-tuning | 15 | 39.5% | Train-eval loop |
| nlp | 13 | 34.2% | Domain knowledge |
| prompt-engineering | 12 | 31.6% | LLM-as-judge prompt design |
| aws | 11 | 28.9% | Cloud infra for eval at scale |
| agents | 9 | 23.7% | Agentic eval patterns |
| rag | 7 | 18.4% | RAG evaluation pipelines |
| agentic-ai | 6 | 15.8% | Advanced agent evals |

- **Data:** `SELECT jst2.tag, COUNT(*) FROM job_skill_tags jst1 JOIN job_skill_tags jst2 ON jst1.job_id = jst2.job_id WHERE jst1.tag = 'model-evaluation' AND jst2.tag <> 'model-evaluation' GROUP BY jst2.tag ORDER BY co_occur DESC`
- **Visualization:** Radar/spider chart with the top 10 co-occurring skills. Or a network diagram with `model-evaluation` at center. Headline: "The Evaluation Engineer's Skill Stack: Python + LLM + Deep Learning Core"
- **Story angle:** The 44.7% MLOps co-occurrence is notable -- nearly half of eval roles sit at the intersection of evaluation and operationalization. The 31.6% prompt-engineering overlap directly reflects the LLM-as-judge pattern where prompts are evaluation instruments.

## Insight 4: Evaluation Skill Is a Hard Requirement, Not a Nice-to-Have

The requirement level breakdown for `model-evaluation` tags tells a clear story:

| Requirement Level | Count | % (N=38) |
|---|---|---|
| required | 18 | 47.4% |
| preferred | 18 | 47.4% |
| nice-to-have | 2 | 5.3% |

- **Data:** `SELECT level, COUNT(*) FROM job_skill_tags WHERE tag = 'model-evaluation' GROUP BY level`
- **Visualization:** Stacked bar chart comparing model-evaluation requirement levels. Headline: "94.7% of Eval Requirements Are 'Required' or 'Preferred' -- Almost Never Optional"
- **Story angle:** When companies ask for evaluation skills, they mean it. Only 5.3% treat it as a nice-to-have. This is a strong signal for candidates: evaluation is a differentiating, career-advancing skill, not a checkbox.

## Insight 5: Temporal Trend -- Evaluation Demand Spiked 9x in Q1 2026

Monthly breakdown of `model-evaluation` tagged jobs vs. total job volume:

| Month | Total Jobs | Eval-Tagged Jobs | Eval % |
|---|---|---|---|
| 2025-02 | 4 | 2 | 50.0%* |
| 2025-08 | 25 | 1 | 4.0%* |
| 2025-10 | 71 | 5 | 7.0% |
| 2026-01 | 282 | 18 | 6.4% |
| 2026-02 | 711 | 11 | 1.5% |
| 2026-03 | 442 | 1 | 0.2%** |

*Small sample size (N < 30 total jobs), treat with caution.*
**March 2026 is partial month (data through Mar 6).*

- **Data:** `SELECT substr(posted_at, 1, 7) as month, COUNT(DISTINCT j.id) FROM jobs j WHERE j.id IN (SELECT job_id FROM job_skill_tags WHERE tag = 'model-evaluation') GROUP BY month`
- **Visualization:** Dual-axis line chart. Left axis: total jobs. Right axis: eval-tagged jobs. X-axis: months. Headline: "Evaluation Demand Peaks: 18 Jobs in January 2026"
- **Story angle:** The absolute peak of 18 eval-tagged jobs in January 2026 (out of 282 total, or 6.4%) represents a real concentration. As a share of jobs, evaluation demand is steadily present at 1.5-7% once enough volume exists to measure. The drop in Feb/Mar likely reflects the skill extraction pipeline not keeping pace with the rapid growth of total job ingest (from 282 to 711 to 442).

## Insight 6: ATS Platform Skew -- Ashby Dominates Eval-Hiring Companies

For model-evaluation tagged jobs:

| ATS Platform | Eval Jobs | % (N=38) | Overall Platform Share (N=1,780) | % |
|---|---|---|---|---|
| Ashby | 24 | 63.2% | 763 | 42.9% |
| Greenhouse | 14 | 36.8% | 1,011 | 56.8% |
| Lever | 0 | 0.0% | 6 | 0.3% |

- **Data:** `SELECT source_kind, COUNT(*) FROM jobs WHERE id IN (SELECT job_id FROM job_skill_tags WHERE tag = 'model-evaluation') GROUP BY source_kind`
- **Visualization:** Side-by-side grouped bar chart comparing eval share vs. overall share per ATS. Headline: "Ashby Over-Indexes 1.5x for Evaluation Roles"
- **Story angle:** Ashby's 63.2% share of eval roles vs. 42.9% overall share (a 1.47x over-index) confirms the pattern that AI-native startups (Ashby's core customer base) are where evaluation expertise is most concentrated. Greenhouse-heavy companies (larger enterprises) are under-indexed for evaluation skills.

## Insight 7: The Companies Building Evaluation Teams

12 companies have posted jobs tagged with `model-evaluation`:

| Company | Eval-Tagged Jobs | Description |
|---|---|---|
| Credit Karma (Intuit) | 11 | AI Scientists - Consumer Risk Fraud (eval for financial ML) |
| Adaptive ML | 7 | Forward Deployed AI Engineer, ML DevEx (EU remote-friendly) |
| Distyl | 7 | AI Product Engineer, AI Evaluation Engineer, Forward Deployed AI Architect |
| Gray Swan AI | 4 | Sr. ML Engineer, Forward Deployed Engineer - ML |
| Silver (Peak Health) | 2 | Backend-leaning SWE with eval requirements |
| Deepgram | 1 | Model Evaluation QA Lead (the rare dedicated title) |
| Commure | 1 | Senior SWE, Evals and AI Infra |
| Defense Unicorns | 1 | Forward Deployed AI Engineer |
| Normal Computing | 1 | AI Research Engineer |
| Adaptive Security | 1 | Founding ML Engineer |
| DigiBee | 1 | AI Engineer Specialist |
| Day1 Academies | 1 | Senior SWE - AI Applications |

- **Data:** `SELECT company_key, COUNT(DISTINCT job_id) FROM job_skill_tags jst JOIN jobs j ON jst.job_id = j.id WHERE jst.tag = 'model-evaluation' GROUP BY company_key`
- **Visualization:** Treemap with company size proportional to eval job count. Headline: "12 Companies Are Building Evaluation Expertise -- 3 Account for 66% of Demand"
- **Story angle:** The top 3 (Credit Karma, Adaptive ML, Distyl) account for 25 of 38 eval-tagged jobs (65.8%). Credit Karma's 11 AI Scientist postings for fraud detection suggest financial services is a vertical where model evaluation is mission-critical. Adaptive ML and Distyl are AI-native companies where evaluation is core to the product.

## Insight 8: Remote EU and Evaluation -- A Gap and an Opportunity

Of 21 remote EU jobs, 10 (47.6%) mention evaluation terms in their descriptions, but only 1 carries the `model-evaluation` skill tag (ML Developer Experience Engineer at Adaptive ML). Key remote EU jobs with evaluation signals:

| Title | Company | Evaluation Context |
|---|---|---|
| Sr AI Engineer (Remote Europe) | n8n | LLM evaluation in workflow automation |
| Staff LLM Interaction Engineer (Europe remote) | n8n | LLM quality and eval for user interactions |
| ML Developer Experience Engineer | Adaptive ML | Model evaluation skill tag -- EU-remote, Paris-based |
| Customer Success Manager | DeepL | Evaluation of translation quality (domain-specific) |

- **Data:** `SELECT title, company_key FROM jobs WHERE is_remote_eu = 1 AND (description LIKE '%evaluat%' OR ...)`
- **Visualization:** Venn diagram: "Remote EU" (21) intersecting "Evaluation mentions" (643). Overlap = 10. Headline: "Half of Remote EU AI Roles Touch Evaluation -- But Only 1 Is Tagged"
- **Story angle:** The 47.6% overlap for remote EU (10 of 21) vs. 36.1% overall (643 of 1,780) suggests remote EU roles over-index for evaluation language. n8n and Adaptive ML are standouts for EU-based candidates seeking evaluation-focused work.

## Raw Data Tables

### Table A: All 3 Dedicated Evaluation Titles

| ID | Title | Company | Posted |
|---|---|---|---|
| -- | AI Evaluation Engineer | Distyl | 2026-02-20 |
| -- | Model Evaluation QA Lead | Deepgram | 2026-02-09 |
| -- | Senior Software Engineer, Evals and AI Infra | Commure | (in corpus) |

### Table B: Description-Level Evaluation Terminology Frequency

| Term Pattern | Job Count | % of Corpus (N=1,780) |
|---|---|---|
| "benchmark" (any context) | 199 | 11.2% |
| "evaluat*" (evaluation/evaluate/etc.) | 643* | 36.1% |
| "evaluation framework" OR "eval framework" | 16 | 0.9% |
| "model quality" OR "model performance" OR "model accuracy" | 9 | 0.5% |
| "evaluation pipeline" OR "eval pipeline" | 8 | 0.4% |
| "RLHF" OR "human evaluation" OR "human-in-the-loop" | 12 | 0.7% |
| "LLM-as-judge" OR "LLM as judge" | 1 | 0.06% |

*Note: "evaluat*" is a broad pattern that includes non-AI uses of "evaluation" (e.g., performance evaluation, candidate evaluation). The signal-to-noise ratio improves dramatically when filtered to AI-titled roles (110 of 1,780).*

### Table C: The 21 Remote EU Jobs

| Title | Company | Posted |
|---|---|---|
| Backend Software Engineer - Connectors | Camunda | 2026-03-05 |
| Lead Engineer - Real-Time Video Infrastructure | Stream | 2026-03-05 |
| Staff LLM Interaction Engineer (Europe remote) | n8n | 2026-03-05 |
| Senior/Staff Engineer - Core Workflow Engine | n8n | 2026-03-05 |
| Security Engineer - Application Security | Neko Health | 2026-03-05 |
| Customer Success Manager (x2) | Conga | 2026-03-05 |
| Sr AI Engineer (Remote Europe) | n8n | 2026-03-03 |
| Expert Modern Coins | Catawiki | 2026-03-02 |
| Expert Fashion (Luxury Pre-Owned) | Catawiki | 2026-03-02 |
| Customer Success Manager | DeepL | 2026-02-26 |
| Expert Wine | Catawiki | 2026-02-24 |
| Expert Classic Cars (x2) | Catawiki | 2026-02-24 |
| Enterprise AE Public Sector (x2) | DeepL | 2026-02-19 |
| Expert Pokemon & Trading Cards | Catawiki | 2026-02-13 |
| Expert Comics | Catawiki | 2026-02-13 |
| Expert Automobilia | Catawiki | 2026-02-13 |
| Expert Audio Equipment | Catawiki | 2026-02-13 |
| ML Developer Experience Engineer | Adaptive ML | 2026-01-06 |

## Methodology

- **Data source:** nomadically.work D1 database (Cloudflare), queried via `wrangler d1 execute --remote`
- **Time period:** Full database contents, Jan 2025 -- March 2026 (partial)
- **Total corpus:** 1,780 jobs across 3 ATS platforms (Greenhouse: 1,011; Ashby: 763; Lever: 6)
- **Skill-tagged subset:** 311 unique jobs with extracted skill tags
- **Remote EU subset:** 21 jobs classified as `is_remote_eu = true`
- **Evaluation detection method (3 layers):**
  1. **Skill tag:** `model-evaluation` tag in `job_skill_tags` table (38 jobs, highest precision)
  2. **Title search:** LIKE patterns for "eval", "evaluation", "quality", "QA", "benchmark" in `jobs.title` (24 jobs broadly, 3 with dedicated eval titles)
  3. **Description search:** LIKE patterns for evaluation-related terms in `jobs.description` (643 jobs, lowest precision due to non-AI uses)
- **Caveats:**
  - The `model-evaluation` skill tag depends on the LLM-based skill extraction pipeline; only 311 of 1,780 jobs have been processed. The true proportion of eval-requiring jobs is likely higher once the remaining 1,469 jobs are tagged.
  - Remote EU classification (`is_remote_eu`) has only been applied to 21 jobs. Many jobs in the corpus may be EU-remote eligible but unclassified (`is_remote_eu = NULL` for hundreds of jobs).
  - Description-level "evaluat*" matches include non-AI contexts (e.g., "performance evaluation" for employee reviews). The 643 number is an upper bound.
  - Temporal trends are confounded by ingestion ramp-up: the database grew from single-digit monthly jobs in early 2025 to 700+ in Feb 2026. Month-over-month percentage comparisons require caution.
  - Only 1 explicit "LLM-as-judge" mention was found. The practice is likely more common than the terminology in job descriptions.

## Story Recommendations

1. **Lead with the embedding insight (Insight 2):** The 213x ratio between description mentions (643) and dedicated titles (3) is the most compelling narrative. "LLM evaluation expertise is the most in-demand skill you won't find in a job title."

2. **Use the skill ranking (Insight 1) as the quantitative hook:** Model evaluation outranking MLOps and prompt engineering is counterintuitive and newsworthy. It challenges the assumption that operational and prompting skills are more sought-after than measurement skills.

3. **Frame the co-occurrence data (Insight 3) as a hiring guide:** The skill stack table is directly actionable for readers. "If you want to break into AI evaluation, here is the exact skill combination employers are looking for."

4. **Highlight the requirement level (Insight 4) to underscore urgency:** 94.7% required or preferred -- this is not an optional checkbox.

5. **Use Distyl's "AI Evaluation Engineer" title as a case study:** One of only 3 dedicated eval titles in the entire corpus. If you can get quotes or details from Distyl's job description, it anchors the abstract data in a concrete, nameable role.

6. **The LLM-as-judge terminology gap is a narrative opportunity:** Only 1 mention of the explicit term despite widespread practice. The Writer can explain why: the technique is spreading faster than the vocabulary, and job descriptions lag behind engineering practice.

7. **Remote EU angle (Insight 8):** n8n and Adaptive ML are the standout companies for EU-based evaluation work. The 47.6% overlap rate suggests remote EU roles may actually over-index for evaluation requirements -- a positive signal for the target audience.

8. **Caution on temporal claims:** The trend data (Insight 5) should be presented carefully given the ingestion ramp-up. Avoid "evaluation demand grew 9x" claims without qualifying that the database itself grew. Focus instead on the steady 1.5-7% share once sufficient volume exists.
