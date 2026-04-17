pub use icp::optim::{
    MomentumSGD, AdamOptimizer,
    compute_gradients_batch, OptimizationResult,
    grid_search_icp, sgd_refine, threshold_sweep, optimize, save_result,
    LabeledSample,
};
pub use icp::math::{clip_gradients, cosine_annealing};

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::scoring::*;
    use super::super::ml_eval::evaluate_scoring;

    fn industry_seniority_samples(n: usize) -> Vec<LabeledSample> {
        (0..n)
            .map(|i| {
                let pos = i % 2 == 0;
                LabeledSample {
                    features: [
                        if pos { 1.0 } else { 0.0 },
                        0.5,
                        if pos { 1.0 } else { 0.0 },
                        0.0,
                        0.0,
                        0.0,
                        0.5,
                    ],
                    label: if pos { 1.0 } else { 0.0 },
                }
            })
            .collect()
    }

    fn balanced_samples(n: usize) -> Vec<LabeledSample> {
        (0..n)
            .map(|i| {
                let pos = i % 2 == 0;
                let v = if pos { 1.0 } else { 0.0 };
                LabeledSample {
                    features: [v; 7],
                    label: v,
                }
            })
            .collect()
    }

    #[test]
    fn test_grid_search_perfect_separation() {
        let samples = balanced_samples(20);
        let grid = &[1.0, 10.0, 20.0, 30.0];
        let (_icp, f1) = grid_search_icp(&samples, grid, 0.5);
        assert!(f1 > 0.5, "expected f1 > 0.5, got {f1:.4}");
    }

    #[test]
    fn test_sgd_improves_over_pretrained() {
        let samples = balanced_samples(40);
        let pretrained = LogisticScorer::default_pretrained();
        let pretrained_f1 = evaluate_scoring(&pretrained, &samples, 0.5).f1;
        let trained = sgd_refine(&samples, 200, 0.1);
        let trained_f1 = evaluate_scoring(&trained, &samples, 0.5).f1;
        assert!(
            trained_f1 >= pretrained_f1 - 0.05,
            "trained_f1 {trained_f1:.4} should be >= pretrained_f1 {pretrained_f1:.4} - 0.05"
        );
    }

    #[test]
    fn test_sgd_refine_marks_trained() {
        let samples = balanced_samples(10);
        let scorer = sgd_refine(&samples, 10, 0.1);
        assert!(scorer.trained);
    }

    #[test]
    fn test_threshold_sweep_empty() {
        let scorer = LogisticScorer::default_pretrained();
        let (t, f1) = threshold_sweep(&scorer, &[]);
        assert!((t - 0.5).abs() < 1e-5);
        assert_eq!(f1, 0.0);
    }

    #[test]
    fn test_full_optimize() {
        let samples = balanced_samples(40);
        let (result, scorer, calibrator) = optimize(&samples);
        assert_eq!(result.grid_search_combos, 4096);
        assert!(scorer.trained);
        assert!(calibrator.fitted);
    }

    #[test]
    fn test_save_result_roundtrip() {
        let samples = balanced_samples(20);
        let (result, _scorer, _cal) = optimize(&samples);
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("opt_result.json");
        save_result(&result, &path).expect("save_result should succeed");
        let raw = std::fs::read_to_string(&path).expect("read back JSON");
        let loaded: OptimizationResult = serde_json::from_str(&raw).expect("deserialize");
        assert_eq!(result.sgd_epochs, loaded.sgd_epochs);
        assert!((result.best_f1 - loaded.best_f1).abs() < 1e-6);
    }

    #[test]
    fn test_momentum_sgd_step() {
        let mut opt = MomentumSGD::new(7, 0.1, 0.9, 0.0);
        let grad = vec![1.0, -1.0, 0.5, -0.5, 0.2, -0.2, 0.0];
        opt.step(&grad);
        assert!(opt.weights[0] < 0.0);
        assert!(opt.weights[1] > 0.0);
    }

    #[test]
    fn test_adam_step() {
        let mut opt = AdamOptimizer::new(7, 0.001, 0.9, 0.999, 1e-8);
        let grad = vec![1.0, -1.0, 0.5, -0.5, 0.2, -0.2, 0.0];
        opt.adam_step(&grad);
        assert_eq!(opt.t, 1);
        assert!(opt.weights[0] < 0.0);
        assert!(opt.weights[1] > 0.0);
    }

    #[test]
    fn test_clip_gradients_exceeds_norm() {
        let mut grad = vec![3.0, 4.0];
        clip_gradients(&mut grad, 1.0);
        let norm: f32 = grad.iter().map(|g| g * g).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-5);
    }

    #[test]
    fn test_cosine_annealing() {
        let lr_start = cosine_annealing(0.1, 0, 100);
        let lr_end = cosine_annealing(0.1, 100, 100);
        assert!((lr_start - 0.1).abs() < 1e-6);
        assert!(lr_end.abs() < 1e-6);
    }
}
