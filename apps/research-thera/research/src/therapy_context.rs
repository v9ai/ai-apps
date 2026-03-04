use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TherapyContext {
    pub goal_id: u32,
    pub family_member_id: u32,
    pub therapeutic_goal_type: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub severity: Option<String>,
    pub impairment_domains: Vec<String>,
    pub target_population: String,
    pub focus_keywords: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchOutput {
    pub goal_id: u32,
    pub therapeutic_goal_type: String,
    pub papers: Vec<PaperResult>,
    pub aggregated_techniques: Vec<TechniqueRecommendation>,
    pub confidence_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperResult {
    pub title: String,
    pub authors: Vec<String>,
    pub year: Option<u32>,
    pub journal: Option<String>,
    pub doi: Option<String>,
    pub url: Option<String>,
    pub abstract_text: Option<String>,
    pub key_findings: Vec<String>,
    pub therapeutic_techniques: Vec<String>,
    pub evidence_level: String,
    pub relevance_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechniqueRecommendation {
    pub technique: String,
    pub evidence_base: String,
    pub target_population: String,
    pub key_papers: Vec<String>,
    pub confidence: f64,
}

impl TherapyContext {
    pub fn from_goal_file(path: &Path) -> Result<Self> {
        let content = std::fs::read_to_string(path).with_context(|| format!("reading {path:?}"))?;
        let goal: GoalFile =
            serde_json::from_str(&content).with_context(|| "parsing goal file JSON")?;

        let impairment_domains: Vec<String> = goal
            .impairment_domains
            .unwrap_or_default()
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let focus_keywords = infer_focus_keywords(&goal.therapeutic_goal_type, &goal.title);

        Ok(TherapyContext {
            goal_id: goal.goal_id,
            family_member_id: goal.family_member_id,
            therapeutic_goal_type: goal.therapeutic_goal_type,
            title: goal.title,
            description: goal.description,
            category: goal.category,
            severity: goal.severity,
            impairment_domains,
            target_population: goal
                .target_population
                .unwrap_or_else(|| "children adolescents".to_string()),
            focus_keywords,
        })
    }

    pub fn from_support_need(path: &Path) -> Result<Self> {
        let content = std::fs::read_to_string(path).with_context(|| format!("reading {path:?}"))?;
        let sn: SupportNeedFile =
            serde_json::from_str(&content).with_context(|| "parsing support need JSON")?;

        let impairment_domains: Vec<String> = sn
            .impairment_domains
            .unwrap_or_default()
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let focus_keywords = infer_focus_keywords(&sn.category, &sn.title);

        Ok(TherapyContext {
            goal_id: sn.characteristic_id as u32,
            family_member_id: sn.family_member_id,
            therapeutic_goal_type: sn.category.clone(),
            title: sn.title,
            description: sn.description,
            category: Some(sn.category),
            severity: sn.severity,
            impairment_domains,
            target_population: "children adolescents families".to_string(),
            focus_keywords,
        })
    }

    pub fn build_agent_prompt(&self) -> String {
        let domains_str = self.impairment_domains.join(", ");
        let keywords_str = self.focus_keywords.join(", ");
        let queries = generate_search_queries(
            &self.therapeutic_goal_type,
            &self.title,
            &self.impairment_domains,
        );
        let queries_block = queries
            .iter()
            .enumerate()
            .map(|(i, q)| format!("  {}. \"{}\"", i + 1, q))
            .collect::<Vec<_>>()
            .join("\n");

        let severity_context = match &self.severity {
            Some(s) => format!("- **Severity:** {}\n", s),
            None => String::new(),
        };

        let description_context = match &self.description {
            Some(d) => format!("- **Description:** {}\n", d),
            None => String::new(),
        };

        format!(
            r#"You are a clinical research specialist for a therapeutic platform supporting children and families.
Your job: search academic literature and return evidence-based therapeutic technique recommendations.

## Current Therapeutic Context
- **Goal ID:** {goal_id}
- **Goal Type:** {goal_type}
- **Title:** {title}
{description_context}{severity_context}- **Impairment Domains:** {domains}
- **Target Population:** {population}
- **Focus Keywords:** {keywords}

## Research Task

Search for academic papers relevant to **{goal_type}** interventions, particularly for {population}.

**Run searches for each of these queries** (use search_papers for each):
{queries_block}

For the most promising 4–5 papers, call get_paper_detail to get their full abstract and TLDR.

**Prioritise:**
1. Meta-analyses and systematic reviews (highest evidence level)
2. Randomized controlled trials (RCTs)
3. Papers with explicit therapeutic techniques and outcome measures
4. Papers specific to {population}
5. Papers from 2015+ (current evidence base)

## Required Output Format

Return a structured markdown report in EXACTLY this format:

```markdown
# Therapeutic Research — {goal_type}

## Context
- **Title:** {title}
- **Population:** {population}
- **Domains:** {domains}

## Papers Reviewed

### [1] <Title> (<Year>, <N> citations)
- **Authors:** ...
- **Evidence Level:** meta-analysis | RCT | cohort | case-series | case-study
- **Relevance:** high | medium | low
- **Population:** children | adolescents | adults | families
- **Key Finding:** (1–2 sentences: what did this study conclude?)
- **Therapeutic Techniques:** technique1, technique2, ...
- **DOI:** 10.xxx/yyy
- **Source:** <url>

... (one block per paper, at least 4 papers)

## Aggregated Therapeutic Techniques

Based on the literature, for **{goal_type}** in {population}:

| Technique | Evidence Base | Target | Key Papers | Confidence |
|-----------|---------------|--------|------------|------------|
| technique1 | meta-analysis | children | [1,3] | high |
| technique2 | RCT | adolescents | [2,4] | medium |

## Evidence Assessment
- Total papers reviewed: N
- Meta-analyses: N
- RCTs: N
- Population-specific: N
- Overall confidence: X%

## Recommended JSON Output

```json
{{
  "goal_id": {goal_id},
  "therapeutic_goal_type": "{goal_type}",
  "papers": [
    {{
      "title": "...",
      "authors": ["..."],
      "year": 2024,
      "doi": "10.xxx/yyy",
      "evidence_level": "meta-analysis",
      "relevance_score": 0.95,
      "key_findings": ["...", "..."],
      "therapeutic_techniques": ["...", "..."]
    }}
  ],
  "aggregated_techniques": [
    {{
      "technique": "...",
      "evidence_base": "meta-analysis",
      "target_population": "children",
      "confidence": 0.90
    }}
  ],
  "confidence_score": 0.85
}}
```
```

The JSON block is machine-parsed — it MUST be valid JSON."#,
            goal_id = self.goal_id,
            goal_type = self.therapeutic_goal_type,
            title = self.title,
            domains = domains_str,
            population = self.target_population,
            keywords = keywords_str,
            queries_block = queries_block,
            description_context = description_context,
            severity_context = severity_context,
        )
    }
}

fn generate_search_queries(goal_type: &str, title: &str, domains: &[String]) -> Vec<String> {
    let mut queries = vec![
        format!(
            "{} therapeutic intervention children adolescents evidence-based",
            goal_type
        ),
        format!("{} meta-analysis systematic review", goal_type),
        format!("{} treatment outcome RCT", goal_type),
    ];

    for domain in domains {
        let q = match domain.to_uppercase().as_str() {
            "ACADEMIC" => "school-based intervention academic functioning children",
            "PEER" => "peer relationship social skills intervention children",
            "FAMILY" => "family therapy parent training intervention",
            "SELF_CARE" | "SELFCARE" => "self-care daily living skills intervention children",
            "SAFETY" => "safety assessment risk management children mental health",
            _ => "",
        };
        if !q.is_empty() {
            queries.push(q.to_string());
        }
    }

    if title.len() > 10 {
        let keywords: Vec<&str> = title.split_whitespace().take(3).collect();
        queries.push(format!("{} intervention children", keywords.join(" ")));
    }

    queries.push(format!("{} clinical guidelines practice", goal_type));
    queries
}

fn infer_focus_keywords(goal_type: &str, title: &str) -> Vec<String> {
    let mut keywords = vec![];

    let gt = goal_type.to_lowercase();
    if gt.contains("anxiety") || gt.contains("worry") {
        keywords.extend_from_slice(&[
            "CBT".into(),
            "exposure therapy".into(),
            "anxiety intervention".into(),
        ]);
    }
    if gt.contains("depression") || gt.contains("mood") {
        keywords.extend_from_slice(&[
            "CBT".into(),
            "behavioral activation".into(),
            "depression treatment".into(),
        ]);
    }
    if gt.contains("adhd") || gt.contains("attention") {
        keywords.extend_from_slice(&[
            "ADHD intervention".into(),
            "parent training".into(),
            "executive function".into(),
        ]);
    }
    if gt.contains("behavior") || gt.contains("conduct") {
        keywords.extend_from_slice(&[
            "parent management training".into(),
            "behavioral intervention".into(),
        ]);
    }
    if gt.contains("trauma") || gt.contains("ptsd") {
        keywords.extend_from_slice(&[
            "TF-CBT".into(),
            "EMDR".into(),
            "trauma-focused therapy".into(),
        ]);
    }
    if gt.contains("autism") || gt.contains("asd") {
        keywords.extend_from_slice(&[
            "ABA".into(),
            "social skills training".into(),
            "autism intervention".into(),
        ]);
    }
    if gt.contains("support need") {
        keywords.extend_from_slice(&[
            "Support Priority assessment".into(),
            "WHODAS".into(),
            "ICF framework".into(),
        ]);
    }

    if keywords.is_empty() {
        let title_words: Vec<String> = title
            .split_whitespace()
            .filter(|w| w.len() > 4)
            .take(3)
            .map(String::from)
            .collect();
        keywords = title_words;
    }

    keywords
}

#[derive(Deserialize)]
struct GoalFile {
    goal_id: u32,
    family_member_id: u32,
    therapeutic_goal_type: String,
    title: String,
    description: Option<String>,
    category: Option<String>,
    severity: Option<String>,
    impairment_domains: Option<String>,
    target_population: Option<String>,
}

#[derive(Deserialize)]
struct SupportNeedFile {
    characteristic_id: i32,
    family_member_id: u32,
    category: String,
    title: String,
    description: Option<String>,
    severity: Option<String>,
    impairment_domains: Option<String>,
}
