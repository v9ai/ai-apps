//! Evaluation framework for measuring finding quality against ground truth.
//!
//! Pure, synchronous functions — no LLM dependency. Computes precision, recall,
//! F1, and hallucination rate by keyword-matching findings to ground truths.

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
}

impl EvalConfig {
    pub fn new(ground_truths: Vec<GroundTruth>) -> Self {
        Self {
            ground_truths,
            match_threshold: 2,
        }
    }

    pub fn with_threshold(mut self, threshold: usize) -> Self {
        self.match_threshold = threshold;
        self
    }
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
    }
}
