//! Evaluation framework for measuring finding quality against ground truth.
//!
//! Pure, synchronous functions — no LLM dependency. Computes precision, recall,
//! F1, and hallucination rate by keyword-matching findings to ground truths.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

/// A known truth that findings should detect.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroundTruth {
    pub id: String,
    pub description: String,
    pub keywords: Vec<String>,
    #[serde(default)]
    pub severity: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
}

/// A single finding produced by a pipeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    pub id: String,
    pub description: String,
    #[serde(default)]
    pub evidence: Vec<String>,
    #[serde(default = "default_confidence")]
    pub confidence: f64,
    #[serde(default)]
    pub finding_type: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
}

fn default_confidence() -> f64 {
    1.0
}

/// Configuration for evaluation.
#[derive(Debug, Clone)]
pub struct EvalConfig {
    pub ground_truths: Vec<GroundTruth>,
    /// Minimum keyword matches required to consider a finding matched.
    pub match_threshold: usize,
    /// Severity weights for weighted F1 calculation. Keys are severity names
    /// (matching `GroundTruth.severity`), values are multipliers.
    pub severity_weights: HashMap<String, f64>,
    /// Whether to compute per-category breakdown.
    pub category_breakdown: bool,
}

impl EvalConfig {
    pub fn new(ground_truths: Vec<GroundTruth>) -> Self {
        Self {
            ground_truths,
            match_threshold: 2,
            severity_weights: HashMap::new(),
            category_breakdown: false,
        }
    }

    pub fn with_threshold(mut self, threshold: usize) -> Self {
        self.match_threshold = threshold;
        self
    }

    pub fn with_severity_weight(mut self, severity: &str, weight: f64) -> Self {
        self.severity_weights.insert(severity.to_string(), weight);
        self
    }

    pub fn with_category_breakdown(mut self) -> Self {
        self.category_breakdown = true;
        self
    }
}

/// Per-category evaluation metrics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryMetrics {
    pub category: String,
    pub true_positives: usize,
    pub false_negatives: usize,
    pub recall: f64,
    pub count: usize,
}

/// Evaluation metrics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvalMetrics {
    pub true_positives: usize,
    pub false_positives: usize,
    pub false_negatives: usize,
    pub precision: f64,
    pub recall: f64,
    pub f1_score: f64,
    pub hallucination_rate: f64,
    pub matched_ids: Vec<String>,
    pub missed_ids: Vec<String>,
    /// Weighted F1 using severity weights on recall. Only set when severity_weights
    /// are configured.
    #[serde(default)]
    pub weighted_f1: Option<f64>,
    /// Per-category breakdown. Only populated when `category_breakdown` is enabled.
    #[serde(default)]
    pub categories: Vec<CategoryMetrics>,
    /// Mean confidence of findings that matched a ground truth.
    #[serde(default)]
    pub mean_confidence: Option<f64>,
}

/// Check whether a finding matches a ground truth by counting keyword hits
/// in the finding's combined text (description + evidence).
pub fn finding_matches(finding: &Finding, ground_truth: &GroundTruth, threshold: usize) -> bool {
    let combined = {
        let mut parts = vec![finding.description.to_lowercase()];
        for e in &finding.evidence {
            parts.push(e.to_lowercase());
        }
        parts.join(" ")
    };

    let count = ground_truth
        .keywords
        .iter()
        .filter(|kw| combined.contains(&kw.to_lowercase()))
        .count();

    count >= threshold
}

/// Evaluate findings against ground truths. Returns precision, recall, F1,
/// hallucination rate, and lists of matched/missed ground truth IDs.
pub fn evaluate(findings: &[Finding], config: &EvalConfig) -> EvalMetrics {
    let mut matched_ids: Vec<String> = Vec::new();

    // For each ground truth, check if any finding matches it
    for gt in &config.ground_truths {
        let matched = findings
            .iter()
            .any(|f| finding_matches(f, gt, config.match_threshold));
        if matched {
            matched_ids.push(gt.id.clone());
        }
    }

    let missed_ids: Vec<String> = config
        .ground_truths
        .iter()
        .filter(|gt| !matched_ids.contains(&gt.id))
        .map(|gt| gt.id.clone())
        .collect();

    let tp = matched_ids.len();
    let fn_count = missed_ids.len();

    // Count findings that didn't match any ground truth
    let fp = findings
        .iter()
        .filter(|f| {
            !config
                .ground_truths
                .iter()
                .any(|gt| finding_matches(f, gt, config.match_threshold))
        })
        .count();

    let precision = if tp + fp > 0 {
        tp as f64 / (tp + fp) as f64
    } else {
        0.0
    };

    let recall = if tp + fn_count > 0 {
        tp as f64 / (tp + fn_count) as f64
    } else {
        0.0
    };

    let f1_score = if precision + recall > 0.0 {
        2.0 * precision * recall / (precision + recall)
    } else {
        0.0
    };

    let hallucination_rate = if !findings.is_empty() {
        fp as f64 / findings.len() as f64
    } else {
        0.0
    };

    // Weighted F1: use severity weights on recall per ground truth
    let weighted_f1 = if !config.severity_weights.is_empty() && !config.ground_truths.is_empty() {
        let mut weighted_hits = 0.0;
        let mut total_weight = 0.0;
        for gt in &config.ground_truths {
            let weight = gt
                .severity
                .as_ref()
                .and_then(|s| config.severity_weights.get(s))
                .copied()
                .unwrap_or(1.0);
            total_weight += weight;
            if matched_ids.contains(&gt.id) {
                weighted_hits += weight;
            }
        }
        let weighted_recall = if total_weight > 0.0 {
            weighted_hits / total_weight
        } else {
            0.0
        };
        let wf1 = if precision + weighted_recall > 0.0 {
            2.0 * precision * weighted_recall / (precision + weighted_recall)
        } else {
            0.0
        };
        Some(wf1)
    } else {
        None
    };

    // Category breakdown
    let categories = if config.category_breakdown {
        let mut cat_map: HashMap<String, (usize, usize)> = HashMap::new(); // (tp, total)
        for gt in &config.ground_truths {
            let cat = gt.category.clone().unwrap_or_else(|| "uncategorized".to_string());
            let entry = cat_map.entry(cat).or_insert((0, 0));
            entry.1 += 1;
            if matched_ids.contains(&gt.id) {
                entry.0 += 1;
            }
        }
        let mut cats: Vec<CategoryMetrics> = cat_map
            .into_iter()
            .map(|(category, (cat_tp, count))| {
                let cat_fn = count - cat_tp;
                let cat_recall = if count > 0 {
                    cat_tp as f64 / count as f64
                } else {
                    0.0
                };
                CategoryMetrics {
                    category,
                    true_positives: cat_tp,
                    false_negatives: cat_fn,
                    recall: cat_recall,
                    count,
                }
            })
            .collect();
        cats.sort_by(|a, b| a.category.cmp(&b.category));
        cats
    } else {
        Vec::new()
    };

    // Mean confidence of matched findings
    let mean_confidence = {
        let matched_confidences: Vec<f64> = findings
            .iter()
            .filter(|f| {
                config
                    .ground_truths
                    .iter()
                    .any(|gt| finding_matches(f, gt, config.match_threshold))
            })
            .map(|f| f.confidence)
            .collect();
        if matched_confidences.is_empty() {
            None
        } else {
            let sum: f64 = matched_confidences.iter().sum();
            Some(sum / matched_confidences.len() as f64)
        }
    };

    EvalMetrics {
        true_positives: tp,
        false_positives: fp,
        false_negatives: fn_count,
        precision,
        recall,
        f1_score,
        hallucination_rate,
        matched_ids,
        missed_ids,
        weighted_f1,
        categories,
        mean_confidence,
    }
}
