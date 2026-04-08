use std::io::{self, BufWriter, Write};
use std::path::Path;

use serde::{Deserialize, Serialize};
use serde_json;

use super::ml_eval::LabeledSample;

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
    use super::scoring::FEATURE_COUNT;

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

        // HF composite + depth (7-9)
        features[7] = rng.next_range(0.4, 1.0);  // hf_score
        features[8] = rng.next_range(0.3, 1.0);  // hf_model_depth
        features[9] = rng.next_range(0.2, 1.0);  // hf_training_depth

        // Maturity decomposed (10-14)
        features[10] = rng.next_range(0.7, 1.0);  // max_effort
        features[11] = rng.next_range(0.3, 0.9);  // production_ratio
        features[12] = rng.next_range(0.5, 1.0);  // dl_weighted_maturity
        features[13] = rng.next_range(0.0, 0.8);  // alignment_diversity
        features[14] = rng.next_range(0.3, 0.8);  // maturity_trend

        // Research (15)
        features[15] = rng.binary_feature(0.6);

        // Sales decomposed (16-19)
        features[16] = rng.binary_feature(0.3);   // sales_b2b_core
        features[17] = rng.binary_feature(0.25);  // sales_outreach
        features[18] = rng.next_range(0.1, 0.6);  // sales_funnel
        features[19] = rng.binary_feature(0.15);  // sales_platform

        // Training signals (20-23)
        features[20] = rng.next_range(0.1, 0.7);  // research_intensity
        features[21] = rng.next_range(0.2, 0.8);  // infra_sophistication
        features[22] = rng.next_range(0.3, 0.9);  // signal_breadth
        features[23] = rng.next_range(0.0, 0.6);  // domain_nlp_focus

        // Architecture diversity (24-28)
        features[24] = rng.next_range(0.3, 0.9);  // library_sophistication
        features[25] = rng.next_range(0.2, 0.8);  // pipeline_diversity
        features[26] = rng.next_range(0.0, 0.5);  // custom_arch_ratio
        features[27] = rng.next_range(0.1, 0.7);  // framework_diversity
        features[28] = rng.next_range(0.0, 0.3);  // moe_ratio

        // Download signals (29-33)
        features[29] = rng.next_range(0.3, 1.0);  // download_scale
        features[30] = rng.next_range(0.2, 0.8);  // download_per_model
        features[31] = rng.next_range(0.2, 0.6);  // top_model_dominance
        features[32] = rng.next_range(0.01, 0.1); // likes_per_download
        features[33] = rng.next_range(0.3, 0.9);  // download_breadth

        // Temporal (34-37)
        features[34] = rng.next_range(0.5, 1.0);  // recency
        features[35] = rng.next_range(0.3, 1.0);  // acceleration
        features[36] = rng.next_range(0.2, 1.0);  // longevity
        features[37] = rng.next_range(0.1, 0.6);  // burst_intensity

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
        features[7] = rng.next_range(0.0, 0.3);   // hf_score
        features[8] = rng.next_range(0.0, 0.2);   // hf_model_depth
        features[9] = rng.next_range(0.0, 0.15);  // hf_training_depth

        // Maturity decomposed (10-14) — low
        features[10] = rng.next_range(0.0, 0.3);  // max_effort
        features[11] = rng.next_range(0.0, 0.15); // production_ratio
        features[12] = rng.next_range(0.0, 0.3);  // dl_weighted_maturity
        features[13] = rng.next_range(0.0, 0.2);  // alignment_diversity
        features[14] = rng.next_range(0.2, 0.5);  // maturity_trend (neutral-ish)

        // Research (15) — rare
        features[15] = rng.binary_feature(0.1);

        // Sales decomposed (16-19) — low
        features[16] = rng.binary_feature(0.05);  // sales_b2b_core
        features[17] = rng.binary_feature(0.05);  // sales_outreach
        features[18] = rng.next_range(0.0, 0.15); // sales_funnel
        features[19] = rng.binary_feature(0.05);  // sales_platform

        // Training signals (20-23) — low
        features[20] = rng.next_range(0.0, 0.15); // research_intensity
        features[21] = rng.next_range(0.0, 0.15); // infra_sophistication
        features[22] = rng.next_range(0.0, 0.2);  // signal_breadth
        features[23] = rng.next_range(0.0, 0.15); // domain_nlp_focus

        // Architecture diversity (24-28) — low
        features[24] = rng.next_range(0.0, 0.2);  // library_sophistication
        features[25] = rng.next_range(0.0, 0.2);  // pipeline_diversity
        features[26] = rng.next_range(0.0, 0.1);  // custom_arch_ratio
        features[27] = rng.next_range(0.0, 0.15); // framework_diversity
        features[28] = rng.next_range(0.0, 0.05); // moe_ratio

        // Download signals (29-33) — low
        features[29] = rng.next_range(0.0, 0.2);  // download_scale
        features[30] = rng.next_range(0.0, 0.15); // download_per_model
        features[31] = rng.next_range(0.0, 0.3);  // top_model_dominance
        features[32] = rng.next_range(0.0, 0.02); // likes_per_download
        features[33] = rng.next_range(0.0, 0.2);  // download_breadth

        // Temporal (34-37) — low/stale
        features[34] = rng.next_range(0.0, 0.3);  // recency
        features[35] = rng.next_range(0.0, 0.3);  // acceleration
        features[36] = rng.next_range(0.0, 0.3);  // longevity
        features[37] = rng.next_range(0.0, 0.15); // burst_intensity

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
}
