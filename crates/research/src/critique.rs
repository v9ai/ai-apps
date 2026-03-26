//! Search quality evaluation: scores results on diversity, coverage, and depth.
//!
//! When the `local-vector` feature is enabled, an additional semantic diversity
//! metric is available via [`CritiqueConfig::evaluate_semantic`], which uses
//! the Candle embedding engine to measure pairwise cosine distances.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use crate::paper::ResearchPaper;

#[derive(Debug, Clone)]
pub struct CritiqueConfig {
    pub min_results: usize,
    pub min_year_range: u32,
    pub min_sources: usize,
    pub quality_threshold: f64,
}

impl Default for CritiqueConfig {
    fn default() -> Self {
        Self {
            min_results: 5,
            min_year_range: 3,
            min_sources: 2,
            quality_threshold: 0.6,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Critique {
    pub quality_score: f64,
    pub issues: Vec<String>,
    pub suggestions: Vec<String>,
}

impl CritiqueConfig {
    pub fn evaluate(&self, papers: &[ResearchPaper]) -> Critique {
        let mut issues = Vec::new();
        let mut suggestions = Vec::new();
        let mut weighted_score = 0.0;

        // 1. Result count (weight 0.3)
        let count_ratio = (papers.len() as f64 / self.min_results as f64).min(1.0);
        weighted_score += count_ratio * 0.3;
        if papers.len() < self.min_results {
            issues.push(format!(
                "Too few papers ({}, expected at least {})",
                papers.len(),
                self.min_results
            ));
            suggestions.push("Broaden search terms or relax filters".into());
        }

        // 2. Year span (weight 0.2)
        let years: Vec<u32> = papers.iter().filter_map(|p| p.year).collect();
        if let (Some(&mn), Some(&mx)) = (years.iter().min(), years.iter().max()) {
            let span = mx - mn;
            let span_ratio = (span as f64 / self.min_year_range as f64).min(1.0);
            weighted_score += span_ratio * 0.2;
            if span < self.min_year_range {
                issues.push(format!("Narrow time range ({mn}-{mx})"));
                suggestions.push("Include older foundational papers".into());
            }
        } else if !papers.is_empty() {
            issues.push("No year data available".into());
        }

        // 3. Source diversity (weight 0.2)
        let mut sources = HashSet::new();
        for p in papers {
            sources.insert(format!("{:?}", p.source));
        }
        let source_ratio = (sources.len() as f64 / self.min_sources as f64).min(1.0);
        weighted_score += source_ratio * 0.2;
        if sources.len() < self.min_sources {
            issues.push(format!(
                "Limited source diversity ({} source{})",
                sources.len(),
                if sources.len() == 1 { "" } else { "s" }
            ));
            suggestions.push("Search across arXiv, Semantic Scholar, OpenAlex".into());
        }

        // 4. Abstract coverage (weight 0.15)
        if !papers.is_empty() {
            let with_abstract = papers
                .iter()
                .filter(|p| {
                    p.abstract_text
                        .as_ref()
                        .map(|a| !a.is_empty())
                        .unwrap_or(false)
                })
                .count();
            let abs_ratio = with_abstract as f64 / papers.len() as f64;
            weighted_score += abs_ratio * 0.15;
            if abs_ratio < 0.5 {
                issues.push(format!(
                    "Low abstract coverage ({:.0}%)",
                    abs_ratio * 100.0
                ));
                suggestions
                    .push("Prefer sources with full abstracts (arXiv, Semantic Scholar)".into());
            }
        }

        // 5. Citation distribution (weight 0.15)
        if !papers.is_empty() {
            let with_citations = papers
                .iter()
                .filter(|p| p.citation_count.map(|c| c > 0).unwrap_or(false))
                .count();
            let cite_ratio = with_citations as f64 / papers.len() as f64;
            weighted_score += cite_ratio * 0.15;
            if cite_ratio < 0.3 {
                issues.push("Most papers have no citation data".into());
                suggestions.push("Use Semantic Scholar for citation-rich results".into());
            }
        }

        Critique {
            quality_score: weighted_score.max(0.0).min(1.0),
            issues,
            suggestions,
        }
    }

    /// Evaluate with an additional semantic diversity dimension using local
    /// Candle embeddings. Rebalances weights to include a pairwise-distance
    /// metric (weight 0.15, taken proportionally from the other five axes).
    ///
    /// `embeddings` must be one 384-d vector per paper (same order as `papers`).
    #[cfg(feature = "local-vector")]
    pub fn evaluate_semantic(
        &self,
        papers: &[ResearchPaper],
        embeddings: &[Vec<f32>],
    ) -> Critique {
        // Start from the base critique.
        let base = self.evaluate(papers);
        if papers.len() < 2 || embeddings.len() != papers.len() {
            return base;
        }

        // Mean pairwise cosine distance (1 - sim). Higher = more diverse.
        let diversity = mean_pairwise_distance(embeddings);

        // Rebalance: scale base axes to 0.85, add diversity at 0.15.
        let rebalanced = base.quality_score * 0.85 + diversity * 0.15;

        let mut issues = base.issues;
        let mut suggestions = base.suggestions;
        if diversity < 0.3 {
            issues.push(format!(
                "Low semantic diversity ({:.2}) — results may be near-duplicates",
                diversity
            ));
            suggestions.push("Use more varied query angles or broaden search terms".into());
        }

        Critique {
            quality_score: rebalanced.clamp(0.0, 1.0),
            issues,
            suggestions,
        }
    }
}

/// Mean pairwise cosine distance across all (i, j) pairs.
/// Vectors are assumed L2-normalized so cosine = dot product.
#[cfg(feature = "local-vector")]
fn mean_pairwise_distance(vecs: &[Vec<f32>]) -> f64 {
    let n = vecs.len();
    if n < 2 {
        return 0.0;
    }
    let mut total = 0.0f64;
    let mut count = 0u64;
    for i in 0..n {
        for j in (i + 1)..n {
            let sim: f32 = crate::local_embeddings::EmbeddingEngine::cosine(&vecs[i], &vecs[j]);
            total += (1.0 - sim as f64).max(0.0);
            count += 1;
        }
    }
    if count == 0 { 0.0 } else { total / count as f64 }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::paper::PaperSource;

    fn make_paper(title: &str, year: Option<u32>, source: PaperSource) -> ResearchPaper {
        ResearchPaper {
            title: title.into(),
            abstract_text: Some("Some abstract text here.".into()),
            authors: vec!["Author".into()],
            year,
            doi: None,
            citation_count: Some(10),
            url: None,
            pdf_url: None,
            source,
            source_id: title.into(),
            fields_of_study: None,
        }
    }

    #[test]
    fn empty_papers_scores_zero() {
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&[]);
        assert!(critique.quality_score < 0.01);
        assert!(!critique.issues.is_empty());
    }

    #[test]
    fn diverse_results_score_high() {
        let papers = vec![
            make_paper("Paper A", Some(2020), PaperSource::Arxiv),
            make_paper("Paper B", Some(2021), PaperSource::SemanticScholar),
            make_paper("Paper C", Some(2022), PaperSource::OpenAlex),
            make_paper("Paper D", Some(2023), PaperSource::Crossref),
            make_paper("Paper E", Some(2024), PaperSource::Core),
        ];
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(critique.quality_score > 0.8);
    }

    #[cfg(feature = "local-vector")]
    #[test]
    fn semantic_diversity_flags_near_duplicates() {
        let papers = vec![
            make_paper("Paper A", Some(2020), PaperSource::Arxiv),
            make_paper("Paper B", Some(2021), PaperSource::SemanticScholar),
            make_paper("Paper C", Some(2022), PaperSource::OpenAlex),
            make_paper("Paper D", Some(2023), PaperSource::Crossref),
            make_paper("Paper E", Some(2024), PaperSource::Core),
        ];
        // Near-identical embeddings → low diversity
        let embs: Vec<Vec<f32>> = (0..5)
            .map(|_| {
                let mut v = vec![0.0f32; 384];
                v[0] = 1.0;
                v
            })
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate_semantic(&papers, &embs);
        assert!(critique.issues.iter().any(|i| i.contains("semantic diversity")));
    }

    #[cfg(feature = "local-vector")]
    #[test]
    fn semantic_diversity_rewards_spread() {
        let papers = vec![
            make_paper("Paper A", Some(2020), PaperSource::Arxiv),
            make_paper("Paper B", Some(2021), PaperSource::SemanticScholar),
            make_paper("Paper C", Some(2022), PaperSource::OpenAlex),
            make_paper("Paper D", Some(2023), PaperSource::Crossref),
            make_paper("Paper E", Some(2024), PaperSource::Core),
        ];
        // Orthogonal embeddings → high diversity
        let embs: Vec<Vec<f32>> = (0..5)
            .map(|i| {
                let mut v = vec![0.0f32; 384];
                v[i] = 1.0;
                v
            })
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate_semantic(&papers, &embs);
        assert!(!critique.issues.iter().any(|i| i.contains("semantic diversity")));
        assert!(critique.quality_score > 0.8);
    }

    #[test]
    fn narrow_year_range_flagged() {
        let papers = vec![
            make_paper("A", Some(2024), PaperSource::Arxiv),
            make_paper("B", Some(2024), PaperSource::SemanticScholar),
            make_paper("C", Some(2024), PaperSource::OpenAlex),
            make_paper("D", Some(2024), PaperSource::Crossref),
            make_paper("E", Some(2024), PaperSource::Core),
        ];
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(critique.issues.iter().any(|i| i.contains("time range")));
    }
}
