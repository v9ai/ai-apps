//! K-fold cross-validation, feature ablation, and legacy-vs-full comparison
//! for the 44-feature contact scoring model.
//!
//! Enabled with the `kernel-eval` Cargo feature (same as `ml_eval` and
//! `weight_optimizer` — the modules this depends on).

use super::ml_eval::{evaluate_scoring, LabeledSample, ScoringEval};
use super::scoring::FEATURE_COUNT;
use super::weight_optimizer::{sgd_refine, threshold_sweep};

// ── Feature names (for reporting) ───────────────────────────────────────────

/// Human-readable name for each of the 44 features, in index order.
pub const FEATURE_NAMES: [&str; FEATURE_COUNT] = [
    "industry_match",
    "employee_in_range",
    "seniority_match",
    "department_match",
    "tech_norm",
    "email_norm",
    "smooth_recency",
    "hf_score",
    "hf_model_depth",
    "hf_training_depth",
    "hf_max_effort",
    "hf_production_ratio",
    "hf_dl_weighted_maturity",
    "hf_alignment_diversity",
    "hf_maturity_trend",
    "hf_research",
    "hf_sales_b2b_core",
    "hf_sales_outreach",
    "hf_sales_funnel",
    "hf_sales_platform",
    "hf_research_intensity",
    "hf_infra_sophistication",
    "hf_signal_breadth",
    "hf_domain_nlp_focus",
    "hf_library_sophistication",
    "hf_pipeline_diversity",
    "hf_custom_arch_ratio",
    "hf_framework_diversity",
    "hf_moe_ratio",
    "hf_download_scale",
    "hf_download_per_model",
    "hf_top_model_dominance",
    "hf_likes_per_download",
    "hf_download_breadth",
    "hf_recency",
    "hf_acceleration",
    "hf_longevity",
    "hf_burst_intensity",
    "ix_research_x_seniority",
    "ix_score_x_tech",
    "ix_training_x_production",
    "ix_depth_x_industry",
    "ix_sales_x_department",
    "ix_hf_threshold",
];

// ── Result types ────────────────────────────────────────────────────────────

/// Aggregate cross-validation result across k folds.
#[derive(Debug, Clone)]
pub struct CvResult {
    pub mean_f1: f32,
    pub std_f1: f32,
    pub mean_auc: f32,
    pub std_auc: f32,
    pub fold_count: usize,
}

/// Feature ablation result: baseline F1 and per-feature delta when zeroed.
#[derive(Debug, Clone)]
pub struct AblationResult {
    pub baseline_f1: f32,
    /// (feature_index, feature_name, delta_f1) sorted by |delta| descending.
    pub deltas: Vec<(usize, &'static str, f32)>,
}

/// Side-by-side comparison of the full 44-feature model vs the legacy 7-feature model.
#[derive(Debug, Clone)]
pub struct FeatureSetComparison {
    pub full_cv: CvResult,
    pub legacy_cv: CvResult,
    pub delta_f1: f32,
    pub delta_auc: f32,
}

// ── Deterministic LCG PRNG ──────────────────────────────────────────────────

struct Lcg(u64);

impl Lcg {
    fn new(seed: u64) -> Self {
        Self(seed)
    }

    fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1);
        self.0
    }
}

// ── Deterministic shuffle (seeded Fisher-Yates) ─────────────────────────────

fn seeded_shuffle(v: &mut [usize], rng: &mut Lcg) {
    let n = v.len();
    for i in (1..n).rev() {
        let j = (rng.next() as usize) % (i + 1);
        v.swap(i, j);
    }
}

// ── Core k-fold implementation ──────────────────────────────────────────────

/// Stratified k-fold cross-validation with SGD training per fold.
///
/// Returns aggregate metrics (mean/std of F1 and AUC) across `k` folds.
///
/// Defaults: k=5, epochs=100, lr=0.3
pub fn stratified_kfold_cv(
    samples: &[LabeledSample],
    k: usize,
    epochs: usize,
    lr: f32,
) -> CvResult {
    if samples.is_empty() || k < 2 {
        return CvResult {
            mean_f1: 0.0,
            std_f1: 0.0,
            mean_auc: 0.5,
            std_auc: 0.0,
            fold_count: 0,
        };
    }

    // Separate indices by class
    let mut pos_idx: Vec<usize> = Vec::new();
    let mut neg_idx: Vec<usize> = Vec::new();
    for (i, s) in samples.iter().enumerate() {
        if s.label >= 0.5 {
            pos_idx.push(i);
        } else {
            neg_idx.push(i);
        }
    }

    // Deterministic shuffle
    let mut rng = Lcg::new(0xCAFE_BABE_DEAD_BEEF);
    seeded_shuffle(&mut pos_idx, &mut rng);
    seeded_shuffle(&mut neg_idx, &mut rng);

    // Build fold assignments
    let mut folds: Vec<Vec<usize>> = (0..k).map(|_| Vec::new()).collect();
    for (i, &idx) in pos_idx.iter().enumerate() {
        folds[i % k].push(idx);
    }
    for (i, &idx) in neg_idx.iter().enumerate() {
        folds[i % k].push(idx);
    }

    let mut f1_scores = Vec::with_capacity(k);
    let mut auc_scores = Vec::with_capacity(k);

    for fold in 0..k {
        // Build train/test split
        let test_indices = &folds[fold];
        let train_samples: Vec<LabeledSample> = (0..k)
            .filter(|&f| f != fold)
            .flat_map(|f| folds[f].iter())
            .map(|&i| samples[i].clone())
            .collect();
        let test_samples: Vec<LabeledSample> = test_indices
            .iter()
            .map(|&i| samples[i].clone())
            .collect();

        if train_samples.is_empty() || test_samples.is_empty() {
            continue;
        }

        // Train
        let scorer = sgd_refine(&train_samples, epochs, lr);
        let (threshold, _) = threshold_sweep(&scorer, &train_samples);

        // Evaluate on test set
        let eval: ScoringEval = evaluate_scoring(&scorer, &test_samples, threshold);
        f1_scores.push(eval.f1);
        auc_scores.push(eval.auc_roc);
    }

    let fold_count = f1_scores.len();
    if fold_count == 0 {
        return CvResult {
            mean_f1: 0.0,
            std_f1: 0.0,
            mean_auc: 0.5,
            std_auc: 0.0,
            fold_count: 0,
        };
    }

    let mean_f1 = f1_scores.iter().sum::<f32>() / fold_count as f32;
    let mean_auc = auc_scores.iter().sum::<f32>() / fold_count as f32;

    let std_f1 = if fold_count > 1 {
        let var: f32 = f1_scores.iter().map(|&f| (f - mean_f1).powi(2)).sum::<f32>() / (fold_count - 1) as f32;
        var.sqrt()
    } else {
        0.0
    };

    let std_auc = if fold_count > 1 {
        let var: f32 = auc_scores.iter().map(|&a| (a - mean_auc).powi(2)).sum::<f32>() / (fold_count - 1) as f32;
        var.sqrt()
    } else {
        0.0
    };

    CvResult {
        mean_f1,
        std_f1,
        mean_auc,
        std_auc,
        fold_count,
    }
}

// ── Feature ablation ────────────────────────────────────────────────────────

/// Run feature ablation: for each feature, zero it across all samples, run CV,
/// and record the F1 delta from baseline.
///
/// Returns sorted by |delta| descending (most impactful feature first).
pub fn feature_ablation(samples: &[LabeledSample], k: usize) -> AblationResult {
    let baseline = stratified_kfold_cv(samples, k, 100, 0.3);
    let baseline_f1 = baseline.mean_f1;

    let mut deltas: Vec<(usize, &'static str, f32)> = Vec::with_capacity(FEATURE_COUNT);

    for (feat_idx, &feat_name) in FEATURE_NAMES.iter().enumerate() {
        // Create modified samples with this feature zeroed
        let modified: Vec<LabeledSample> = samples
            .iter()
            .map(|s| {
                let mut m = s.clone();
                m.features[feat_idx] = 0.0;
                m
            })
            .collect();

        let cv = stratified_kfold_cv(&modified, k, 100, 0.3);
        let delta = baseline_f1 - cv.mean_f1; // positive = feature helps
        deltas.push((feat_idx, feat_name, delta));
    }

    // Sort by absolute delta descending
    deltas.sort_by(|a, b| b.2.abs().partial_cmp(&a.2.abs()).unwrap_or(std::cmp::Ordering::Equal));

    AblationResult {
        baseline_f1,
        deltas,
    }
}

// ── Legacy vs full comparison ───────────────────────────────────────────────

/// Compare the full 44-feature model against the legacy 7-feature model.
///
/// The legacy model zeroes features 7-37 (all HF signals), simulating the old
/// contact-only scoring baseline.
pub fn compare_legacy_vs_full(samples: &[LabeledSample], k: usize) -> FeatureSetComparison {
    let full_cv = stratified_kfold_cv(samples, k, 100, 0.3);

    // Create legacy samples: zero features 7-37 (HF signals)
    let legacy_samples: Vec<LabeledSample> = samples
        .iter()
        .map(|s| {
            let mut m = s.clone();
            for i in 7..38 {
                m.features[i] = 0.0;
            }
            // Interaction terms that depend on HF features will naturally become 0
            // when extract_features recomputes them, but since we're zeroing the
            // stored features directly, also zero the interaction terms.
            for i in 38..FEATURE_COUNT {
                m.features[i] = 0.0;
            }
            m
        })
        .collect();

    let legacy_cv = stratified_kfold_cv(&legacy_samples, k, 100, 0.3);

    let delta_f1 = full_cv.mean_f1 - legacy_cv.mean_f1;
    let delta_auc = full_cv.mean_auc - legacy_cv.mean_auc;

    FeatureSetComparison {
        full_cv,
        legacy_cv,
        delta_f1,
        delta_auc,
    }
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kernel::data_gen::generate_contact_labels;

    /// Helper: generate a dataset large enough for CV.
    fn test_dataset() -> Vec<LabeledSample> {
        generate_contact_labels(200)
    }

    #[test]
    fn test_feature_names_length() {
        assert_eq!(FEATURE_NAMES.len(), FEATURE_COUNT);
    }

    #[test]
    fn test_kfold_cv() {
        let samples = test_dataset();
        let result = stratified_kfold_cv(&samples, 5, 50, 0.3);

        assert_eq!(result.fold_count, 5);
        assert!(result.mean_f1 >= 0.0 && result.mean_f1 <= 1.0,
            "mean_f1 out of range: {}", result.mean_f1);
        assert!(result.mean_auc >= 0.0 && result.mean_auc <= 1.0,
            "mean_auc out of range: {}", result.mean_auc);
        assert!(result.std_f1 >= 0.0, "std_f1 negative: {}", result.std_f1);
        assert!(result.std_auc >= 0.0, "std_auc negative: {}", result.std_auc);
        // With 200 synthetic samples, the model should learn *something*
        assert!(result.mean_f1 > 0.1,
            "mean_f1 suspiciously low: {}", result.mean_f1);
    }

    #[test]
    fn test_kfold_cv_empty() {
        let result = stratified_kfold_cv(&[], 5, 50, 0.3);
        assert_eq!(result.fold_count, 0);
        assert_eq!(result.mean_f1, 0.0);
    }

    #[test]
    fn test_kfold_cv_k_1() {
        let samples = test_dataset();
        let result = stratified_kfold_cv(&samples, 1, 50, 0.3);
        // k < 2 should return empty
        assert_eq!(result.fold_count, 0);
    }

    #[test]
    fn test_feature_ablation() {
        let samples = test_dataset();
        let result = feature_ablation(&samples, 3);

        assert!(result.baseline_f1 >= 0.0);
        assert_eq!(result.deltas.len(), FEATURE_COUNT);

        // Verify sorted by absolute delta descending
        for w in result.deltas.windows(2) {
            assert!(w[0].2.abs() >= w[1].2.abs() - 1e-6,
                "ablation not sorted: |{}| < |{}|", w[0].2, w[1].2);
        }

        // Each delta should have a valid feature name
        for (idx, name, _) in &result.deltas {
            assert_eq!(*name, FEATURE_NAMES[*idx]);
        }
    }

    #[test]
    fn test_legacy_comparison() {
        let samples = test_dataset();
        let result = compare_legacy_vs_full(&samples, 3);

        assert!(result.full_cv.mean_f1 >= 0.0);
        assert!(result.legacy_cv.mean_f1 >= 0.0);
        // delta_f1 = full - legacy, can be positive or negative
        let expected_delta = result.full_cv.mean_f1 - result.legacy_cv.mean_f1;
        assert!((result.delta_f1 - expected_delta).abs() < 1e-6,
            "delta_f1 mismatch: {} vs {}", result.delta_f1, expected_delta);

        let expected_auc_delta = result.full_cv.mean_auc - result.legacy_cv.mean_auc;
        assert!((result.delta_auc - expected_auc_delta).abs() < 1e-6,
            "delta_auc mismatch: {} vs {}", result.delta_auc, expected_auc_delta);
    }

    #[test]
    fn test_seeded_shuffle_deterministic() {
        let mut v1 = vec![0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        let mut v2 = v1.clone();
        let mut rng1 = Lcg::new(42);
        let mut rng2 = Lcg::new(42);
        seeded_shuffle(&mut v1, &mut rng1);
        seeded_shuffle(&mut v2, &mut rng2);
        assert_eq!(v1, v2, "same seed should produce same shuffle");
    }

    #[test]
    fn test_seeded_shuffle_different_seeds() {
        let mut v1 = vec![0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        let mut v2 = v1.clone();
        let mut rng1 = Lcg::new(42);
        let mut rng2 = Lcg::new(99);
        seeded_shuffle(&mut v1, &mut rng1);
        seeded_shuffle(&mut v2, &mut rng2);
        // Very unlikely to be equal with different seeds
        assert_ne!(v1, v2, "different seeds should (usually) produce different shuffles");
    }
}
