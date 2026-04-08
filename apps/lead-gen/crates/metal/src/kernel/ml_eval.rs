//! ML evaluation harness for the contact-scoring pipeline.
//!
//! Reads labeled samples from a JSONL file (`eval_labels.jsonl`), computes
//! binary classification metrics against a [`LogisticScorer`], and writes
//! a structured [`EvalReport`] as pretty-printed JSON.
//!
//! Feature order (must match `LogisticScorer::extract_features`):
//! `[industry_match, employee_in_range, seniority_match, department_match,
//!   tech_norm, email_norm, recency_smooth,
//!   hf_score, hf_model_depth, hf_training_depth, hf_maturity,
//!   hf_research, hf_sales_relevance]`
//!
//! Enabled with the `kernel-eval` Cargo feature.

use std::io::{BufRead, BufReader};
use std::path::Path;

use anyhow::Result;
use serde::{Deserialize, Serialize};

use super::scoring::{LogisticScorer, FEATURE_COUNT};

// ── Data types ────────────────────────────────────────────────────────────────

/// A single labeled sample loaded from the JSONL evaluation file.
///
/// Each JSONL line must be a JSON object of this shape:
/// ```json
/// {"features": [1.0, 1.0, 1.0, 1.0, 0.8, 1.0, 0.9, 0.7, 0.5, 0.6, 0.8, 1.0, 0.3], "label": 1.0}
/// ```
///
/// `features` maps to the FEATURE_COUNT-element vector produced by
/// `LogisticScorer::extract_features`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabeledSample {
    /// FEATURE_COUNT-element feature vector.
    pub features: [f32; FEATURE_COUNT],
    /// Ground-truth label: `1.0` = positive lead, `0.0` = negative.
    pub label: f32,
}

impl LabeledSample {
    /// Construct a sample directly from a feature vector and label.
    pub fn new(features: [f32; FEATURE_COUNT], label: f32) -> Self {
        Self { features, label }
    }

    /// Convenience constructor for a positive-class sample (label = 1.0).
    pub fn positive(features: [f32; FEATURE_COUNT]) -> Self {
        Self::new(features, 1.0)
    }

    /// Convenience constructor for a negative-class sample (label = 0.0).
    pub fn negative(features: [f32; FEATURE_COUNT]) -> Self {
        Self::new(features, 0.0)
    }
}

/// Binary classification metrics for the contact scorer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringEval {
    /// (TP + TN) / N
    pub accuracy: f32,
    /// TP / (TP + FP); `0.0` when denominator is zero.
    pub precision: f32,
    /// TP / (TP + FN); `0.0` when denominator is zero.
    pub recall: f32,
    /// Harmonic mean of precision and recall; `0.0` when both are zero.
    pub f1: f32,
    /// Area under the ROC curve via the trapezoid rule.
    pub auc_roc: f32,
    /// Normalized discounted cumulative gain at k = 10.
    pub ndcg_at_10: f32,
    /// Total number of samples evaluated.
    pub sample_count: usize,
    /// Number of positive-class samples.
    pub positive_count: usize,
    /// Decision threshold used to binarize probabilities.
    pub threshold: f32,
    /// Learned weight vector copied from the scorer.
    pub weights: Vec<f32>,
    /// Learned bias term copied from the scorer.
    pub bias: f32,
}

/// Named-entity recognition quality proxy metrics.
///
/// Populated with placeholder values at present; reserved for a future NER
/// eval pass that walks extracted job descriptions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NerEval {
    /// Fraction of samples where at least one skill keyword was extracted.
    pub extraction_rate: f32,
    /// Total number of distinct keywords matched across all samples.
    pub keyword_count: usize,
}

/// Top-level evaluation report combining scoring and NER metrics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvalReport {
    /// Binary classification metrics for the logistic scorer.
    pub scoring: ScoringEval,
    /// NER extraction quality metrics.
    pub ner: NerEval,
    /// Training/eval iteration index (monotonically increasing).
    pub iteration: u32,
    /// RFC 3339 timestamp of when this report was generated.
    pub timestamp: String,
}

// ── I/O helpers ───────────────────────────────────────────────────────────────

/// Load labeled samples from a JSONL file.
///
/// Each non-empty line must be a JSON object matching [`LabeledSample`].
/// Lines that fail to parse are skipped with a `tracing::warn!` log so that a
/// single bad line does not abort the entire eval run.
///
/// # Errors
/// Returns an error if the file cannot be opened or if a line-level I/O error
/// occurs.
pub fn load_labels(path: &Path) -> Result<Vec<LabeledSample>> {
    let file = std::fs::File::open(path)
        .map_err(|e| anyhow::anyhow!("cannot open labels file {}: {}", path.display(), e))?;

    let reader = BufReader::new(file);
    let mut samples = Vec::new();

    for (line_no, line) in reader.lines().enumerate() {
        let raw =
            line.map_err(|e| anyhow::anyhow!("I/O error at line {}: {}", line_no + 1, e))?;
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            continue;
        }
        match serde_json::from_str::<LabeledSample>(trimmed) {
            Ok(sample) => samples.push(sample),
            Err(e) => {
                tracing::warn!(line = line_no + 1, error = %e, "skipping malformed label line");
            }
        }
    }

    Ok(samples)
}

// ── Metric computation ────────────────────────────────────────────────────────

/// Compute AUC-ROC via the trapezoid rule.
///
/// `predictions` is a slice of `(predicted_score, ground_truth_label)` pairs.
/// The function sorts by score descending, walks the ROC curve one sample at a
/// time, and accumulates trapezoid areas.
///
/// Returns `0.5` for degenerate inputs (empty slice, or all one class).
fn compute_auc_roc(predictions: &[(f32, f32)]) -> f32 {
    if predictions.is_empty() {
        return 0.5;
    }

    let total_pos: f32 = predictions.iter().map(|(_, l)| *l).sum();
    let total_neg = predictions.len() as f32 - total_pos;

    if total_pos == 0.0 || total_neg == 0.0 {
        return 0.5;
    }

    // Sort by predicted score descending (highest confidence first).
    let mut sorted = predictions.to_vec();
    sorted.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    let mut auc = 0.0_f32;
    let mut tpr_prev = 0.0_f32;
    let mut fpr_prev = 0.0_f32;
    let mut tp = 0.0_f32;
    let mut fp = 0.0_f32;

    for &(_, label) in &sorted {
        if label >= 0.5 {
            tp += 1.0;
        } else {
            fp += 1.0;
        }

        let tpr = tp / total_pos;
        let fpr = fp / total_neg;

        // Trapezoid area: base = delta FPR, height = average of adjacent TPRs.
        auc += (fpr - fpr_prev) * (tpr + tpr_prev) / 2.0;

        tpr_prev = tpr;
        fpr_prev = fpr;
    }

    auc
}

/// Compute NDCG@k for ranking quality.
///
/// `predictions` is a slice of `(predicted_score, ground_truth_label)` pairs.
/// Predictions are ranked by score descending; the ideal ranking orders by
/// label descending.
///
/// NDCG = DCG / iDCG where DCG = Σ label_i / log₂(i+2) for i in 0..k.
///
/// Returns `1.0` when `k == 0`, the slice is empty, or iDCG is zero.
fn compute_ndcg(predictions: &[(f32, f32)], k: usize) -> f32 {
    if k == 0 || predictions.is_empty() {
        return 1.0;
    }

    // Rank by predicted score descending.
    let mut by_score = predictions.to_vec();
    by_score.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    // Ideal rank: by label descending.
    let mut by_label = predictions.to_vec();
    by_label.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    let dcg: f32 = by_score
        .iter()
        .take(k)
        .enumerate()
        .map(|(i, (_, label))| label / (i as f32 + 2.0).log2())
        .sum();

    let idcg: f32 = by_label
        .iter()
        .take(k)
        .enumerate()
        .map(|(i, (_, label))| label / (i as f32 + 2.0).log2())
        .sum();

    if idcg == 0.0 {
        return 1.0;
    }

    dcg / idcg
}

/// Evaluate a [`LogisticScorer`] against labeled data at the given threshold.
///
/// 1. Scores each sample with `scorer.score(&sample.features)`.
/// 2. Applies `threshold` to produce a binary prediction.
/// 3. Accumulates TP / FP / TN / FN counts.
/// 4. Derives accuracy, precision, recall, F1, AUC-ROC, and NDCG@10.
///
/// Returns a zeroed [`ScoringEval`] when `samples` is empty.
pub fn evaluate_scoring(
    scorer: &LogisticScorer,
    samples: &[LabeledSample],
    threshold: f32,
) -> ScoringEval {
    let n = samples.len();
    if n == 0 {
        return ScoringEval {
            accuracy: 0.0,
            precision: 0.0,
            recall: 0.0,
            f1: 0.0,
            auc_roc: 0.5,
            ndcg_at_10: 1.0,
            sample_count: 0,
            positive_count: 0,
            threshold,
            weights: scorer.weights.clone(),
            bias: scorer.bias,
        };
    }

    let mut tp = 0_u32;
    let mut fp = 0_u32;
    let mut tn = 0_u32;
    let mut fn_ = 0_u32;
    let mut positive_count = 0_usize;
    let mut predictions: Vec<(f32, f32)> = Vec::with_capacity(n);

    for sample in samples {
        let score = scorer.score(&sample.features);
        let predicted_pos = score >= threshold;
        let actual_pos = sample.label >= 0.5;

        predictions.push((score, sample.label));

        if actual_pos {
            positive_count += 1;
        }

        match (predicted_pos, actual_pos) {
            (true, true) => tp += 1,
            (true, false) => fp += 1,
            (false, true) => fn_ += 1,
            (false, false) => tn += 1,
        }
    }

    let n_f = n as f32;
    let accuracy = (tp + tn) as f32 / n_f;

    let precision = if tp + fp == 0 {
        0.0
    } else {
        tp as f32 / (tp + fp) as f32
    };

    let recall = if tp + fn_ == 0 {
        0.0
    } else {
        tp as f32 / (tp + fn_) as f32
    };

    let f1 = if precision + recall == 0.0 {
        0.0
    } else {
        2.0 * precision * recall / (precision + recall)
    };

    let auc_roc = compute_auc_roc(&predictions);
    let ndcg_at_10 = compute_ndcg(&predictions, 10);

    ScoringEval {
        accuracy,
        precision,
        recall,
        f1,
        auc_roc,
        ndcg_at_10,
        sample_count: n,
        positive_count,
        threshold,
        weights: scorer.weights.clone(),
        bias: scorer.bias,
    }
}

/// Compute the F1 score from parallel slices of predicted and actual labels.
///
/// Both slices must have the same length.  Returns `0.0` when precision and
/// recall are both zero (no positive predictions or no positive ground truth).
///
/// This function is re-exported for use by the `weight_optimizer` module.
pub fn compute_f1(predicted: &[bool], actual: &[bool]) -> f32 {
    assert_eq!(predicted.len(), actual.len(), "predicted and actual must have equal length");
    let mut tp = 0_u32;
    let mut fp = 0_u32;
    let mut fn_ = 0_u32;
    for (&p, &a) in predicted.iter().zip(actual.iter()) {
        match (p, a) {
            (true, true) => tp += 1,
            (true, false) => fp += 1,
            (false, true) => fn_ += 1,
            _ => {}
        }
    }
    let precision = if tp + fp == 0 {
        0.0
    } else {
        tp as f32 / (tp + fp) as f32
    };
    let recall = if tp + fn_ == 0 {
        0.0
    } else {
        tp as f32 / (tp + fn_) as f32
    };
    if precision + recall == 0.0 {
        0.0
    } else {
        2.0 * precision * recall / (precision + recall)
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────

/// Run a full evaluation cycle and write the report to `report_path`.
///
/// Steps:
/// 1. Load labeled samples from `labels_path` via [`load_labels`].
/// 2. Evaluate the scorer at threshold `0.5` via [`evaluate_scoring`].
/// 3. Construct a placeholder [`NerEval`] (reserved for future NER pass).
/// 4. Stamp the current UTC time as an RFC 3339 string.
/// 5. Serialize the [`EvalReport`] as pretty-printed JSON and write to
///    `report_path`, creating parent directories as needed.
///
/// # Errors
/// Returns an error if label loading, JSON serialization, or file I/O fails.
pub fn run_eval(
    scorer: &LogisticScorer,
    labels_path: &Path,
    report_path: &Path,
    iteration: u32,
) -> Result<EvalReport> {
    let samples = load_labels(labels_path)?;

    tracing::info!(
        path = %labels_path.display(),
        count = samples.len(),
        "loaded labeled samples for eval"
    );

    let scoring = evaluate_scoring(scorer, &samples, 0.5);

    let ner = NerEval {
        extraction_rate: 0.0,
        keyword_count: 0,
    };

    let timestamp = chrono::Utc::now().to_rfc3339();

    let report = EvalReport {
        scoring,
        ner,
        iteration,
        timestamp,
    };

    if let Some(parent) = report_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let json = serde_json::to_string_pretty(&report)?;
    std::fs::write(report_path, &json)?;

    tracing::info!(
        path = %report_path.display(),
        f1 = report.scoring.f1,
        auc = report.scoring.auc_roc,
        ndcg = report.scoring.ndcg_at_10,
        "eval report written"
    );

    Ok(report)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // Helper: build a scorer whose decision boundary cleanly separates
    // all-ones features (positive) from all-zeros features (negative).
    // dot([1..1], weights) + bias = 13*3.0 + (-19.5) = 19.5 → sigmoid ≈ 1.0
    // dot([0..0], weights) + bias = 0.0 + (-19.5) = -19.5 → sigmoid ≈ 0.0
    fn perfect_scorer() -> LogisticScorer {
        LogisticScorer {
            weights: vec![3.0; FEATURE_COUNT],
            bias: -(FEATURE_COUNT as f32 * 3.0 / 2.0),
            feature_stats: (0..FEATURE_COUNT)
                .map(|_| super::super::scoring::WelfordStats::new())
                .collect(),
            trained: true,
            semantic_weight: 0.0,
        }
    }

    fn binary_samples(n: usize) -> Vec<LabeledSample> {
        (0..n)
            .map(|i| {
                let pos = i % 2 == 0;
                LabeledSample {
                    features: if pos {
                        [1.0; FEATURE_COUNT]
                    } else {
                        [0.0; FEATURE_COUNT]
                    },
                    label: if pos { 1.0 } else { 0.0 },
                }
            })
            .collect()
    }

    // ── perfect classifier ────────────────────────────────────────────────────

    #[test]
    fn test_perfect_classifier() {
        let scorer = perfect_scorer();
        let samples = binary_samples(20);
        let eval = evaluate_scoring(&scorer, &samples, 0.5);

        assert_eq!(eval.sample_count, 20);
        assert_eq!(eval.positive_count, 10);
        assert!(
            (eval.f1 - 1.0).abs() < 1e-4,
            "expected F1 = 1.0, got {:.6}",
            eval.f1
        );
        assert!(
            (eval.accuracy - 1.0).abs() < 1e-4,
            "expected accuracy = 1.0, got {:.6}",
            eval.accuracy
        );
        assert!(
            (eval.precision - 1.0).abs() < 1e-4,
            "expected precision = 1.0, got {:.6}",
            eval.precision
        );
        assert!(
            (eval.recall - 1.0).abs() < 1e-4,
            "expected recall = 1.0, got {:.6}",
            eval.recall
        );
    }

    // ── random / chance classifier ────────────────────────────────────────────

    // A zero-weight scorer always emits sigmoid(0) = 0.5.  At threshold 0.5
    // every sample is predicted positive, giving precision ≈ 0.5, recall = 1.0,
    // F1 ≈ 0.667.  Accept any value in [0.3, 0.8] as "chance level".
    #[test]
    fn test_random_classifier() {
        let scorer = LogisticScorer {
            weights: vec![0.0; FEATURE_COUNT],
            bias: 0.0,
            feature_stats: (0..FEATURE_COUNT)
                .map(|_| super::super::scoring::WelfordStats::new())
                .collect(),
            trained: true,
            semantic_weight: 0.0,
        };
        let samples = binary_samples(20);
        let eval = evaluate_scoring(&scorer, &samples, 0.5);

        assert!(
            eval.f1 >= 0.3 && eval.f1 <= 0.8,
            "expected F1 in [0.3, 0.8] for zero-weight scorer, got {:.6}",
            eval.f1
        );
    }

    // ── AUC-ROC ───────────────────────────────────────────────────────────────

    // All positives rank above all negatives → AUC = 1.0.
    #[test]
    fn test_auc_perfect() {
        let predictions = vec![
            (0.95, 1.0),
            (0.85, 1.0),
            (0.75, 1.0),
            (0.30, 0.0),
            (0.20, 0.0),
            (0.10, 0.0),
        ];
        let auc = compute_auc_roc(&predictions);
        assert!(
            (auc - 1.0).abs() < 1e-5,
            "expected AUC = 1.0, got {:.6}",
            auc
        );
    }

    // All negatives rank above all positives → AUC ≈ 0.0.
    #[test]
    fn test_auc_worst() {
        let predictions = vec![
            (0.95, 0.0),
            (0.85, 0.0),
            (0.75, 0.0),
            (0.30, 1.0),
            (0.20, 1.0),
            (0.10, 1.0),
        ];
        let auc = compute_auc_roc(&predictions);
        assert!(auc < 0.05, "expected AUC ≈ 0.0, got {:.6}", auc);
    }

    // Degenerate: all same class → returns 0.5.
    #[test]
    fn test_auc_all_same_class() {
        let predictions = vec![(0.9, 1.0), (0.8, 1.0), (0.7, 1.0)];
        let auc = compute_auc_roc(&predictions);
        assert!((auc - 0.5).abs() < 1e-5);
    }

    // ── NDCG ─────────────────────────────────────────────────────────────────

    // Top-k are all positive → NDCG@k = 1.0.
    #[test]
    fn test_ndcg_perfect() {
        let predictions = vec![
            (0.95, 1.0),
            (0.90, 1.0),
            (0.85, 1.0),
            (0.40, 0.0),
            (0.30, 0.0),
        ];
        let ndcg = compute_ndcg(&predictions, 3);
        assert!(
            (ndcg - 1.0).abs() < 1e-5,
            "expected NDCG@3 = 1.0, got {:.6}",
            ndcg
        );
    }

    // k larger than the number of samples still returns a value in [0, 1].
    #[test]
    fn test_ndcg_k_larger_than_n() {
        let predictions = vec![(0.8, 1.0), (0.6, 0.0), (0.4, 1.0), (0.2, 0.0)];
        let ndcg = compute_ndcg(&predictions, 10);
        assert!(ndcg >= 0.0 && ndcg <= 1.0, "NDCG out of [0,1]: {:.6}", ndcg);
    }

    // All-negative labels → iDCG = 0 → returns 1.0 (defined as perfect).
    #[test]
    fn test_ndcg_no_positives() {
        let predictions = vec![(0.9, 0.0), (0.8, 0.0), (0.7, 0.0)];
        let ndcg = compute_ndcg(&predictions, 3);
        assert!((ndcg - 1.0).abs() < 1e-5);
    }

    // ── load_labels ───────────────────────────────────────────────────────────

    // Well-formed JSONL with a blank line in the middle.
    #[test]
    fn test_load_labels() {
        use std::io::Write;

        let jsonl = concat!(
            r#"{"features":[1.0,1.0,1.0,1.0,0.8,1.0,0.9,0.7,0.5,0.6,0.8,1.0,0.3],"label":1.0}"#,
            "\n",
            "\n",
            r#"{"features":[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],"label":0.0}"#,
            "\n",
        );

        let mut tmp = tempfile::NamedTempFile::new().expect("tempfile");
        tmp.write_all(jsonl.as_bytes()).expect("write");

        let samples = load_labels(tmp.path()).expect("load_labels");
        assert_eq!(samples.len(), 2);
        assert!((samples[0].features[0] - 1.0).abs() < 1e-6);
        assert!((samples[0].label - 1.0).abs() < 1e-6);
        assert!((samples[1].features[0] - 0.0).abs() < 1e-6);
        assert!((samples[1].label - 0.0).abs() < 1e-6);
    }

    // A malformed line must be skipped; subsequent valid lines are preserved.
    #[test]
    fn test_load_labels_skips_bad_lines() {
        use std::io::Write;

        let jsonl = concat!(
            r#"{"features":[1.0,1.0,1.0,1.0,0.8,1.0,0.9,0.7,0.5,0.6,0.8,1.0,0.3],"label":1.0}"#,
            "\n",
            "not valid json\n",
            r#"{"features":[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],"label":0.0}"#,
            "\n",
        );

        let mut tmp = tempfile::NamedTempFile::new().expect("tempfile");
        tmp.write_all(jsonl.as_bytes()).expect("write");

        let samples = load_labels(tmp.path()).expect("load_labels");
        assert_eq!(samples.len(), 2, "bad line must be skipped, not abort");
    }

    // Missing file returns an error, not a panic.
    #[test]
    fn test_load_labels_missing_file() {
        let result = load_labels(Path::new("/does/not/exist/eval_labels.jsonl"));
        assert!(result.is_err());
    }

    // ── run_eval integration ──────────────────────────────────────────────────

    // End-to-end: write a JSONL file, run eval, verify the report on disk.
    #[test]
    fn test_run_eval_writes_report() {
        use std::io::Write;

        let scorer = perfect_scorer();

        let jsonl: String = (0..10)
            .map(|i| {
                let pos = i % 2 == 0;
                let feat = if pos {
                    "[1.0,1.0,1.0,1.0,1.0,1.0,1.0]"
                } else {
                    "[0.0,0.0,0.0,0.0,0.0,0.0,0.0]"
                };
                let label = if pos { "1.0" } else { "0.0" };
                format!(r#"{{"features":{},"label":{}}}"#, feat, label)
            })
            .collect::<Vec<_>>()
            .join("\n");

        let dir = tempfile::tempdir().expect("tempdir");
        let labels_path = dir.path().join("eval_labels.jsonl");
        let report_path = dir.path().join("report.json");

        let mut f = std::fs::File::create(&labels_path).expect("create labels");
        f.write_all(jsonl.as_bytes()).expect("write labels");

        let report = run_eval(&scorer, &labels_path, &report_path, 1).expect("run_eval");

        assert_eq!(report.iteration, 1);
        assert_eq!(report.scoring.sample_count, 10);
        assert_eq!(report.scoring.positive_count, 5);
        assert!(
            (report.scoring.f1 - 1.0).abs() < 1e-4,
            "expected F1 = 1.0, got {:.6}",
            report.scoring.f1
        );
        assert!(report_path.exists(), "report file must be created on disk");

        // Round-trip: data on disk must match in-memory report.
        let raw = std::fs::read_to_string(&report_path).expect("read report");
        let on_disk: EvalReport = serde_json::from_str(&raw).expect("parse report");
        assert_eq!(on_disk.iteration, report.iteration);
        assert!((on_disk.scoring.f1 - report.scoring.f1).abs() < 1e-6);
        assert!(!on_disk.timestamp.is_empty());
    }
}
