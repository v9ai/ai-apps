use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

// ── SIMD / Vectorized Batch Scoring ────────────────────────────────────────────

/// Pre-computed exponential decay look-up tables.
/// Index by day offset (0..255). Value = exp(-ln(2) * day / half_life).
/// Avoids repeated transcendental function calls in the hot scoring loop.
pub struct DecayLuts {
    /// Half-life = 30 days (HiringIntent, ProductLaunch)
    pub decay_30: [f32; 256],
    /// Half-life = 60 days (TechAdoption, LeadershipChange)
    pub decay_60: [f32; 256],
    /// Half-life = 90 days (BudgetCycle)
    pub decay_90: [f32; 256],
}

/// Category weights packed as a 6-element array for SIMD consumption.
/// Order: hiring, tech, growth, budget, leadership, product.
pub struct CategoryWeights {
    pub w: [f32; 6],
    pub total: f32,
}

impl CategoryWeights {
    pub fn from_intent_weights(iw: &IntentWeights) -> Self {
        let w = [
            iw.hiring_intent,
            iw.tech_adoption,
            iw.growth_signal,
            iw.budget_cycle,
            iw.leadership_change,
            iw.product_launch,
        ];
        Self { w, total: w.iter().sum() }
    }
}

/// Schraudolph fast exp approximation (IEEE 754 bit-level manipulation).
/// Accurate to ~4% relative error for x in [-87, 88].
/// Used as fallback when day offset exceeds LUT range (> 255 days).
#[inline(always)]
pub fn fast_exp_approx(x: f32) -> f32 {
    // Constants: 2^23 / ln(2) ≈ 12102203.16, and bias 127 * 2^23 = 1065353216
    const A: f32 = 12102203.16_f32;
    const B: f32 = 1065353216.0_f32; // 127 << 23
    const CLAMP_LO: f32 = -87.0;
    const CLAMP_HI: f32 = 88.0;
    let x = x.clamp(CLAMP_LO, CLAMP_HI);
    let bits = (A * x + B) as i32;
    f32::from_bits(bits as u32)
}

fn build_decay_lut(half_life: f32) -> [f32; 256] {
    let k = std::f32::consts::LN_2 / half_life;
    let mut lut = [0.0f32; 256];
    for day in 0..256 {
        lut[day] = (-k * day as f32).exp();
    }
    lut
}

/// Initialize decay LUTs. Called once, cached globally.
pub fn init_decay_luts() -> &'static DecayLuts {
    static LUTS: OnceLock<DecayLuts> = OnceLock::new();
    LUTS.get_or_init(|| DecayLuts {
        decay_30: build_decay_lut(30.0),
        decay_60: build_decay_lut(60.0),
        decay_90: build_decay_lut(90.0),
    })
}

impl DecayLuts {
    /// Look up decay factor for a given day offset and half-life.
    /// Falls back to fast_exp_approx for days >= 256.
    #[inline(always)]
    pub fn lookup(&self, days: u16, half_life: u16) -> f32 {
        let lut = match half_life {
            30 => &self.decay_30,
            60 => &self.decay_60,
            90 => &self.decay_90,
            _ => {
                // Arbitrary half-life: use fast approximation
                let k = std::f32::consts::LN_2 / half_life as f32;
                return fast_exp_approx(-k * days as f32);
            }
        };
        if (days as usize) < 256 {
            lut[days as usize]
        } else {
            let k = std::f32::consts::LN_2 / half_life as f32;
            fast_exp_approx(-k * days as f32)
        }
    }
}

/// Fused batch scoring: processes all 256 companies in a single vectorized pass.
///
/// For each company slot i (0..batch.count), computes:
///   score[i] = sum_over_categories(signal_strength[cat][i] * weight[cat]) / total_weight * 100
///
/// The inner loop is structured for LLVM auto-vectorization:
/// - 4x unrolled accumulation
/// - Contiguous f32 array reads (SoA layout)
/// - No branches in the hot path
///
/// On aarch64 with NEON, this compiles to fused multiply-accumulate (FMLA) instructions.
pub fn score_intent_batch_simd(
    batch: &IntentBatch,
    weights: &CategoryWeights,
    _decay_luts: &DecayLuts,
) -> [f32; 256] {
    let mut out = [0.0f32; 256];
    if weights.total == 0.0 || batch.count == 0 {
        return out;
    }

    let inv_total = 100.0 / weights.total;
    let n = batch.count.min(256);

    // Process 4 companies at a time for instruction-level parallelism.
    // LLVM will map this to NEON FMLA on aarch64 or SSE/AVX FMA on x86.
    let chunks = n / 4;
    let remainder = n % 4;

    for chunk in 0..chunks {
        let base = chunk * 4;

        // Unrolled 4x: accumulate weighted scores
        let mut acc0 = 0.0f32;
        let mut acc1 = 0.0f32;
        let mut acc2 = 0.0f32;
        let mut acc3 = 0.0f32;

        // Category 0: hiring
        acc0 += batch.hiring_score[base]     * weights.w[0];
        acc1 += batch.hiring_score[base + 1] * weights.w[0];
        acc2 += batch.hiring_score[base + 2] * weights.w[0];
        acc3 += batch.hiring_score[base + 3] * weights.w[0];

        // Category 1: tech
        acc0 += batch.tech_score[base]     * weights.w[1];
        acc1 += batch.tech_score[base + 1] * weights.w[1];
        acc2 += batch.tech_score[base + 2] * weights.w[1];
        acc3 += batch.tech_score[base + 3] * weights.w[1];

        // Category 2: growth
        acc0 += batch.growth_score[base]     * weights.w[2];
        acc1 += batch.growth_score[base + 1] * weights.w[2];
        acc2 += batch.growth_score[base + 2] * weights.w[2];
        acc3 += batch.growth_score[base + 3] * weights.w[2];

        // Category 3: budget
        acc0 += batch.budget_score[base]     * weights.w[3];
        acc1 += batch.budget_score[base + 1] * weights.w[3];
        acc2 += batch.budget_score[base + 2] * weights.w[3];
        acc3 += batch.budget_score[base + 3] * weights.w[3];

        // Category 4: leadership
        acc0 += batch.leadership_score[base]     * weights.w[4];
        acc1 += batch.leadership_score[base + 1] * weights.w[4];
        acc2 += batch.leadership_score[base + 2] * weights.w[4];
        acc3 += batch.leadership_score[base + 3] * weights.w[4];

        // Category 5: product
        acc0 += batch.product_score[base]     * weights.w[5];
        acc1 += batch.product_score[base + 1] * weights.w[5];
        acc2 += batch.product_score[base + 2] * weights.w[5];
        acc3 += batch.product_score[base + 3] * weights.w[5];

        out[base]     = acc0 * inv_total;
        out[base + 1] = acc1 * inv_total;
        out[base + 2] = acc2 * inv_total;
        out[base + 3] = acc3 * inv_total;
    }

    // Handle remainder (0-3 companies)
    let rem_base = chunks * 4;
    for i in 0..remainder {
        let idx = rem_base + i;
        let acc = batch.hiring_score[idx]     * weights.w[0]
                + batch.tech_score[idx]        * weights.w[1]
                + batch.growth_score[idx]      * weights.w[2]
                + batch.budget_score[idx]      * weights.w[3]
                + batch.leadership_score[idx]  * weights.w[4]
                + batch.product_score[idx]     * weights.w[5];
        out[idx] = acc * inv_total;
    }

    out
}

/// aarch64 NEON intrinsics path for batch scoring.
/// Uses 128-bit SIMD registers (float32x4_t) for 4-wide multiply-accumulate.
#[cfg(target_arch = "aarch64")]
pub fn score_intent_batch_neon(
    batch: &IntentBatch,
    weights: &CategoryWeights,
    _decay_luts: &DecayLuts,
) -> [f32; 256] {
    use std::arch::aarch64::*;

    let mut out = [0.0f32; 256];
    if weights.total == 0.0 || batch.count == 0 {
        return out;
    }

    let inv_total = 100.0 / weights.total;
    let n = batch.count.min(256);
    let chunks = n / 4;

    unsafe {
        let v_inv = vdupq_n_f32(inv_total);
        let w0 = vdupq_n_f32(weights.w[0]);
        let w1 = vdupq_n_f32(weights.w[1]);
        let w2 = vdupq_n_f32(weights.w[2]);
        let w3 = vdupq_n_f32(weights.w[3]);
        let w4 = vdupq_n_f32(weights.w[4]);
        let w5 = vdupq_n_f32(weights.w[5]);

        for chunk in 0..chunks {
            let base = chunk * 4;

            // Load 4 floats from each signal array
            let h = vld1q_f32(batch.hiring_score.as_ptr().add(base));
            let t = vld1q_f32(batch.tech_score.as_ptr().add(base));
            let g = vld1q_f32(batch.growth_score.as_ptr().add(base));
            let b = vld1q_f32(batch.budget_score.as_ptr().add(base));
            let l = vld1q_f32(batch.leadership_score.as_ptr().add(base));
            let p = vld1q_f32(batch.product_score.as_ptr().add(base));

            // Fused multiply-accumulate: acc = h*w0 + t*w1 + g*w2 + b*w3 + l*w4 + p*w5
            let mut acc = vmulq_f32(h, w0);
            acc = vfmaq_f32(acc, t, w1);
            acc = vfmaq_f32(acc, g, w2);
            acc = vfmaq_f32(acc, b, w3);
            acc = vfmaq_f32(acc, l, w4);
            acc = vfmaq_f32(acc, p, w5);

            // Normalize: score = acc * (100 / total_weight)
            let result = vmulq_f32(acc, v_inv);
            vst1q_f32(out.as_mut_ptr().add(base), result);
        }
    }

    // Scalar remainder
    let rem_base = chunks * 4;
    for idx in rem_base..n {
        let acc = batch.hiring_score[idx]     * weights.w[0]
                + batch.tech_score[idx]        * weights.w[1]
                + batch.growth_score[idx]      * weights.w[2]
                + batch.budget_score[idx]      * weights.w[3]
                + batch.leadership_score[idx]  * weights.w[4]
                + batch.product_score[idx]     * weights.w[5];
        out[idx] = acc * inv_total;
    }

    out
}

/// Dispatch to best available SIMD path.
pub fn score_intent_batch_best(
    batch: &IntentBatch,
    weights: &CategoryWeights,
    decay_luts: &DecayLuts,
) -> [f32; 256] {
    #[cfg(target_arch = "aarch64")]
    {
        score_intent_batch_neon(batch, weights, decay_luts)
    }
    #[cfg(not(target_arch = "aarch64"))]
    {
        score_intent_batch_simd(batch, weights, decay_luts)
    }
}

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

    /// Aggregate signals using pre-computed decay LUTs (avoids exp() calls).
    pub fn aggregate_signals_lut(&mut self, idx: usize, signals: &[IntentSignal], luts: &DecayLuts) {
        self.hiring_score[idx] = 0.0;
        self.tech_score[idx] = 0.0;
        self.growth_score[idx] = 0.0;
        self.budget_score[idx] = 0.0;
        self.leadership_score[idx] = 0.0;
        self.product_score[idx] = 0.0;
        self.signal_count[idx] = signals.len() as u16;

        for signal in signals {
            let freshness = luts.lookup(signal.detected_at_days, signal.decay_days);
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

    /// Compute scores using the SIMD-optimized fused path.
    /// Dispatches to NEON intrinsics on aarch64, 4x-unrolled scalar otherwise.
    pub fn compute_scores_simd(&mut self, weights: &IntentWeights) {
        let cw = CategoryWeights::from_intent_weights(weights);
        let luts = init_decay_luts();
        let scores = score_intent_batch_best(self, &cw, luts);
        self.intent_scores = scores;
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

// -- Semantic Intent Features (BGE embeddings) ---------------------------------

/// Extended feature count: 10 keyword + 6 semantic cosine similarities.
pub const NUM_SEMANTIC_INTENT_FEATURES: usize = 16;

/// Pre-computed prototype embeddings for each intent type.
/// These are the mean embeddings of representative texts per signal category,
/// generated by `mlx-training/export_intent_prototypes.py`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentPrototypes {
    /// 6 prototype embeddings, one per signal type. Each is 384-dim (BGE).
    pub prototypes: Vec<Vec<f32>>,
    pub dim: usize,
}

impl IntentPrototypes {
    pub fn from_json(path: &std::path::Path) -> Option<Self> {
        std::fs::read_to_string(path).ok()
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    pub fn cosine_similarity(&self, signal: SignalType, embedding: &[f32]) -> f32 {
        let proto = &self.prototypes[signal.index()];
        if proto.len() != embedding.len() { return 0.0; }
        let dot: f32 = proto.iter().zip(embedding).map(|(a, b)| a * b).sum();
        let norm_a: f32 = proto.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm_a < 1e-10 || norm_b < 1e-10 { return 0.0; }
        dot / (norm_a * norm_b)
    }
}

/// Semantic intent classifier — extends keyword features with embedding cosine similarities.
/// Uses 16-element feature vector: [10 keyword features | 6 semantic cosine sims].
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticIntentClassifier {
    pub weights: Vec<[f32; NUM_SEMANTIC_INTENT_FEATURES]>,
    pub biases: [f32; NUM_INTENT_LABELS],
    pub trained: bool,
}

impl SemanticIntentClassifier {
    pub fn from_json(path: &std::path::Path) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn to_json(&self, path: &std::path::Path) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, json)
    }

    pub fn classify(&self, features: &[f32; NUM_SEMANTIC_INTENT_FEATURES]) -> [f32; NUM_INTENT_LABELS] {
        if !self.trained {
            return [0.0; NUM_INTENT_LABELS];
        }
        let mut scores = [0.0f32; NUM_INTENT_LABELS];
        for i in 0..NUM_INTENT_LABELS {
            let mut z = self.biases[i];
            for j in 0..NUM_SEMANTIC_INTENT_FEATURES {
                z += self.weights[i][j] * features[j];
            }
            scores[i] = sigmoid(z);
        }
        scores
    }

    pub fn classify_text(
        &self,
        text: &str,
        source_type: &str,
        has_url: bool,
        prototypes: &IntentPrototypes,
        embedding: &[f32],
    ) -> Vec<(SignalType, f32)> {
        let features = extract_semantic_intent_features(text, source_type, has_url, prototypes, embedding);
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

impl Default for SemanticIntentClassifier {
    fn default() -> Self {
        Self {
            weights: vec![[0.0; NUM_SEMANTIC_INTENT_FEATURES]; NUM_INTENT_LABELS],
            biases: [0.0; NUM_INTENT_LABELS],
            trained: false,
        }
    }
}

/// Extract the 16-element feature vector: [10 keyword features | 6 semantic sims].
/// The first 10 features match `extract_intent_features()` exactly.
/// Features 10-15 are cosine similarities between the text embedding and intent prototypes.
pub fn extract_semantic_intent_features(
    text: &str,
    source_type: &str,
    has_url: bool,
    prototypes: &IntentPrototypes,
    embedding: &[f32],
) -> [f32; NUM_SEMANTIC_INTENT_FEATURES] {
    let keyword_features = extract_intent_features(text, source_type, has_url);

    let mut features = [0.0f32; NUM_SEMANTIC_INTENT_FEATURES];
    features[..NUM_INTENT_FEATURES].copy_from_slice(&keyword_features);

    // Semantic cosine similarities against intent prototypes
    for signal_type in SignalType::ALL {
        let sim = prototypes.cosine_similarity(signal_type, embedding);
        features[NUM_INTENT_FEATURES + signal_type.index()] = sim;
    }

    features
}

/// Semantic extension to IntentBatch: per-company semantic similarity scores.
#[repr(C, align(64))]
pub struct SemanticIntentBatch {
    /// Base intent batch with keyword-based scores.
    pub base: IntentBatch,

    /// Per-signal semantic cosine similarity (parallel arrays, max 256 companies)
    pub semantic_hiring: [f32; 256],
    pub semantic_tech: [f32; 256],
    pub semantic_growth: [f32; 256],
    pub semantic_budget: [f32; 256],
    pub semantic_leadership: [f32; 256],
    pub semantic_product: [f32; 256],
}

impl SemanticIntentBatch {
    pub fn new() -> Self {
        unsafe { std::mem::zeroed() }
    }

    /// Set semantic similarity scores for a company slot.
    pub fn set_semantic_scores(&mut self, idx: usize, prototypes: &IntentPrototypes, embedding: &[f32]) {
        self.semantic_hiring[idx] = prototypes.cosine_similarity(SignalType::HiringIntent, embedding);
        self.semantic_tech[idx] = prototypes.cosine_similarity(SignalType::TechAdoption, embedding);
        self.semantic_growth[idx] = prototypes.cosine_similarity(SignalType::GrowthSignal, embedding);
        self.semantic_budget[idx] = prototypes.cosine_similarity(SignalType::BudgetCycle, embedding);
        self.semantic_leadership[idx] = prototypes.cosine_similarity(SignalType::LeadershipChange, embedding);
        self.semantic_product[idx] = prototypes.cosine_similarity(SignalType::ProductLaunch, embedding);
    }

    /// Compute intent scores using combined keyword + semantic signals.
    /// Semantic scores blend with keyword scores: effective = max(keyword, semantic * boost).
    pub fn compute_blended_scores(&mut self, weights: &IntentWeights, semantic_boost: f32) {
        let total_weight = weights.total();
        if total_weight == 0.0 { return; }

        for i in 0..self.base.count {
            let hiring = self.base.hiring_score[i].max(self.semantic_hiring[i] * semantic_boost);
            let tech = self.base.tech_score[i].max(self.semantic_tech[i] * semantic_boost);
            let growth = self.base.growth_score[i].max(self.semantic_growth[i] * semantic_boost);
            let budget = self.base.budget_score[i].max(self.semantic_budget[i] * semantic_boost);
            let leadership = self.base.leadership_score[i].max(self.semantic_leadership[i] * semantic_boost);
            let product = self.base.product_score[i].max(self.semantic_product[i] * semantic_boost);

            let weighted = hiring * weights.hiring_intent
                + tech * weights.tech_adoption
                + growth * weights.growth_signal
                + budget * weights.budget_cycle
                + leadership * weights.leadership_change
                + product * weights.product_launch;

            self.base.intent_scores[i] = (weighted / total_weight) * 100.0;
        }
    }
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

    #[test]
    fn test_semantic_classifier_untrained() {
        let cls = SemanticIntentClassifier::default();
        assert!(!cls.trained);
        let scores = cls.classify(&[0.0; NUM_SEMANTIC_INTENT_FEATURES]);
        assert!(scores.iter().all(|&s| s == 0.0));
    }

    #[test]
    fn test_extract_semantic_features_extends_keyword() {
        let prototypes = IntentPrototypes {
            prototypes: vec![vec![1.0, 0.0, 0.0]; 6],
            dim: 3,
        };
        let embedding = vec![1.0, 0.0, 0.0]; // identical to prototypes

        let features = extract_semantic_intent_features(
            "We're hiring for a new position",
            "linkedin_post",
            false,
            &prototypes,
            &embedding,
        );

        // First 10 features should match keyword extraction
        let kw_features = extract_intent_features("We're hiring for a new position", "linkedin_post", false);
        for i in 0..NUM_INTENT_FEATURES {
            assert!((features[i] - kw_features[i]).abs() < 1e-6, "feature {} mismatch", i);
        }

        // Semantic features should be 1.0 (identical vectors)
        for i in NUM_INTENT_FEATURES..NUM_SEMANTIC_INTENT_FEATURES {
            assert!((features[i] - 1.0).abs() < 1e-6, "semantic feature {} should be 1.0, got {}", i, features[i]);
        }
    }

    #[test]
    fn test_semantic_batch_blended_scores() {
        let mut batch = SemanticIntentBatch::new();
        batch.base.count = 1;

        // Company with no keyword signals but strong semantic signal
        batch.base.hiring_score[0] = 0.0;
        batch.semantic_hiring[0] = 0.8;

        batch.compute_blended_scores(&IntentWeights::default(), 1.0);
        assert!(batch.base.intent_scores[0] > 0.0, "semantic should contribute even without keywords");
    }

    #[test]
    fn test_intent_prototypes_cosine() {
        let prototypes = IntentPrototypes {
            prototypes: vec![
                vec![1.0, 0.0, 0.0], // hiring
                vec![0.0, 1.0, 0.0], // tech
                vec![0.0, 0.0, 1.0], // growth
                vec![0.5, 0.5, 0.0], // budget
                vec![0.0, 0.5, 0.5], // leadership
                vec![0.5, 0.0, 0.5], // product
            ],
            dim: 3,
        };

        let embedding = vec![1.0, 0.0, 0.0];
        let sim = prototypes.cosine_similarity(SignalType::HiringIntent, &embedding);
        assert!((sim - 1.0).abs() < 1e-6, "should be 1.0 for identical direction");

        let sim_ortho = prototypes.cosine_similarity(SignalType::TechAdoption, &embedding);
        assert!(sim_ortho.abs() < 1e-6, "should be 0.0 for orthogonal");
    }

    // ── Decay LUT tests ────────────────────────────────────────────────────

    #[test]
    fn test_decay_luts_init() {
        let luts = init_decay_luts();
        // Day 0 should always be 1.0
        assert!((luts.decay_30[0] - 1.0).abs() < 1e-6);
        assert!((luts.decay_60[0] - 1.0).abs() < 1e-6);
        assert!((luts.decay_90[0] - 1.0).abs() < 1e-6);
        // At half-life, value should be ~0.5
        assert!((luts.decay_30[30] - 0.5).abs() < 0.01, "decay_30[30] = {}", luts.decay_30[30]);
        assert!((luts.decay_60[60] - 0.5).abs() < 0.01, "decay_60[60] = {}", luts.decay_60[60]);
        assert!((luts.decay_90[90] - 0.5).abs() < 0.01, "decay_90[90] = {}", luts.decay_90[90]);
    }

    #[test]
    fn test_decay_lut_matches_signal_freshness() {
        let luts = init_decay_luts();
        // LUT values should match signal_freshness() within f32 precision
        for day in [0u16, 1, 5, 15, 29, 30, 60, 90, 120, 200, 255] {
            let lut_val = luts.lookup(day, 30);
            let ref_val = signal_freshness(day, 30);
            assert!((lut_val - ref_val).abs() < 1e-5,
                "day={day}: lut={lut_val} vs ref={ref_val}");
        }
    }

    #[test]
    fn test_decay_lut_arbitrary_halflife() {
        let luts = init_decay_luts();
        // Half-life 45 is not pre-computed; should fall back to fast_exp_approx
        let val = luts.lookup(45, 45);
        let ref_val = signal_freshness(45, 45);
        assert!((val - ref_val).abs() < 0.05,
            "arbitrary half-life: got {val}, expected ~{ref_val}");
    }

    #[test]
    fn test_decay_lut_beyond_256() {
        let luts = init_decay_luts();
        let val = luts.lookup(300, 30);
        let ref_val = signal_freshness(300, 30);
        // fast_exp_approx is approximate, allow 5% relative error
        let rel_err = if ref_val.abs() > 1e-10 { (val - ref_val).abs() / ref_val } else { val.abs() };
        assert!(rel_err < 0.05 || val.abs() < 1e-6,
            "day=300: got {val}, expected ~{ref_val}, rel_err={rel_err}");
    }

    // ── fast_exp_approx tests ──────────────────────────────────────────────

    #[test]
    fn test_fast_exp_approx_zero() {
        let val = fast_exp_approx(0.0);
        assert!((val - 1.0).abs() < 0.05, "exp(0) should be ~1.0, got {val}");
    }

    #[test]
    fn test_fast_exp_approx_negative() {
        let val = fast_exp_approx(-1.0);
        let expected = (-1.0f32).exp();
        let rel_err = (val - expected).abs() / expected;
        assert!(rel_err < 0.05, "exp(-1): got {val}, expected {expected}, rel_err={rel_err}");
    }

    #[test]
    fn test_fast_exp_approx_clamps() {
        // Should not panic or produce NaN/Inf
        let lo = fast_exp_approx(-100.0);
        let hi = fast_exp_approx(100.0);
        assert!(lo.is_finite(), "clamped low should be finite");
        assert!(hi.is_finite(), "clamped high should be finite");
        assert!(lo >= 0.0);
    }

    // ── SIMD batch scoring tests ───────────────────────────────────────────

    #[test]
    fn test_score_intent_batch_simd_matches_scalar() {
        let mut batch = IntentBatch::new();
        batch.count = 8;

        // Fill with deterministic test data
        for i in 0..8 {
            batch.hiring_score[i] = 0.1 * (i + 1) as f32;
            batch.tech_score[i] = 0.05 * (i + 1) as f32;
            batch.growth_score[i] = 0.08 * (i + 1) as f32;
            batch.budget_score[i] = 0.03 * (i + 1) as f32;
            batch.leadership_score[i] = 0.02 * (i + 1) as f32;
            batch.product_score[i] = 0.01 * (i + 1) as f32;
        }

        let weights = IntentWeights::default();

        // Scalar path
        let mut scalar_batch = IntentBatch::new();
        scalar_batch.count = 8;
        scalar_batch.hiring_score = batch.hiring_score;
        scalar_batch.tech_score = batch.tech_score;
        scalar_batch.growth_score = batch.growth_score;
        scalar_batch.budget_score = batch.budget_score;
        scalar_batch.leadership_score = batch.leadership_score;
        scalar_batch.product_score = batch.product_score;
        scalar_batch.compute_scores(&weights);

        // SIMD path
        let cw = CategoryWeights::from_intent_weights(&weights);
        let luts = init_decay_luts();
        let simd_scores = score_intent_batch_simd(&batch, &cw, luts);

        for i in 0..8 {
            assert!((simd_scores[i] - scalar_batch.intent_scores[i]).abs() < 1e-4,
                "slot {i}: simd={} scalar={}", simd_scores[i], scalar_batch.intent_scores[i]);
        }
    }

    #[test]
    fn test_score_intent_batch_simd_full_256() {
        let mut batch = IntentBatch::new();
        batch.count = 256;
        for i in 0..256 {
            let t = i as f32 / 256.0;
            batch.hiring_score[i] = t;
            batch.tech_score[i] = 1.0 - t;
            batch.growth_score[i] = t * 0.5;
            batch.budget_score[i] = (1.0 - t) * 0.3;
            batch.leadership_score[i] = t * 0.1;
            batch.product_score[i] = 0.05;
        }

        let weights = IntentWeights::default();
        let cw = CategoryWeights::from_intent_weights(&weights);
        let luts = init_decay_luts();
        let scores = score_intent_batch_simd(&batch, &cw, luts);

        // Verify all scores are in valid range
        for i in 0..256 {
            assert!(scores[i] >= 0.0 && scores[i] <= 100.0,
                "slot {i}: score {} out of range", scores[i]);
        }
    }

    #[test]
    fn test_score_intent_batch_simd_remainder() {
        // Non-multiple-of-4 count to exercise remainder path
        let mut batch = IntentBatch::new();
        batch.count = 7; // 4 + 3 remainder
        for i in 0..7 {
            batch.hiring_score[i] = 0.5;
            batch.tech_score[i] = 0.5;
            batch.growth_score[i] = 0.5;
            batch.budget_score[i] = 0.5;
            batch.leadership_score[i] = 0.5;
            batch.product_score[i] = 0.5;
        }

        let weights = IntentWeights::default();
        let cw = CategoryWeights::from_intent_weights(&weights);
        let luts = init_decay_luts();
        let scores = score_intent_batch_simd(&batch, &cw, luts);

        // All active slots should have equal scores (all inputs identical)
        for i in 0..7 {
            assert!((scores[i] - scores[0]).abs() < 1e-6,
                "slot {i}: {} != slot 0: {}", scores[i], scores[0]);
        }
        // Score should be 50.0 (all signals = 0.5, weighted average = 0.5, * 100 = 50)
        assert!((scores[0] - 50.0).abs() < 0.01, "expected 50.0, got {}", scores[0]);
    }

    #[test]
    fn test_score_intent_batch_best_dispatch() {
        // Verify best-dispatch produces same results as portable SIMD
        let mut batch = IntentBatch::new();
        batch.count = 4;
        batch.hiring_score[0] = 0.9;
        batch.tech_score[1] = 0.8;
        batch.growth_score[2] = 0.7;
        batch.budget_score[3] = 0.6;

        let weights = IntentWeights::default();
        let cw = CategoryWeights::from_intent_weights(&weights);
        let luts = init_decay_luts();
        let best = score_intent_batch_best(&batch, &cw, luts);
        let portable = score_intent_batch_simd(&batch, &cw, luts);

        for i in 0..4 {
            assert!((best[i] - portable[i]).abs() < 1e-4,
                "slot {i}: best={} portable={}", best[i], portable[i]);
        }
    }

    #[test]
    fn test_aggregate_signals_lut_matches_original() {
        let signals = vec![
            IntentSignal { signal_type: SignalType::HiringIntent, confidence: 0.9, detected_at_days: 5, decay_days: 30 },
            IntentSignal { signal_type: SignalType::TechAdoption, confidence: 0.8, detected_at_days: 20, decay_days: 60 },
            IntentSignal { signal_type: SignalType::BudgetCycle, confidence: 0.7, detected_at_days: 45, decay_days: 90 },
        ];

        let mut batch_orig = IntentBatch::new();
        batch_orig.count = 1;
        batch_orig.aggregate_signals(0, &signals);

        let mut batch_lut = IntentBatch::new();
        batch_lut.count = 1;
        let luts = init_decay_luts();
        batch_lut.aggregate_signals_lut(0, &signals, luts);

        // Should match within f32 precision (LUT uses same exp() at init)
        assert!((batch_lut.hiring_score[0] - batch_orig.hiring_score[0]).abs() < 1e-5,
            "hiring: lut={} orig={}", batch_lut.hiring_score[0], batch_orig.hiring_score[0]);
        assert!((batch_lut.tech_score[0] - batch_orig.tech_score[0]).abs() < 1e-5,
            "tech: lut={} orig={}", batch_lut.tech_score[0], batch_orig.tech_score[0]);
        assert!((batch_lut.budget_score[0] - batch_orig.budget_score[0]).abs() < 1e-5,
            "budget: lut={} orig={}", batch_lut.budget_score[0], batch_orig.budget_score[0]);
    }

    #[test]
    fn test_compute_scores_simd_method() {
        let mut batch = IntentBatch::new();
        batch.count = 4;
        for i in 0..4 {
            batch.hiring_score[i] = 0.8;
            batch.tech_score[i] = 0.6;
            batch.growth_score[i] = 0.4;
            batch.budget_score[i] = 0.3;
            batch.leadership_score[i] = 0.2;
            batch.product_score[i] = 0.1;
        }

        batch.compute_scores_simd(&IntentWeights::default());
        for i in 0..4 {
            assert!(batch.intent_scores[i] > 0.0 && batch.intent_scores[i] <= 100.0,
                "slot {i}: score {} invalid", batch.intent_scores[i]);
        }
    }

    // ── Benchmark-style tests (cargo test -- --nocapture) ──────────────────

    #[test]
    fn bench_scalar_vs_simd_256() {
        let mut batch = IntentBatch::new();
        batch.count = 256;
        for i in 0..256 {
            let t = i as f32 / 256.0;
            batch.hiring_score[i] = t * 0.9;
            batch.tech_score[i] = (1.0 - t) * 0.8;
            batch.growth_score[i] = t * 0.5;
            batch.budget_score[i] = 0.3;
            batch.leadership_score[i] = t * 0.1;
            batch.product_score[i] = 0.05;
        }

        let weights = IntentWeights::default();
        let cw = CategoryWeights::from_intent_weights(&weights);
        let luts = init_decay_luts();

        // Warm up
        let _ = score_intent_batch_simd(&batch, &cw, luts);

        // Scalar timing
        let scalar_start = std::time::Instant::now();
        for _ in 0..10_000 {
            let mut b = IntentBatch::new();
            b.count = 256;
            b.hiring_score = batch.hiring_score;
            b.tech_score = batch.tech_score;
            b.growth_score = batch.growth_score;
            b.budget_score = batch.budget_score;
            b.leadership_score = batch.leadership_score;
            b.product_score = batch.product_score;
            b.compute_scores(&weights);
            std::hint::black_box(&b.intent_scores);
        }
        let scalar_ns = scalar_start.elapsed().as_nanos();

        // SIMD timing
        let simd_start = std::time::Instant::now();
        for _ in 0..10_000 {
            let result = score_intent_batch_best(&batch, &cw, luts);
            std::hint::black_box(&result);
        }
        let simd_ns = simd_start.elapsed().as_nanos();

        let scalar_per = scalar_ns / 10_000;
        let simd_per = simd_ns / 10_000;
        let speedup = scalar_ns as f64 / simd_ns.max(1) as f64;

        eprintln!(
            "[bench] 256-company intent scoring x10000:\n  scalar: {}ns/iter\n  simd:   {}ns/iter\n  speedup: {:.2}x",
            scalar_per, simd_per, speedup
        );

        // SIMD should not be significantly slower than scalar
        assert!(speedup > 0.5, "SIMD path should not be >2x slower than scalar");
    }

    #[test]
    fn bench_lut_vs_exp_freshness() {
        let luts = init_decay_luts();

        // LUT path
        let lut_start = std::time::Instant::now();
        for _ in 0..100_000 {
            for day in 0..256u16 {
                std::hint::black_box(luts.lookup(day, 30));
            }
        }
        let lut_ns = lut_start.elapsed().as_nanos();

        // exp() path
        let exp_start = std::time::Instant::now();
        for _ in 0..100_000 {
            for day in 0..256u16 {
                std::hint::black_box(signal_freshness(day, 30));
            }
        }
        let exp_ns = exp_start.elapsed().as_nanos();

        let speedup = exp_ns as f64 / lut_ns.max(1) as f64;
        eprintln!(
            "[bench] 256 decay lookups x100000:\n  exp():  {}ns total\n  LUT:   {}ns total\n  speedup: {:.2}x",
            exp_ns, lut_ns, speedup
        );
    }
}
