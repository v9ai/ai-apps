use serde::{Deserialize, Serialize};

/// Number of features in the logistic regression model.
///
/// Layout:
///   [0]  industry_match       (binary)
///   [1]  employee_in_range    (binary)
///   [2]  seniority_match      (binary)
///   [3]  department_match     (binary)
///   [4]  tech_norm            (0-1)
///   [5]  email_norm           (0-1)
///   [6]  smooth_recency       (exp decay)
///   [7]  hf_score             (0-1)  — compute_hf_score() composite
///   [8]  hf_model_depth       (0-1)  — log(1 + models) / log(1 + 20)
///   [9]  hf_training_depth    (0-1)  — distinct signal types / 5
///   [10] hf_maturity          (0-1)  — avg effort level ordinal
///   [11] hf_research          (binary) — has pretraining OR arxiv > 0
///   [12] hf_sales_relevance   (0-1)  — sales_signals / 3
pub const FEATURE_COUNT: usize = 13;

// ── HuggingFace company-level signals ────────────────────────────────────────

/// Pre-computed HF signals for a company, derived from an HF org profile.
/// All values are normalized to [0, 1] for direct use as ML features.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct HfCompanySignals {
    /// Composite HF score (0-1), from `compute_hf_score()`.
    pub hf_score: f32,
    /// log(1 + model_count) / log(1 + 20), capped at 1.0.
    pub model_depth: f32,
    /// Distinct training signal types / 5, capped at 1.0.
    pub training_depth: f32,
    /// Average model maturity ordinal (Production=1.0 … Trivial=0.15).
    pub maturity: f32,
    /// 1.0 if org has pre-training evidence OR arxiv papers, else 0.0.
    pub research: f32,
    /// sales_signals.len() / 3, capped at 1.0.
    pub sales_relevance: f32,
}

impl HfCompanySignals {
    /// Build signals from raw org-level counts (no hf crate dependency needed).
    pub fn from_raw(
        hf_score: f32,
        model_count: usize,
        training_signal_types: usize,
        avg_maturity: f32,
        has_pretraining: bool,
        arxiv_count: usize,
        sales_signal_count: usize,
    ) -> Self {
        Self {
            hf_score: hf_score.clamp(0.0, 1.0),
            model_depth: ((1.0 + model_count as f32).ln() / (1.0 + 20.0_f32).ln()).min(1.0),
            training_depth: (training_signal_types as f32 / 5.0).min(1.0),
            maturity: avg_maturity.clamp(0.0, 1.0),
            research: if has_pretraining || arxiv_count > 0 { 1.0 } else { 0.0 },
            sales_relevance: (sales_signal_count as f32 / 3.0).min(1.0),
        }
    }
}

/// Build `HfCompanySignals` directly from an `hf::OrgProfile`.
#[cfg(feature = "kernel-hf")]
impl HfCompanySignals {
    pub fn from_org_profile(profile: &hf::OrgProfile) -> Self {
        use std::collections::HashSet;

        let hf_score = hf::OrgScanner::compute_hf_score(profile);

        let signal_types: HashSet<_> = profile
            .training_signals
            .iter()
            .map(|s| std::mem::discriminant(&s.signal_type))
            .collect();

        let has_pretraining = profile
            .training_signals
            .iter()
            .any(|s| s.signal_type == hf::TrainingSignalType::PreTraining);

        let avg_maturity = if profile.model_maturity.is_empty() {
            0.0
        } else {
            let sum: f32 = profile
                .model_maturity
                .iter()
                .map(|m| match m.effort_level {
                    hf::EffortLevel::Production => 1.0,
                    hf::EffortLevel::Research => 0.85,
                    hf::EffortLevel::Moderate => 0.7,
                    hf::EffortLevel::Experiment => 0.35,
                    hf::EffortLevel::Trivial => 0.15,
                })
                .sum();
            sum / profile.model_maturity.len() as f32
        };

        Self::from_raw(
            hf_score,
            profile.models.len(),
            signal_types.len(),
            avg_maturity,
            has_pretraining,
            profile.arxiv_links.len(),
            profile.sales_signals.len(),
        )
    }
}

/// ICP matching criteria — defines what signals to look for in contact records.
pub struct IcpMatcher {
    /// Target industries (lowercase). A contact's industry matches if any substring matches.
    pub target_industries: Vec<String>,
    /// Target seniorities (e.g., "VP", "Director", "C-level").
    pub target_seniorities: Vec<String>,
    /// Target departments (e.g., "Engineering", "AI", "ML").
    pub target_departments: Vec<String>,
    /// Target tech stack keywords.
    pub target_tech: Vec<String>,
    /// Employee range (min, max).
    pub employee_range: (u32, u32),
}

impl IcpMatcher {
    /// Check if a value matches any target (case-insensitive substring).
    fn matches_any(value: &str, targets: &[String]) -> bool {
        let lower = value.to_lowercase();
        targets.iter().any(|t| lower.contains(t.as_str()))
    }

    /// Score a contact's tech overlap (0-10 scale).
    pub fn tech_overlap(&self, tech_stack: &str) -> u8 {
        if self.target_tech.is_empty() { return 0; }
        let lower = tech_stack.to_lowercase();
        let hits = self.target_tech.iter().filter(|t| lower.contains(t.as_str())).count();
        ((hits as f32 / self.target_tech.len() as f32) * 10.0).min(10.0) as u8
    }

    /// Populate a single slot in a ContactBatch from contact/company fields.
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
            target_tech: vec!["rust".into(), "python".into(), "kubernetes".into(), "pytorch".into(), "tensorflow".into()],
            employee_range: (20, 500),
        }
    }
}

/// ICP (Ideal Customer Profile) weight configuration for scoring.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IcpProfile {
    pub industry_weight: f32,    // default 25
    pub employee_weight: f32,    // default 15
    pub seniority_weight: f32,   // default 25
    pub department_weight: f32,  // default 15
    pub tech_weight: f32,        // default 10 (0-10 scale input)
    pub email_weight: f32,       // default 5
    /// HuggingFace composite signal weight (0-1 input).
    #[serde(default = "default_hf_weight")]
    pub hf_weight: f32,          // default 15
}

fn default_hf_weight() -> f32 { 15.0 }

impl IcpProfile {
    /// Load weights from a JSON file, falling back to defaults on any error.
    pub fn from_json(path: &std::path::Path) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    /// Persist weights to a JSON file.
    pub fn to_json(&self, path: &std::path::Path) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, json)
    }

    /// Return weights as an array (same order as LogisticScorer features, minus recency).
    pub fn as_weights(&self) -> [f32; 7] {
        [
            self.industry_weight,
            self.employee_weight,
            self.seniority_weight,
            self.department_weight,
            self.tech_weight,
            self.email_weight,
            self.hf_weight,
        ]
    }
}

impl Default for IcpProfile {
    fn default() -> Self {
        Self {
            industry_weight: 25.0,
            employee_weight: 15.0,
            seniority_weight: 25.0,
            department_weight: 15.0,
            tech_weight: 10.0,
            email_weight: 5.0,
            hf_weight: 15.0,
        }
    }
}

/// Batch of contacts in Structure-of-Arrays layout for vectorized scoring.
/// Cache-line aligned (64 bytes) for optimal NEON/SSE auto-vectorization.
/// Process up to 256 contacts per batch.
#[repr(C, align(64))]
pub struct ContactBatch {
    // Input columns (parallel arrays — same index = same contact)
    pub industry_match: [u8; 256],    // 1 if matches ICP industry
    pub employee_in_range: [u8; 256], // 1 if in ICP employee range
    pub seniority_match: [u8; 256],   // 1 if matches target seniority
    pub department_match: [u8; 256],  // 1 if matches target department
    pub tech_overlap: [u8; 256],      // 0-10 scale of tech stack overlap
    pub email_verified: [u8; 256],    // 2=verified, 1=catch-all, 0=unknown
    pub recency_days: [u16; 256],     // days since last update

    // Semantic embedding features (from BGE cosine similarity)
    pub semantic_icp_score: [f32; 256], // cosine(company_emb, icp_emb), 0.0 if unavailable

    // HuggingFace company-level signals (same value for all contacts from same company)
    pub hf_score: [f32; 256],
    pub hf_model_depth: [f32; 256],
    pub hf_training_depth: [f32; 256],
    pub hf_maturity: [f32; 256],
    pub hf_research: [f32; 256],
    pub hf_sales_relevance: [f32; 256],

    // Output
    pub scores: [f32; 256],

    pub count: usize,
}

impl ContactBatch {
    pub fn new() -> Self {
        // Safety: all-zeros is valid for this struct
        unsafe { std::mem::zeroed() }
    }

    /// Populate HuggingFace signals for a batch slot (company-level, same for all contacts).
    pub fn populate_hf_slot(&mut self, idx: usize, signals: &HfCompanySignals) {
        self.hf_score[idx] = signals.hf_score;
        self.hf_model_depth[idx] = signals.model_depth;
        self.hf_training_depth[idx] = signals.training_depth;
        self.hf_maturity[idx] = signals.maturity;
        self.hf_research[idx] = signals.research;
        self.hf_sales_relevance[idx] = signals.sales_relevance;
    }

    /// Compute ICP fit scores for the entire batch using default weights.
    pub fn compute_scores(&mut self) {
        self.compute_scores_with(&IcpProfile::default());
    }

    /// Compute ICP fit scores with custom weight profile.
    /// The loop structure is auto-vectorizable by LLVM with -C opt-level=3.
    pub fn compute_scores_with(&mut self, icp: &IcpProfile) {
        let n = self.count;
        let max = icp.industry_weight
            + icp.employee_weight
            + icp.seniority_weight
            + icp.department_weight
            + icp.tech_weight
            + icp.email_weight
            + icp.hf_weight;

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
            // HF composite signal (0-1)
            score += self.hf_score[i] * icp.hf_weight;

            // Normalize to 0-100
            let icp_fit = (score / max) * 100.0;

            // Recency bonus (0-15 points)
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

    /// Compute ICP fit scores with semantic embedding boost.
    /// When `semantic_icp_score[i] > 0`, it blends with the boolean features.
    /// Semantic boost replaces the binary tech_overlap with continuous similarity.
    pub fn compute_scores_semantic(&mut self, icp: &IcpProfile, semantic_weight: f32) {
        let n = self.count;
        let base_max = icp.industry_weight
            + icp.employee_weight
            + icp.seniority_weight
            + icp.department_weight
            + icp.tech_weight
            + icp.email_weight
            + icp.hf_weight;
        let total_max = base_max + semantic_weight;

        for i in 0..n {
            let mut score: f32 = 0.0;

            score += self.industry_match[i] as f32 * icp.industry_weight;
            score += self.employee_in_range[i] as f32 * icp.employee_weight;
            score += self.seniority_match[i] as f32 * icp.seniority_weight;
            score += self.department_match[i] as f32 * icp.department_weight;

            // Blend: use max(keyword tech_overlap, semantic similarity) for tech scoring
            let keyword_tech = self.tech_overlap[i] as f32 / 10.0;
            let semantic_tech = self.semantic_icp_score[i];
            let blended_tech = keyword_tech.max(semantic_tech);
            score += blended_tech * icp.tech_weight;

            score += match self.email_verified[i] {
                2 => icp.email_weight,
                1 => icp.email_weight * 0.4,
                _ => 0.0,
            };

            // HF composite signal
            score += self.hf_score[i] * icp.hf_weight;

            // Semantic ICP score as additive feature (captures soft signals keywords miss)
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

    /// Return top-k indices by score (partial sort via quickselect).
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

    /// Get a scored result as (index, score) pairs, sorted descending.
    pub fn top_k_scored(&self, k: usize) -> Vec<(usize, f32)> {
        self.top_k(k)
            .into_iter()
            .map(|i| (i, self.scores[i]))
            .collect()
    }

    /// Serialize top-K results as JSON for Python pipeline consumption.
    /// Format: [{"index": N, "score": F}, ...]
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
}

impl Default for ContactBatch {
    fn default() -> Self {
        Self::new()
    }
}

// ── Module 4: ML-based Lead Scoring ──────────────────────────────────────────

/// Welford's online algorithm for running mean/variance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WelfordStats {
    pub count: u64,
    pub mean: f32,
    pub m2: f32,
}

impl WelfordStats {
    pub fn new() -> Self {
        Self { count: 0, mean: 0.0, m2: 0.0 }
    }

    pub fn update(&mut self, value: f32) {
        self.count += 1;
        let delta = value - self.mean;
        self.mean += delta / self.count as f32;
        let delta2 = value - self.mean;
        self.m2 += delta * delta2;
    }

    pub fn variance(&self) -> f32 {
        if self.count < 2 { 1.0 } else { self.m2 / self.count as f32 }
    }

    pub fn std_dev(&self) -> f32 {
        self.variance().sqrt().max(1e-6)
    }

    pub fn normalize(&self, value: f32) -> f32 {
        (value - self.mean) / self.std_dev()
    }
}

impl Default for WelfordStats {
    fn default() -> Self {
        Self::new()
    }
}

/// Logistic regression scorer with learned weights.
/// Features (FEATURE_COUNT + 1 optional semantic):
///   [0]  industry_match    (binary)
///   [1]  employee_in_range (binary)
///   [2]  seniority_match   (binary)
///   [3]  department_match  (binary)
///   [4]  tech_overlap / 10 (0-1)
///   [5]  email_verified / 2(0-1)
///   [6]  smooth_recency    (exp decay)
///   [7]  hf_score          (0-1)
///   [8]  hf_model_depth    (0-1)
///   [9]  hf_training_depth (0-1)
///   [10] hf_maturity       (0-1)
///   [11] hf_research       (binary)
///   [12] hf_sales_relevance(0-1)
///   [+]  semantic_icp_score(cosine, optional — 0.0 if unavailable)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogisticScorer {
    pub weights: Vec<f32>,
    pub bias: f32,
    pub feature_stats: Vec<WelfordStats>,
    pub trained: bool,
    /// Optional extra weight for semantic ICP score (from BGE embeddings).
    #[serde(default)]
    pub semantic_weight: f32,
}

impl LogisticScorer {
    pub fn new() -> Self {
        Self {
            weights: vec![0.0; FEATURE_COUNT],
            bias: 0.0,
            feature_stats: (0..FEATURE_COUNT).map(|_| WelfordStats::new()).collect(),
            trained: false,
            semantic_weight: 0.0,
        }
    }

    /// Pre-trained weights calibrated for B2B lead scoring.
    pub fn default_pretrained() -> Self {
        Self {
            weights: vec![
                0.8,  //  0: industry_match
                0.5,  //  1: employee_in_range
                0.8,  //  2: seniority_match
                0.5,  //  3: department_match
                0.3,  //  4: tech_norm
                0.2,  //  5: email_norm
                0.3,  //  6: smooth_recency
                0.7,  //  7: hf_score — strong composite signal
                0.4,  //  8: hf_model_depth — model publishing depth
                0.5,  //  9: hf_training_depth — custom training = serious org
                0.3,  // 10: hf_maturity — production models matter
                0.6,  // 11: hf_research — papers/pretraining = deep ML
                0.3,  // 12: hf_sales_relevance — sales models = potential customer
            ],
            bias: -1.8,
            feature_stats: (0..FEATURE_COUNT).map(|_| WelfordStats::new()).collect(),
            trained: true,
            semantic_weight: 0.4,
        }
    }

    /// Numerically stable sigmoid activation.
    #[inline]
    pub fn sigmoid(x: f32) -> f32 {
        1.0 / (1.0 + (-x.clamp(-88.0, 88.0)).exp())
    }

    /// Exponential recency decay: 1.0 at day 0, ~0.5 at day 46, <0.1 at day 180.
    #[inline]
    pub fn smooth_recency(days: u16) -> f32 {
        (-0.015 * days as f32).exp()
    }

    /// Extract a FEATURE_COUNT-element vector from a ContactBatch at a given index.
    pub fn extract_features(batch: &ContactBatch, idx: usize) -> [f32; FEATURE_COUNT] {
        [
            batch.industry_match[idx] as f32,
            batch.employee_in_range[idx] as f32,
            batch.seniority_match[idx] as f32,
            batch.department_match[idx] as f32,
            batch.tech_overlap[idx] as f32 / 10.0,
            batch.email_verified[idx] as f32 / 2.0,
            Self::smooth_recency(batch.recency_days[idx]),
            // HF features
            batch.hf_score[idx],
            batch.hf_model_depth[idx],
            batch.hf_training_depth[idx],
            batch.hf_maturity[idx],
            batch.hf_research[idx],
            batch.hf_sales_relevance[idx],
        ]
    }

    /// Score a single feature vector.
    pub fn score(&self, features: &[f32; FEATURE_COUNT]) -> f32 {
        let mut dot = self.bias;
        let n = self.weights.len().min(FEATURE_COUNT);
        for i in 0..n {
            dot += self.weights[i] * features[i];
        }
        Self::sigmoid(dot)
    }

    /// Score a feature vector with semantic ICP score (extra feature).
    pub fn score_with_semantic(&self, features: &[f32; FEATURE_COUNT], semantic_score: f32) -> f32 {
        let mut dot = self.bias;
        let n = self.weights.len().min(FEATURE_COUNT);
        for i in 0..n {
            dot += self.weights[i] * features[i];
        }
        dot += self.semantic_weight * semantic_score;
        Self::sigmoid(dot)
    }

    /// Score all contacts in a batch, writing results to batch.scores (0-100 scale).
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

    /// Train via stochastic gradient descent on labeled data.
    pub fn fit(
        &mut self,
        features: &[[f32; FEATURE_COUNT]],
        labels: &[f32],
        learning_rate: f32,
        epochs: usize,
    ) {
        // Ensure weights/stats are sized correctly
        self.weights.resize(FEATURE_COUNT, 0.0);
        while self.feature_stats.len() < FEATURE_COUNT {
            self.feature_stats.push(WelfordStats::new());
        }

        for sample in features {
            for j in 0..FEATURE_COUNT {
                self.feature_stats[j].update(sample[j]);
            }
        }

        for epoch in 0..epochs {
            let lr = learning_rate * 0.995f32.powi(epoch as i32);
            for (x, &y) in features.iter().zip(labels.iter()) {
                let pred = self.score(x);
                let error = pred - y;
                for j in 0..FEATURE_COUNT {
                    self.weights[j] -= lr * error * x[j];
                }
                self.bias -= lr * error;
            }
        }

        self.trained = true;
    }
}

impl LogisticScorer {
    /// Load a trained scorer from a JSON file, falling back to pretrained defaults.
    /// If the loaded weights don't match FEATURE_COUNT, falls back to defaults.
    pub fn from_json(path: &std::path::Path) -> Self {
        let loaded: Option<Self> = std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok());
        match loaded {
            Some(mut s) if s.weights.len() == FEATURE_COUNT => {
                // Ensure stats are also the right length
                s.feature_stats.resize_with(FEATURE_COUNT, WelfordStats::new);
                s
            }
            _ => Self::default_pretrained(),
        }
    }

    /// Persist the scorer to a JSON file.
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

impl ContactBatch {
    /// Score contacts using a logistic regression model.
    /// Falls back to rule-based scoring if the model is untrained.
    pub fn compute_scores_logistic(&mut self, scorer: &LogisticScorer) {
        if !scorer.trained {
            self.compute_scores();
            return;
        }
        scorer.score_batch(self);
    }
}

/// Isotonic regression calibrator using Pool Adjacent Violators Algorithm.
pub struct IsotonicCalibrator {
    breakpoints: Vec<(f32, f32)>,
    pub fitted: bool,
}

impl IsotonicCalibrator {
    pub fn new() -> Self {
        Self {
            breakpoints: Vec::new(),
            fitted: false,
        }
    }

    /// Fit the calibrator using the Pool Adjacent Violators Algorithm (PAVA).
    /// Sorts (score, label) pairs by score, then merges adjacent blocks where
    /// the label average decreases to enforce monotonicity.
    pub fn fit(&mut self, scores: &[f32], labels: &[f32]) {
        assert_eq!(scores.len(), labels.len(), "scores and labels must have same length");
        if scores.is_empty() {
            return;
        }

        // Sort by score
        let mut pairs: Vec<(f32, f32)> = scores.iter().copied().zip(labels.iter().copied()).collect();
        pairs.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));

        // PAVA: maintain blocks of (score_sum, label_sum, count)
        let mut blocks: Vec<(f32, f32, usize)> = Vec::new();
        for (score, label) in &pairs {
            blocks.push((*score, *label, 1));

            // Merge adjacent blocks where the new block's average is less than the previous
            while blocks.len() >= 2 {
                let n = blocks.len();
                let avg_last = blocks[n - 1].1 / blocks[n - 1].2 as f32;
                let avg_prev = blocks[n - 2].1 / blocks[n - 2].2 as f32;
                if avg_last < avg_prev {
                    let last = blocks.pop().unwrap();
                    let prev = blocks.last_mut().unwrap();
                    prev.0 += last.0; // accumulate score sum
                    prev.1 += last.1; // accumulate label sum
                    prev.2 += last.2; // accumulate count
                } else {
                    break;
                }
            }
        }

        // Convert blocks to breakpoints: (average_score, average_label)
        self.breakpoints.clear();
        for (score_sum, label_sum, count) in &blocks {
            let avg_score = score_sum / *count as f32;
            let avg_label = label_sum / *count as f32;
            self.breakpoints.push((avg_score, avg_label));
        }

        self.fitted = true;
    }

    /// Calibrate a raw score using binary search + linear interpolation.
    /// Returns the raw score unchanged if the calibrator is not fitted.
    pub fn calibrate(&self, raw_score: f32) -> f32 {
        if !self.fitted || self.breakpoints.is_empty() {
            return raw_score;
        }

        // Clamp to breakpoint range
        if raw_score <= self.breakpoints[0].0 {
            return self.breakpoints[0].1;
        }
        let last = self.breakpoints.len() - 1;
        if raw_score >= self.breakpoints[last].0 {
            return self.breakpoints[last].1;
        }

        // Binary search for the interval
        let pos = self.breakpoints.partition_point(|bp| bp.0 <= raw_score);
        if pos == 0 {
            return self.breakpoints[0].1;
        }

        let (x0, y0) = self.breakpoints[pos - 1];
        let (x1, y1) = self.breakpoints[pos];

        // Linear interpolation
        let t = if (x1 - x0).abs() < 1e-10 { 0.5 } else { (raw_score - x0) / (x1 - x0) };
        y0 + t * (y1 - y0)
    }

    /// Calibrate all scores in a batch (scores are on 0-100 scale, normalize to 0-1 for
    /// calibration, then scale back).
    pub fn calibrate_batch(&self, batch: &mut ContactBatch) {
        for i in 0..batch.count {
            let raw = batch.scores[i] / 100.0;
            batch.scores[i] = self.calibrate(raw) * 100.0;
        }
    }
}

impl Default for IsotonicCalibrator {
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

        // Perfect candidate
        batch.industry_match[0] = 1;
        batch.employee_in_range[0] = 1;
        batch.seniority_match[0] = 1;
        batch.department_match[0] = 1;
        batch.tech_overlap[0] = 10;
        batch.email_verified[0] = 2;
        batch.recency_days[0] = 1;

        // Partial candidate
        batch.industry_match[1] = 1;
        batch.seniority_match[1] = 1;
        batch.tech_overlap[1] = 5;
        batch.email_verified[1] = 1;
        batch.recency_days[1] = 30;

        // Weak candidate
        batch.tech_overlap[2] = 2;
        batch.recency_days[2] = 365;

        batch.compute_scores();

        assert!(batch.scores[0] > batch.scores[1]);
        assert!(batch.scores[1] > batch.scores[2]);
        assert!(batch.scores[0] > 90.0); // near-perfect
        assert!(batch.scores[2] < 20.0); // weak
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
        assert_eq!(top3[0], 1); // 90
        assert_eq!(top3[1], 3); // 70
        assert_eq!(top3[2], 0); // 50
    }

    #[test]
    fn test_top_k_empty() {
        let batch = ContactBatch::new();
        assert!(batch.top_k(5).is_empty());
    }

    #[test]
    fn test_top_k_exceeds_count() {
        let mut batch = ContactBatch::new();
        batch.count = 2;
        batch.scores[0] = 10.0;
        batch.scores[1] = 20.0;

        let top = batch.top_k(100);
        assert_eq!(top.len(), 2);
        assert_eq!(top[0], 1);
        assert_eq!(top[1], 0);
    }

    #[test]
    fn test_custom_weights() {
        let mut batch = ContactBatch::new();
        batch.count = 1;
        batch.industry_match[0] = 1;
        batch.recency_days[0] = 1;

        // Only industry matters
        let icp = IcpProfile {
            industry_weight: 100.0,
            employee_weight: 0.0,
            seniority_weight: 0.0,
            department_weight: 0.0,
            tech_weight: 0.0,
            email_weight: 0.0,
        };

        batch.compute_scores_with(&icp);
        assert!(batch.scores[0] > 95.0); // 100% ICP fit * 0.85 + 15 recency
    }

    #[test]
    fn test_json_output() {
        let mut batch = ContactBatch::new();
        batch.count = 2;
        batch.scores[0] = 50.0;
        batch.scores[1] = 90.0;

        let json = batch.top_k_json(2);
        assert!(json.contains("90.00"));
        assert!(json.contains("50.00"));
        assert!(json.starts_with('['));
        assert!(json.ends_with(']'));
    }

    #[test]
    fn test_recency_bonus() {
        let mut batch = ContactBatch::new();
        batch.count = 6;

        // All same ICP fit, vary only recency
        for i in 0..6 {
            batch.industry_match[i] = 1;
            batch.seniority_match[i] = 1;
        }

        batch.recency_days[0] = 1;   // 15 bonus
        batch.recency_days[1] = 10;  // 12 bonus
        batch.recency_days[2] = 20;  // 9 bonus
        batch.recency_days[3] = 60;  // 5 bonus
        batch.recency_days[4] = 120; // 2 bonus
        batch.recency_days[5] = 365; // 0 bonus

        batch.compute_scores();

        for i in 0..5 {
            assert!(
                batch.scores[i] > batch.scores[i + 1],
                "score[{}]={} should > score[{}]={}",
                i, batch.scores[i], i + 1, batch.scores[i + 1]
            );
        }
    }

    // ── IcpMatcher tests ──

    #[test]
    fn test_icp_matcher_tech_overlap() {
        let matcher = IcpMatcher::default();
        assert_eq!(matcher.tech_overlap("rust, python, kubernetes"), 6);
        assert_eq!(matcher.tech_overlap("java, go, c++"), 0);
        assert_eq!(matcher.tech_overlap(""), 0);
    }

    #[test]
    fn test_icp_matcher_tech_overlap_case_insensitive() {
        let matcher = IcpMatcher::default();
        assert_eq!(matcher.tech_overlap("RUST, PYTHON"), 4);
    }

    #[test]
    fn test_icp_matcher_tech_overlap_empty_targets() {
        let matcher = IcpMatcher {
            target_tech: vec![],
            ..IcpMatcher::default()
        };
        assert_eq!(matcher.tech_overlap("rust python"), 0);
    }

    #[test]
    fn test_icp_matcher_populate_slot_hit() {
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 1;
        matcher.populate_slot(
            &mut batch, 0,
            "AI/ML SaaS", 100, "VP Engineering", "Head of AI",
            "rust, pytorch", "verified", 5,
        );
        assert_eq!(batch.industry_match[0], 1);
        assert_eq!(batch.employee_in_range[0], 1);
        assert_eq!(batch.seniority_match[0], 1);
        assert_eq!(batch.department_match[0], 1);
        assert_eq!(batch.tech_overlap[0], 4); // 2/5 * 10
        assert_eq!(batch.email_verified[0], 2);
        assert_eq!(batch.recency_days[0], 5);
    }

    #[test]
    fn test_icp_matcher_populate_slot_miss() {
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 1;
        matcher.populate_slot(
            &mut batch, 0,
            "Mining", 5, "Intern", "Sales Rep",
            "excel, word", "unknown", 400,
        );
        assert_eq!(batch.industry_match[0], 0);
        assert_eq!(batch.employee_in_range[0], 0);
        assert_eq!(batch.seniority_match[0], 0);
        assert_eq!(batch.department_match[0], 0);
        assert_eq!(batch.tech_overlap[0], 0);
        assert_eq!(batch.email_verified[0], 0);
    }

    #[test]
    fn test_icp_matcher_email_catch_all() {
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 1;
        matcher.populate_slot(&mut batch, 0, "", 100, "", "", "", "catch-all", 0);
        assert_eq!(batch.email_verified[0], 1);
        matcher.populate_slot(&mut batch, 0, "", 100, "", "", "", "catchall", 0);
        assert_eq!(batch.email_verified[0], 1);
    }

    #[test]
    fn test_icp_profile_default_weights_sum() {
        let icp = IcpProfile::default();
        let total = icp.industry_weight + icp.employee_weight + icp.seniority_weight
            + icp.department_weight + icp.tech_weight + icp.email_weight + icp.hf_weight;
        assert_eq!(total, 110.0);
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

    // ── WelfordStats tests ──

    #[test]
    fn test_welford_stats_basic() {
        let mut ws = WelfordStats::new();
        for v in [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0] {
            ws.update(v);
        }
        assert!((ws.mean - 5.0).abs() < 0.01, "mean={}", ws.mean);
        assert!((ws.variance() - 4.0).abs() < 0.01, "variance={}", ws.variance());
    }

    #[test]
    fn test_welford_stats_normalize() {
        let mut ws = WelfordStats::new();
        for v in [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0] {
            ws.update(v);
        }
        // mean=5, std=2 → z-score of 7 = (7-5)/2 = 1.0
        let z = ws.normalize(7.0);
        assert!((z - 1.0).abs() < 0.01, "z={}", z);
        // z-score of 5 = 0
        let z0 = ws.normalize(5.0);
        assert!(z0.abs() < 0.01, "z0={}", z0);
    }

    #[test]
    fn test_welford_stats_single() {
        let mut ws = WelfordStats::new();
        ws.update(42.0);
        assert_eq!(ws.count, 1);
        // variance returns 1.0 for count < 2
        assert_eq!(ws.variance(), 1.0);
        assert!(ws.std_dev() >= 1e-6);
    }

    #[test]
    fn test_sigmoid_bounds() {
        let mid = LogisticScorer::sigmoid(0.0);
        assert!((mid - 0.5).abs() < 1e-6, "sigmoid(0)={}", mid);

        let high = LogisticScorer::sigmoid(100.0);
        assert!(high > 0.999, "sigmoid(100)={}", high);

        let low = LogisticScorer::sigmoid(-100.0);
        assert!(low < 0.001, "sigmoid(-100)={}", low);
    }

    #[test]
    fn test_smooth_recency() {
        let day0 = LogisticScorer::smooth_recency(0);
        assert!((day0 - 1.0).abs() < 1e-6, "day0={}", day0);

        let day46 = LogisticScorer::smooth_recency(46);
        assert!((day46 - 0.5).abs() < 0.05, "day46={}", day46);

        let day180 = LogisticScorer::smooth_recency(180);
        assert!(day180 < 0.1, "day180={}", day180);
    }

    #[test]
    fn test_logistic_untrained_fallback() {
        let scorer = LogisticScorer::new();
        assert!(!scorer.trained);

        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 1;
        matcher.populate_slot(
            &mut batch, 0,
            "AI SaaS", 100, "CTO", "Engineering",
            "rust, python", "verified", 3,
        );

        // Save expected rule-based score
        let mut batch_rule = ContactBatch::new();
        batch_rule.count = 1;
        batch_rule.industry_match[0] = batch.industry_match[0];
        batch_rule.employee_in_range[0] = batch.employee_in_range[0];
        batch_rule.seniority_match[0] = batch.seniority_match[0];
        batch_rule.department_match[0] = batch.department_match[0];
        batch_rule.tech_overlap[0] = batch.tech_overlap[0];
        batch_rule.email_verified[0] = batch.email_verified[0];
        batch_rule.recency_days[0] = batch.recency_days[0];
        batch_rule.compute_scores();

        batch.compute_scores_logistic(&scorer);
        assert!(
            (batch.scores[0] - batch_rule.scores[0]).abs() < 0.01,
            "logistic={} rule={}",
            batch.scores[0],
            batch_rule.scores[0]
        );
    }

    #[test]
    fn test_logistic_pretrained_ordering() {
        let scorer = LogisticScorer::default_pretrained();

        // Good lead: all signals positive
        let mut batch = ContactBatch::new();
        batch.count = 2;
        batch.industry_match[0] = 1;
        batch.employee_in_range[0] = 1;
        batch.seniority_match[0] = 1;
        batch.department_match[0] = 1;
        batch.tech_overlap[0] = 8;
        batch.email_verified[0] = 2;
        batch.recency_days[0] = 3;

        // Bad lead: no signals
        batch.industry_match[1] = 0;
        batch.employee_in_range[1] = 0;
        batch.seniority_match[1] = 0;
        batch.department_match[1] = 0;
        batch.tech_overlap[1] = 0;
        batch.email_verified[1] = 0;
        batch.recency_days[1] = 365;

        batch.compute_scores_logistic(&scorer);
        assert!(
            batch.scores[0] > batch.scores[1],
            "good={} bad={}",
            batch.scores[0],
            batch.scores[1]
        );
    }

    #[test]
    fn test_logistic_fit() {
        let mut scorer = LogisticScorer::new();

        // 10 positive examples (all features high, including HF signals)
        // 10 negative examples (all features low)
        let mut features = Vec::new();
        let mut labels = Vec::new();
        for _ in 0..10 {
            features.push([1.0, 1.0, 1.0, 1.0, 0.8, 1.0, 0.9, 0.8, 0.6, 0.7, 0.9, 1.0, 0.5]);
            labels.push(1.0);
        }
        for _ in 0..10 {
            features.push([0.0, 0.0, 0.0, 0.0, 0.1, 0.0, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
            labels.push(0.0);
        }

        scorer.fit(&features, &labels, 0.5, 100);
        assert!(scorer.trained);

        let pos_score = scorer.score(&[1.0, 1.0, 1.0, 1.0, 0.8, 1.0, 0.9, 0.8, 0.6, 0.7, 0.9, 1.0, 0.5]);
        let neg_score = scorer.score(&[0.0, 0.0, 0.0, 0.0, 0.1, 0.0, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
        assert!(
            pos_score > neg_score,
            "pos={} neg={}",
            pos_score,
            neg_score
        );
        assert!(pos_score > 0.7, "pos_score={}", pos_score);
        assert!(neg_score < 0.3, "neg_score={}", neg_score);
    }

    #[test]
    fn test_logistic_batch() {
        let scorer = LogisticScorer::default_pretrained();
        let matcher = IcpMatcher::default();

        let mut batch = ContactBatch::new();
        batch.count = 3;

        // Strong lead
        matcher.populate_slot(&mut batch, 0, "AI SaaS", 100, "CTO", "Engineering", "rust, python, pytorch", "verified", 1);
        // Medium lead
        matcher.populate_slot(&mut batch, 1, "AI", 200, "Manager", "Data", "python", "catch-all", 30);
        // Weak lead
        matcher.populate_slot(&mut batch, 2, "Mining", 5, "Intern", "Sales", "excel", "unknown", 365);

        scorer.score_batch(&mut batch);
        assert!(batch.scores[0] > batch.scores[1], "0={} 1={}", batch.scores[0], batch.scores[1]);
        assert!(batch.scores[1] > batch.scores[2], "1={} 2={}", batch.scores[1], batch.scores[2]);
    }

    #[test]
    fn test_feature_extraction() {
        let mut batch = ContactBatch::new();
        batch.count = 1;
        batch.industry_match[0] = 1;
        batch.employee_in_range[0] = 1;
        batch.seniority_match[0] = 0;
        batch.department_match[0] = 1;
        batch.tech_overlap[0] = 5;
        batch.email_verified[0] = 2;
        batch.recency_days[0] = 0;
        // HF signals
        batch.hf_score[0] = 0.75;
        batch.hf_model_depth[0] = 0.6;
        batch.hf_training_depth[0] = 0.8;
        batch.hf_maturity[0] = 0.9;
        batch.hf_research[0] = 1.0;
        batch.hf_sales_relevance[0] = 0.33;

        let features = LogisticScorer::extract_features(&batch, 0);
        assert_eq!(features[0], 1.0); // industry
        assert_eq!(features[1], 1.0); // employee
        assert_eq!(features[2], 0.0); // seniority
        assert_eq!(features[3], 1.0); // department
        assert!((features[4] - 0.5).abs() < 1e-6); // tech: 5/10
        assert!((features[5] - 1.0).abs() < 1e-6); // email: 2/2
        assert!((features[6] - 1.0).abs() < 1e-6); // recency: day 0 = 1.0
        // HF features
        assert!((features[7] - 0.75).abs() < 1e-6); // hf_score
        assert!((features[8] - 0.6).abs() < 1e-6);  // hf_model_depth
        assert!((features[9] - 0.8).abs() < 1e-6);  // hf_training_depth
        assert!((features[10] - 0.9).abs() < 1e-6); // hf_maturity
        assert!((features[11] - 1.0).abs() < 1e-6); // hf_research
        assert!((features[12] - 0.33).abs() < 1e-6); // hf_sales_relevance
    }

    // ── IsotonicCalibrator tests ──

    #[test]
    fn test_isotonic_identity() {
        // Already monotonic data should pass through approximately unchanged
        let mut cal = IsotonicCalibrator::new();
        let scores = vec![0.1, 0.3, 0.5, 0.7, 0.9];
        let labels = vec![0.1, 0.3, 0.5, 0.7, 0.9];
        cal.fit(&scores, &labels);
        assert!(cal.fitted);
        for &s in &scores {
            let c = cal.calibrate(s);
            assert!((c - s).abs() < 0.01, "score={} calibrated={}", s, c);
        }
    }

    #[test]
    fn test_isotonic_pava_merges() {
        // Non-monotonic: label drops then rises — PAVA should merge
        let mut cal = IsotonicCalibrator::new();
        let scores = vec![0.1, 0.2, 0.3, 0.4, 0.5];
        let labels = vec![0.2, 0.8, 0.3, 0.7, 0.9];
        cal.fit(&scores, &labels);
        assert!(cal.fitted);

        // After PAVA, output at 0.2 should not be > output at 0.3
        let c1 = cal.calibrate(0.2);
        let c2 = cal.calibrate(0.3);
        assert!(c2 >= c1 - 0.01, "c1={} c2={}", c1, c2);
    }

    #[test]
    fn test_isotonic_clamp_edges() {
        let mut cal = IsotonicCalibrator::new();
        let scores = vec![0.2, 0.5, 0.8];
        let labels = vec![0.1, 0.5, 0.9];
        cal.fit(&scores, &labels);

        // Below range → clamp to first breakpoint's label
        let low = cal.calibrate(0.0);
        assert!((low - 0.1).abs() < 0.01, "low={}", low);

        // Above range → clamp to last breakpoint's label
        let high = cal.calibrate(1.0);
        assert!((high - 0.9).abs() < 0.01, "high={}", high);
    }

    #[test]
    fn test_isotonic_monotonic_output() {
        let mut cal = IsotonicCalibrator::new();
        // Deliberately non-monotonic labels
        let scores = vec![0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
        let labels = vec![0.5, 0.3, 0.6, 0.2, 0.7, 0.4, 0.8, 0.5, 0.9];
        cal.fit(&scores, &labels);

        // Verify output is non-decreasing
        let mut prev = f32::NEG_INFINITY;
        for i in 0..100 {
            let s = i as f32 / 100.0;
            let c = cal.calibrate(s);
            assert!(c >= prev - 1e-6, "non-monotonic at s={}: prev={} c={}", s, prev, c);
            prev = c;
        }
    }

    #[test]
    fn test_isotonic_unfitted_passthrough() {
        let cal = IsotonicCalibrator::new();
        assert!(!cal.fitted);
        assert_eq!(cal.calibrate(0.42), 0.42);
        assert_eq!(cal.calibrate(0.99), 0.99);
    }

    #[test]
    fn test_isotonic_batch() {
        let mut cal = IsotonicCalibrator::new();
        let scores = vec![0.1, 0.3, 0.5, 0.7, 0.9];
        let labels = vec![0.1, 0.3, 0.5, 0.7, 0.9];
        cal.fit(&scores, &labels);

        let mut batch = ContactBatch::new();
        batch.count = 3;
        batch.scores[0] = 30.0; // 0.30 normalized
        batch.scores[1] = 70.0; // 0.70 normalized
        batch.scores[2] = 50.0; // 0.50 normalized

        cal.calibrate_batch(&mut batch);

        // Ordering should be preserved
        assert!(batch.scores[1] > batch.scores[2], "1={} 2={}", batch.scores[1], batch.scores[2]);
        assert!(batch.scores[2] > batch.scores[0], "2={} 0={}", batch.scores[2], batch.scores[0]);
    }

    #[test]
    fn test_isotonic_single_point() {
        let mut cal = IsotonicCalibrator::new();
        cal.fit(&[0.5], &[0.8]);
        assert!(cal.fitted);
        // Single breakpoint: everything maps to 0.8
        assert!((cal.calibrate(0.5) - 0.8).abs() < 0.01);
        assert!((cal.calibrate(0.0) - 0.8).abs() < 0.01); // clamped to edge
        assert!((cal.calibrate(1.0) - 0.8).abs() < 0.01); // clamped to edge
    }

    #[test]
    fn test_backward_compat() {
        // Verify existing compute_scores still works identically
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 2;
        matcher.populate_slot(&mut batch, 0, "AI SaaS", 100, "CTO", "Engineering", "rust, python", "verified", 3);
        matcher.populate_slot(&mut batch, 1, "Mining", 5, "Intern", "Sales", "excel", "unknown", 365);
        batch.compute_scores();
        assert!(batch.scores[0] > batch.scores[1]);
        assert!(batch.scores[0] > 0.0);
    }

    // ── HfCompanySignals tests ──

    #[test]
    fn test_hf_signals_from_raw() {
        let sig = HfCompanySignals::from_raw(0.72, 15, 4, 0.85, true, 3, 2);
        assert!((sig.hf_score - 0.72).abs() < 1e-6);
        assert!(sig.model_depth > 0.0 && sig.model_depth <= 1.0);
        assert!((sig.training_depth - 0.8).abs() < 1e-6); // 4/5
        assert!((sig.maturity - 0.85).abs() < 1e-6);
        assert_eq!(sig.research, 1.0); // has_pretraining = true
        assert!((sig.sales_relevance - (2.0 / 3.0)).abs() < 1e-6);
    }

    #[test]
    fn test_hf_signals_zero() {
        let sig = HfCompanySignals::from_raw(0.0, 0, 0, 0.0, false, 0, 0);
        assert_eq!(sig.hf_score, 0.0);
        assert_eq!(sig.model_depth, 0.0);
        assert_eq!(sig.training_depth, 0.0);
        assert_eq!(sig.maturity, 0.0);
        assert_eq!(sig.research, 0.0);
        assert_eq!(sig.sales_relevance, 0.0);
    }

    #[test]
    fn test_hf_signals_clamped() {
        let sig = HfCompanySignals::from_raw(1.5, 100, 20, 1.5, true, 100, 100);
        assert_eq!(sig.hf_score, 1.0); // clamped
        assert_eq!(sig.model_depth, 1.0); // clamped
        assert_eq!(sig.training_depth, 1.0); // clamped
        assert_eq!(sig.maturity, 1.0); // clamped
        assert_eq!(sig.sales_relevance, 1.0); // clamped
    }

    #[test]
    fn test_hf_signals_boost_score() {
        let scorer = LogisticScorer::default_pretrained();
        let matcher = IcpMatcher::default();

        let mut batch = ContactBatch::new();
        batch.count = 2;

        // Same contact features for both
        matcher.populate_slot(&mut batch, 0, "AI SaaS", 100, "CTO", "Engineering", "rust, python", "verified", 3);
        matcher.populate_slot(&mut batch, 1, "AI SaaS", 100, "CTO", "Engineering", "rust, python", "verified", 3);

        // Only slot 0 gets HF signals
        let hf = HfCompanySignals::from_raw(0.85, 12, 4, 0.9, true, 2, 1);
        batch.populate_hf_slot(0, &hf);
        // Slot 1 has no HF signals (all zeros)

        scorer.score_batch(&mut batch);
        assert!(
            batch.scores[0] > batch.scores[1],
            "with_hf={} without_hf={}",
            batch.scores[0],
            batch.scores[1]
        );
    }

    #[test]
    fn test_hf_backward_compat_no_hf() {
        // Contacts with zero HF signals should rank same as before
        let scorer = LogisticScorer::default_pretrained();
        let matcher = IcpMatcher::default();

        let mut batch = ContactBatch::new();
        batch.count = 2;

        // Strong lead vs weak lead — no HF signals
        matcher.populate_slot(&mut batch, 0, "AI SaaS", 100, "CTO", "Engineering", "rust, python", "verified", 3);
        matcher.populate_slot(&mut batch, 1, "Mining", 5, "Intern", "Sales", "excel", "unknown", 365);

        scorer.score_batch(&mut batch);
        assert!(batch.scores[0] > batch.scores[1]);
    }

    #[test]
    fn test_hf_maturity_ordering() {
        let scorer = LogisticScorer::default_pretrained();
        let matcher = IcpMatcher::default();

        let mut batch = ContactBatch::new();
        batch.count = 3;

        // Same base features, different maturity levels
        for i in 0..3 {
            matcher.populate_slot(&mut batch, i, "AI", 100, "CTO", "Engineering", "python", "verified", 5);
            batch.hf_score[i] = 0.7;
            batch.hf_model_depth[i] = 0.5;
            batch.hf_training_depth[i] = 0.5;
            batch.hf_research[i] = 1.0;
            batch.hf_sales_relevance[i] = 0.3;
        }
        batch.hf_maturity[0] = 1.0;  // Production
        batch.hf_maturity[1] = 0.7;  // Moderate
        batch.hf_maturity[2] = 0.15; // Trivial

        scorer.score_batch(&mut batch);
        assert!(batch.scores[0] > batch.scores[1], "prod={} mod={}", batch.scores[0], batch.scores[1]);
        assert!(batch.scores[1] > batch.scores[2], "mod={} triv={}", batch.scores[1], batch.scores[2]);
    }

    #[test]
    fn test_populate_hf_slot() {
        let mut batch = ContactBatch::new();
        batch.count = 1;
        let hf = HfCompanySignals::from_raw(0.65, 8, 3, 0.7, false, 2, 1);
        batch.populate_hf_slot(0, &hf);
        assert!((batch.hf_score[0] - 0.65).abs() < 1e-6);
        assert!(batch.hf_model_depth[0] > 0.0);
        assert!((batch.hf_training_depth[0] - 0.6).abs() < 1e-6); // 3/5
        assert!((batch.hf_maturity[0] - 0.7).abs() < 1e-6);
        assert_eq!(batch.hf_research[0], 1.0); // arxiv_count=2 > 0
        assert!((batch.hf_sales_relevance[0] - (1.0 / 3.0)).abs() < 1e-6);
    }

    #[test]
    fn test_icp_scoring_with_hf_weight() {
        let mut batch = ContactBatch::new();
        batch.count = 2;

        // Both have same base features (no ICP match at all)
        batch.recency_days[0] = 30;
        batch.recency_days[1] = 30;

        // Only slot 0 has HF signal
        batch.hf_score[0] = 0.9;

        let icp = IcpProfile::default();
        batch.compute_scores_with(&icp);

        // Slot 0 should score higher because of HF contribution
        assert!(
            batch.scores[0] > batch.scores[1],
            "with_hf={} without_hf={}",
            batch.scores[0],
            batch.scores[1]
        );
    }
}
