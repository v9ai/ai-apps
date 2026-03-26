//! Search quality evaluation: scores results on diversity, coverage, and depth.
//!
//! Dimensions scored (all available without feature flags):
//! - **Result count**: enough papers to draw conclusions
//! - **Year span**: temporal breadth of the corpus
//! - **Source diversity**: variety of data sources (arXiv, Semantic Scholar, etc.)
//! - **Abstract coverage**: fraction of papers with abstracts
//! - **Citation distribution**: papers with citation data
//! - **Recency bias**: detects over-concentration on recent publications
//! - **Citation network**: Gini-based analysis of citation concentration
//! - **Authority**: presence of highly-cited landmark papers
//! - **Field diversity**: variety of research fields/categories
//!
//! When the `local-vector` feature is enabled, an additional **semantic diversity**
//! metric is available via [`CritiqueConfig::evaluate_semantic`], which uses
//! the Candle embedding engine to measure pairwise cosine distances.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use crate::paper::ResearchPaper;

/// Per-dimension weight overrides. All weights are normalised to sum to 1.0
/// before scoring, so relative magnitudes are what matter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionWeights {
    pub result_count: f64,
    pub year_span: f64,
    pub source_diversity: f64,
    pub abstract_coverage: f64,
    pub citation_distribution: f64,
    pub recency_bias: f64,
    pub citation_network: f64,
    pub authority: f64,
    pub field_diversity: f64,
}

impl Default for DimensionWeights {
    fn default() -> Self {
        Self {
            result_count: 0.15,
            year_span: 0.10,
            source_diversity: 0.10,
            abstract_coverage: 0.10,
            citation_distribution: 0.10,
            recency_bias: 0.10,
            citation_network: 0.10,
            authority: 0.10,
            field_diversity: 0.15,
        }
    }
}

impl DimensionWeights {
    /// Return weights normalised so they sum to 1.0.
    fn normalised(&self) -> [f64; 9] {
        let raw = [
            self.result_count,
            self.year_span,
            self.source_diversity,
            self.abstract_coverage,
            self.citation_distribution,
            self.recency_bias,
            self.citation_network,
            self.authority,
            self.field_diversity,
        ];
        let total: f64 = raw.iter().sum();
        if total <= 0.0 {
            return [1.0 / 9.0; 9];
        }
        let mut out = [0.0; 9];
        for (i, &v) in raw.iter().enumerate() {
            out[i] = v / total;
        }
        out
    }
}

#[derive(Debug, Clone)]
pub struct CritiqueConfig {
    pub min_results: usize,
    pub min_year_range: u32,
    pub min_sources: usize,
    pub quality_threshold: f64,
    /// Citation count above which a paper is considered a "landmark".
    pub authority_citation_threshold: u64,
    /// Minimum fraction of landmark papers expected for a healthy corpus.
    pub authority_min_fraction: f64,
    /// Year considered "current" for recency bias detection (defaults to current year).
    pub current_year: u32,
    /// Per-dimension weight overrides.
    pub weights: DimensionWeights,
}

impl Default for CritiqueConfig {
    fn default() -> Self {
        Self {
            min_results: 5,
            min_year_range: 3,
            min_sources: 2,
            quality_threshold: 0.6,
            authority_citation_threshold: 100,
            authority_min_fraction: 0.1,
            current_year: 2026,
            weights: DimensionWeights::default(),
        }
    }
}

/// Per-dimension raw scores (0.0..=1.0) for transparency.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionScores {
    pub result_count: f64,
    pub year_span: f64,
    pub source_diversity: f64,
    pub abstract_coverage: f64,
    pub citation_distribution: f64,
    pub recency_bias: f64,
    pub citation_network: f64,
    pub authority: f64,
    pub field_diversity: f64,
    /// Only populated when `evaluate_semantic` is used.
    pub semantic_diversity: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Critique {
    pub quality_score: f64,
    pub dimension_scores: DimensionScores,
    pub issues: Vec<String>,
    pub suggestions: Vec<String>,
}

impl CritiqueConfig {
    pub fn evaluate(&self, papers: &[ResearchPaper]) -> Critique {
        let mut issues = Vec::new();
        let mut suggestions = Vec::new();
        let w = self.weights.normalised();

        // 1. Result count
        let count_score = (papers.len() as f64 / self.min_results as f64).min(1.0);

        // Short-circuit: no papers means everything scores zero
        if papers.is_empty() {
            issues.push(format!(
                "Too few papers (0, expected at least {})",
                self.min_results
            ));
            suggestions.push("Broaden search terms or relax filters".into());
            return Critique {
                quality_score: 0.0,
                dimension_scores: DimensionScores {
                    result_count: 0.0,
                    year_span: 0.0,
                    source_diversity: 0.0,
                    abstract_coverage: 0.0,
                    citation_distribution: 0.0,
                    recency_bias: 0.0,
                    citation_network: 0.0,
                    authority: 0.0,
                    field_diversity: 0.0,
                    semantic_diversity: None,
                },
                issues,
                suggestions,
            };
        }
        if papers.len() < self.min_results {
            issues.push(format!(
                "Too few papers ({}, expected at least {})",
                papers.len(),
                self.min_results
            ));
            suggestions.push("Broaden search terms or relax filters".into());
        }

        // 2. Year span
        let years: Vec<u32> = papers.iter().filter_map(|p| p.year).collect();
        let year_span_score = if let (Some(&mn), Some(&mx)) =
            (years.iter().min(), years.iter().max())
        {
            let span = mx - mn;
            let ratio = (span as f64 / self.min_year_range as f64).min(1.0);
            if span < self.min_year_range {
                issues.push(format!("Narrow time range ({mn}-{mx})"));
                suggestions.push("Include older foundational papers".into());
            }
            ratio
        } else {
            if !papers.is_empty() {
                issues.push("No year data available".into());
            }
            0.0
        };

        // 3. Source diversity
        let mut sources = HashSet::new();
        for p in papers {
            sources.insert(format!("{:?}", p.source));
        }
        let source_score = (sources.len() as f64 / self.min_sources as f64).min(1.0);
        if sources.len() < self.min_sources {
            issues.push(format!(
                "Limited source diversity ({} source{})",
                sources.len(),
                if sources.len() == 1 { "" } else { "s" }
            ));
            suggestions.push("Search across arXiv, Semantic Scholar, OpenAlex".into());
        }

        // 4. Abstract coverage
        let abstract_score = if !papers.is_empty() {
            let with_abstract = papers
                .iter()
                .filter(|p| {
                    p.abstract_text
                        .as_ref()
                        .map(|a| !a.is_empty())
                        .unwrap_or(false)
                })
                .count();
            let ratio = with_abstract as f64 / papers.len() as f64;
            if ratio < 0.5 {
                issues.push(format!("Low abstract coverage ({:.0}%)", ratio * 100.0));
                suggestions
                    .push("Prefer sources with full abstracts (arXiv, Semantic Scholar)".into());
            }
            ratio
        } else {
            0.0
        };

        // 5. Citation distribution
        let citation_dist_score = if !papers.is_empty() {
            let with_citations = papers
                .iter()
                .filter(|p| p.citation_count.map(|c| c > 0).unwrap_or(false))
                .count();
            let ratio = with_citations as f64 / papers.len() as f64;
            if ratio < 0.3 {
                issues.push("Most papers have no citation data".into());
                suggestions.push("Use Semantic Scholar for citation-rich results".into());
            }
            ratio
        } else {
            0.0
        };

        // 6. Recency bias detection
        let recency_score = score_recency_bias(papers, self.current_year, &mut issues, &mut suggestions);

        // 7. Citation network (Gini coefficient — lower Gini = more equal = healthier)
        let citation_network_score = score_citation_network(papers, &mut issues, &mut suggestions);

        // 8. Authority scoring
        let authority_score = score_authority(
            papers,
            self.authority_citation_threshold,
            self.authority_min_fraction,
            &mut issues,
            &mut suggestions,
        );

        // 9. Field diversity
        let field_diversity_score = score_field_diversity(papers, &mut issues, &mut suggestions);

        let scores = DimensionScores {
            result_count: count_score,
            year_span: year_span_score,
            source_diversity: source_score,
            abstract_coverage: abstract_score,
            citation_distribution: citation_dist_score,
            recency_bias: recency_score,
            citation_network: citation_network_score,
            authority: authority_score,
            field_diversity: field_diversity_score,
            semantic_diversity: None,
        };

        let raw = [
            count_score,
            year_span_score,
            source_score,
            abstract_score,
            citation_dist_score,
            recency_score,
            citation_network_score,
            authority_score,
            field_diversity_score,
        ];
        let quality_score: f64 = raw.iter().zip(w.iter()).map(|(s, wt)| s * wt).sum();

        Critique {
            quality_score: quality_score.clamp(0.0, 1.0),
            dimension_scores: scores,
            issues,
            suggestions,
        }
    }

    /// Evaluate with an additional semantic diversity dimension using local
    /// Candle embeddings. Rebalances weights to include a pairwise-distance
    /// metric (weight 0.15, taken proportionally from the other nine axes).
    ///
    /// `embeddings` must be one 384-d vector per paper (same order as `papers`).
    #[cfg(feature = "local-vector")]
    pub fn evaluate_semantic(
        &self,
        papers: &[ResearchPaper],
        embeddings: &[Vec<f32>],
    ) -> Critique {
        let base = self.evaluate(papers);
        if papers.len() < 2 || embeddings.len() != papers.len() {
            return base;
        }

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

        let mut dimension_scores = base.dimension_scores;
        dimension_scores.semantic_diversity = Some(diversity);

        Critique {
            quality_score: rebalanced.clamp(0.0, 1.0),
            dimension_scores,
            issues,
            suggestions,
        }
    }
}

// ─── Dimension scorers ──────────────────────────────────────────────────────

/// Detects recency bias: if >70% of papers with year data fall within the
/// last 2 years, the corpus may lack historical context.
/// Returns a score where 1.0 = well-balanced, 0.0 = heavily biased to recent.
fn score_recency_bias(
    papers: &[ResearchPaper],
    current_year: u32,
    issues: &mut Vec<String>,
    suggestions: &mut Vec<String>,
) -> f64 {
    let years: Vec<u32> = papers.iter().filter_map(|p| p.year).collect();
    if years.len() < 2 {
        return 0.5; // not enough data to judge
    }
    let recent_cutoff = current_year.saturating_sub(1);
    let recent_count = years.iter().filter(|&&y| y >= recent_cutoff).count();
    let recent_frac = recent_count as f64 / years.len() as f64;

    // Score: 1.0 when <=40% recent, linearly drops to 0.0 at 100% recent
    let score = if recent_frac <= 0.4 {
        1.0
    } else {
        ((1.0 - recent_frac) / 0.6).clamp(0.0, 1.0)
    };

    if recent_frac > 0.7 {
        issues.push(format!(
            "Recency bias: {:.0}% of papers from {recent_cutoff}+",
            recent_frac * 100.0,
        ));
        suggestions.push("Add seminal/foundational papers from earlier years".into());
    }

    score
}

/// Citation network score based on the Gini coefficient of citation counts.
/// A perfectly equal distribution scores 1.0; extreme concentration scores low.
/// A moderate Gini (0.3-0.6) is actually healthy (mix of landmark + new papers).
fn score_citation_network(
    papers: &[ResearchPaper],
    issues: &mut Vec<String>,
    suggestions: &mut Vec<String>,
) -> f64 {
    let mut counts: Vec<f64> = papers
        .iter()
        .filter_map(|p| p.citation_count.map(|c| c as f64))
        .collect();

    if counts.len() < 2 {
        return 0.5;
    }

    counts.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let n = counts.len() as f64;
    let mean = counts.iter().sum::<f64>() / n;

    if mean < 0.001 {
        // All zeros — no citation data at all
        return 0.3;
    }

    // Gini coefficient
    let mut sum_diff = 0.0;
    for (i, &ci) in counts.iter().enumerate() {
        for &cj in counts.iter().skip(i + 1) {
            sum_diff += (cj - ci).abs();
        }
    }
    let gini = sum_diff / (n * n * mean);

    // Ideal Gini for research is moderate (0.3-0.6 = healthy mix).
    // Extreme equality (0.0) or extreme concentration (>0.8) both penalised.
    let score = if gini <= 0.6 {
        // 0.0-0.6 maps to 0.6-1.0
        0.6 + (gini / 0.6) * 0.4
    } else {
        // 0.6-1.0 maps to 1.0 down to 0.2
        1.0 - ((gini - 0.6) / 0.4) * 0.8
    };

    if gini > 0.8 {
        issues.push(format!(
            "Citation concentration too high (Gini {:.2}) — corpus dominated by a few papers",
            gini
        ));
        suggestions.push("Balance highly-cited papers with newer or niche works".into());
    } else if gini < 0.1 {
        issues.push(format!(
            "Citation counts suspiciously uniform (Gini {:.2})",
            gini
        ));
        suggestions.push("Include a mix of landmark and emerging papers".into());
    }

    score.clamp(0.0, 1.0)
}

/// Authority scoring: fraction of papers that are "landmarks" (above citation threshold).
/// Having some high-authority papers is good; having none flags a gap.
fn score_authority(
    papers: &[ResearchPaper],
    threshold: u64,
    min_fraction: f64,
    issues: &mut Vec<String>,
    suggestions: &mut Vec<String>,
) -> f64 {
    if papers.is_empty() {
        return 0.0;
    }

    let landmark_count = papers
        .iter()
        .filter(|p| p.citation_count.map(|c| c >= threshold).unwrap_or(false))
        .count();
    let fraction = landmark_count as f64 / papers.len() as f64;

    // Score: 0 landmarks = 0.0; reaching min_fraction = 1.0; cap at 1.0
    let score = (fraction / min_fraction.max(0.01)).min(1.0);

    if landmark_count == 0 {
        issues.push(format!(
            "No landmark papers (>{threshold} citations) in corpus"
        ));
        suggestions.push("Include well-established, highly-cited foundational works".into());
    }

    score
}

/// Field diversity: how many distinct fields of study are represented.
/// Uses `fields_of_study` from papers. More fields = more diverse perspective.
fn score_field_diversity(
    papers: &[ResearchPaper],
    issues: &mut Vec<String>,
    suggestions: &mut Vec<String>,
) -> f64 {
    if papers.is_empty() {
        return 0.0;
    }

    let mut all_fields = HashSet::new();
    let mut papers_with_fields = 0usize;
    for p in papers {
        if let Some(ref fields) = p.fields_of_study {
            if !fields.is_empty() {
                papers_with_fields += 1;
                for f in fields {
                    all_fields.insert(f.to_lowercase());
                }
            }
        }
    }

    if papers_with_fields == 0 {
        // No field data — neutral score
        return 0.5;
    }

    let field_count = all_fields.len();

    // Measure how evenly fields are distributed
    let mut field_counts: HashMap<String, usize> = HashMap::new();
    for p in papers {
        if let Some(ref fields) = p.fields_of_study {
            for f in fields {
                *field_counts.entry(f.to_lowercase()).or_insert(0) += 1;
            }
        }
    }

    // Score: log-scaled field count (1 field = 0.2, 3 fields = 0.6, 5+ = 1.0)
    let diversity_score = match field_count {
        0 => 0.0,
        1 => 0.2,
        2 => 0.4,
        3 => 0.6,
        4 => 0.8,
        _ => 1.0,
    };

    if field_count <= 1 && papers_with_fields >= 3 {
        issues.push("All papers in a single research field".into());
        suggestions.push("Include cross-disciplinary perspectives".into());
    }

    diversity_score
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

    fn make_paper_full(
        title: &str,
        year: Option<u32>,
        source: PaperSource,
        citations: Option<u64>,
        fields: Option<Vec<String>>,
        abstract_text: Option<String>,
    ) -> ResearchPaper {
        ResearchPaper {
            title: title.into(),
            abstract_text,
            authors: vec!["Author".into()],
            year,
            doi: None,
            citation_count: citations,
            url: None,
            pdf_url: None,
            source,
            source_id: title.into(),
            fields_of_study: fields,
        }
    }

    // ── Result count ────────────────────────────────────────────────────────

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
        assert!(
            critique.quality_score > 0.5,
            "score was {}",
            critique.quality_score
        );
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

    // ── Recency bias ────────────────────────────────────────────────────────

    #[test]
    fn recency_bias_detected_when_all_recent() {
        let papers = vec![
            make_paper("A", Some(2026), PaperSource::Arxiv),
            make_paper("B", Some(2026), PaperSource::SemanticScholar),
            make_paper("C", Some(2025), PaperSource::OpenAlex),
            make_paper("D", Some(2025), PaperSource::Crossref),
            make_paper("E", Some(2025), PaperSource::Core),
        ];
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(
            critique.issues.iter().any(|i| i.contains("Recency bias")),
            "issues: {:?}",
            critique.issues
        );
        assert!(critique.dimension_scores.recency_bias < 0.6);
    }

    #[test]
    fn recency_bias_not_flagged_when_balanced() {
        let papers = vec![
            make_paper("A", Some(2015), PaperSource::Arxiv),
            make_paper("B", Some(2018), PaperSource::SemanticScholar),
            make_paper("C", Some(2020), PaperSource::OpenAlex),
            make_paper("D", Some(2022), PaperSource::Crossref),
            make_paper("E", Some(2025), PaperSource::Core),
        ];
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(
            !critique.issues.iter().any(|i| i.contains("Recency bias")),
            "issues: {:?}",
            critique.issues
        );
        assert!(critique.dimension_scores.recency_bias > 0.8);
    }

    // ── Citation network (Gini) ─────────────────────────────────────────────

    #[test]
    fn citation_network_uniform_scores_moderate() {
        // All papers have identical citations — Gini near 0 → flag suspiciously uniform
        let papers: Vec<_> = (0..5)
            .map(|i| {
                make_paper_full(
                    &format!("P{i}"),
                    Some(2020 + i as u32),
                    PaperSource::Arxiv,
                    Some(50),
                    None,
                    Some("Abstract".into()),
                )
            })
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(
            critique
                .issues
                .iter()
                .any(|i| i.contains("uniform")),
            "issues: {:?}",
            critique.issues
        );
    }

    #[test]
    fn citation_network_extreme_concentration_flagged() {
        // One paper has 10000 cites, rest have 1
        let mut papers = vec![make_paper_full(
            "Landmark",
            Some(2015),
            PaperSource::Arxiv,
            Some(10000),
            None,
            Some("Abstract".into()),
        )];
        for i in 0..9 {
            papers.push(make_paper_full(
                &format!("P{i}"),
                Some(2020 + i as u32),
                PaperSource::SemanticScholar,
                Some(1),
                None,
                Some("Abstract".into()),
            ));
        }
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(
            critique
                .issues
                .iter()
                .any(|i| i.contains("Citation concentration")),
            "issues: {:?}",
            critique.issues
        );
    }

    // ── Authority scoring ───────────────────────────────────────────────────

    #[test]
    fn authority_flags_no_landmarks() {
        // All papers have low citations
        let papers: Vec<_> = (0..5)
            .map(|i| {
                make_paper_full(
                    &format!("P{i}"),
                    Some(2020),
                    PaperSource::Arxiv,
                    Some(5),
                    None,
                    Some("Abstract".into()),
                )
            })
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(
            critique.issues.iter().any(|i| i.contains("landmark")),
            "issues: {:?}",
            critique.issues
        );
        assert!(critique.dimension_scores.authority < 0.01);
    }

    #[test]
    fn authority_rewards_landmark_papers() {
        let mut papers: Vec<_> = (0..4)
            .map(|i| {
                make_paper_full(
                    &format!("P{i}"),
                    Some(2020),
                    PaperSource::Arxiv,
                    Some(5),
                    None,
                    Some("Abstract".into()),
                )
            })
            .collect();
        // Add a landmark
        papers.push(make_paper_full(
            "Landmark",
            Some(2015),
            PaperSource::SemanticScholar,
            Some(500),
            None,
            Some("Abstract".into()),
        ));
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(
            !critique.issues.iter().any(|i| i.contains("landmark")),
            "issues: {:?}",
            critique.issues
        );
        assert!(critique.dimension_scores.authority > 0.9);
    }

    // ── Field diversity ─────────────────────────────────────────────────────

    #[test]
    fn field_diversity_single_field_flagged() {
        let papers: Vec<_> = (0..5)
            .map(|i| {
                make_paper_full(
                    &format!("P{i}"),
                    Some(2020),
                    PaperSource::Arxiv,
                    Some(10),
                    Some(vec!["cs.AI".into()]),
                    Some("Abstract".into()),
                )
            })
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(
            critique.issues.iter().any(|i| i.contains("single research field")),
            "issues: {:?}",
            critique.issues
        );
        assert!(critique.dimension_scores.field_diversity < 0.3);
    }

    #[test]
    fn field_diversity_multiple_fields_scores_high() {
        let fields = vec![
            vec!["cs.AI".into(), "cs.LG".into()],
            vec!["cs.CL".into()],
            vec!["stat.ML".into()],
            vec!["cs.CV".into(), "cs.AI".into()],
            vec!["q-bio.NC".into()],
        ];
        let papers: Vec<_> = fields
            .into_iter()
            .enumerate()
            .map(|(i, f)| {
                make_paper_full(
                    &format!("P{i}"),
                    Some(2020 + i as u32),
                    PaperSource::Arxiv,
                    Some(10),
                    Some(f),
                    Some("Abstract".into()),
                )
            })
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(
            critique.dimension_scores.field_diversity > 0.8,
            "field_diversity was {}",
            critique.dimension_scores.field_diversity
        );
    }

    #[test]
    fn field_diversity_no_field_data_neutral() {
        let papers = vec![make_paper("A", Some(2020), PaperSource::Arxiv)];
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(
            (critique.dimension_scores.field_diversity - 0.5).abs() < 0.01,
            "field_diversity was {}",
            critique.dimension_scores.field_diversity
        );
    }

    // ── Custom weights ──────────────────────────────────────────────────────

    #[test]
    fn custom_weights_affect_score() {
        let papers = vec![
            make_paper("A", Some(2024), PaperSource::Arxiv),
            make_paper("B", Some(2024), PaperSource::Arxiv),
            make_paper("C", Some(2024), PaperSource::Arxiv),
            make_paper("D", Some(2024), PaperSource::Arxiv),
            make_paper("E", Some(2024), PaperSource::Arxiv),
        ];

        let default_cfg = CritiqueConfig::default();
        let default_critique = default_cfg.evaluate(&papers);

        // Weight only result_count (which is perfect at 5 papers)
        let mut weighted_cfg = CritiqueConfig::default();
        weighted_cfg.weights = DimensionWeights {
            result_count: 1.0,
            year_span: 0.0,
            source_diversity: 0.0,
            abstract_coverage: 0.0,
            citation_distribution: 0.0,
            recency_bias: 0.0,
            citation_network: 0.0,
            authority: 0.0,
            field_diversity: 0.0,
        };
        let weighted_critique = weighted_cfg.evaluate(&papers);

        // With only result_count weighted and 5 papers, score should be 1.0
        assert!(
            (weighted_critique.quality_score - 1.0).abs() < 0.01,
            "score was {}",
            weighted_critique.quality_score
        );
        // Default should differ
        assert!(
            (default_critique.quality_score - weighted_critique.quality_score).abs() > 0.1,
            "default={} weighted={}",
            default_critique.quality_score,
            weighted_critique.quality_score
        );
    }

    #[test]
    fn dimension_scores_populated() {
        let papers = vec![
            make_paper("A", Some(2020), PaperSource::Arxiv),
            make_paper("B", Some(2023), PaperSource::SemanticScholar),
        ];
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        // All dimension scores should be between 0 and 1
        let ds = &critique.dimension_scores;
        for &score in &[
            ds.result_count,
            ds.year_span,
            ds.source_diversity,
            ds.abstract_coverage,
            ds.citation_distribution,
            ds.recency_bias,
            ds.citation_network,
            ds.authority,
            ds.field_diversity,
        ] {
            assert!(
                (0.0..=1.0).contains(&score),
                "score {} out of range",
                score
            );
        }
        assert!(critique.dimension_scores.semantic_diversity.is_none());
    }

    // ── Semantic diversity (local-vector only) ──────────────────────────────

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
        assert!(critique.dimension_scores.semantic_diversity.is_some());
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
        assert!(critique.dimension_scores.semantic_diversity.unwrap() > 0.5);
    }
}
