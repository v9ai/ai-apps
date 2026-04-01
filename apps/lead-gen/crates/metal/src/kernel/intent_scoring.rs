use serde::{Deserialize, Serialize};

/// The 6 intent signal categories.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SignalType {
    HiringIntent,
    TechAdoption,
    GrowthSignal,
    BudgetCycle,
    LeadershipChange,
    ProductLaunch,
}

impl SignalType {
    /// Default decay half-life in days for this signal type.
    pub fn default_decay_days(&self) -> u16 {
        match self {
            Self::HiringIntent => 30,
            Self::TechAdoption => 60,
            Self::GrowthSignal => 45,
            Self::BudgetCycle => 90,
            Self::LeadershipChange => 60,
            Self::ProductLaunch => 30,
        }
    }

    /// Index into weight/score arrays.
    pub fn index(&self) -> usize {
        match self {
            Self::HiringIntent => 0,
            Self::TechAdoption => 1,
            Self::GrowthSignal => 2,
            Self::BudgetCycle => 3,
            Self::LeadershipChange => 4,
            Self::ProductLaunch => 5,
        }
    }

    pub const ALL: [SignalType; 6] = [
        Self::HiringIntent, Self::TechAdoption, Self::GrowthSignal,
        Self::BudgetCycle, Self::LeadershipChange, Self::ProductLaunch,
    ];
}

/// Category weights for intent score aggregation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentWeights {
    pub hiring_intent: f32,      // 30.0
    pub tech_adoption: f32,      // 20.0
    pub growth_signal: f32,      // 25.0
    pub budget_cycle: f32,       // 15.0
    pub leadership_change: f32,  // 5.0
    pub product_launch: f32,     // 5.0
}

impl Default for IntentWeights {
    fn default() -> Self {
        Self {
            hiring_intent: 30.0,
            tech_adoption: 20.0,
            growth_signal: 25.0,
            budget_cycle: 15.0,
            leadership_change: 5.0,
            product_launch: 5.0,
        }
    }
}

impl IntentWeights {
    pub fn weight_for(&self, signal: SignalType) -> f32 {
        match signal {
            SignalType::HiringIntent => self.hiring_intent,
            SignalType::TechAdoption => self.tech_adoption,
            SignalType::GrowthSignal => self.growth_signal,
            SignalType::BudgetCycle => self.budget_cycle,
            SignalType::LeadershipChange => self.leadership_change,
            SignalType::ProductLaunch => self.product_launch,
        }
    }

    pub fn total(&self) -> f32 {
        self.hiring_intent + self.tech_adoption + self.growth_signal
            + self.budget_cycle + self.leadership_change + self.product_launch
    }
}

/// A single detected intent signal.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentSignal {
    pub signal_type: SignalType,
    pub confidence: f32,
    pub detected_at_days: u16,  // days ago since detection
    pub decay_days: u16,        // half-life in days
}

/// Exponential decay for signal freshness.
/// Returns value in [0, 1] where 1 = just detected, 0.5 = at half-life.
pub fn signal_freshness(days_since: u16, half_life: u16) -> f32 {
    if half_life == 0 { return 0.0; }
    let k = 0.693_f32 / half_life as f32;  // ln(2)
    (-k * days_since as f32).exp()
}

/// Batch of companies for SIMD-friendly intent scoring (SoA layout).
/// Cache-line aligned for optimal NEON auto-vectorization.
#[repr(C, align(64))]
pub struct IntentBatch {
    // Per-category best-decayed-score (parallel arrays, max 256 companies)
    pub hiring_score: [f32; 256],
    pub tech_score: [f32; 256],
    pub growth_score: [f32; 256],
    pub budget_score: [f32; 256],
    pub leadership_score: [f32; 256],
    pub product_score: [f32; 256],
    pub signal_count: [u16; 256],

    // Output
    pub intent_scores: [f32; 256],  // 0..100

    pub count: usize,
}

impl IntentBatch {
    pub fn new() -> Self {
        unsafe { std::mem::zeroed() }
    }

    /// Aggregate signals for a single company slot.
    /// Takes the max decayed score per category (best signal wins).
    pub fn aggregate_signals(&mut self, idx: usize, signals: &[IntentSignal]) {
        // Reset
        self.hiring_score[idx] = 0.0;
        self.tech_score[idx] = 0.0;
        self.growth_score[idx] = 0.0;
        self.budget_score[idx] = 0.0;
        self.leadership_score[idx] = 0.0;
        self.product_score[idx] = 0.0;
        self.signal_count[idx] = signals.len() as u16;

        for signal in signals {
            let freshness = signal_freshness(signal.detected_at_days, signal.decay_days);
            let effective = signal.confidence * freshness;

            let slot = match signal.signal_type {
                SignalType::HiringIntent => &mut self.hiring_score[idx],
                SignalType::TechAdoption => &mut self.tech_score[idx],
                SignalType::GrowthSignal => &mut self.growth_score[idx],
                SignalType::BudgetCycle => &mut self.budget_score[idx],
                SignalType::LeadershipChange => &mut self.leadership_score[idx],
                SignalType::ProductLaunch => &mut self.product_score[idx],
            };

            if effective > *slot {
                *slot = effective;
            }
        }
    }

    /// Compute weighted intent scores for all companies in the batch.
    pub fn compute_scores(&mut self, weights: &IntentWeights) {
        let total_weight = weights.total();
        if total_weight == 0.0 { return; }

        for i in 0..self.count {
            let weighted = self.hiring_score[i] * weights.hiring_intent
                + self.tech_score[i] * weights.tech_adoption
                + self.growth_score[i] * weights.growth_signal
                + self.budget_score[i] * weights.budget_cycle
                + self.leadership_score[i] * weights.leadership_change
                + self.product_score[i] * weights.product_launch;

            self.intent_scores[i] = (weighted / total_weight) * 100.0;
        }
    }

    /// Return indices sorted by intent score descending.
    pub fn top_k(&self, k: usize) -> Vec<usize> {
        let mut indices: Vec<usize> = (0..self.count).collect();
        indices.sort_by(|&a, &b| {
            self.intent_scores[b]
                .partial_cmp(&self.intent_scores[a])
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        indices.truncate(k);
        indices
    }
}

// -- Intent Classifier (distilled logistic regression) --------

pub const NUM_INTENT_FEATURES: usize = 10;
pub const NUM_INTENT_LABELS: usize = 6;

/// Logistic intent classifier with distilled weights.
/// 6 independent logistic regressions (one per signal type).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentClassifier {
    pub weights: Vec<[f32; NUM_INTENT_FEATURES]>,
    pub biases: [f32; NUM_INTENT_LABELS],
    pub trained: bool,
}

impl IntentClassifier {
    /// Load weights from a JSON file, falling back to untrained on error.
    pub fn from_json(path: &std::path::Path) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    /// Persist weights to JSON.
    pub fn to_json(&self, path: &std::path::Path) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, json)
    }

    /// Classify a feature vector. Returns confidence per signal type.
    pub fn classify(&self, features: &[f32; NUM_INTENT_FEATURES]) -> [f32; NUM_INTENT_LABELS] {
        if !self.trained {
            return [0.0; NUM_INTENT_LABELS];
        }

        let mut scores = [0.0f32; NUM_INTENT_LABELS];
        for i in 0..NUM_INTENT_LABELS {
            let mut z = self.biases[i];
            for j in 0..NUM_INTENT_FEATURES {
                z += self.weights[i][j] * features[j];
            }
            scores[i] = sigmoid(z);
        }
        scores
    }

    /// Classify raw text by extracting features first.
    pub fn classify_text(&self, text: &str, source_type: &str, has_url: bool) -> Vec<(SignalType, f32)> {
        let features = extract_intent_features(text, source_type, has_url);
        let scores = self.classify(&features);

        let mut results = Vec::new();
        for (i, &score) in scores.iter().enumerate() {
            if score > 0.3 {
                results.push((SignalType::ALL[i], score));
            }
        }
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results
    }
}

impl Default for IntentClassifier {
    fn default() -> Self {
        Self {
            weights: vec![[0.0; NUM_INTENT_FEATURES]; NUM_INTENT_LABELS],
            biases: [0.0; NUM_INTENT_LABELS],
            trained: false,
        }
    }
}

fn sigmoid(x: f32) -> f32 {
    1.0 / (1.0 + (-x).exp())
}

// -- Feature extraction -----------------------------------------------

// Keyword lists matching the Python training pipeline
const HIRING_KW: &[&str] = &[
    "we're hiring", "we are hiring", "hiring for", "looking for",
    "open role", "open position", "join our team", "join us",
    "now hiring", "apply now", "expanding team", "new hires",
    "headcount", "growing our team", "building our team",
];

const TECH_KW: &[&str] = &[
    "migrating to", "adopting", "deployed", "switched to",
    "new stack", "infrastructure upgrade", "implementing",
    "rolling out", "upgrading to", "moving to",
];

const GROWTH_KW: &[&str] = &[
    "raised", "series a", "series b", "series c", "funding",
    "revenue growth", "ipo", "acquisition", "acquired",
    "new office", "expanding to", "growth stage",
];

const BUDGET_KW: &[&str] = &[
    "q1 planning", "annual budget", "rfp", "vendor evaluation",
    "procurement", "new fiscal year", "budget approved",
    "evaluating solutions",
];

const LEADERSHIP_KW: &[&str] = &[
    "new cto", "new vp", "appointed", "joined as",
    "promoted to", "new head of", "welcome our new",
    "announcing our new",
];

const PRODUCT_KW: &[&str] = &[
    "launching", "introducing", "announcing", "new product",
    "new feature", "beta release", "ga release", "just shipped",
    "now available", "public preview",
];

fn kw_density(text: &str, keywords: &[&str], word_count: usize) -> f32 {
    let hits = keywords.iter().filter(|kw| text.contains(**kw)).count();
    hits as f32 / word_count.max(1) as f32
}

/// Extract the 10-element feature vector matching the Python distillation script.
pub fn extract_intent_features(text: &str, source_type: &str, has_url: bool) -> [f32; NUM_INTENT_FEATURES] {
    let lower = text.to_lowercase();
    let word_count = lower.split_whitespace().count().max(1);

    let source_enc = match source_type {
        "company_snapshot" => 0.2f32,
        "linkedin_post" => 0.5,
        "company_fact" => 0.8,
        _ => 0.0,
    };

    // Entity density: ratio of capitalized words (proxy for named entities)
    let cap_count = text.split_whitespace()
        .filter(|w| w.len() > 1 && w.chars().next().map_or(false, |c| c.is_uppercase()))
        .count();
    let entity_density = cap_count as f32 / word_count as f32;

    [
        kw_density(&lower, HIRING_KW, word_count),
        kw_density(&lower, TECH_KW, word_count),
        kw_density(&lower, GROWTH_KW, word_count),
        kw_density(&lower, BUDGET_KW, word_count),
        kw_density(&lower, LEADERSHIP_KW, word_count),
        kw_density(&lower, PRODUCT_KW, word_count),
        (text.len() as f32 / 3000.0).min(1.0),
        if has_url { 1.0 } else { 0.0 },
        source_enc,
        entity_density,
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signal_freshness_at_zero() {
        let f = signal_freshness(0, 30);
        assert!((f - 1.0).abs() < 0.001, "freshness at day 0 should be ~1.0, got {f}");
    }

    #[test]
    fn test_signal_freshness_at_half_life() {
        let f = signal_freshness(30, 30);
        assert!((f - 0.5).abs() < 0.01, "freshness at half-life should be ~0.5, got {f}");
    }

    #[test]
    fn test_signal_freshness_decays() {
        let f1 = signal_freshness(10, 30);
        let f2 = signal_freshness(60, 30);
        assert!(f1 > f2, "older signals should have lower freshness");
    }

    #[test]
    fn test_signal_freshness_zero_half_life() {
        let f = signal_freshness(10, 0);
        assert!((f - 0.0).abs() < 0.001, "zero half-life should return 0");
    }

    #[test]
    fn test_intent_batch_empty() {
        let mut batch = IntentBatch::new();
        batch.count = 0;
        batch.compute_scores(&IntentWeights::default());
        // Should not panic
    }

    #[test]
    fn test_intent_batch_single_company() {
        let mut batch = IntentBatch::new();
        batch.count = 1;

        let signals = vec![
            IntentSignal { signal_type: SignalType::HiringIntent, confidence: 0.9, detected_at_days: 0, decay_days: 30 },
            IntentSignal { signal_type: SignalType::GrowthSignal, confidence: 0.7, detected_at_days: 10, decay_days: 45 },
        ];
        batch.aggregate_signals(0, &signals);
        batch.compute_scores(&IntentWeights::default());

        assert!(batch.intent_scores[0] > 0.0, "should have positive intent score");
        assert!(batch.intent_scores[0] <= 100.0, "should not exceed 100");
    }

    #[test]
    fn test_intent_batch_top_k() {
        let mut batch = IntentBatch::new();
        batch.count = 3;
        batch.intent_scores[0] = 50.0;
        batch.intent_scores[1] = 80.0;
        batch.intent_scores[2] = 30.0;

        let top = batch.top_k(2);
        assert_eq!(top, vec![1, 0]);
    }

    #[test]
    fn test_classifier_untrained() {
        let cls = IntentClassifier::default();
        assert!(!cls.trained);
        let scores = cls.classify(&[0.0; NUM_INTENT_FEATURES]);
        assert!(scores.iter().all(|&s| s == 0.0));
    }

    #[test]
    fn test_extract_features_hiring_text() {
        let text = "We're hiring for an open position! Join our team and apply now.";
        let features = extract_intent_features(text, "linkedin_post", true);
        // Hiring density should be highest
        assert!(features[0] > features[1], "hiring density should exceed tech density");
        assert!((features[7] - 1.0).abs() < 0.001, "has_url should be 1.0");
        assert!((features[8] - 0.5).abs() < 0.001, "linkedin_post source encoding");
    }

    #[test]
    fn test_signal_type_index_all() {
        for (i, st) in SignalType::ALL.iter().enumerate() {
            assert_eq!(st.index(), i);
        }
    }

    #[test]
    fn test_intent_weights_total() {
        let w = IntentWeights::default();
        assert!((w.total() - 100.0).abs() < 0.001, "default weights should sum to 100");
    }
}
