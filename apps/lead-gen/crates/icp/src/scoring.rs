use crate::criteria::IcpWeights;
use crate::math::{fast_sigmoid, sigmoid, smooth_recency, prefetch_read, WelfordStats};
use serde::{Deserialize, Serialize};

pub struct IcpMatcher {
    pub target_industries: Vec<String>,
    pub target_seniorities: Vec<String>,
    pub target_departments: Vec<String>,
    pub target_tech_stack: Vec<String>,
    pub employee_range: (u32, u32),
}

impl IcpMatcher {
    fn matches_any(value: &str, targets: &[String]) -> bool {
        let lower = value.to_lowercase();
        targets.iter().any(|t| lower.contains(t.as_str()))
    }

    pub fn tech_overlap(&self, tech_stack: &str) -> u8 {
        if self.target_tech_stack.is_empty() { return 0; }
        let lower = tech_stack.to_lowercase();
        let hits = self.target_tech_stack.iter().filter(|t| lower.contains(t.as_str())).count();
        ((hits as f32 / self.target_tech_stack.len() as f32) * 10.0).min(10.0) as u8
    }

    #[allow(clippy::too_many_arguments)]
    pub fn populate_slot(
        &self,
        batch: &mut ContactBatch,
        idx: usize,
        industry: &str,
        employee_count: u32,
        seniority: &str,
        title: &str,
        tech_stack: &str,
        email_status: &str,
        days_since_update: u16,
    ) {
        batch.industry_match[idx] = Self::matches_any(industry, &self.target_industries) as u8;
        batch.employee_in_range[idx] = (employee_count >= self.employee_range.0
            && employee_count <= self.employee_range.1) as u8;
        batch.seniority_match[idx] = Self::matches_any(seniority, &self.target_seniorities) as u8;
        batch.department_match[idx] = Self::matches_any(title, &self.target_departments) as u8;
        batch.tech_overlap[idx] = self.tech_overlap(tech_stack);
        batch.email_verified[idx] = match email_status {
            "verified" => 2,
            "catch-all" | "catchall" => 1,
            _ => 0,
        };
        batch.recency_days[idx] = days_since_update;
    }
}

impl Default for IcpMatcher {
    fn default() -> Self {
        Self {
            target_industries: vec!["ai".into(), "ml".into(), "saas".into(), "infrastructure".into()],
            target_seniorities: vec!["vp".into(), "director".into(), "head".into(), "chief".into(), "cto".into(), "ceo".into()],
            target_departments: vec!["engineering".into(), "ai".into(), "ml".into(), "data".into(), "platform".into()],
            target_tech_stack: vec!["rust".into(), "python".into(), "kubernetes".into(), "pytorch".into(), "tensorflow".into()],
            employee_range: (20, 500),
        }
    }
}

#[repr(C, align(64))]
pub struct ContactBatch {
    pub industry_match: [u8; 256],
    pub employee_in_range: [u8; 256],
    pub seniority_match: [u8; 256],
    pub department_match: [u8; 256],
    pub tech_overlap: [u8; 256],
    pub email_verified: [u8; 256],
    pub recency_days: [u16; 256],
    pub semantic_icp_score: [f32; 256],
    pub scores: [f32; 256],
    pub count: usize,
}

impl ContactBatch {
    pub fn new() -> Self {
        unsafe { std::mem::zeroed() }
    }

    pub fn compute_scores(&mut self) {
        self.compute_scores_with(&IcpWeights::default());
    }

    pub fn compute_scores_with(&mut self, icp: &IcpWeights) {
        let n = self.count;
        let max = icp.industry_weight
            + icp.employee_weight
            + icp.seniority_weight
            + icp.department_weight
            + icp.tech_weight
            + icp.email_weight;

        for i in 0..n {
            let mut score: f32 = 0.0;
            score += self.industry_match[i] as f32 * icp.industry_weight;
            score += self.employee_in_range[i] as f32 * icp.employee_weight;
            score += self.seniority_match[i] as f32 * icp.seniority_weight;
            score += self.department_match[i] as f32 * icp.department_weight;
            score += (self.tech_overlap[i] as f32 / 10.0) * icp.tech_weight;
            score += match self.email_verified[i] {
                2 => icp.email_weight,
                1 => icp.email_weight * 0.4,
                _ => 0.0,
            };

            let icp_fit = (score / max) * 100.0;

            let recency = match self.recency_days[i] {
                0..=7 => 15.0f32,
                8..=14 => 12.0,
                15..=30 => 9.0,
                31..=90 => 5.0,
                91..=180 => 2.0,
                _ => 0.0,
            };

            self.scores[i] = icp_fit * 0.85 + recency;
        }
    }

    pub fn compute_scores_semantic(&mut self, icp: &IcpWeights, semantic_weight: f32) {
        let n = self.count;
        let base_max = icp.industry_weight
            + icp.employee_weight
            + icp.seniority_weight
            + icp.department_weight
            + icp.tech_weight
            + icp.email_weight;
        let total_max = base_max + semantic_weight;

        for i in 0..n {
            let mut score: f32 = 0.0;
            score += self.industry_match[i] as f32 * icp.industry_weight;
            score += self.employee_in_range[i] as f32 * icp.employee_weight;
            score += self.seniority_match[i] as f32 * icp.seniority_weight;
            score += self.department_match[i] as f32 * icp.department_weight;

            let keyword_tech = self.tech_overlap[i] as f32 / 10.0;
            let semantic_tech = self.semantic_icp_score[i];
            let blended_tech = keyword_tech.max(semantic_tech);
            score += blended_tech * icp.tech_weight;

            score += match self.email_verified[i] {
                2 => icp.email_weight,
                1 => icp.email_weight * 0.4,
                _ => 0.0,
            };

            score += self.semantic_icp_score[i] * semantic_weight;
            let icp_fit = (score / total_max) * 100.0;

            let recency = match self.recency_days[i] {
                0..=7 => 15.0f32,
                8..=14 => 12.0,
                15..=30 => 9.0,
                31..=90 => 5.0,
                91..=180 => 2.0,
                _ => 0.0,
            };

            self.scores[i] = icp_fit * 0.85 + recency;
        }
    }

    pub fn compute_scores_fast(&mut self, icp: &IcpWeights) {
        let n = self.count;
        let max = icp.industry_weight
            + icp.employee_weight
            + icp.seniority_weight
            + icp.department_weight
            + icp.tech_weight
            + icp.email_weight;

        const PREFETCH_AHEAD: usize = 16;

        for i in 0..n {
            if i + PREFETCH_AHEAD < n {
                let pa = i + PREFETCH_AHEAD;
                prefetch_read(self.industry_match.as_ptr().wrapping_add(pa));
                prefetch_read(self.employee_in_range.as_ptr().wrapping_add(pa));
                prefetch_read(self.seniority_match.as_ptr().wrapping_add(pa));
                prefetch_read(self.department_match.as_ptr().wrapping_add(pa));
                prefetch_read(self.tech_overlap.as_ptr().wrapping_add(pa));
                prefetch_read(self.email_verified.as_ptr().wrapping_add(pa));
                prefetch_read(self.recency_days.as_ptr().wrapping_add(pa));
            }

            let mut score: f32 = 0.0;
            score += self.industry_match[i] as f32 * icp.industry_weight;
            score += self.employee_in_range[i] as f32 * icp.employee_weight;
            score += self.seniority_match[i] as f32 * icp.seniority_weight;
            score += self.department_match[i] as f32 * icp.department_weight;
            score += (self.tech_overlap[i] as f32 / 10.0) * icp.tech_weight;
            score += match self.email_verified[i] {
                2 => icp.email_weight,
                1 => icp.email_weight * 0.4,
                _ => 0.0,
            };

            let icp_fit = (score / max) * 100.0;
            let recency = (-0.015 * self.recency_days[i] as f32).exp().min(1.0) * 15.0;
            self.scores[i] = icp_fit * 0.85 + recency;
        }
    }

    pub fn compute_scores_logistic_fast(&mut self, scorer: &LogisticScorer) {
        if !scorer.trained {
            self.compute_scores_fast(&IcpWeights::default());
            return;
        }

        let n = self.count;
        const PREFETCH_AHEAD: usize = 16;

        for i in 0..n {
            if i + PREFETCH_AHEAD < n {
                let pa = i + PREFETCH_AHEAD;
                prefetch_read(self.industry_match.as_ptr().wrapping_add(pa));
                prefetch_read(self.seniority_match.as_ptr().wrapping_add(pa));
                prefetch_read(self.tech_overlap.as_ptr().wrapping_add(pa));
                prefetch_read(self.recency_days.as_ptr().wrapping_add(pa));
                prefetch_read(self.semantic_icp_score.as_ptr().wrapping_add(pa));
            }

            let features = LogisticScorer::extract_features(self, i);
            let semantic = self.semantic_icp_score[i];

            let mut dot = scorer.bias;
            dot += scorer.weights[0] * features[0];
            dot += scorer.weights[1] * features[1];
            dot += scorer.weights[2] * features[2];
            dot += scorer.weights[3] * features[3];
            dot += scorer.weights[4] * features[4];
            dot += scorer.weights[5] * features[5];
            dot += scorer.weights[6] * features[6];
            if semantic > 0.0 {
                dot += scorer.semantic_weight * semantic;
            }

            self.scores[i] = fast_sigmoid(dot) * 100.0;
        }
    }

    pub fn top_k(&self, k: usize) -> Vec<usize> {
        let k = k.min(self.count);
        if k == 0 {
            return Vec::new();
        }

        let mut indices: Vec<usize> = (0..self.count).collect();
        indices.select_nth_unstable_by(k.saturating_sub(1), |&a, &b| {
            self.scores[b]
                .partial_cmp(&self.scores[a])
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        indices.truncate(k);
        indices.sort_by(|&a, &b| {
            self.scores[b]
                .partial_cmp(&self.scores[a])
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        indices
    }

    pub fn top_k_scored(&self, k: usize) -> Vec<(usize, f32)> {
        self.top_k(k)
            .into_iter()
            .map(|i| (i, self.scores[i]))
            .collect()
    }

    pub fn top_k_json(&self, k: usize) -> String {
        let results = self.top_k_scored(k);
        let mut json = String::from("[");
        for (i, (idx, score)) in results.iter().enumerate() {
            if i > 0 {
                json.push(',');
            }
            json.push_str(&format!(r#"{{"index":{},"score":{:.2}}}"#, idx, score));
        }
        json.push(']');
        json
    }

    pub fn compute_scores_logistic(&mut self, scorer: &LogisticScorer) {
        if !scorer.trained {
            self.compute_scores();
            return;
        }
        for i in 0..self.count {
            let features = LogisticScorer::extract_features(self, i);
            self.scores[i] = scorer.score(&features) * 100.0;
        }
    }
}

impl Default for ContactBatch {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogisticScorer {
    pub weights: [f32; 7],
    pub bias: f32,
    pub feature_stats: [WelfordStats; 7],
    pub trained: bool,
    #[serde(default)]
    pub semantic_weight: f32,
}

impl LogisticScorer {
    pub fn new() -> Self {
        Self {
            weights: [0.0; 7],
            bias: 0.0,
            feature_stats: std::array::from_fn(|_| WelfordStats::new()),
            trained: false,
            semantic_weight: 0.0,
        }
    }

    pub fn default_pretrained() -> Self {
        Self {
            weights: [0.8, 0.5, 0.8, 0.5, 0.3, 0.2, 0.3],
            bias: -1.5,
            feature_stats: std::array::from_fn(|_| WelfordStats::new()),
            trained: true,
            semantic_weight: 0.4,
        }
    }

    #[inline]
    pub fn sigmoid(x: f32) -> f32 {
        sigmoid(x)
    }

    #[inline]
    pub fn smooth_recency(days: u16) -> f32 {
        smooth_recency(days)
    }

    pub fn extract_features(batch: &ContactBatch, idx: usize) -> [f32; 7] {
        [
            batch.industry_match[idx] as f32,
            batch.employee_in_range[idx] as f32,
            batch.seniority_match[idx] as f32,
            batch.department_match[idx] as f32,
            batch.tech_overlap[idx] as f32 / 10.0,
            batch.email_verified[idx] as f32 / 2.0,
            smooth_recency(batch.recency_days[idx]),
        ]
    }

    pub fn score(&self, features: &[f32; 7]) -> f32 {
        let mut dot = self.bias;
        for i in 0..7 {
            dot += self.weights[i] * features[i];
        }
        sigmoid(dot)
    }

    pub fn score_with_semantic(&self, features: &[f32; 7], semantic_score: f32) -> f32 {
        let mut dot = self.bias;
        for i in 0..7 {
            dot += self.weights[i] * features[i];
        }
        dot += self.semantic_weight * semantic_score;
        sigmoid(dot)
    }

    pub fn score_batch(&self, batch: &mut ContactBatch) {
        for i in 0..batch.count {
            let features = Self::extract_features(batch, i);
            let semantic = batch.semantic_icp_score[i];
            batch.scores[i] = if semantic > 0.0 {
                self.score_with_semantic(&features, semantic) * 100.0
            } else {
                self.score(&features) * 100.0
            };
        }
    }

    pub fn fit(
        &mut self,
        features: &[[f32; 7]],
        labels: &[f32],
        learning_rate: f32,
        epochs: usize,
    ) {
        for sample in features {
            for j in 0..7 {
                self.feature_stats[j].update(sample[j]);
            }
        }

        for epoch in 0..epochs {
            let lr = learning_rate * 0.995f32.powi(epoch as i32);
            for (x, &y) in features.iter().zip(labels.iter()) {
                let pred = self.score(x);
                let error = pred - y;
                for j in 0..7 {
                    self.weights[j] -= lr * error * x[j];
                }
                self.bias -= lr * error;
            }
        }

        self.trained = true;
    }

    pub fn from_json(path: &std::path::Path) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_else(Self::default_pretrained)
    }

    pub fn to_json(&self, path: &std::path::Path) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, json)
    }
}

impl Default for LogisticScorer {
    fn default() -> Self {
        Self::new()
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
    fn test_compute_scores_fast_ordering() {
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 3;
        matcher.populate_slot(&mut batch, 0, "AI SaaS", 100, "CTO", "Engineering", "rust, python, pytorch", "verified", 1);
        matcher.populate_slot(&mut batch, 1, "AI", 200, "Manager", "Data", "python", "catch-all", 30);
        matcher.populate_slot(&mut batch, 2, "Mining", 5, "Intern", "Sales", "excel", "unknown", 365);

        batch.compute_scores_fast(&IcpWeights::default());
        assert!(batch.scores[0] > batch.scores[1]);
        assert!(batch.scores[1] > batch.scores[2]);
    }
}
