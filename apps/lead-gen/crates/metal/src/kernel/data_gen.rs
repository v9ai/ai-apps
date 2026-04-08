use std::io::{self, BufWriter, Write};
use std::path::Path;

use serde::{Deserialize, Serialize};
use serde_json;

use super::ml_eval::LabeledSample;

use super::scoring::{HfCompanySignals, FEATURE_COUNT};

// ---------------------------------------------------------------------------
// Remote classification structs
// ---------------------------------------------------------------------------

/// A single fine-tune training example in chat-message format.
/// Serialised as one JSON line per example (JSONL).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteSample {
    pub messages: Vec<Message>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

// ---------------------------------------------------------------------------
// Deterministic PRNG — LCG, no external rand crate required
// ---------------------------------------------------------------------------

/// Simple deterministic pseudo-random number generator (Linear Congruential).
/// Produces reproducible synthetic datasets across runs.
struct Rng(u64);

impl Rng {
    fn new(seed: u64) -> Self {
        Self(seed)
    }

    /// Returns a value uniformly distributed in [0.0, 2.0).
    /// Caller is responsible for clamping to the desired range.
    fn next_f32(&mut self) -> f32 {
        self.0 = self.0
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1);
        ((self.0 >> 33) as f32) / (u32::MAX as f32 / 2.0)
    }

    /// Returns a value in [lo, hi).
    fn next_range(&mut self, lo: f32, hi: f32) -> f32 {
        let span = hi - lo;
        // next_f32 is in [0, 2), so halve it first to get [0, 1)
        lo + (self.next_f32() * 0.5) * span
    }

    /// Returns true with probability `p`.
    fn next_bool(&mut self, p: f32) -> bool {
        self.next_range(0.0, 1.0) < p
    }

    /// Returns a f32 feature value: either 1.0 (with prob `p`) or 0.0.
    fn binary_feature(&mut self, p: f32) -> f32 {
        self.next_bool(p) as u8 as f32
    }
}

// ---------------------------------------------------------------------------
// Contact label generation
// ---------------------------------------------------------------------------

/// Generate synthetic ICP contact training data (44-feature layout).
///
/// Creates `count` labeled samples — roughly half positive (ICP match, label
/// 1.0) and half negative (label 0.0) — with realistic feature distributions
/// and deliberate noise/overlap so the boundary is not trivially separable.
///
/// See `FEATURE_COUNT` doc comment in `scoring.rs` for the full 44-feature layout.
pub fn generate_contact_labels(count: usize) -> Vec<LabeledSample> {
    let mut rng = Rng::new(0xDEAD_BEEF_1234_5678);
    let mut samples = Vec::with_capacity(count);

    let half = count / 2;
    let positives = half;
    let negatives = count - half; // handles odd counts

    // --- Positive examples (ICP match) ------------------------------------
    for _ in 0..positives {
        let mut features = [0.0f32; FEATURE_COUNT];
        // Add noise: ~15 % of positives have one weak signal to blur boundary
        let noise = rng.next_bool(0.15);

        // Base contact (0-6)
        features[0] = if noise { rng.binary_feature(0.6) } else { rng.binary_feature(0.88) }; // industry
        features[1] = rng.binary_feature(0.82); // employee
        features[2] = if noise { rng.binary_feature(0.55) } else { rng.binary_feature(0.80) }; // seniority
        features[3] = rng.binary_feature(0.75); // department
        features[4] = rng.next_range(0.5, 1.0); // tech_norm
        features[5] = rng.next_range(0.5, 1.0); // email_norm
        features[6] = rng.next_range(0.5, 1.0); // recency_smooth

        // HF composite + depth (7-9) — calibrated from real HF scans (2026-04)
        features[7] = rng.next_range(0.4, 0.75);  // hf_score (real: 0.60-0.71 for strong orgs)
        features[8] = rng.next_range(0.3, 1.0);   // hf_model_depth (real: 0.69-1.0)
        features[9] = rng.binary_feature(0.75);    // hf_training_depth (binary-ish: 0 or 1.0)

        // Maturity decomposed (10-14) — real production_ratio has widest variance
        features[10] = rng.binary_feature(0.75);    // max_effort (binary-ish in practice)
        features[11] = rng.next_range(0.08, 0.86);  // production_ratio (real: 0.09-0.86, key signal)
        features[12] = rng.next_range(0.4, 1.0);    // dl_weighted_maturity
        features[13] = rng.next_range(0.0, 1.0);    // alignment_diversity (real: 0-1.0)
        features[14] = rng.next_range(0.39, 0.73);  // maturity_trend (real: narrow range)

        // Research (15) — strong binary gate
        features[15] = rng.binary_feature(0.75);    // (real: 75% of strong orgs)

        // Sales decomposed (16-19) — rare signals
        features[16] = rng.binary_feature(0.12);   // sales_b2b_core (real: mean 0.13)
        features[17] = rng.binary_feature(0.05);   // sales_outreach (very rare in practice)
        features[18] = rng.next_range(0.0, 0.15);  // sales_funnel (real: 0-0.14)
        features[19] = rng.binary_feature(0.05);   // sales_platform (very rare)

        // Training signals (20-23)
        features[20] = rng.next_range(0.0, 0.3);   // research_intensity (low even for strong orgs)
        features[21] = rng.next_range(0.0, 0.15);  // infra_sophistication (real: mean 0.07)
        features[22] = rng.next_range(0.4, 1.0);   // signal_breadth (real: 0-1.0, mean 0.69)
        features[23] = rng.next_range(0.0, 0.35);  // domain_nlp_focus (real: 0-0.34)

        // Architecture diversity (24-28) — calibrated to rescaled ranges
        features[24] = rng.next_range(0.1, 0.7);   // library_sophistication (real: 0-0.67)
        features[25] = rng.next_range(0.25, 1.0);  // pipeline_diversity (real: 0.5-1.0)
        features[26] = rng.next_range(0.0, 0.1);   // custom_arch_ratio (near-zero for big orgs)
        features[27] = rng.next_range(0.1, 0.8);   // framework_diversity (real: 0-0.80)
        features[28] = rng.next_range(0.0, 0.05);  // moe_ratio (near-zero for most)

        // Download signals (29-33) — rescaled, no longer saturated
        features[29] = rng.next_range(0.5, 0.9);   // download_scale (real: 0.78-0.88)
        features[30] = rng.next_range(0.3, 0.85);  // download_per_model (real: 0-0.85)
        features[31] = rng.next_range(0.05, 0.55);  // top_model_dominance (real: 0-0.53)
        features[32] = rng.next_range(0.01, 0.28); // likes_per_download (real: 0-0.28)
        features[33] = rng.next_range(0.3, 0.92);  // download_breadth (real: 0-0.92)

        // Temporal (34-37)
        features[34] = rng.next_range(0.4, 1.0);   // recency (real: 0.44-1.0)
        features[35] = rng.next_range(0.25, 1.0);  // acceleration (real: 0.25-1.0)
        features[36] = rng.next_range(0.5, 1.0);   // longevity (real: 0.90-1.0 for strong)
        features[37] = rng.next_range(0.2, 1.0);   // burst_intensity (real: 0-1.0)

        // Cross-signal interactions (38-43)
        features[38] = features[15] * features[2];  // research × seniority
        features[39] = features[7] * features[4];   // score × tech
        features[40] = features[9] * features[11];  // training × production_ratio
        features[41] = features[8] * features[0];   // depth × industry
        features[42] = features[18] * features[3];  // sales_funnel × department
        features[43] = if features[7] > 0.6 { 1.0 } else { 0.0 }; // hf_threshold

        samples.push(LabeledSample { features, label: 1.0 });
    }

    // --- Negative examples (not ICP match) --------------------------------
    for _ in 0..negatives {
        let mut features = [0.0f32; FEATURE_COUNT];
        // Add noise: ~10 % of negatives look almost positive
        let noise = rng.next_bool(0.10);

        // Base contact (0-6)
        features[0] = if noise { rng.binary_feature(0.55) } else { rng.binary_feature(0.18) }; // industry
        features[1] = rng.binary_feature(0.30); // employee
        features[2] = if noise { rng.binary_feature(0.50) } else { rng.binary_feature(0.15) }; // seniority
        features[3] = rng.binary_feature(0.28); // department
        features[4] = rng.next_range(0.0, 0.35); // tech_norm
        features[5] = rng.next_range(0.0, 0.50); // email_norm
        features[6] = rng.next_range(0.05, 0.50); // recency_smooth

        // HF composite + depth (7-9) — low/zero HF presence
        features[7] = rng.next_range(0.0, 0.3);   // hf_score (weak org: 0-0.02 real)
        features[8] = rng.next_range(0.0, 0.15);  // hf_model_depth
        features[9] = rng.binary_feature(0.1);     // hf_training_depth (binary, rare)

        // Maturity decomposed (10-14) — low
        features[10] = rng.binary_feature(0.1);    // max_effort
        features[11] = rng.next_range(0.0, 0.1);  // production_ratio (near zero)
        features[12] = rng.next_range(0.0, 0.2);  // dl_weighted_maturity
        features[13] = rng.next_range(0.0, 0.1);  // alignment_diversity
        features[14] = rng.next_range(0.35, 0.55); // maturity_trend (neutral)

        // Research (15) — rare
        features[15] = rng.binary_feature(0.1);

        // Sales decomposed (16-19) — near zero
        features[16] = rng.binary_feature(0.02);  // sales_b2b_core
        features[17] = rng.binary_feature(0.01);  // sales_outreach
        features[18] = rng.next_range(0.0, 0.05); // sales_funnel
        features[19] = rng.binary_feature(0.01);  // sales_platform

        // Training signals (20-23) — low
        features[20] = rng.next_range(0.0, 0.05); // research_intensity
        features[21] = rng.next_range(0.0, 0.03); // infra_sophistication
        features[22] = rng.next_range(0.0, 0.15); // signal_breadth
        features[23] = rng.next_range(0.0, 0.1);  // domain_nlp_focus

        // Architecture diversity (24-28) — low
        features[24] = rng.next_range(0.0, 0.15); // library_sophistication
        features[25] = rng.next_range(0.0, 0.25); // pipeline_diversity
        features[26] = rng.next_range(0.0, 0.05); // custom_arch_ratio
        features[27] = rng.next_range(0.0, 0.1);  // framework_diversity
        features[28] = rng.next_range(0.0, 0.02); // moe_ratio

        // Download signals (29-33) — low after rescaling
        features[29] = rng.next_range(0.0, 0.5);  // download_scale (wider range for weak orgs)
        features[30] = rng.next_range(0.0, 0.2);  // download_per_model
        features[31] = rng.next_range(0.3, 0.9);  // top_model_dominance (high = bad, few models)
        features[32] = rng.next_range(0.0, 0.02); // likes_per_download
        features[33] = rng.next_range(0.0, 0.15); // download_breadth

        // Temporal (34-37) — low/stale
        features[34] = rng.next_range(0.0, 0.3);  // recency (stale)
        features[35] = rng.next_range(0.0, 0.4);  // acceleration
        features[36] = rng.next_range(0.0, 0.3);  // longevity
        features[37] = rng.next_range(0.0, 0.1);  // burst_intensity

        // Cross-signal interactions (38-43)
        features[38] = features[15] * features[2];
        features[39] = features[7] * features[4];
        features[40] = features[9] * features[11];
        features[41] = features[8] * features[0];
        features[42] = features[18] * features[3];
        features[43] = if features[7] > 0.6 { 1.0 } else { 0.0 };

        samples.push(LabeledSample { features, label: 0.0 });
    }

    samples
}

// ---------------------------------------------------------------------------
// Bootstrap labels from real HF org data
// ---------------------------------------------------------------------------

/// Heuristic label for an HF org: how likely is a contact from this org to be
/// a good ICP match? Returns 1.0 (positive) or 0.0 (negative).
///
/// The heuristic combines the strongest signals:
/// - `hf_score` > 0.4 (composite quality)
/// - `model_depth` > 0.3 (enough models to matter)
/// - At least one of: research, training_depth > 0.2, production_ratio > 0.2
///
/// This is intentionally imperfect — real labels would come from sales outcomes.
fn heuristic_label(sig: &HfCompanySignals) -> f32 {
    let quality = sig.hf_score > 0.4;
    let depth = sig.model_depth > 0.3;
    let activity = sig.research > 0.5
        || sig.training_depth > 0.2
        || sig.production_ratio > 0.2
        || sig.download_scale > 0.3;
    if quality && depth && activity { 1.0 } else { 0.0 }
}

/// Generate labeled samples from real `HfCompanySignals`, pairing each org's HF
/// signals with synthetic contact features.
///
/// For each org, generates `contacts_per_org` samples with varied contact-level
/// features (base 0-6). Positive orgs get "good" contact features ~70% of the
/// time (simulating that good companies have more reachable contacts), negative
/// orgs get "weak" contact features ~80% of the time.
///
/// Interaction features (38-43) are computed from the combined feature vector.
pub fn bootstrap_labels(
    signals: &[HfCompanySignals],
    contacts_per_org: usize,
) -> Vec<LabeledSample> {
    let mut rng = Rng::new(0xB007_57AA_BEEF_CAFE);
    let mut samples = Vec::with_capacity(signals.len() * contacts_per_org);

    for sig in signals {
        let label = heuristic_label(sig);
        let is_positive = label > 0.5;

        for _ in 0..contacts_per_org {
            let mut features = [0.0f32; FEATURE_COUNT];

            // Base contact features (0-6) — correlated with org quality
            if is_positive && rng.next_bool(0.70) {
                // Good contact at a good org
                features[0] = rng.binary_feature(0.85); // industry_match
                features[1] = rng.binary_feature(0.80); // employee_in_range
                features[2] = rng.binary_feature(0.75); // seniority_match
                features[3] = rng.binary_feature(0.70); // department_match
                features[4] = rng.next_range(0.4, 1.0); // tech_norm
                features[5] = rng.next_range(0.5, 1.0); // email_norm
                features[6] = rng.next_range(0.5, 1.0); // smooth_recency
            } else if is_positive {
                // Weak contact at a good org — noise
                features[0] = rng.binary_feature(0.40);
                features[1] = rng.binary_feature(0.50);
                features[2] = rng.binary_feature(0.30);
                features[3] = rng.binary_feature(0.35);
                features[4] = rng.next_range(0.1, 0.5);
                features[5] = rng.next_range(0.2, 0.7);
                features[6] = rng.next_range(0.2, 0.6);
            } else if rng.next_bool(0.80) {
                // Weak contact at a weak org (most common negative case)
                features[0] = rng.binary_feature(0.20);
                features[1] = rng.binary_feature(0.30);
                features[2] = rng.binary_feature(0.15);
                features[3] = rng.binary_feature(0.25);
                features[4] = rng.next_range(0.0, 0.35);
                features[5] = rng.next_range(0.0, 0.50);
                features[6] = rng.next_range(0.05, 0.40);
            } else {
                // Decent contact at a weak org — hard negative
                features[0] = rng.binary_feature(0.65);
                features[1] = rng.binary_feature(0.70);
                features[2] = rng.binary_feature(0.60);
                features[3] = rng.binary_feature(0.55);
                features[4] = rng.next_range(0.3, 0.8);
                features[5] = rng.next_range(0.4, 0.9);
                features[6] = rng.next_range(0.4, 0.8);
            }

            // HF features (7-37) — directly from real signals
            features[7] = sig.hf_score;
            features[8] = sig.model_depth;
            features[9] = sig.training_depth;
            features[10] = sig.max_effort;
            features[11] = sig.production_ratio;
            features[12] = sig.dl_weighted_maturity;
            features[13] = sig.alignment_diversity;
            features[14] = sig.maturity_trend;
            features[15] = sig.research;
            features[16] = sig.sales_b2b_core;
            features[17] = sig.sales_outreach;
            features[18] = sig.sales_funnel;
            features[19] = sig.sales_platform;
            features[20] = sig.research_intensity;
            features[21] = sig.infra_sophistication;
            features[22] = sig.signal_breadth;
            features[23] = sig.domain_nlp_focus;
            features[24] = sig.library_sophistication;
            features[25] = sig.pipeline_diversity;
            features[26] = sig.custom_arch_ratio;
            features[27] = sig.framework_diversity;
            features[28] = sig.moe_ratio;
            features[29] = sig.download_scale;
            features[30] = sig.download_per_model;
            features[31] = sig.top_model_dominance;
            features[32] = sig.likes_per_download;
            features[33] = sig.download_breadth;
            features[34] = sig.recency;
            features[35] = sig.acceleration;
            features[36] = sig.longevity;
            features[37] = sig.burst_intensity;

            // Cross-signal interactions (38-43)
            features[38] = features[15] * features[2];  // research × seniority
            features[39] = features[7] * features[4];   // hf_score × tech
            features[40] = features[9] * features[11];  // training × production
            features[41] = features[8] * features[0];   // depth × industry
            features[42] = features[18] * features[3];  // sales_funnel × department
            features[43] = if features[7] > 0.6 { 1.0 } else { 0.0 }; // hf_threshold

            samples.push(LabeledSample { features, label });
        }
    }

    samples
}

/// Summary statistics for a set of `HfCompanySignals` — useful for understanding
/// the distribution of real HF data and calibrating synthetic data generators.
#[derive(Debug, Clone)]
pub struct SignalStats {
    pub org_count: usize,
    pub positive_count: usize,
    pub negative_count: usize,
    /// (field_name, min, max, mean) for each of the 31 HF signal fields.
    pub field_stats: Vec<(&'static str, f32, f32, f32)>,
}

/// Compute summary statistics over a slice of HfCompanySignals.
pub fn signal_distribution(signals: &[HfCompanySignals]) -> SignalStats {
    let n = signals.len();
    if n == 0 {
        return SignalStats {
            org_count: 0,
            positive_count: 0,
            negative_count: 0,
            field_stats: Vec::new(),
        };
    }

    let pos = signals.iter().filter(|s| heuristic_label(s) > 0.5).count();

    // Extract each field into a slice for stats computation
    let fields: Vec<(&str, Vec<f32>)> = vec![
        ("hf_score", signals.iter().map(|s| s.hf_score).collect()),
        ("model_depth", signals.iter().map(|s| s.model_depth).collect()),
        ("training_depth", signals.iter().map(|s| s.training_depth).collect()),
        ("max_effort", signals.iter().map(|s| s.max_effort).collect()),
        ("production_ratio", signals.iter().map(|s| s.production_ratio).collect()),
        ("dl_weighted_maturity", signals.iter().map(|s| s.dl_weighted_maturity).collect()),
        ("alignment_diversity", signals.iter().map(|s| s.alignment_diversity).collect()),
        ("maturity_trend", signals.iter().map(|s| s.maturity_trend).collect()),
        ("research", signals.iter().map(|s| s.research).collect()),
        ("sales_b2b_core", signals.iter().map(|s| s.sales_b2b_core).collect()),
        ("sales_outreach", signals.iter().map(|s| s.sales_outreach).collect()),
        ("sales_funnel", signals.iter().map(|s| s.sales_funnel).collect()),
        ("sales_platform", signals.iter().map(|s| s.sales_platform).collect()),
        ("research_intensity", signals.iter().map(|s| s.research_intensity).collect()),
        ("infra_sophistication", signals.iter().map(|s| s.infra_sophistication).collect()),
        ("signal_breadth", signals.iter().map(|s| s.signal_breadth).collect()),
        ("domain_nlp_focus", signals.iter().map(|s| s.domain_nlp_focus).collect()),
        ("library_sophistication", signals.iter().map(|s| s.library_sophistication).collect()),
        ("pipeline_diversity", signals.iter().map(|s| s.pipeline_diversity).collect()),
        ("custom_arch_ratio", signals.iter().map(|s| s.custom_arch_ratio).collect()),
        ("framework_diversity", signals.iter().map(|s| s.framework_diversity).collect()),
        ("moe_ratio", signals.iter().map(|s| s.moe_ratio).collect()),
        ("download_scale", signals.iter().map(|s| s.download_scale).collect()),
        ("download_per_model", signals.iter().map(|s| s.download_per_model).collect()),
        ("top_model_dominance", signals.iter().map(|s| s.top_model_dominance).collect()),
        ("likes_per_download", signals.iter().map(|s| s.likes_per_download).collect()),
        ("download_breadth", signals.iter().map(|s| s.download_breadth).collect()),
        ("recency", signals.iter().map(|s| s.recency).collect()),
        ("acceleration", signals.iter().map(|s| s.acceleration).collect()),
        ("longevity", signals.iter().map(|s| s.longevity).collect()),
        ("burst_intensity", signals.iter().map(|s| s.burst_intensity).collect()),
    ];

    let field_stats = fields
        .into_iter()
        .map(|(name, vals)| {
            let min = vals.iter().cloned().fold(f32::INFINITY, f32::min);
            let max = vals.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
            let mean = vals.iter().sum::<f32>() / n as f32;
            (name, min, max, mean)
        })
        .collect();

    SignalStats {
        org_count: n,
        positive_count: pos,
        negative_count: n - pos,
        field_stats,
    }
}

// ---------------------------------------------------------------------------
// Remote worldwide job classification data
// ---------------------------------------------------------------------------

const WORLD_REGIONS: &[&str] = &[
    // Europe
    "Germany",
    "Netherlands",
    "France",
    "Spain",
    "Sweden",
    "Denmark",
    "Finland",
    "Poland",
    "Czech Republic",
    "Austria",
    "Ireland",
    "Portugal",
    "Romania",
    "Switzerland",
    "UK",
    "Norway",
    // Americas
    "Canada",
    "Brazil",
    "Argentina",
    "Colombia",
    "Mexico",
    // Asia-Pacific
    "Singapore",
    "Australia",
    "India",
    "Japan",
    "South Korea",
    "Taiwan",
    // MENA / Other
    "Israel",
    "UAE",
    "Turkey",
    "South Africa",
];

const REMOTE_PATTERNS: &[&str] = &[
    "fully remote",
    "100% remote",
    "remote-first",
    "work from anywhere",
    "remote worldwide",
];

const ROLE_TYPES: &[&str] = &[
    "ML Engineer",
    "AI Engineer",
    "Data Scientist",
    "MLOps Engineer",
    "NLP Engineer",
    "Computer Vision Engineer",
    "Deep Learning Engineer",
    "AI Research Scientist",
    "Machine Learning Researcher",
    "Applied AI Engineer",
];

const SYSTEM_PROMPT: &str = "You are a job classification assistant. Classify whether a job posting is for a fully remote AI/ML engineering position open to candidates worldwide. Respond with JSON: {\"is_remote_ai\": true/false, \"confidence\": 0.0-1.0, \"reason\": \"...\"}";

/// Maximum positive examples to emit (caps the full 32×5×10=1600 cartesian
/// product so the dataset stays at a practical training size).
const MAX_POSITIVES: usize = 200;

/// Generate Remote Worldwide job classification training data.
///
/// Produces positive examples via template expansion over the cartesian
/// product of world regions × remote patterns × AI/ML role types (capped at
/// `MAX_POSITIVES` by cycling through the combinations with a fixed stride),
/// plus hard negatives covering US-only on-site, hybrid, restricted-region,
/// and non-AI remote postings.
///
/// Total: up to `MAX_POSITIVES` positives + ~130 hard negatives.
pub fn generate_remote_worldwide_labels() -> Vec<RemoteSample> {
    let mut samples = Vec::new();

    // --- Positive examples ------------------------------------------------
    let total_combos = WORLD_REGIONS.len() * REMOTE_PATTERNS.len() * ROLE_TYPES.len();
    let stride = (total_combos / MAX_POSITIVES).max(1);

    let mut combo_idx = 0usize;
    let mut emitted = 0usize;

    'outer: for (ci, region) in WORLD_REGIONS.iter().enumerate() {
        for (ri, remote_pattern) in REMOTE_PATTERNS.iter().enumerate() {
            for (ti, role_type) in ROLE_TYPES.iter().enumerate() {
                let flat = ci * REMOTE_PATTERNS.len() * ROLE_TYPES.len()
                    + ri * ROLE_TYPES.len()
                    + ti;
                if flat != combo_idx {
                    continue;
                }
                // This combo is selected — emit it.
                let user_content = format!(
                    "Job Title: {role_type}\nLocation: {region}, {remote_pattern}\nRequirements: Python, PyTorch, distributed training"
                );
                let assistant_content = serde_json::json!({
                    "is_remote_ai": true,
                    "confidence": 0.95,
                    "reason": format!("Fully remote {role_type} position open worldwide")
                })
                .to_string();

                samples.push(build_chat_sample(
                    SYSTEM_PROMPT,
                    &user_content,
                    &assistant_content,
                ));

                emitted += 1;
                combo_idx += stride;
                if emitted >= MAX_POSITIVES {
                    break 'outer;
                }
            }
        }
    }
    // Safety net: if stride skipped past remaining combos, stop gracefully.
    // (The break 'outer above already handles this, but keeps clippy happy.)
    let _ = combo_idx;

    // --- Hard negatives ---------------------------------------------------

    // 1. US-only on-site AI roles (50 examples)
    for i in 0..50usize {
        let role = ROLE_TYPES[i % ROLE_TYPES.len()];
        let city = US_CITIES[i % US_CITIES.len()];
        let user_content = format!(
            "Job Title: {role}\nLocation: {city}, on-site\nRequirements: Python, PyTorch"
        );
        let assistant_content = serde_json::json!({
            "is_remote_ai": false,
            "confidence": 0.97,
            "reason": "On-site position, not remote"
        })
        .to_string();
        samples.push(build_chat_sample(SYSTEM_PROMPT, &user_content, &assistant_content));
    }

    // 2. Hybrid roles requiring in-office presence (30 examples)
    for i in 0..30usize {
        let role = ROLE_TYPES[i % ROLE_TYPES.len()];
        let city = HYBRID_CITIES[i % HYBRID_CITIES.len()];
        let user_content = format!(
            "Job Title: {role}\nLocation: {city}, hybrid 3 days/week\nRequirements: Python, TensorFlow"
        );
        let assistant_content = serde_json::json!({
            "is_remote_ai": false,
            "confidence": 0.90,
            "reason": "Hybrid role requiring in-office presence, not fully remote"
        })
        .to_string();
        samples.push(build_chat_sample(SYSTEM_PROMPT, &user_content, &assistant_content));
    }

    // 3. US work-authorization-restricted remote AI roles (20 examples)
    for i in 0..20usize {
        let role = ROLE_TYPES[i % ROLE_TYPES.len()];
        let city = US_CITIES[i % US_CITIES.len()];
        let user_content = format!(
            "Job Title: {role}\nLocation: {city}, remote\nRequirements: Python, JAX, TPUs\nNote: Must be authorized to work in the US"
        );
        let assistant_content = serde_json::json!({
            "is_remote_ai": false,
            "confidence": 0.93,
            "reason": "Remote but restricted to US work authorization — not open worldwide"
        })
        .to_string();
        samples.push(build_chat_sample(SYSTEM_PROMPT, &user_content, &assistant_content));
    }

    // 4. Non-AI remote roles (30 examples)
    for i in 0..30usize {
        let role = NON_AI_ROLES[i % NON_AI_ROLES.len()];
        let region = WORLD_REGIONS[i % WORLD_REGIONS.len()];
        let user_content = format!(
            "Job Title: {role}\nLocation: {region}, fully remote\nRequirements: CRM, Salesforce, communication skills"
        );
        let assistant_content = serde_json::json!({
            "is_remote_ai": false,
            "confidence": 0.93,
            "reason": "Remote position but not an AI/ML engineering role"
        })
        .to_string();
        samples.push(build_chat_sample(SYSTEM_PROMPT, &user_content, &assistant_content));
    }

    samples
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

fn build_chat_sample(system: &str, user: &str, assistant: &str) -> RemoteSample {
    RemoteSample {
        messages: vec![
            Message { role: "system".to_string(), content: system.to_string() },
            Message { role: "user".to_string(), content: user.to_string() },
            Message { role: "assistant".to_string(), content: assistant.to_string() },
        ],
    }
}

const US_CITIES: &[&str] = &[
    "San Francisco", "New York", "Austin", "Seattle", "Boston",
    "Chicago", "Los Angeles", "Denver", "Atlanta", "San Jose",
];

const HYBRID_CITIES: &[&str] = &[
    "London", "Berlin", "Paris", "Amsterdam", "Dublin",
    "Stockholm", "Copenhagen", "Zurich", "Barcelona", "Milan",
    "Toronto", "Singapore", "Sydney", "Tokyo", "New York",
];

const NON_AI_ROLES: &[&str] = &[
    "Sales Manager", "Account Executive", "Marketing Manager",
    "Customer Success Manager", "Business Development Representative",
    "Product Manager", "UX Designer", "Technical Recruiter",
    "Finance Analyst", "Operations Manager",
];

// ---------------------------------------------------------------------------
// I/O helpers
// ---------------------------------------------------------------------------

/// Write labeled contact samples to a JSONL file (one JSON object per line).
/// Creates parent directories if they do not already exist.
pub fn write_labels(samples: &[LabeledSample], path: &Path) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    let file = std::fs::File::create(path)?;
    let mut writer = BufWriter::new(file);
    for sample in samples {
        let line = serde_json::to_string(sample)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
        writer.write_all(line.as_bytes())?;
        writer.write_all(b"\n")?;
    }
    writer.flush()
}

/// Write Remote Worldwide classification samples to a JSONL file (for finetune.py).
/// Creates parent directories if they do not already exist.
pub fn write_remote_worldwide_labels(samples: &[RemoteSample], path: &Path) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    let file = std::fs::File::create(path)?;
    let mut writer = BufWriter::new(file);
    for sample in samples {
        let line = serde_json::to_string(sample)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
        writer.write_all(line.as_bytes())?;
        writer.write_all(b"\n")?;
    }
    writer.flush()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{BufRead, BufReader};

    #[test]
    fn test_generate_contact_labels_balanced() {
        let samples = generate_contact_labels(200);
        assert_eq!(samples.len(), 200);

        let positives = samples.iter().filter(|s| s.label == 1.0).count();
        let negatives = samples.iter().filter(|s| s.label == 0.0).count();

        // Expect exact 50/50 split given the implementation
        assert_eq!(positives, 100, "expected 100 positive samples, got {positives}");
        assert_eq!(negatives, 100, "expected 100 negative samples, got {negatives}");
    }

    #[test]
    fn test_generate_contact_labels_features_in_range() {
        let samples = generate_contact_labels(400);
        for (i, sample) in samples.iter().enumerate() {
            for (fi, &feature) in sample.features.iter().enumerate() {
                assert!(
                    (0.0..=1.0).contains(&feature),
                    "sample {i} feature {fi} = {feature} is out of [0, 1]"
                );
            }
            assert!(
                sample.label == 0.0 || sample.label == 1.0,
                "sample {i} has invalid label {}",
                sample.label
            );
        }
    }

    #[test]
    fn test_generate_remote_worldwide_has_positives_and_negatives() {
        let samples = generate_remote_worldwide_labels();
        assert!(!samples.is_empty(), "no samples generated");

        let has_positive = samples.iter().any(|s| {
            s.messages.iter().any(|m| {
                m.role == "assistant" && m.content.contains("\"is_remote_ai\":true")
            })
        });
        let has_negative = samples.iter().any(|s| {
            s.messages.iter().any(|m| {
                m.role == "assistant" && m.content.contains("\"is_remote_ai\":false")
            })
        });

        assert!(has_positive, "no positive worldwide remote samples found");
        assert!(has_negative, "no negative worldwide remote samples found");

        // Every sample must have exactly 3 messages: system, user, assistant
        for (i, sample) in samples.iter().enumerate() {
            assert_eq!(
                sample.messages.len(),
                3,
                "sample {i} has {} messages instead of 3",
                sample.messages.len()
            );
            assert_eq!(sample.messages[0].role, "system");
            assert_eq!(sample.messages[1].role, "user");
            assert_eq!(sample.messages[2].role, "assistant");
        }
    }

    #[test]
    fn test_write_read_roundtrip() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("test_labels.jsonl");

        let original = generate_contact_labels(100);
        write_labels(&original, &path).expect("write_labels failed");

        // Read back and count lines
        let file = std::fs::File::open(&path).expect("open");
        let reader = BufReader::new(file);
        let lines: Vec<String> = reader.lines().map(|l| l.expect("line")).collect();

        assert_eq!(
            lines.len(),
            original.len(),
            "line count mismatch: wrote {} samples, read {} lines",
            original.len(),
            lines.len()
        );

        // Verify each line deserialises back to a valid LabeledSample
        for (i, line) in lines.iter().enumerate() {
            let parsed: LabeledSample =
                serde_json::from_str(line).unwrap_or_else(|e| {
                    panic!("line {i} failed to deserialise: {e}\ncontent: {line}")
                });
            assert_eq!(
                parsed.label, original[i].label,
                "label mismatch at index {i}"
            );
            assert_eq!(
                parsed.features, original[i].features,
                "features mismatch at index {i}"
            );
        }
    }

    #[test]
    fn test_write_remote_worldwide_roundtrip() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("remote_worldwide.jsonl");

        let original = generate_remote_worldwide_labels();
        write_remote_worldwide_labels(&original, &path).expect("write_remote_worldwide_labels failed");

        let file = std::fs::File::open(&path).expect("open");
        let reader = BufReader::new(file);
        let line_count = reader.lines().count();

        assert_eq!(
            line_count,
            original.len(),
            "remote_worldwide line count mismatch: wrote {}, read {}",
            original.len(),
            line_count
        );
    }

    // ── Bootstrap labels tests ──────────────────────────────────────────────

    /// Build a "strong" org signal set (should label positive).
    fn strong_org() -> HfCompanySignals {
        HfCompanySignals {
            hf_score: 0.75,
            model_depth: 0.6,
            training_depth: 0.5,
            max_effort: 0.85,
            production_ratio: 0.4,
            dl_weighted_maturity: 0.7,
            alignment_diversity: 0.25,
            maturity_trend: 0.6,
            research: 1.0,
            sales_b2b_core: 0.0,
            sales_outreach: 0.0,
            sales_funnel: 0.28,
            sales_platform: 0.0,
            research_intensity: 0.4,
            infra_sophistication: 0.5,
            signal_breadth: 0.6,
            domain_nlp_focus: 0.3,
            library_sophistication: 0.7,
            pipeline_diversity: 0.5,
            custom_arch_ratio: 0.15,
            framework_diversity: 0.5,
            moe_ratio: 0.05,
            download_scale: 0.65,
            download_per_model: 0.4,
            top_model_dominance: 0.3,
            likes_per_download: 0.05,
            download_breadth: 0.6,
            recency: 0.9,
            acceleration: 0.7,
            longevity: 0.8,
            burst_intensity: 0.3,
        }
    }

    /// Build a "weak" org signal set (should label negative).
    fn weak_org() -> HfCompanySignals {
        HfCompanySignals {
            hf_score: 0.1,
            model_depth: 0.05,
            training_depth: 0.0,
            max_effort: 0.15,
            production_ratio: 0.0,
            dl_weighted_maturity: 0.1,
            alignment_diversity: 0.0,
            maturity_trend: 0.5,
            research: 0.0,
            sales_b2b_core: 0.0,
            sales_outreach: 0.0,
            sales_funnel: 0.0,
            sales_platform: 0.0,
            research_intensity: 0.0,
            infra_sophistication: 0.0,
            signal_breadth: 0.0,
            domain_nlp_focus: 0.0,
            library_sophistication: 0.1,
            pipeline_diversity: 0.0,
            custom_arch_ratio: 0.0,
            framework_diversity: 0.0,
            moe_ratio: 0.0,
            download_scale: 0.05,
            download_per_model: 0.02,
            top_model_dominance: 0.8,
            likes_per_download: 0.0,
            download_breadth: 0.0,
            recency: 0.2,
            acceleration: 0.5,
            longevity: 0.1,
            burst_intensity: 0.0,
        }
    }

    #[test]
    fn test_bootstrap_labels_count() {
        let orgs = vec![strong_org(), weak_org()];
        let samples = bootstrap_labels(&orgs, 10);
        assert_eq!(samples.len(), 20, "2 orgs × 10 contacts = 20 samples");
    }

    #[test]
    fn test_bootstrap_labels_has_both_classes() {
        let orgs = vec![strong_org(), weak_org()];
        let samples = bootstrap_labels(&orgs, 10);
        let pos = samples.iter().filter(|s| s.label > 0.5).count();
        let neg = samples.iter().filter(|s| s.label < 0.5).count();
        assert_eq!(pos, 10, "strong org should produce 10 positive samples");
        assert_eq!(neg, 10, "weak org should produce 10 negative samples");
    }

    #[test]
    fn test_bootstrap_labels_hf_features_from_real_data() {
        let org = strong_org();
        let samples = bootstrap_labels(&[org], 5);
        for s in &samples {
            // HF features (7-37) should match the org signal exactly
            assert_eq!(s.features[7], org.hf_score);
            assert_eq!(s.features[8], org.model_depth);
            assert_eq!(s.features[15], org.research);
            assert_eq!(s.features[29], org.download_scale);
        }
    }

    #[test]
    fn test_bootstrap_labels_interactions_computed() {
        let org = strong_org();
        let samples = bootstrap_labels(&[org], 20);
        for s in &samples {
            // ix_score_x_tech = features[7] * features[4]
            let expected_39 = s.features[7] * s.features[4];
            assert!((s.features[39] - expected_39).abs() < 1e-6,
                "interaction ix_score_x_tech mismatch");
            // ix_hf_threshold = (features[7] > 0.6) as f32
            let expected_43 = if s.features[7] > 0.6 { 1.0 } else { 0.0 };
            assert_eq!(s.features[43], expected_43);
        }
    }

    #[test]
    fn test_bootstrap_labels_features_in_range() {
        let orgs = vec![strong_org(), weak_org()];
        let samples = bootstrap_labels(&orgs, 50);
        for (i, s) in samples.iter().enumerate() {
            for (fi, &f) in s.features.iter().enumerate() {
                assert!((0.0..=1.0).contains(&f),
                    "bootstrap sample {i} feature {fi} = {f} out of [0, 1]");
            }
        }
    }

    #[test]
    fn test_signal_distribution() {
        let orgs = vec![strong_org(), weak_org()];
        let stats = signal_distribution(&orgs);
        assert_eq!(stats.org_count, 2);
        assert_eq!(stats.positive_count, 1);
        assert_eq!(stats.negative_count, 1);
        assert_eq!(stats.field_stats.len(), 31);
        // hf_score: min=0.1, max=0.75
        let hf = &stats.field_stats[0];
        assert_eq!(hf.0, "hf_score");
        assert!((hf.1 - 0.1).abs() < 1e-6);
        assert!((hf.2 - 0.75).abs() < 1e-6);
    }
}
