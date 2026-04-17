pub use icp::math::{fast_sigmoid, prefetch_read, WelfordStats};
pub use icp::scoring::{IcpMatcher, ContactBatch, LogisticScorer};
pub use icp::calibration::IsotonicCalibrator;
pub use icp::criteria::IcpWeights;

pub type IcpProfile = IcpWeights;

// ── BatchScoringContext: zero-allocation batch scoring via ScoringArena ──────

#[cfg(feature = "kernel-arena")]
use super::arena::{ArenaStats, ScoringArena};

#[cfg(feature = "kernel-arena")]
pub struct BatchScoringContext {
    arena: ScoringArena,
}

#[cfg(feature = "kernel-arena")]
impl BatchScoringContext {
    pub fn new(batch_size: usize) -> Self {
        Self {
            arena: ScoringArena::new(batch_size),
        }
    }

    pub fn alloc_features(&mut self, len: usize) -> &mut [f32] {
        self.arena.alloc_f32_slice(len)
    }

    pub fn alloc_u16(&mut self, len: usize) -> &mut [u16] {
        self.arena.alloc_aligned::<u16>(len)
    }

    pub fn alloc_scores(&mut self, len: usize) -> &mut [f32] {
        self.arena.alloc_f32_slice(len)
    }

    pub fn score_batch_from_features(
        &mut self,
        features_flat: &[f32],
        recency_days: &[u16],
        count: usize,
        icp: &IcpProfile,
        top_k: usize,
    ) -> Vec<(usize, f32)> {
        assert_eq!(features_flat.len(), count * 7, "features_flat must be count * 7");
        assert!(recency_days.len() >= count, "recency_days too short");

        let scores = self.arena.alloc_f32_slice(count);

        let max = icp.industry_weight
            + icp.employee_weight
            + icp.seniority_weight
            + icp.department_weight
            + icp.tech_weight
            + icp.email_weight;

        for i in 0..count {
            let base = i * 7;
            let mut score: f32 = 0.0;

            score += features_flat[base]     * icp.industry_weight;
            score += features_flat[base + 1] * icp.employee_weight;
            score += features_flat[base + 2] * icp.seniority_weight;
            score += features_flat[base + 3] * icp.department_weight;
            score += features_flat[base + 4] * icp.tech_weight;
            score += features_flat[base + 5] * icp.email_weight;

            let icp_fit = (score / max) * 100.0;
            let recency = icp::math::smooth_recency(recency_days[i]) * 15.0;
            scores[i] = icp_fit * 0.85 + recency;
        }

        Self::top_k_from_scores(scores, top_k)
    }

    pub fn score_batch_logistic(
        &mut self,
        batch: &ContactBatch,
        scorer: &LogisticScorer,
        top_k: usize,
    ) -> Vec<(usize, f32)> {
        let count = batch.count;
        let scores = self.arena.alloc_f32_slice(count);

        for i in 0..count {
            let features = LogisticScorer::extract_features(batch, i);
            let semantic = batch.semantic_icp_score[i];
            scores[i] = if semantic > 0.0 {
                scorer.score_with_semantic(&features, semantic) * 100.0
            } else {
                scorer.score(&features) * 100.0
            };
        }

        Self::top_k_from_scores(scores, top_k)
    }

    fn top_k_from_scores(scores: &[f32], k: usize) -> Vec<(usize, f32)> {
        let count = scores.len();
        let k = k.min(count);
        if k == 0 {
            return Vec::new();
        }

        let mut indices: Vec<usize> = (0..count).collect();
        indices.select_nth_unstable_by(k.saturating_sub(1), |&a, &b| {
            scores[b]
                .partial_cmp(&scores[a])
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        indices.truncate(k);
        indices.sort_by(|&a, &b| {
            scores[b]
                .partial_cmp(&scores[a])
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        indices.into_iter().map(|i| (i, scores[i])).collect()
    }

    pub fn reset(&mut self) {
        self.arena.reset();
    }

    pub fn stats(&self) -> ArenaStats {
        self.arena.stats()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_scoring() {
        let mut batch = ContactBatch::new();
        batch.count = 3;

        batch.industry_match[0] = 1;
        batch.employee_in_range[0] = 1;
        batch.seniority_match[0] = 1;
        batch.department_match[0] = 1;
        batch.tech_overlap[0] = 10;
        batch.email_verified[0] = 2;
        batch.recency_days[0] = 1;

        batch.industry_match[1] = 1;
        batch.seniority_match[1] = 1;
        batch.tech_overlap[1] = 5;
        batch.email_verified[1] = 1;
        batch.recency_days[1] = 30;

        batch.tech_overlap[2] = 2;
        batch.recency_days[2] = 365;

        batch.compute_scores();

        assert!(batch.scores[0] > batch.scores[1]);
        assert!(batch.scores[1] > batch.scores[2]);
        assert!(batch.scores[0] > 90.0);
        assert!(batch.scores[2] < 20.0);
    }

    #[test]
    fn test_top_k() {
        let mut batch = ContactBatch::new();
        batch.count = 5;
        batch.scores[0] = 50.0;
        batch.scores[1] = 90.0;
        batch.scores[2] = 30.0;
        batch.scores[3] = 70.0;
        batch.scores[4] = 10.0;

        let top3 = batch.top_k(3);
        assert_eq!(top3.len(), 3);
        assert_eq!(top3[0], 1);
        assert_eq!(top3[1], 3);
        assert_eq!(top3[2], 0);
    }

    #[test]
    fn test_icp_matcher_tech_overlap() {
        let matcher = IcpMatcher::default();
        assert_eq!(matcher.tech_overlap("rust, python, kubernetes"), 6);
        assert_eq!(matcher.tech_overlap("java, go, c++"), 0);
    }

    #[test]
    fn test_end_to_end_icp_score() {
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 1;
        matcher.populate_slot(
            &mut batch, 0,
            "AI Infrastructure", 200, "CTO", "Engineering",
            "rust, python, pytorch", "verified", 3,
        );
        batch.compute_scores();
        assert!(batch.scores[0] > 80.0, "got {}", batch.scores[0]);
    }

    #[test]
    fn test_logistic_pretrained_ordering() {
        let scorer = LogisticScorer::default_pretrained();
        let mut batch = ContactBatch::new();
        batch.count = 2;
        batch.industry_match[0] = 1;
        batch.employee_in_range[0] = 1;
        batch.seniority_match[0] = 1;
        batch.department_match[0] = 1;
        batch.tech_overlap[0] = 8;
        batch.email_verified[0] = 2;
        batch.recency_days[0] = 3;

        batch.recency_days[1] = 365;

        batch.compute_scores_logistic(&scorer);
        assert!(batch.scores[0] > batch.scores[1]);
    }

    #[test]
    fn test_logistic_fit() {
        let mut scorer = LogisticScorer::new();
        let mut features = Vec::new();
        let mut labels = Vec::new();
        for _ in 0..10 {
            features.push([1.0, 1.0, 1.0, 1.0, 0.8, 1.0, 0.9]);
            labels.push(1.0);
        }
        for _ in 0..10 {
            features.push([0.0, 0.0, 0.0, 0.0, 0.1, 0.0, 0.1]);
            labels.push(0.0);
        }

        scorer.fit(&features, &labels, 0.5, 100);
        assert!(scorer.trained);

        let pos_score = scorer.score(&[1.0, 1.0, 1.0, 1.0, 0.8, 1.0, 0.9]);
        let neg_score = scorer.score(&[0.0, 0.0, 0.0, 0.0, 0.1, 0.0, 0.1]);
        assert!(pos_score > neg_score);
        assert!(pos_score > 0.7);
        assert!(neg_score < 0.3);
    }

    #[test]
    fn test_compute_scores_fast_ordering() {
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 3;
        matcher.populate_slot(&mut batch, 0, "AI SaaS", 100, "CTO", "Engineering", "rust, python, pytorch", "verified", 1);
        matcher.populate_slot(&mut batch, 1, "AI", 200, "Manager", "Data", "python", "catch-all", 30);
        matcher.populate_slot(&mut batch, 2, "Mining", 5, "Intern", "Sales", "excel", "unknown", 365);

        batch.compute_scores_fast(&IcpProfile::default());
        assert!(batch.scores[0] > batch.scores[1]);
        assert!(batch.scores[1] > batch.scores[2]);
    }

    #[test]
    fn test_type_alias_backward_compat() {
        let icp: IcpProfile = IcpProfile::default();
        assert_eq!(icp.industry_weight, 25.0);
        let _weights: IcpWeights = icp;
    }

    #[cfg(feature = "kernel-arena")]
    mod batch_scoring_ctx {
        use super::*;

        #[test]
        fn test_batch_scoring_context_new() {
            let ctx = BatchScoringContext::new(256);
            let stats = ctx.stats();
            assert_eq!(stats.bytes_used, 0);
        }

        #[test]
        fn test_batch_scoring_context_score_from_features() {
            let mut ctx = BatchScoringContext::new(32);
            let icp = IcpProfile::default();
            let count = 3;
            let features_flat: Vec<f32> = vec![
                1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0,
                1.0, 0.0, 1.0, 0.0, 0.5, 0.5, 0.0,
                0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
            ];
            let recency_days: Vec<u16> = vec![1, 30, 365];
            let results = ctx.score_batch_from_features(&features_flat, &recency_days, count, &icp, 3);
            assert_eq!(results.len(), 3);
            assert!(results[0].1 > results[1].1);
            assert!(results[1].1 > results[2].1);
        }

        #[test]
        fn test_batch_scoring_context_logistic() {
            let mut ctx = BatchScoringContext::new(32);
            let scorer = LogisticScorer::default_pretrained();
            let matcher = IcpMatcher::default();

            let mut batch = ContactBatch::new();
            batch.count = 3;
            matcher.populate_slot(&mut batch, 0, "AI SaaS", 100, "CTO", "Engineering", "rust, python, pytorch", "verified", 1);
            matcher.populate_slot(&mut batch, 1, "AI", 200, "Manager", "Data", "python", "catch-all", 30);
            matcher.populate_slot(&mut batch, 2, "Mining", 5, "Intern", "Sales", "excel", "unknown", 365);

            let results = ctx.score_batch_logistic(&batch, &scorer, 2);
            assert_eq!(results.len(), 2);
            assert_eq!(results[0].0, 0);
        }

        #[test]
        fn test_batch_scoring_context_reset_reuse() {
            let mut ctx = BatchScoringContext::new(32);
            let icp = IcpProfile::default();
            for batch_num in 0..5u32 {
                let count = 4;
                let mut features = vec![0.0f32; count * 7];
                let recency_days = vec![5u16; count];
                for i in 0..count {
                    features[i * 7] = ((batch_num + i as u32) % 2) as f32;
                }
                let results = ctx.score_batch_from_features(&features, &recency_days, count, &icp, 2);
                assert_eq!(results.len(), 2);
                ctx.reset();
            }
            let stats = ctx.stats();
            assert_eq!(stats.bytes_used, 0);
        }
    }
}
