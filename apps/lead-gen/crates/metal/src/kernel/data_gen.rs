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

/// Generate synthetic ICP contact training data.
///
/// Creates `count` labeled samples — roughly half positive (ICP match, label
/// 1.0) and half negative (label 0.0) — with realistic feature distributions
/// and deliberate noise/overlap so the boundary is not trivially separable.
///
/// Feature vector layout (matches `LabeledSample.features`):
///   [0] industry_match      binary
///   [1] employee_in_range   binary
///   [2] seniority_match     binary
///   [3] department_match    binary
///   [4] tech_norm           continuous [0, 1]
///   [5] email_norm          continuous [0, 1]
///   [6] recency_smooth      continuous [0, 1]
pub fn generate_contact_labels(count: usize) -> Vec<LabeledSample> {
    let mut rng = Rng::new(0xDEAD_BEEF_1234_5678);
    let mut samples = Vec::with_capacity(count);

    let half = count / 2;
    let positives = half;
    let negatives = count - half; // handles odd counts

    // --- Positive examples (ICP match) ------------------------------------
    for _ in 0..positives {
        // Add noise: ~15 % of positives have one weak signal to blur boundary
        let noise = rng.next_bool(0.15);

        let industry_match = if noise { rng.binary_feature(0.6) } else { rng.binary_feature(0.88) };
        let employee_in_range = rng.binary_feature(0.82);
        let seniority_match = if noise { rng.binary_feature(0.55) } else { rng.binary_feature(0.80) };
        let department_match = rng.binary_feature(0.75);
        let tech_norm = rng.next_range(0.5, 1.0);
        let email_norm = rng.next_range(0.5, 1.0);
        let recency_smooth = rng.next_range(0.5, 1.0);

        samples.push(LabeledSample {
            features: [
                industry_match,
                employee_in_range,
                seniority_match,
                department_match,
                tech_norm,
                email_norm,
                recency_smooth,
            ],
            label: 1.0,
        });
    }

    // --- Negative examples (not ICP match) --------------------------------
    for _ in 0..negatives {
        // Add noise: ~10 % of negatives look almost positive
        let noise = rng.next_bool(0.10);

        let industry_match = if noise { rng.binary_feature(0.55) } else { rng.binary_feature(0.18) };
        let employee_in_range = rng.binary_feature(0.30);
        let seniority_match = if noise { rng.binary_feature(0.50) } else { rng.binary_feature(0.15) };
        let department_match = rng.binary_feature(0.28);
        let tech_norm = rng.next_range(0.0, 0.35);
        let email_norm = rng.next_range(0.0, 0.50);
        let recency_smooth = rng.next_range(0.05, 0.50);

        samples.push(LabeledSample {
            features: [
                industry_match,
                employee_in_range,
                seniority_match,
                department_match,
                tech_norm,
                email_norm,
                recency_smooth,
            ],
            label: 0.0,
        });
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
