//! Search quality evaluation: scores results on diversity, coverage, and depth.
//!
//! Dimensions scored (all available without feature flags):
//! - **Result count**: enough papers to draw conclusions
//! - **Year range**: temporal breadth of the corpus
//! - **Source diversity**: variety of data sources (arXiv, Semantic Scholar, etc.)
//! - **Abstract coverage**: fraction of papers with abstracts
//! - **Recency bias**: detects over-concentration on recent publications
//! - **Citation network**: Gini-based analysis of citation concentration
//! - **Authority**: presence of highly-cited landmark papers
//! - **Field diversity**: variety of research fields/categories
//!
//! When the `local-vector` feature is enabled, an additional **semantic diversity**
//! metric is available via `CritiqueConfig::evaluate_semantic`, which uses
//! the Candle embedding engine to measure pairwise cosine distances.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use crate::paper::ResearchPaper;

/// Per-dimension weight overrides. All weights are normalised to sum to 1.0
/// before scoring, so relative magnitudes are what matter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionWeights {
    pub result_count: f32,
    pub year_range: f32,
    pub source_diversity: f32,
    pub abstract_coverage: f32,
    pub recency_bias: f32,
    pub citation_network: f32,
    pub authority: f32,
    pub field_diversity: f32,
}

impl Default for DimensionWeights {
    fn default() -> Self {
        Self {
            result_count: 0.15,
            year_range: 0.12,
            source_diversity: 0.12,
            abstract_coverage: 0.12,
            recency_bias: 0.12,
            citation_network: 0.10,
            authority: 0.12,
            field_diversity: 0.15,
        }
    }
}

impl DimensionWeights {
    /// Scale all weights in place so they sum to 1.0.
    pub fn normalize(&mut self) {
        let total = self.result_count
            + self.year_range
            + self.source_diversity
            + self.abstract_coverage
            + self.recency_bias
            + self.citation_network
            + self.authority
            + self.field_diversity;
        if total <= 0.0 {
            *self = Self::default();
            return;
        }
        self.result_count /= total;
        self.year_range /= total;
        self.source_diversity /= total;
        self.abstract_coverage /= total;
        self.recency_bias /= total;
        self.citation_network /= total;
        self.authority /= total;
        self.field_diversity /= total;
    }

    /// Return weights normalised so they sum to 1.0 (non-mutating).
    fn normalised(&self) -> [f32; 8] {
        let raw = [
            self.result_count,
            self.year_range,
            self.source_diversity,
            self.abstract_coverage,
            self.recency_bias,
            self.citation_network,
            self.authority,
            self.field_diversity,
        ];
        let total: f32 = raw.iter().sum();
        if total <= 0.0 {
            return [1.0 / 8.0; 8];
        }
        let mut out = [0.0; 8];
        for (i, &v) in raw.iter().enumerate() {
            out[i] = v / total;
        }
        out
    }
}

/// Per-dimension raw scores (0.0..=1.0) for transparency.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionScores {
    pub result_count: f32,
    pub year_range: f32,
    pub source_diversity: f32,
    pub abstract_coverage: f32,
    pub recency_bias: f32,
    pub citation_network: f32,
    pub authority: f32,
    pub field_diversity: f32,
    /// Only populated when `evaluate_semantic` is used.
    pub semantic_diversity: Option<f32>,
}

#[derive(Debug, Clone)]
pub struct CritiqueConfig {
    pub min_results: usize,
    pub min_year_range: u32,
    pub min_sources: usize,
    pub quality_threshold: f64,
    /// Citation count above which a paper is considered a "landmark".
    pub authority_citation_threshold: u32,
    /// Minimum fraction of landmark papers expected for a healthy corpus.
    pub authority_min_fraction: f32,
    /// Year considered "current" for recency bias detection.
    /// Defaults to `None` (uses 2026 as fallback).
    pub current_year: Option<u32>,
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
            current_year: None,
            weights: DimensionWeights::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Critique {
    pub quality_score: f64,
    pub dimension_scores: Option<DimensionScores>,
    pub issues: Vec<String>,
    pub suggestions: Vec<String>,
}

impl CritiqueConfig {
    /// Resolve the effective current year.
    fn effective_year(&self) -> u32 {
        self.current_year.unwrap_or(2026)
    }

    pub fn evaluate(&self, papers: &[ResearchPaper]) -> Critique {
        let mut issues = Vec::new();
        let mut suggestions = Vec::new();
        let w = self.weights.normalised();

        // 1. Result count
        let count_score = (papers.len() as f32 / self.min_results as f32).min(1.0);

        // Short-circuit: no papers means everything scores zero
        if papers.is_empty() {
            issues.push(format!(
                "Too few papers (0, expected at least {})",
                self.min_results
            ));
            suggestions.push("Broaden search terms or relax filters".into());
            return Critique {
                quality_score: 0.0,
                dimension_scores: Some(DimensionScores {
                    result_count: 0.0,
                    year_range: 0.0,
                    source_diversity: 0.0,
                    abstract_coverage: 0.0,
                    recency_bias: 0.0,
                    citation_network: 0.0,
                    authority: 0.0,
                    field_diversity: 0.0,
                    semantic_diversity: None,
                }),
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

        // 2. Year range
        let years: Vec<u32> = papers.iter().filter_map(|p| p.year).collect();
        let year_range_score = if let (Some(&mn), Some(&mx)) =
            (years.iter().min(), years.iter().max())
        {
            let span = mx - mn;
            let ratio = (span as f32 / self.min_year_range as f32).min(1.0);
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
        let source_score = (sources.len() as f32 / self.min_sources as f32).min(1.0);
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
            let ratio = with_abstract as f32 / papers.len() as f32;
            if ratio < 0.5 {
                issues.push(format!("Low abstract coverage ({:.0}%)", ratio * 100.0));
                suggestions
                    .push("Prefer sources with full abstracts (arXiv, Semantic Scholar)".into());
            }
            ratio
        } else {
            0.0
        };

        // 5. Recency bias detection
        let current_year = self.effective_year();
        let recency_score = score_recency_bias(papers, current_year);
        {
            let year_vals: Vec<u32> = papers.iter().filter_map(|p| p.year).collect();
            if year_vals.len() >= 2 {
                let recent_cutoff = current_year.saturating_sub(1);
                let recent_count = year_vals.iter().filter(|&&y| y >= recent_cutoff).count();
                let recent_frac = recent_count as f32 / year_vals.len() as f32;
                if recent_frac > 0.7 {
                    issues.push(format!(
                        "Recency bias: {:.0}% of papers from {recent_cutoff}+",
                        recent_frac * 100.0,
                    ));
                    suggestions.push("Add seminal/foundational papers from earlier years".into());
                }
            }
        }

        // 6. Citation network (Gini coefficient)
        let citation_network_score = score_citation_network(papers);
        {
            let mut counts: Vec<f64> = papers
                .iter()
                .filter_map(|p| p.citation_count.map(|c| c as f64))
                .collect();
            if counts.len() >= 2 {
                counts.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
                let n = counts.len() as f64;
                let mean = counts.iter().sum::<f64>() / n;
                if mean > 0.001 {
                    let mut sum_diff = 0.0;
                    for (i, &ci) in counts.iter().enumerate() {
                        for &cj in counts.iter().skip(i + 1) {
                            sum_diff += (cj - ci).abs();
                        }
                    }
                    let gini = sum_diff / (n * n * mean);
                    if gini > 0.8 {
                        issues.push(format!(
                            "Citation concentration too high (Gini {:.2}) \
                             — corpus dominated by a few papers",
                            gini
                        ));
                        suggestions.push(
                            "Balance highly-cited papers with newer or niche works".into(),
                        );
                    } else if gini < 0.1 {
                        issues.push(format!(
                            "Citation counts suspiciously uniform (Gini {:.2})",
                            gini
                        ));
                        suggestions
                            .push("Include a mix of landmark and emerging papers".into());
                    }
                }
            }
        }

        // 7. Authority scoring
        let authority_score = score_authority(
            papers,
            self.authority_citation_threshold,
            self.authority_min_fraction,
        );
        if authority_score < 0.01 && !papers.is_empty() {
            let threshold = self.authority_citation_threshold;
            issues.push(format!(
                "No landmark papers (>{threshold} citations) in corpus"
            ));
            suggestions
                .push("Include well-established, highly-cited foundational works".into());
        }

        // 8. Field diversity
        let field_diversity_score = score_field_diversity(papers);
        {
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
            if all_fields.len() <= 1 && papers_with_fields >= 3 {
                issues.push("All papers in a single research field".into());
                suggestions.push("Include cross-disciplinary perspectives".into());
            }
        }

        let scores = DimensionScores {
            result_count: count_score,
            year_range: year_range_score,
            source_diversity: source_score,
            abstract_coverage: abstract_score,
            recency_bias: recency_score,
            citation_network: citation_network_score,
            authority: authority_score,
            field_diversity: field_diversity_score,
            semantic_diversity: None,
        };

        let raw = [
            count_score,
            year_range_score,
            source_score,
            abstract_score,
            recency_score,
            citation_network_score,
            authority_score,
            field_diversity_score,
        ];
        let quality_score: f64 = raw
            .iter()
            .zip(w.iter())
            .map(|(s, wt)| *s as f64 * *wt as f64)
            .sum();

        Critique {
            quality_score: quality_score.clamp(0.0, 1.0),
            dimension_scores: Some(scores),
            issues,
            suggestions,
        }
    }

    /// Evaluate with an additional semantic diversity dimension using local
    /// Candle embeddings. Rebalances weights to include a pairwise-distance
    /// metric (weight 0.15, taken proportionally from the other eight axes).
    ///
    /// `embeddings` must be one 384-d vector per paper (same order as `papers`).
    #[cfg(feature = "local-vector")]
    #[cfg_attr(docsrs, doc(cfg(feature = "local-vector")))]
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
        let rebalanced = base.quality_score * 0.85 + diversity as f64 * 0.15;

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
        if let Some(ref mut ds) = dimension_scores {
            ds.semantic_diversity = Some(diversity);
        }

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
/// Returns 1.0 when balanced, drops linearly when over-concentrated.
fn score_recency_bias(papers: &[ResearchPaper], current_year: u32) -> f32 {
    let years: Vec<u32> = papers.iter().filter_map(|p| p.year).collect();
    if years.len() < 2 {
        return 0.5; // not enough data to judge
    }
    let recent_cutoff = current_year.saturating_sub(1);
    let recent_count = years.iter().filter(|&&y| y >= recent_cutoff).count();
    let recent_frac = recent_count as f32 / years.len() as f32;

    if recent_frac <= 0.4 {
        1.0
    } else {
        ((1.0 - recent_frac) / 0.6).clamp(0.0, 1.0)
    }
}

/// Citation network score based on the Gini coefficient of citation counts.
/// Moderate Gini (0.3-0.6) scores best (healthy mix of landmark + new papers).
fn score_citation_network(papers: &[ResearchPaper]) -> f32 {
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
        return 0.3;
    }

    let mut sum_diff = 0.0;
    for (i, &ci) in counts.iter().enumerate() {
        for &cj in counts.iter().skip(i + 1) {
            sum_diff += (cj - ci).abs();
        }
    }
    let gini = sum_diff / (n * n * mean);

    let score = if gini <= 0.6 {
        0.6 + (gini / 0.6) * 0.4
    } else {
        1.0 - ((gini - 0.6) / 0.4) * 0.8
    };

    (score as f32).clamp(0.0, 1.0)
}

/// Authority scoring: fraction of papers above citation threshold.
fn score_authority(papers: &[ResearchPaper], threshold: u32, min_fraction: f32) -> f32 {
    if papers.is_empty() {
        return 0.0;
    }

    let landmark_count = papers
        .iter()
        .filter(|p| {
            p.citation_count
                .map(|c| c >= threshold as u64)
                .unwrap_or(false)
        })
        .count();
    let fraction = landmark_count as f32 / papers.len() as f32;

    (fraction / min_fraction.max(0.01)).min(1.0)
}

/// Field diversity: count distinct `fields_of_study` across papers.
/// Rewards cross-disciplinary breadth.
fn score_field_diversity(papers: &[ResearchPaper]) -> f32 {
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
        return 0.5;
    }

    match all_fields.len() {
        0 => 0.0,
        1 => 0.2,
        2 => 0.4,
        3 => 0.6,
        4 => 0.8,
        _ => 1.0,
    }
}

/// Mean pairwise cosine distance across all (i, j) pairs.
#[cfg(feature = "local-vector")]
fn mean_pairwise_distance(vecs: &[Vec<f32>]) -> f32 {
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
    if count == 0 {
        0.0
    } else {
        (total / count as f64) as f32
    }
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
        assert!(critique.quality_score > 0.5, "score was {}", critique.quality_score);
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
        assert!(critique.issues.iter().any(|i| i.contains("Recency bias")), "issues: {:?}", critique.issues);
        let ds = critique.dimension_scores.unwrap();
        assert!(ds.recency_bias < 0.6);
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
        assert!(!critique.issues.iter().any(|i| i.contains("Recency bias")), "issues: {:?}", critique.issues);
        let ds = critique.dimension_scores.unwrap();
        assert!(ds.recency_bias > 0.8);
    }

    #[test]
    fn recency_bias_score_fn_returns_half_for_single_paper() {
        let papers = vec![make_paper("A", Some(2025), PaperSource::Arxiv)];
        let score = score_recency_bias(&papers, 2026);
        assert!((score - 0.5).abs() < 0.01, "got {}", score);
    }

    #[test]
    fn recency_bias_with_custom_current_year() {
        let papers = vec![
            make_paper("A", Some(2020), PaperSource::Arxiv),
            make_paper("B", Some(2020), PaperSource::SemanticScholar),
            make_paper("C", Some(2020), PaperSource::OpenAlex),
            make_paper("D", Some(2019), PaperSource::Crossref),
            make_paper("E", Some(2019), PaperSource::Core),
        ];
        let mut cfg = CritiqueConfig::default();
        cfg.current_year = Some(2020);
        let critique = cfg.evaluate(&papers);
        let ds = critique.dimension_scores.unwrap();
        assert!(ds.recency_bias < 0.6, "got {}", ds.recency_bias);
    }

    // ── Citation network (Gini) ─────────────────────────────────────────────

    #[test]
    fn citation_network_uniform_scores_moderate() {
        let papers: Vec<_> = (0..5)
            .map(|i| make_paper_full(&format!("P{i}"), Some(2020 + i as u32), PaperSource::Arxiv, Some(50), None, Some("Abstract".into())))
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(critique.issues.iter().any(|i| i.contains("uniform")), "issues: {:?}", critique.issues);
    }

    #[test]
    fn citation_network_extreme_concentration_flagged() {
        let mut papers = vec![make_paper_full("Landmark", Some(2015), PaperSource::Arxiv, Some(10000), None, Some("Abstract".into()))];
        for i in 0..9 {
            papers.push(make_paper_full(&format!("P{i}"), Some(2020 + i as u32), PaperSource::SemanticScholar, Some(1), None, Some("Abstract".into())));
        }
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(critique.issues.iter().any(|i| i.contains("Citation concentration")), "issues: {:?}", critique.issues);
    }

    #[test]
    fn citation_network_moderate_gini_scores_well() {
        let papers = vec![
            make_paper_full("A", Some(2020), PaperSource::Arxiv, Some(200), None, Some("Abstract".into())),
            make_paper_full("B", Some(2020), PaperSource::Arxiv, Some(50), None, Some("Abstract".into())),
            make_paper_full("C", Some(2020), PaperSource::Arxiv, Some(20), None, Some("Abstract".into())),
            make_paper_full("D", Some(2020), PaperSource::Arxiv, Some(5), None, Some("Abstract".into())),
            make_paper_full("E", Some(2020), PaperSource::Arxiv, Some(1), None, Some("Abstract".into())),
        ];
        let score = score_citation_network(&papers);
        assert!(score > 0.7, "got {}", score);
    }

    #[test]
    fn citation_network_no_data_returns_half() {
        let papers = vec![make_paper_full("A", Some(2020), PaperSource::Arxiv, None, None, Some("Abstract".into()))];
        let score = score_citation_network(&papers);
        assert!((score - 0.5).abs() < 0.01, "got {}", score);
    }

    // ── Authority scoring ───────────────────────────────────────────────────

    #[test]
    fn authority_flags_no_landmarks() {
        let papers: Vec<_> = (0..5)
            .map(|i| make_paper_full(&format!("P{i}"), Some(2020), PaperSource::Arxiv, Some(5), None, Some("Abstract".into())))
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(critique.issues.iter().any(|i| i.contains("landmark")), "issues: {:?}", critique.issues);
        let ds = critique.dimension_scores.unwrap();
        assert!(ds.authority < 0.01);
    }

    #[test]
    fn authority_rewards_landmark_papers() {
        let mut papers: Vec<_> = (0..4)
            .map(|i| make_paper_full(&format!("P{i}"), Some(2020), PaperSource::Arxiv, Some(5), None, Some("Abstract".into())))
            .collect();
        papers.push(make_paper_full("Landmark", Some(2015), PaperSource::SemanticScholar, Some(500), None, Some("Abstract".into())));
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(!critique.issues.iter().any(|i| i.contains("landmark")), "issues: {:?}", critique.issues);
        let ds = critique.dimension_scores.unwrap();
        assert!(ds.authority > 0.9);
    }

    #[test]
    fn authority_custom_threshold() {
        let papers: Vec<_> = (0..5)
            .map(|i| make_paper_full(&format!("P{i}"), Some(2020), PaperSource::Arxiv, Some(50), None, Some("Abstract".into())))
            .collect();
        let mut cfg = CritiqueConfig::default();
        cfg.authority_citation_threshold = 30;
        cfg.authority_min_fraction = 0.2;
        let critique = cfg.evaluate(&papers);
        let ds = critique.dimension_scores.unwrap();
        assert!(ds.authority > 0.99, "got {}", ds.authority);
    }

    #[test]
    fn authority_empty_papers_returns_zero() {
        let score = score_authority(&[], 100, 0.1);
        assert!(score < 0.01);
    }

    // ── Field diversity ─────────────────────────────────────────────────────

    #[test]
    fn field_diversity_single_field_flagged() {
        let papers: Vec<_> = (0..5)
            .map(|i| make_paper_full(&format!("P{i}"), Some(2020), PaperSource::Arxiv, Some(10), Some(vec!["cs.AI".into()]), Some("Abstract".into())))
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        assert!(critique.issues.iter().any(|i| i.contains("single research field")), "issues: {:?}", critique.issues);
        let ds = critique.dimension_scores.unwrap();
        assert!(ds.field_diversity < 0.3);
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
        let papers: Vec<_> = fields.into_iter().enumerate()
            .map(|(i, f)| make_paper_full(&format!("P{i}"), Some(2020 + i as u32), PaperSource::Arxiv, Some(10), Some(f), Some("Abstract".into())))
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        let ds = critique.dimension_scores.unwrap();
        assert!(ds.field_diversity > 0.8, "got {}", ds.field_diversity);
    }

    #[test]
    fn field_diversity_no_field_data_neutral() {
        let papers = vec![make_paper("A", Some(2020), PaperSource::Arxiv)];
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        let ds = critique.dimension_scores.unwrap();
        assert!((ds.field_diversity - 0.5).abs() < 0.01, "got {}", ds.field_diversity);
    }

    #[test]
    fn field_diversity_case_insensitive() {
        let papers = vec![
            make_paper_full("A", Some(2020), PaperSource::Arxiv, Some(10), Some(vec!["CS.AI".into()]), Some("Abstract".into())),
            make_paper_full("B", Some(2021), PaperSource::Arxiv, Some(10), Some(vec!["cs.ai".into()]), Some("Abstract".into())),
        ];
        let score = score_field_diversity(&papers);
        assert!((score - 0.2).abs() < 0.01, "got {}", score);
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

        let mut weighted_cfg = CritiqueConfig::default();
        weighted_cfg.weights = DimensionWeights {
            result_count: 1.0, year_range: 0.0, source_diversity: 0.0,
            abstract_coverage: 0.0, recency_bias: 0.0, citation_network: 0.0,
            authority: 0.0, field_diversity: 0.0,
        };
        let weighted_critique = weighted_cfg.evaluate(&papers);
        assert!((weighted_critique.quality_score - 1.0).abs() < 0.01, "score was {}", weighted_critique.quality_score);
        assert!((default_critique.quality_score - weighted_critique.quality_score).abs() > 0.1);
    }

    #[test]
    fn normalize_weights_sums_to_one() {
        let mut w = DimensionWeights {
            result_count: 2.0, year_range: 3.0, source_diversity: 1.0,
            abstract_coverage: 1.0, recency_bias: 1.0, citation_network: 1.0,
            authority: 1.0, field_diversity: 0.0,
        };
        w.normalize();
        let sum = w.result_count + w.year_range + w.source_diversity + w.abstract_coverage
            + w.recency_bias + w.citation_network + w.authority + w.field_diversity;
        assert!((sum - 1.0).abs() < 0.001, "got {}", sum);
        assert!((w.year_range / w.result_count - 1.5).abs() < 0.01);
    }

    #[test]
    fn normalize_all_zero_resets_to_default() {
        let mut w = DimensionWeights {
            result_count: 0.0, year_range: 0.0, source_diversity: 0.0,
            abstract_coverage: 0.0, recency_bias: 0.0, citation_network: 0.0,
            authority: 0.0, field_diversity: 0.0,
        };
        w.normalize();
        let def = DimensionWeights::default();
        assert!((w.result_count - def.result_count).abs() < 0.001);
    }

    // ── Dimension scores populated ──────────────────────────────────────────

    #[test]
    fn dimension_scores_populated() {
        let papers = vec![
            make_paper("A", Some(2020), PaperSource::Arxiv),
            make_paper("B", Some(2023), PaperSource::SemanticScholar),
        ];
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&papers);
        let ds = critique.dimension_scores.unwrap();
        for &score in &[ds.result_count, ds.year_range, ds.source_diversity, ds.abstract_coverage,
                        ds.recency_bias, ds.citation_network, ds.authority, ds.field_diversity] {
            assert!((0.0..=1.0).contains(&score), "score {} out of range", score);
        }
        assert!(ds.semantic_diversity.is_none());
    }

    #[test]
    fn dimension_scores_is_some_on_empty() {
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate(&[]);
        assert!(critique.dimension_scores.is_some());
    }

    #[test]
    fn default_weights_sum_to_one() {
        let w = DimensionWeights::default();
        let sum = w.result_count + w.year_range + w.source_diversity + w.abstract_coverage
            + w.recency_bias + w.citation_network + w.authority + w.field_diversity;
        assert!((sum - 1.0).abs() < 0.01, "got {}", sum);
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
            .map(|_| { let mut v = vec![0.0f32; 384]; v[0] = 1.0; v })
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate_semantic(&papers, &embs);
        assert!(critique.issues.iter().any(|i| i.contains("semantic diversity")));
        let ds = critique.dimension_scores.unwrap();
        assert!(ds.semantic_diversity.is_some());
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
            .map(|i| { let mut v = vec![0.0f32; 384]; v[i] = 1.0; v })
            .collect();
        let cfg = CritiqueConfig::default();
        let critique = cfg.evaluate_semantic(&papers, &embs);
        assert!(!critique.issues.iter().any(|i| i.contains("semantic diversity")));
        let ds = critique.dimension_scores.unwrap();
        assert!(ds.semantic_diversity.unwrap() > 0.5);
    }
}
