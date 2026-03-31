use crate::pipeline::EvalSignal;
use serde::{Deserialize, Serialize};

/// Aggregate metrics for a single pipeline stage.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StageMetrics {
    pub count: usize,
    pub mean: f64,
    pub min: f64,
    pub max: f64,
    pub stddev: f64,
    pub sum: f64,
}

impl StageMetrics {
    pub fn from_signals(signals: &[&EvalSignal]) -> Self {
        if signals.is_empty() {
            return Self {
                count: 0,
                mean: 0.0,
                min: 0.0,
                max: 0.0,
                stddev: 0.0,
                sum: 0.0,
            };
        }

        let values: Vec<f64> = signals.iter().map(|s| s.value).collect();
        let count = values.len();
        let sum: f64 = values.iter().sum();
        let mean = sum / count as f64;
        let min = values.iter().cloned().fold(f64::INFINITY, f64::min);
        let max = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let variance = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / count as f64;
        let stddev = variance.sqrt();

        Self {
            count,
            mean,
            min,
            max,
            stddev,
            sum,
        }
    }
}

// ---------------------------------------------------------------------------
// Score distribution (percentiles)
// ---------------------------------------------------------------------------

/// Percentile summary of a score distribution.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ScoreDistribution {
    pub p10: f64,
    pub p25: f64,
    pub p50: f64,
    pub p75: f64,
    pub p90: f64,
}

impl ScoreDistribution {
    /// Build from a **pre-sorted** slice of scores (ascending).
    /// Returns `Default` (all zeros) for an empty slice.
    pub fn from_sorted(scores: &[f64]) -> Self {
        if scores.is_empty() {
            return Self::default();
        }
        Self {
            p10: percentile_sorted(scores, 10.0),
            p25: percentile_sorted(scores, 25.0),
            p50: percentile_sorted(scores, 50.0),
            p75: percentile_sorted(scores, 75.0),
            p90: percentile_sorted(scores, 90.0),
        }
    }
}

/// Linear-interpolation percentile on a **sorted** slice.
fn percentile_sorted(sorted: &[f64], p: f64) -> f64 {
    let n = sorted.len();
    if n == 1 {
        return sorted[0];
    }
    let rank = p / 100.0 * (n - 1) as f64;
    let lo = rank.floor() as usize;
    let hi = rank.ceil() as usize;
    let frac = rank - lo as f64;
    sorted[lo] + frac * (sorted[hi] - sorted[lo])
}

// ---------------------------------------------------------------------------
// Company ICP scoring metrics
// ---------------------------------------------------------------------------

/// Quality metrics for company ICP scoring.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyScoringMetrics {
    pub total_companies: u32,
    pub scored_companies: u32,
    pub mean_icp_score: f64,
    pub score_distribution: ScoreDistribution,
    /// Companies with composite score >= 80.
    pub high_fit_count: u32,
    /// Companies with composite score 50–79.
    pub medium_fit_count: u32,
    /// Companies with composite score < 50.
    pub low_fit_count: u32,
    /// Fraction of scored companies that have at least one intent signal.
    pub intent_signal_rate: f64,
}

impl CompanyScoringMetrics {
    /// Build from a slice of `(composite_score, has_intent_signal)` tuples.
    ///
    /// `total_companies` is set to the number of entries provided.  Callers
    /// may override that field afterwards if they need to express a larger
    /// universe (e.g. companies that were not scored at all).
    pub fn from_scores(scores: &[(f64, bool)]) -> Self {
        let total_companies = scores.len() as u32;
        let scored_companies = total_companies;

        if scores.is_empty() {
            return Self {
                total_companies: 0,
                scored_companies: 0,
                mean_icp_score: 0.0,
                score_distribution: ScoreDistribution::default(),
                high_fit_count: 0,
                medium_fit_count: 0,
                low_fit_count: 0,
                intent_signal_rate: 0.0,
            };
        }

        let mut raw_scores: Vec<f64> = scores.iter().map(|(s, _)| *s).collect();
        let sum: f64 = raw_scores.iter().sum();
        let mean_icp_score = sum / raw_scores.len() as f64;

        raw_scores.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let score_distribution = ScoreDistribution::from_sorted(&raw_scores);

        let mut high_fit_count = 0u32;
        let mut medium_fit_count = 0u32;
        let mut low_fit_count = 0u32;
        let mut intent_count = 0u32;

        for &(score, has_intent) in scores {
            if score >= 80.0 {
                high_fit_count += 1;
            } else if score >= 50.0 {
                medium_fit_count += 1;
            } else {
                low_fit_count += 1;
            }
            if has_intent {
                intent_count += 1;
            }
        }

        let intent_signal_rate = intent_count as f64 / scored_companies as f64;

        Self {
            total_companies,
            scored_companies,
            mean_icp_score,
            score_distribution,
            high_fit_count,
            medium_fit_count,
            low_fit_count,
            intent_signal_rate,
        }
    }
}

// ---------------------------------------------------------------------------
// Ranking quality metrics
// ---------------------------------------------------------------------------

/// Precision@K: fraction of the top-K scored items that are positive.
///
/// Items are ranked by score descending.  Returns `0.0` when `k == 0` or
/// when `scores_labels` is empty.
pub fn precision_at_k(scores_labels: &[(f64, bool)], k: usize) -> f64 {
    if k == 0 || scores_labels.is_empty() {
        return 0.0;
    }

    let mut ranked: Vec<(f64, bool)> = scores_labels.to_vec();
    ranked.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    let k_actual = k.min(ranked.len());
    let positives = ranked[..k_actual].iter().filter(|(_, label)| *label).count();
    positives as f64 / k_actual as f64
}

/// nDCG@K using binary relevance.
///
/// DCG  = Σ_{i=0}^{K-1}  label_i / log2(i + 2)
/// iDCG = DCG of the ideal ranking (all positives first).
///
/// Returns `0.0` when iDCG == 0 (no positives in the list) or `k == 0`.
pub fn ndcg_at_k(scores_labels: &[(f64, bool)], k: usize) -> f64 {
    if k == 0 || scores_labels.is_empty() {
        return 0.0;
    }

    let mut ranked: Vec<(f64, bool)> = scores_labels.to_vec();
    ranked.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    let k_actual = k.min(ranked.len());

    let dcg: f64 = ranked[..k_actual]
        .iter()
        .enumerate()
        .map(|(i, (_, label))| {
            if *label {
                1.0 / (i as f64 + 2.0).log2()
            } else {
                0.0
            }
        })
        .sum();

    // Ideal: sort positives first, then negatives.
    let total_positives = scores_labels.iter().filter(|(_, l)| *l).count();
    let ideal_k = k_actual.min(total_positives);
    let idcg: f64 = (0..ideal_k)
        .map(|i| 1.0 / (i as f64 + 2.0).log2())
        .sum();

    if idcg == 0.0 {
        0.0
    } else {
        dcg / idcg
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn signal(stage: &str, metric: &str, value: f64) -> EvalSignal {
        EvalSignal {
            stage_name: stage.into(),
            metric_name: metric.into(),
            value,
            timestamp: "2024-01-01T00:00:00Z".into(),
        }
    }

    #[test]
    fn metrics_from_signals() {
        let s1 = signal("crawl", "pages", 10.0);
        let s2 = signal("crawl", "pages", 20.0);
        let s3 = signal("crawl", "pages", 30.0);
        let refs: Vec<&EvalSignal> = vec![&s1, &s2, &s3];
        let m = StageMetrics::from_signals(&refs);

        assert_eq!(m.count, 3);
        assert!((m.mean - 20.0).abs() < 0.001);
        assert!((m.min - 10.0).abs() < 0.001);
        assert!((m.max - 30.0).abs() < 0.001);
        assert!((m.sum - 60.0).abs() < 0.001);
    }

    #[test]
    fn empty_signals() {
        let refs: Vec<&EvalSignal> = vec![];
        let m = StageMetrics::from_signals(&refs);
        assert_eq!(m.count, 0);
        assert_eq!(m.mean, 0.0);
    }

    // --- ScoreDistribution ---

    #[test]
    fn score_distribution_from_sorted() {
        // 10 evenly spaced values: 0, 10, 20, … 90
        let scores: Vec<f64> = (0..10).map(|i| i as f64 * 10.0).collect();
        let dist = ScoreDistribution::from_sorted(&scores);

        // p50 of [0,10,20,30,40,50,60,70,80,90] → rank = 4.5 → 45.0
        assert!((dist.p50 - 45.0).abs() < 0.001, "p50={}", dist.p50);
        assert!(dist.p10 < dist.p25);
        assert!(dist.p25 < dist.p50);
        assert!(dist.p50 < dist.p75);
        assert!(dist.p75 < dist.p90);
    }

    #[test]
    fn score_distribution_single_element() {
        let dist = ScoreDistribution::from_sorted(&[42.0]);
        assert_eq!(dist.p10, 42.0);
        assert_eq!(dist.p50, 42.0);
        assert_eq!(dist.p90, 42.0);
    }

    #[test]
    fn score_distribution_empty() {
        let dist = ScoreDistribution::from_sorted(&[]);
        assert_eq!(dist.p50, 0.0);
    }

    // --- CompanyScoringMetrics ---

    #[test]
    fn company_scoring_metrics_counts() {
        let scores = vec![
            (90.0, true),  // high + intent
            (75.0, false), // medium
            (60.0, true),  // medium + intent
            (40.0, false), // low
            (20.0, false), // low
        ];
        let m = CompanyScoringMetrics::from_scores(&scores);

        assert_eq!(m.total_companies, 5);
        assert_eq!(m.scored_companies, 5);
        assert_eq!(m.high_fit_count, 1);
        assert_eq!(m.medium_fit_count, 2);
        assert_eq!(m.low_fit_count, 2);
        assert!((m.intent_signal_rate - 0.4).abs() < 0.001);
        // mean = (90+75+60+40+20) / 5 = 57
        assert!((m.mean_icp_score - 57.0).abs() < 0.001);
    }

    #[test]
    fn company_scoring_metrics_empty() {
        let m = CompanyScoringMetrics::from_scores(&[]);
        assert_eq!(m.total_companies, 0);
        assert_eq!(m.mean_icp_score, 0.0);
        assert_eq!(m.intent_signal_rate, 0.0);
    }

    // --- precision_at_k ---

    #[test]
    fn precision_at_k_perfect() {
        // Top-3 are all positives.
        let data = vec![(1.0, true), (0.9, true), (0.8, true), (0.2, false)];
        assert!((precision_at_k(&data, 3) - 1.0).abs() < 0.001);
    }

    #[test]
    fn precision_at_k_mixed() {
        // After sorting desc: 1.0/true, 0.9/false, 0.8/true, 0.2/false
        let data = vec![(0.8, true), (0.2, false), (1.0, true), (0.9, false)];
        // top-2: [1.0/true, 0.9/false] → 1 positive out of 2 → 0.5
        assert!((precision_at_k(&data, 2) - 0.5).abs() < 0.001);
    }

    #[test]
    fn precision_at_k_zero() {
        let data = vec![(1.0, true), (0.5, false)];
        assert_eq!(precision_at_k(&data, 0), 0.0);
        assert_eq!(precision_at_k(&[], 3), 0.0);
    }

    #[test]
    fn precision_at_k_exceeds_length() {
        // k larger than the list → clamp to list length
        let data = vec![(1.0, true), (0.5, true)];
        assert!((precision_at_k(&data, 10) - 1.0).abs() < 0.001);
    }

    // --- ndcg_at_k ---

    #[test]
    fn ndcg_at_k_perfect_ranking() {
        // All positives ranked first → nDCG = 1.0
        let data = vec![(1.0, true), (0.9, true), (0.1, false)];
        assert!((ndcg_at_k(&data, 2) - 1.0).abs() < 0.001);
    }

    #[test]
    fn ndcg_at_k_worst_ranking() {
        // The one positive is ranked last → DCG < iDCG → nDCG < 1.0
        let data = vec![(0.9, false), (0.8, false), (0.1, true)];
        let score = ndcg_at_k(&data, 3);
        assert!(score < 1.0, "expected <1.0, got {score}");
        assert!(score > 0.0, "expected >0.0, got {score}");
    }

    #[test]
    fn ndcg_at_k_no_positives() {
        let data = vec![(1.0, false), (0.5, false)];
        assert_eq!(ndcg_at_k(&data, 2), 0.0);
    }

    #[test]
    fn ndcg_at_k_zero_k() {
        let data = vec![(1.0, true)];
        assert_eq!(ndcg_at_k(&data, 0), 0.0);
    }
}
