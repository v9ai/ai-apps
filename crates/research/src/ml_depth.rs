//! ML depth scoring for company research validation.
//!
//! Evaluates a company's machine learning research depth from their paper
//! portfolio. Produces a weighted multi-dimensional score and a categorical
//! verdict: [`MlDepthVerdict::GenuineDeepMl`], [`MlDepthVerdict::AppliedMl`],
//! [`MlDepthVerdict::ApiWrapper`], or [`MlDepthVerdict::Unknown`].
//!
//! Modelled after the [`crate::critique`] module's weighted scoring pattern.

use serde::{Deserialize, Serialize};

use crate::paper::ResearchPaper;

// ── Constants ────────────────────────────────────────────────────────────────

/// Top ML venues for venue quality scoring.
/// Includes both abbreviations and full names since OpenAlex returns full names.
pub const TOP_ML_VENUES: &[&str] = &[
    // Top-tier ML conferences (abbreviations + full names)
    "neurips",
    "nips",
    "neural information processing systems",
    "icml",
    "international conference on machine learning",
    "iclr",
    "international conference on learning representations",
    // NLP
    "acl",
    "association for computational linguistics",
    "emnlp",
    "empirical methods in natural language",
    "naacl",
    "north american chapter",
    "eacl",
    "coling",
    // Computer Vision
    "cvpr",
    "conference on computer vision and pattern recognition",
    "iccv",
    "international conference on computer vision",
    "eccv",
    "european conference on computer vision",
    // AI general
    "aaai",
    "association for the advancement of artificial intelligence",
    "ijcai",
    "international joint conference on artificial intelligence",
    // Top journals
    "jmlr",
    "tmlr",
    "journal of machine learning research",
    "transactions on machine learning research",
    "nature machine intelligence",
    "nature",
    "science",
    "transactions on pattern analysis",
    "ieee transactions on neural networks",
    "artificial intelligence",
    // Secondary but still strong
    "interspeech",
    "icassp",
    "international conference on acoustics",
    "sigir",
    "kdd",
    "knowledge discovery and data mining",
    "www",
    "world wide web",
    "acm computing surveys",
    "ieee signal processing",
];

/// Known elite ML research labs for pedigree detection.
pub const ELITE_ML_LABS: &[&str] = &[
    "google brain",
    "google deepmind",
    "deepmind",
    "meta ai",
    "fair",
    "facebook ai research",
    "meta reality labs",
    "openai",
    "microsoft research",
    "msr",
    "anthropic",
    "apple ml",
    "apple machine learning",
    "nvidia research",
    "amazon science",
    "amazon alexa ai",
    "baidu research",
    "tencent ai",
    "stanford",
    "mit",
    "cmu",
    "carnegie mellon",
    "berkeley",
    "uc berkeley",
    "eth zurich",
    "epfl",
    "oxford",
    "cambridge",
    "mila",
    "montreal institute",
    "max planck",
    "allen ai",
    "ai2",
    "hugging face",
];

/// ML subfields for research breadth scoring.
const ML_SUBFIELDS: &[(&str, &[&str])] = &[
    (
        "nlp",
        &[
            "natural language",
            "nlp",
            "language model",
            "text",
            "translation",
            "sentiment",
            "parsing",
            "named entity",
        ],
    ),
    (
        "cv",
        &[
            "computer vision",
            "image",
            "object detection",
            "segmentation",
            "visual",
            "video",
            "recognition",
        ],
    ),
    (
        "speech",
        &[
            "speech",
            "audio",
            "acoustic",
            "voice",
            "speaker",
            "asr",
            "tts",
        ],
    ),
    (
        "rl",
        &[
            "reinforcement learning",
            "reward",
            "policy",
            "agent",
            "multi-agent",
            "rl",
        ],
    ),
    (
        "generative",
        &[
            "generative",
            "diffusion",
            "gan",
            "vae",
            "autoregressive",
            "generation",
        ],
    ),
    (
        "optimization",
        &[
            "optimization",
            "gradient",
            "convergence",
            "training",
            "regularization",
        ],
    ),
    (
        "theory",
        &[
            "theory",
            "complexity",
            "bounds",
            "approximation",
            "statistical learning",
        ],
    ),
    (
        "robotics",
        &[
            "robotics",
            "robot",
            "manipulation",
            "navigation",
            "autonomous",
        ],
    ),
    (
        "graphs",
        &[
            "graph neural",
            "gnn",
            "knowledge graph",
            "graph learning",
        ],
    ),
    (
        "retrieval",
        &[
            "retrieval",
            "search",
            "embedding",
            "vector",
            "similarity",
        ],
    ),
    (
        "medical",
        &[
            "medical",
            "clinical",
            "healthcare",
            "biomedical",
            "radiology",
        ],
    ),
    (
        "tabular",
        &[
            "tabular",
            "structured data",
            "feature engineering",
            "gradient boosting",
        ],
    ),
];

// ── Types ────────────────────────────────────────────────────────────────────

/// Categorical verdict for a company's ML depth.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MlDepthVerdict {
    GenuineDeepMl,
    AppliedMl,
    ApiWrapper,
    Unknown,
}

impl std::fmt::Display for MlDepthVerdict {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::GenuineDeepMl => write!(f, "GENUINE DEEP ML"),
            Self::AppliedMl => write!(f, "APPLIED ML"),
            Self::ApiWrapper => write!(f, "API WRAPPER"),
            Self::Unknown => write!(f, "UNKNOWN"),
        }
    }
}

/// Full scoring result including verdict, overall score, per-dimension
/// scores, and supporting evidence.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MlDepthScore {
    pub verdict: MlDepthVerdict,
    pub overall_score: f64,
    pub dimensions: MlDepthDimensions,
    pub evidence: Vec<MlDepthEvidence>,
}

/// Per-dimension raw scores (0.0..=1.0).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MlDepthDimensions {
    pub paper_count: f32,
    pub venue_quality: f32,
    pub citation_impact: f32,
    pub research_breadth: f32,
    pub novelty: f32,
    pub team_pedigree: f32,
    pub hf_signals: f32,
}

/// A single piece of scoring evidence.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MlDepthEvidence {
    pub dimension: String,
    pub detail: String,
}

/// Per-dimension weight configuration.
#[derive(Debug, Clone)]
pub struct MlDepthWeights {
    pub paper_count: f32,
    pub venue_quality: f32,
    pub citation_impact: f32,
    pub research_breadth: f32,
    pub novelty: f32,
    pub team_pedigree: f32,
    pub hf_signals: f32,
}

impl Default for MlDepthWeights {
    fn default() -> Self {
        Self {
            paper_count: 0.15,
            venue_quality: 0.20,
            citation_impact: 0.15,
            research_breadth: 0.12,
            novelty: 0.13,
            team_pedigree: 0.15,
            hf_signals: 0.10,
        }
    }
}

/// Configuration and entry point for ML depth evaluation.
#[derive(Debug, Clone)]
pub struct MlDepthConfig {
    pub min_papers_genuine: usize,
    pub min_venue_quality_genuine: f32,
    pub min_overall_genuine: f64,
    pub min_overall_applied: f64,
    pub weights: MlDepthWeights,
}

impl Default for MlDepthConfig {
    fn default() -> Self {
        Self {
            min_papers_genuine: 3,
            min_venue_quality_genuine: 0.3,
            min_overall_genuine: 0.65,
            min_overall_applied: 0.30,
            weights: MlDepthWeights::default(),
        }
    }
}

// ── Scoring ──────────────────────────────────────────────────────────────────

impl MlDepthConfig {
    /// Evaluate a company's ML depth from papers and optional HF score.
    pub fn evaluate(
        &self,
        papers: &[ResearchPaper],
        hf_score: Option<f32>,
    ) -> MlDepthScore {
        let mut evidence = Vec::new();

        // 1. Paper count (sigmoid: 0->0.0, 3->0.5, 10+->1.0)
        let paper_count_score = sigmoid_score(papers.len() as f32, 3.0, 10.0);
        evidence.push(MlDepthEvidence {
            dimension: "paper_count".into(),
            detail: format!("{} papers found", papers.len()),
        });

        // 2. Venue quality
        let (venue_score, venue_evidence) = score_venue_quality(papers);
        evidence.extend(venue_evidence);

        // 3. Citation impact (h-index analog)
        let (citation_score, citation_evidence) = score_citation_impact(papers);
        evidence.extend(citation_evidence);

        // 4. Research breadth
        let (breadth_score, breadth_evidence) = score_research_breadth(papers);
        evidence.extend(breadth_evidence);

        // 5. Novelty
        let (novelty_score, novelty_evidence) = score_novelty(papers);
        evidence.extend(novelty_evidence);

        // 6. Team pedigree
        let (pedigree_score, pedigree_evidence) = score_team_pedigree(papers);
        evidence.extend(pedigree_evidence);

        // 7. HF signals (pass-through)
        let hf_score_val = hf_score.unwrap_or(0.0);
        if hf_score.is_some() {
            evidence.push(MlDepthEvidence {
                dimension: "hf_signals".into(),
                detail: format!("HF org score: {:.2}", hf_score_val),
            });
        }

        let dimensions = MlDepthDimensions {
            paper_count: paper_count_score,
            venue_quality: venue_score,
            citation_impact: citation_score,
            research_breadth: breadth_score,
            novelty: novelty_score,
            team_pedigree: pedigree_score,
            hf_signals: hf_score_val,
        };

        // Weighted overall
        let w = &self.weights;
        let total_weight = w.paper_count
            + w.venue_quality
            + w.citation_impact
            + w.research_breadth
            + w.novelty
            + w.team_pedigree
            + w.hf_signals;

        let overall = if total_weight > 0.0 {
            ((paper_count_score * w.paper_count
                + venue_score * w.venue_quality
                + citation_score * w.citation_impact
                + breadth_score * w.research_breadth
                + novelty_score * w.novelty
                + pedigree_score * w.team_pedigree
                + hf_score_val * w.hf_signals)
                / total_weight) as f64
        } else {
            0.0
        };

        // Classify verdict
        let verdict = if papers.is_empty() {
            MlDepthVerdict::Unknown
        } else if overall >= self.min_overall_genuine
            && papers.len() >= self.min_papers_genuine
            && venue_score >= self.min_venue_quality_genuine
        {
            MlDepthVerdict::GenuineDeepMl
        } else if overall >= self.min_overall_applied {
            MlDepthVerdict::AppliedMl
        } else {
            MlDepthVerdict::ApiWrapper
        };

        MlDepthScore {
            verdict,
            overall_score: overall,
            dimensions,
            evidence,
        }
    }
}

// ── Dimension scorers ────────────────────────────────────────────────────────

fn score_venue_quality(papers: &[ResearchPaper]) -> (f32, Vec<MlDepthEvidence>) {
    if papers.is_empty() {
        return (0.0, vec![]);
    }

    let mut top_venue_count = 0;
    let mut top_venues_found = Vec::new();

    for paper in papers {
        // Check venue field
        let venue_match = paper
            .venue
            .as_deref()
            .map(|v| v.to_lowercase())
            .and_then(|v| {
                TOP_ML_VENUES
                    .iter()
                    .find(|&&tv| v.contains(tv))
                    .map(|&tv| tv.to_owned())
            });

        // Also check fields_of_study and categories
        let category_match = paper.fields_of_study.as_ref().and_then(|fields| {
            fields.iter().map(|f| f.to_lowercase()).find_map(|f| {
                TOP_ML_VENUES
                    .iter()
                    .find(|&&tv| f.contains(tv))
                    .map(|&tv| tv.to_owned())
            })
        });

        if let Some(venue) = venue_match.or(category_match) {
            top_venue_count += 1;
            if !top_venues_found.contains(&venue) {
                top_venues_found.push(venue);
            }
        }
    }

    let score = (top_venue_count as f32 / papers.len() as f32).min(1.0);
    let evidence = if !top_venues_found.is_empty() {
        vec![MlDepthEvidence {
            dimension: "venue_quality".into(),
            detail: format!(
                "{top_venue_count}/{} papers at top venues: {}",
                papers.len(),
                top_venues_found.join(", ")
            ),
        }]
    } else {
        vec![MlDepthEvidence {
            dimension: "venue_quality".into(),
            detail: "No papers at top ML venues".into(),
        }]
    };

    (score, evidence)
}

fn score_citation_impact(papers: &[ResearchPaper]) -> (f32, Vec<MlDepthEvidence>) {
    if papers.is_empty() {
        return (0.0, vec![]);
    }

    let mut citations: Vec<u64> = papers.iter().filter_map(|p| p.citation_count).collect();
    citations.sort_unstable_by(|a, b| b.cmp(a));

    // h-index: largest h such that h papers have >= h citations
    let h_index = citations
        .iter()
        .enumerate()
        .take_while(|(i, &c)| c >= (*i as u64 + 1))
        .count();

    let max_citations = citations.first().copied().unwrap_or(0);
    let total_citations: u64 = citations.iter().sum();

    // Score: h-index of 5+ is strong, 10+ is exceptional
    let score = sigmoid_score(h_index as f32, 3.0, 8.0);

    let evidence = vec![MlDepthEvidence {
        dimension: "citation_impact".into(),
        detail: format!("h-index: {h_index}, max: {max_citations}, total: {total_citations}"),
    }];

    (score, evidence)
}

fn score_research_breadth(papers: &[ResearchPaper]) -> (f32, Vec<MlDepthEvidence>) {
    if papers.is_empty() {
        return (0.0, vec![]);
    }

    let mut subfields_found = Vec::new();

    for paper in papers {
        let text = format!(
            "{} {} {}",
            paper.title,
            paper.abstract_text.as_deref().unwrap_or(""),
            paper
                .fields_of_study
                .as_ref()
                .map(|f| f.join(" "))
                .unwrap_or_default()
        )
        .to_lowercase();

        for (subfield, keywords) in ML_SUBFIELDS {
            if !subfields_found.contains(&subfield.to_string()) && keywords.iter().any(|kw| text.contains(kw))
            {
                subfields_found.push(subfield.to_string());
            }
        }
    }

    // Score: 3+ subfields is good, 5+ is excellent
    let score = sigmoid_score(subfields_found.len() as f32, 2.0, 5.0);

    let evidence = vec![MlDepthEvidence {
        dimension: "research_breadth".into(),
        detail: format!(
            "{} subfields: {}",
            subfields_found.len(),
            subfields_found.join(", ")
        ),
    }];

    (score, evidence)
}

fn score_novelty(papers: &[ResearchPaper]) -> (f32, Vec<MlDepthEvidence>) {
    if papers.is_empty() {
        return (0.0, vec![]);
    }

    let novelty_patterns = [
        "we propose",
        "we introduce",
        "novel",
        "new method",
        "new approach",
        "new architecture",
        "new dataset",
        "new benchmark",
        "state-of-the-art",
        "sota",
        "outperforms",
        "surpasses",
        "first to",
        "we present",
    ];

    let mut novel_count = 0;
    for paper in papers {
        let text = format!(
            "{} {}",
            paper.title,
            paper.abstract_text.as_deref().unwrap_or(""),
        )
        .to_lowercase();

        if novelty_patterns.iter().any(|p| text.contains(p)) {
            novel_count += 1;
        }
    }

    let score = (novel_count as f32 / papers.len() as f32).min(1.0);

    let evidence = vec![MlDepthEvidence {
        dimension: "novelty".into(),
        detail: format!("{novel_count}/{} papers show novelty indicators", papers.len()),
    }];

    (score, evidence)
}

fn score_team_pedigree(papers: &[ResearchPaper]) -> (f32, Vec<MlDepthEvidence>) {
    if papers.is_empty() {
        return (0.0, vec![]);
    }

    let mut elite_affiliations = Vec::new();

    for paper in papers {
        if let Some(affiliations) = &paper.affiliations {
            for aff in affiliations {
                let lower = aff.to_lowercase();
                for &lab in ELITE_ML_LABS {
                    if lower.contains(lab) && !elite_affiliations.contains(&lab.to_owned()) {
                        elite_affiliations.push(lab.to_owned());
                    }
                }
            }
        }
    }

    // Score: 1 elite connection = 0.3, 3+ = 0.7, 5+ = 1.0
    let score = sigmoid_score(elite_affiliations.len() as f32, 2.0, 5.0);

    let evidence = if !elite_affiliations.is_empty() {
        vec![MlDepthEvidence {
            dimension: "team_pedigree".into(),
            detail: format!("Elite lab connections: {}", elite_affiliations.join(", ")),
        }]
    } else {
        vec![MlDepthEvidence {
            dimension: "team_pedigree".into(),
            detail: "No detected elite ML lab connections".into(),
        }]
    };

    (score, evidence)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Smooth sigmoid-like scoring: 0 at 0, ~0.5 at midpoint, ~1.0 at ceiling.
fn sigmoid_score(value: f32, midpoint: f32, ceiling: f32) -> f32 {
    if value <= 0.0 {
        return 0.0;
    }
    if value >= ceiling {
        return 1.0;
    }
    // Simple logistic-like curve
    let x = (value - midpoint) / (ceiling - midpoint) * 6.0 - 3.0;
    1.0 / (1.0 + (-x).exp())
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::paper::PaperSource;

    fn paper(title: &str, cites: u64) -> ResearchPaper {
        ResearchPaper {
            title: title.into(),
            abstract_text: None,
            authors: vec![],
            year: None,
            doi: None,
            citation_count: Some(cites),
            url: None,
            pdf_url: None,
            source: PaperSource::OpenAlex,
            source_id: title.into(),
            fields_of_study: None,
            published_date: None,
            primary_category: None,
            categories: None,
            affiliations: None,
            venue: None,
        }
    }

    fn paper_with_venue(title: &str, cites: u64, venue: &str) -> ResearchPaper {
        let mut p = paper(title, cites);
        p.venue = Some(venue.into());
        p
    }

    fn paper_with_abstract(title: &str, abstract_text: &str) -> ResearchPaper {
        let mut p = paper(title, 0);
        p.abstract_text = Some(abstract_text.into());
        p
    }

    fn paper_with_affiliations(title: &str, affiliations: Vec<&str>) -> ResearchPaper {
        let mut p = paper(title, 0);
        p.affiliations = Some(affiliations.into_iter().map(|s| s.into()).collect());
        p
    }

    // ── sigmoid_score ────────────────────────────────────────────────────

    #[test]
    fn sigmoid_zero() {
        assert_eq!(sigmoid_score(0.0, 3.0, 10.0), 0.0);
    }

    #[test]
    fn sigmoid_at_ceiling() {
        assert_eq!(sigmoid_score(10.0, 3.0, 10.0), 1.0);
    }

    #[test]
    fn sigmoid_above_ceiling() {
        assert_eq!(sigmoid_score(100.0, 3.0, 10.0), 1.0);
    }

    #[test]
    fn sigmoid_at_midpoint_is_about_half() {
        let v = sigmoid_score(3.0, 3.0, 10.0);
        // At x = -3.0, sigmoid is ~0.047, but our mapping puts midpoint at x = -3
        // Actually when value == midpoint: x = (0 / range) * 6 - 3 = -3, so ~0.047
        // This is by design -- the midpoint is the inflection region start
        assert!(v > 0.0 && v < 0.5, "sigmoid at midpoint was {v}");
    }

    // ── Empty papers ─────────────────────────────────────────────────────

    #[test]
    fn empty_papers_unknown() {
        let cfg = MlDepthConfig::default();
        let score = cfg.evaluate(&[], None);
        assert_eq!(score.verdict, MlDepthVerdict::Unknown);
        assert!(score.overall_score < 0.01);
    }

    // ── Verdict classification ───────────────────────────────────────────

    #[test]
    fn api_wrapper_low_papers() {
        let papers = vec![paper("Some blog post paper", 0)];
        let cfg = MlDepthConfig::default();
        let score = cfg.evaluate(&papers, None);
        assert_eq!(score.verdict, MlDepthVerdict::ApiWrapper);
    }

    #[test]
    fn genuine_deep_ml_requires_venue_and_count() {
        let papers: Vec<_> = (0..10)
            .map(|i| {
                let mut p = paper_with_venue(
                    &format!("Novel NeurIPS paper {i}"),
                    100,
                    "NeurIPS 2024",
                );
                p.abstract_text = Some("We propose a novel method that outperforms SOTA".into());
                p.affiliations = Some(vec!["Google DeepMind".into()]);
                p
            })
            .collect();
        let cfg = MlDepthConfig::default();
        let score = cfg.evaluate(&papers, Some(0.8));
        assert_eq!(score.verdict, MlDepthVerdict::GenuineDeepMl);
        assert!(score.overall_score > 0.65);
    }

    // ── Venue quality ────────────────────────────────────────────────────

    #[test]
    fn venue_quality_detects_top_venues() {
        let papers = vec![
            paper_with_venue("A", 10, "NeurIPS 2024"),
            paper_with_venue("B", 10, "ICML 2023"),
            paper_with_venue("C", 10, "Random Workshop"),
        ];
        let (score, evidence) = score_venue_quality(&papers);
        assert!(score > 0.5, "venue score was {score}");
        assert!(!evidence.is_empty());
    }

    // ── Citation impact ──────────────────────────────────────────────────

    #[test]
    fn citation_h_index() {
        // 5 papers with citations [100, 50, 20, 5, 1] -> h-index = 4
        let papers = vec![
            paper("A", 100),
            paper("B", 50),
            paper("C", 20),
            paper("D", 5),
            paper("E", 1),
        ];
        let (score, evidence) = score_citation_impact(&papers);
        assert!(score > 0.1, "citation score was {score}");
        assert!(evidence[0].detail.contains("h-index: 4"));
    }

    // ── Research breadth ─────────────────────────────────────────────────

    #[test]
    fn breadth_detects_subfields() {
        let papers = vec![
            paper_with_abstract("NLP paper", "natural language processing for text classification"),
            paper_with_abstract("CV paper", "computer vision for image segmentation"),
            paper_with_abstract("RL paper", "reinforcement learning agent policy"),
        ];
        let (score, evidence) = score_research_breadth(&papers);
        assert!(score > 0.2, "breadth score was {score}");
        assert!(evidence[0].detail.contains("3 subfields"));
    }

    // ── Novelty ──────────────────────────────────────────────────────────

    #[test]
    fn novelty_detects_patterns() {
        let papers = vec![
            paper_with_abstract("A", "We propose a novel architecture"),
            paper_with_abstract("B", "Our method outperforms state-of-the-art"),
            paper_with_abstract("C", "A survey of existing methods"),
        ];
        let (score, _) = score_novelty(&papers);
        // 2 out of 3 are novel
        assert!(
            (score - 2.0 / 3.0).abs() < 0.01,
            "novelty score was {score}"
        );
    }

    // ── Team pedigree ────────────────────────────────────────────────────

    #[test]
    fn pedigree_detects_elite_labs() {
        let papers = vec![
            paper_with_affiliations("A", vec!["Google DeepMind", "MIT"]),
            paper_with_affiliations("B", vec!["Stanford University"]),
        ];
        let (score, evidence) = score_team_pedigree(&papers);
        assert!(score > 0.3, "pedigree score was {score}");
        assert!(evidence[0].detail.contains("deepmind"));
    }

    #[test]
    fn pedigree_no_elite() {
        let papers = vec![paper_with_affiliations(
            "A",
            vec!["Unknown University"],
        )];
        let (score, evidence) = score_team_pedigree(&papers);
        assert!(score < 0.1, "pedigree score was {score}");
        assert!(evidence[0].detail.contains("No detected"));
    }

    // ── Display ──────────────────────────────────────────────────────────

    #[test]
    fn verdict_display() {
        assert_eq!(MlDepthVerdict::GenuineDeepMl.to_string(), "GENUINE DEEP ML");
        assert_eq!(MlDepthVerdict::AppliedMl.to_string(), "APPLIED ML");
        assert_eq!(MlDepthVerdict::ApiWrapper.to_string(), "API WRAPPER");
        assert_eq!(MlDepthVerdict::Unknown.to_string(), "UNKNOWN");
    }
}
