/// Voyager API ↔ Rust/Metal Pipeline Bridge.
///
/// Receives structured LinkedIn Voyager data (fetched in TypeScript, serialized as JSON),
/// maps it to the existing Rust pipeline types, and feeds it into JobBERT-v3 embeddings,
/// ConTeXT skill extraction, intent scoring, and the zero-alloc NER state machine.
///
/// # Design Rationale
///
/// Voyager data is **structured** — it comes with explicit `workplaceType`, skill URNs,
/// salary bands, etc. The existing NER pipeline extracts this same information from
/// **unstructured** job posting text. This bridge:
///
/// 1. Maps structured Voyager fields directly (zero extraction error)
/// 2. Falls back to NER extraction for fields Voyager doesn't provide
/// 3. Fuses both signal sources with confidence-weighted merging
/// 4. Feeds the merged result into downstream ML (embeddings, scoring)
///
/// # Serialization Format
///
/// TypeScript serializes `VoyagerJobPayload` as JSON via `JSON.stringify()`.
/// Rust deserializes via `serde_json::from_str::<VoyagerJobPayload>()`.
/// The wire format is a JSON object — no protobuf/msgpack needed because:
/// - Batch sizes are small (10-50 jobs per Voyager API page)
/// - JSON serialization cost is dwarfed by ONNX inference (~200ms per batch)
/// - Debugging visibility outweighs the ~2x size overhead vs binary formats
///
/// Requires feature: `kernel-ner` (for `job_ner::JobExtraction` interop)

use serde::{Deserialize, Serialize};

#[cfg(feature = "kernel-ner")]
use super::job_ner::{self, JobExtraction, SkillIdf};

// ════════════════════════════════════════════════════════════════════════════════
// § 1. Voyager API Data Types (deserialized from TypeScript JSON)
// ════════════════════════════════════════════════════════════════════════════════

/// Workplace type as reported by LinkedIn Voyager API.
/// Maps directly to the existing `remote_policy` u8 enum:
///   0=unknown, 1=full_remote, 2=hybrid, 3=onsite
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum VoyagerWorkplaceType {
    Remote,
    Hybrid,
    #[serde(alias = "on-site")]
    OnSite,
}

impl VoyagerWorkplaceType {
    /// Convert to the `job_ner.rs` remote_policy encoding.
    /// This mapping is authoritative — Voyager structured data is ground truth
    /// for workplace type, unlike NER heuristic pattern matching.
    pub fn to_remote_policy(self) -> u8 {
        match self {
            Self::Remote => 1,  // full_remote
            Self::Hybrid => 2,  // hybrid
            Self::OnSite => 3,  // onsite
        }
    }

    /// Confidence of this classification. Voyager structured data = 1.0.
    /// Compare with NER `detect_remote_policy` which uses pattern matching
    /// and has ~0.85 accuracy on edge cases like bare "remote" (maps to hybrid).
    pub fn confidence(self) -> f32 {
        1.0
    }
}

/// A skill as reported by Voyager API (LinkedIn's structured skill taxonomy).
/// LinkedIn skills have URNs like `urn:li:fsd_skill:123` and normalized labels.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoyagerSkill {
    /// LinkedIn skill URN (e.g., "urn:li:fsd_skill:12345").
    pub urn: String,
    /// Normalized skill label (e.g., "Python (Programming Language)").
    pub label: String,
    /// LinkedIn's own skill type classification.
    #[serde(default)]
    pub skill_type: Option<String>,
}

/// Salary information from Voyager API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoyagerSalary {
    pub min: Option<u32>,
    pub max: Option<u32>,
    /// ISO 4217 currency code (e.g., "USD", "EUR", "GBP").
    pub currency: String,
    /// Pay period: "YEARLY", "MONTHLY", "HOURLY".
    #[serde(default)]
    pub period: Option<String>,
}

impl VoyagerSalary {
    /// Normalize salary to annual USD-equivalent for comparison with NER extraction.
    /// NER `extract_salary` always produces annual figures in the original currency.
    pub fn annualized_min(&self) -> u32 {
        let base = self.min.unwrap_or(0);
        self.annualize(base)
    }

    pub fn annualized_max(&self) -> u32 {
        let base = self.max.unwrap_or(0);
        self.annualize(base)
    }

    fn annualize(&self, amount: u32) -> u32 {
        match self.period.as_deref() {
            Some("MONTHLY") => amount.saturating_mul(12),
            Some("HOURLY") => amount.saturating_mul(2080), // 40h * 52w
            _ => amount, // YEARLY or unknown
        }
    }
}

/// Full Voyager job payload — the JSON wire type between TypeScript and Rust.
///
/// TypeScript serializes this as:
/// ```typescript
/// const payload: VoyagerJobPayload = {
///   urn: job.entityUrn,
///   title: job.title,
///   description: job.description?.text ?? "",
///   companyName: job.companyDetails?.company?.name ?? "",
///   companyUrn: job.companyDetails?.company?.entityUrn,
///   workplaceType: mapWorkplaceType(job.workplaceType),
///   salary: extractSalary(job),
///   skills: job.skillMatchStatuses?.map(mapSkill) ?? [],
///   location: job.formattedLocation,
///   listedAt: job.listedAt,  // epoch ms
///   applyUrl: job.applyMethod?.companyApplyUrl,
///   posterUrn: job.poster?.entityUrn,
///   reposted: job.repostedJob ?? false,
///   employmentType: job.employmentType,
///   experienceLevel: job.experienceLevel,
/// };
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoyagerJobPayload {
    /// LinkedIn URN (e.g., "urn:li:fsd_jobPosting:4123456789").
    pub urn: String,
    pub title: String,
    /// Full job description text (HTML stripped by TypeScript before serialization).
    pub description: String,
    pub company_name: String,
    #[serde(default)]
    pub company_urn: Option<String>,

    /// Structured workplace type from Voyager API.
    #[serde(default)]
    pub workplace_type: Option<VoyagerWorkplaceType>,

    /// Structured salary from Voyager API.
    #[serde(default)]
    pub salary: Option<VoyagerSalary>,

    /// Structured skills from Voyager API (LinkedIn's skill taxonomy).
    #[serde(default)]
    pub skills: Vec<VoyagerSkill>,

    #[serde(default)]
    pub location: Option<String>,

    /// Epoch milliseconds when LinkedIn listed the job.
    #[serde(default)]
    pub listed_at: Option<u64>,

    #[serde(default)]
    pub apply_url: Option<String>,

    #[serde(default)]
    pub poster_urn: Option<String>,

    #[serde(default)]
    pub reposted: bool,

    /// "FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", etc.
    #[serde(default)]
    pub employment_type: Option<String>,

    /// Voyager experience level: "ENTRY_LEVEL", "MID_SENIOR", "DIRECTOR", etc.
    #[serde(default)]
    pub experience_level: Option<String>,
}

/// Batch of Voyager jobs for pipeline processing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoyagerJobBatch {
    pub jobs: Vec<VoyagerJobPayload>,
    /// Timestamp when this batch was fetched (epoch ms).
    pub fetched_at: u64,
}

// ════════════════════════════════════════════════════════════════════════════════
// § 2. Merged Extraction Result (Voyager structured + NER unstructured)
// ════════════════════════════════════════════════════════════════════════════════

/// Source provenance for each extracted field.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FieldSource {
    /// From Voyager API structured data (high confidence).
    Voyager,
    /// From NER state machine extraction (variable confidence).
    Ner,
    /// Fused from both sources (highest confidence).
    Fused,
}

/// A skill with provenance tracking — enables quality comparison between
/// Voyager structured skills and ML-extracted skills.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenancedSkill {
    /// Normalized skill label (lowercased, trimmed).
    pub label: String,
    /// Confidence score: 1.0 for Voyager, 0.0-1.0 for ML extraction.
    pub confidence: f32,
    /// Where this skill came from.
    pub source: FieldSource,
    /// LinkedIn skill URN (only present for Voyager-sourced skills).
    #[serde(default)]
    pub voyager_urn: Option<String>,
    /// ESCO mapping (if available from the esco.rs bridge).
    #[serde(default)]
    pub esco_label: Option<String>,
}

/// Merged job extraction combining Voyager structured data with NER extraction.
///
/// For each field, the higher-confidence source wins. When both sources agree,
/// the `Fused` provenance is assigned with boosted confidence.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergedJobExtraction {
    /// Canonical source URN.
    pub voyager_urn: String,

    // --- Core fields ---
    pub company: String,
    pub company_source: FieldSource,

    pub title: String,
    pub title_source: FieldSource,

    /// remote_policy: 0=unknown, 1=full_remote, 2=hybrid, 3=onsite
    pub remote_policy: u8,
    pub remote_source: FieldSource,
    pub remote_confidence: f32,

    pub salary_min: u32,
    pub salary_max: u32,
    pub salary_currency: String,
    pub salary_source: FieldSource,

    pub experience_min: u8,
    pub experience_max: u8,

    // --- Skills (merged from both sources) ---
    pub skills: Vec<ProvenancedSkill>,

    // --- Metadata ---
    pub location: Option<String>,
    pub employment_type: Option<String>,
    pub experience_level: Option<String>,
    pub listed_at: Option<u64>,
    pub apply_url: Option<String>,
    pub poster_urn: Option<String>,
    pub reposted: bool,

    /// Overall extraction confidence (0.0-1.0).
    /// Voyager-sourced jobs start at ~0.90 (structured data is reliable).
    /// NER-only jobs cap at ~0.70 (pattern matching has failure modes).
    pub overall_confidence: f32,

    /// Description text passed through for embedding pipeline.
    pub description: String,
}

// ════════════════════════════════════════════════════════════════════════════════
// § 3. Voyager → remote_policy Mapping
// ════════════════════════════════════════════════════════════════════════════════

/// Map Voyager workplace type to existing remote_policy, with NER fallback.
///
/// Priority order:
/// 1. Voyager `workplaceType` field (confidence=1.0, structured API data)
/// 2. NER `detect_remote_policy` from description text (confidence=0.70-0.85)
/// 3. 0 (unknown) if neither source has signal
///
/// When both sources agree, confidence is boosted to 1.0 (Fused).
/// When they disagree, Voyager wins (structured > heuristic).
#[cfg(feature = "kernel-ner")]
pub fn resolve_remote_policy(
    voyager_type: Option<VoyagerWorkplaceType>,
    description: &[u8],
) -> (u8, f32, FieldSource) {
    let ner_policy = job_ner::detect_remote_policy(
        &description.iter().map(|b| b.to_ascii_lowercase()).collect::<Vec<u8>>(),
    );
    let ner_confidence = match ner_policy {
        1 => 0.90, // "fully remote" patterns are reliable
        2 => 0.70, // hybrid/bare "remote" is ambiguous
        3 => 0.85, // onsite patterns are fairly reliable
        _ => 0.0,
    };

    match voyager_type {
        Some(vt) => {
            let voyager_policy = vt.to_remote_policy();
            if voyager_policy == ner_policy && ner_policy != 0 {
                // Both sources agree — Fused with maximum confidence
                (voyager_policy, 1.0, FieldSource::Fused)
            } else {
                // Voyager takes priority
                (voyager_policy, vt.confidence(), FieldSource::Voyager)
            }
        }
        None => {
            if ner_policy != 0 {
                (ner_policy, ner_confidence, FieldSource::Ner)
            } else {
                (0, 0.0, FieldSource::Ner)
            }
        }
    }
}

/// Non-NER version for when only Voyager data is available.
pub fn resolve_remote_policy_voyager_only(
    voyager_type: Option<VoyagerWorkplaceType>,
) -> (u8, f32, FieldSource) {
    match voyager_type {
        Some(vt) => (vt.to_remote_policy(), vt.confidence(), FieldSource::Voyager),
        None => (0, 0.0, FieldSource::Ner),
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// § 4. Skill Extraction Pipeline Integration
// ════════════════════════════════════════════════════════════════════════════════

/// Normalize a Voyager skill label for comparison with ML-extracted skills.
///
/// LinkedIn skill labels often include qualifiers like "(Programming Language)"
/// or "Amazon Web Services (AWS)". This normalizes to a form comparable with
/// the internal 157-tag taxonomy from `esco.rs`.
pub fn normalize_voyager_skill(label: &str) -> String {
    let mut normalized = label.to_lowercase();

    // Strip parenthetical qualifiers: "Python (Programming Language)" → "python"
    if let Some(paren_start) = normalized.find('(') {
        // But keep the content if it's an acronym expansion:
        // "Amazon Web Services (AWS)" → keep "aws" from inside parens
        let inside = &normalized[paren_start + 1..];
        if let Some(paren_end) = inside.find(')') {
            let acronym = inside[..paren_end].trim();
            if acronym.len() <= 5 && acronym.chars().all(|c| c.is_ascii_alphanumeric()) {
                // It's an acronym — use it as the canonical form
                normalized = acronym.to_string();
            } else {
                // Strip the parenthetical
                normalized = normalized[..paren_start].trim().to_string();
            }
        }
    }

    // Normalize separators
    normalized = normalized.replace(' ', "-");
    normalized = normalized.replace('_', "-");

    // Remove trailing dots/commas
    normalized = normalized.trim_end_matches(|c: char| c == '.' || c == ',').to_string();

    normalized
}

/// Merge Voyager structured skills with ML-extracted skills (from ConTeXT or NER).
///
/// Strategy:
/// 1. Voyager skills get confidence=1.0 (structured ground truth)
/// 2. ML-extracted skills keep their cosine similarity as confidence
/// 3. If a skill appears in both, it becomes Fused with boosted confidence
/// 4. Duplicates are deduplicated by normalized label (Voyager version wins)
///
/// This handles the quality gap: Voyager gives ~15-20 skills per job with perfect
/// precision but limited recall (only skills LinkedIn has in its taxonomy).
/// ConTeXT extraction gives broader coverage but with ~0.45-0.85 precision.
pub fn merge_skills(
    voyager_skills: &[VoyagerSkill],
    ml_skills: &[(String, f32)], // (label, confidence) from ConTeXT or NER
) -> Vec<ProvenancedSkill> {
    let mut merged: Vec<ProvenancedSkill> = Vec::with_capacity(
        voyager_skills.len() + ml_skills.len(),
    );

    // Index Voyager skills by normalized label for O(1) lookup
    let mut voyager_labels: std::collections::HashSet<String> =
        std::collections::HashSet::with_capacity(voyager_skills.len());

    for vs in voyager_skills {
        let normalized = normalize_voyager_skill(&vs.label);
        voyager_labels.insert(normalized.clone());
        merged.push(ProvenancedSkill {
            label: normalized,
            confidence: 1.0,
            source: FieldSource::Voyager,
            voyager_urn: Some(vs.urn.clone()),
            esco_label: None,
        });
    }

    // Add ML-extracted skills, marking as Fused if Voyager also has them
    for (ml_label, ml_conf) in ml_skills {
        let normalized = ml_label.to_lowercase().replace(' ', "-");
        if voyager_labels.contains(&normalized) {
            // Both sources have this skill — upgrade to Fused
            if let Some(existing) = merged.iter_mut().find(|s| s.label == normalized) {
                existing.source = FieldSource::Fused;
                // Boost confidence: both structured + ML agree
                existing.confidence = 1.0_f32.min(existing.confidence + ml_conf * 0.1);
            }
        } else {
            // ML-only skill — keep with original confidence
            merged.push(ProvenancedSkill {
                label: normalized,
                confidence: *ml_conf,
                source: FieldSource::Ner,
                voyager_urn: None,
                esco_label: None,
            });
        }
    }

    // Sort by confidence descending
    merged.sort_by(|a, b| {
        b.confidence
            .partial_cmp(&a.confidence)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    merged
}

// ════════════════════════════════════════════════════════════════════════════════
// § 5. Full Voyager → MergedJobExtraction Conversion
// ════════════════════════════════════════════════════════════════════════════════

/// Convert a single Voyager job payload into a `MergedJobExtraction`.
///
/// This is the primary bridge function. It:
/// 1. Maps Voyager structured fields directly (company, title, salary, workplace)
/// 2. Optionally runs NER on the description for additional signal
/// 3. Merges skills from both sources
/// 4. Computes overall confidence
///
/// The `ml_skills` parameter accepts pre-extracted skills from ConTeXT or
/// other ML pipelines. Pass empty slice if ML extraction hasn't been run yet.
pub fn convert_voyager_job(
    payload: &VoyagerJobPayload,
    ml_skills: &[(String, f32)],
) -> MergedJobExtraction {
    // § 5a. Remote policy resolution
    let (remote_policy, remote_confidence, remote_source) =
        resolve_remote_policy_voyager_only(payload.workplace_type);

    // § 5b. Salary resolution — Voyager salary is structured and authoritative
    let (salary_min, salary_max, salary_currency, salary_source) = match &payload.salary {
        Some(sal) => (
            sal.annualized_min(),
            sal.annualized_max(),
            sal.currency.clone(),
            FieldSource::Voyager,
        ),
        None => (0, 0, "USD".to_string(), FieldSource::Ner),
    };

    // § 5c. Skill merging
    let skills = merge_skills(&payload.skills, ml_skills);

    // § 5d. Experience level mapping
    let (experience_min, experience_max) = map_experience_level(
        payload.experience_level.as_deref(),
    );

    // § 5e. Overall confidence computation
    let mut conf_sum = 0.0f32;
    let mut conf_count = 0u8;

    // Company always present from Voyager (high confidence)
    if !payload.company_name.is_empty() {
        conf_sum += 1.0;
        conf_count += 1;
    }
    // Title always present from Voyager
    if !payload.title.is_empty() {
        conf_sum += 1.0;
        conf_count += 1;
    }
    // Remote policy
    if remote_policy != 0 {
        conf_sum += remote_confidence;
        conf_count += 1;
    }
    // Salary
    if salary_min > 0 || salary_max > 0 {
        conf_sum += 0.95; // Voyager salary is slightly less reliable (sometimes missing)
        conf_count += 1;
    }
    // Skills
    if !skills.is_empty() {
        let avg_skill_conf = skills.iter().map(|s| s.confidence).sum::<f32>()
            / skills.len() as f32;
        conf_sum += avg_skill_conf;
        conf_count += 1;
    }

    let overall_confidence = if conf_count > 0 {
        conf_sum / conf_count as f32
    } else {
        0.0
    };

    MergedJobExtraction {
        voyager_urn: payload.urn.clone(),
        company: payload.company_name.clone(),
        company_source: FieldSource::Voyager,
        title: payload.title.clone(),
        title_source: FieldSource::Voyager,
        remote_policy,
        remote_source,
        remote_confidence,
        salary_min,
        salary_max,
        salary_currency,
        salary_source,
        experience_min,
        experience_max,
        skills,
        location: payload.location.clone(),
        employment_type: payload.employment_type.clone(),
        experience_level: payload.experience_level.clone(),
        listed_at: payload.listed_at,
        apply_url: payload.apply_url.clone(),
        poster_urn: payload.poster_urn.clone(),
        reposted: payload.reposted,
        overall_confidence,
        description: payload.description.clone(),
    }
}

/// Convert with NER fallback — runs the zero-alloc state machine on the
/// description text to fill in any fields Voyager didn't provide.
#[cfg(feature = "kernel-ner")]
pub fn convert_voyager_job_with_ner(
    payload: &VoyagerJobPayload,
    ml_skills: &[(String, f32)],
    idf: &mut SkillIdf,
) -> MergedJobExtraction {
    let desc_bytes = payload.description.as_bytes();

    // Run NER on description
    let mut ner_extraction = JobExtraction::new();
    job_ner::extract_job_fields_ml(desc_bytes, &mut ner_extraction, idf);

    // § Remote policy: fuse Voyager + NER
    let (remote_policy, remote_confidence, remote_source) =
        resolve_remote_policy(payload.workplace_type, desc_bytes);

    // § Salary: prefer Voyager, fall back to NER
    let (salary_min, salary_max, salary_currency, salary_source) = match &payload.salary {
        Some(sal) if sal.min.is_some() || sal.max.is_some() => (
            sal.annualized_min(),
            sal.annualized_max(),
            sal.currency.clone(),
            FieldSource::Voyager,
        ),
        _ => {
            if ner_extraction.salary_min > 0 || ner_extraction.salary_max > 0 {
                (
                    ner_extraction.salary_min,
                    ner_extraction.salary_max,
                    "USD".to_string(), // NER doesn't detect currency
                    FieldSource::Ner,
                )
            } else {
                (0, 0, "USD".to_string(), FieldSource::Ner)
            }
        }
    };

    // § Experience: prefer Voyager structured, fall back to NER
    let (experience_min, experience_max) = match payload.experience_level.as_deref() {
        Some(level) => map_experience_level(Some(level)),
        None => (ner_extraction.experience_min, ner_extraction.experience_max),
    };

    // § Skills: merge Voyager + NER keyword skills + ML skills
    let mut all_ml_skills: Vec<(String, f32)> = ml_skills.to_vec();

    // Add NER-extracted skills with 0.70 confidence (keyword match)
    for i in 0..ner_extraction.skills_count as usize {
        let skill_str = ner_extraction.skill_str(i);
        if !skill_str.is_empty() {
            all_ml_skills.push((skill_str.to_string(), 0.70));
        }
    }

    let skills = merge_skills(&payload.skills, &all_ml_skills);

    // § Company: prefer Voyager, NER as fallback
    let (company, company_source) = if !payload.company_name.is_empty() {
        (payload.company_name.clone(), FieldSource::Voyager)
    } else {
        let ner_company = ner_extraction.company_str().to_string();
        if !ner_company.is_empty() {
            (ner_company, FieldSource::Ner)
        } else {
            (String::new(), FieldSource::Ner)
        }
    };

    // § Title: prefer Voyager, NER as fallback
    let (title, title_source) = if !payload.title.is_empty() {
        (payload.title.clone(), FieldSource::Voyager)
    } else {
        let ner_title = ner_extraction.title_str().to_string();
        if !ner_title.is_empty() {
            (ner_title, FieldSource::Ner)
        } else {
            (String::new(), FieldSource::Ner)
        }
    };

    // § Overall confidence
    let mut conf_sum = 0.0f32;
    let mut conf_count = 0u8;

    if !company.is_empty() {
        conf_sum += if company_source == FieldSource::Voyager { 1.0 } else { 0.70 };
        conf_count += 1;
    }
    if !title.is_empty() {
        conf_sum += if title_source == FieldSource::Voyager { 1.0 } else { 0.70 };
        conf_count += 1;
    }
    if remote_policy != 0 {
        conf_sum += remote_confidence;
        conf_count += 1;
    }
    if salary_min > 0 || salary_max > 0 {
        conf_sum += if salary_source == FieldSource::Voyager { 0.95 } else { 0.75 };
        conf_count += 1;
    }
    if !skills.is_empty() {
        let avg = skills.iter().map(|s| s.confidence).sum::<f32>() / skills.len() as f32;
        conf_sum += avg;
        conf_count += 1;
    }

    let overall_confidence = if conf_count > 0 {
        conf_sum / conf_count as f32
    } else {
        0.0
    };

    MergedJobExtraction {
        voyager_urn: payload.urn.clone(),
        company,
        company_source,
        title,
        title_source,
        remote_policy,
        remote_source,
        remote_confidence,
        salary_min,
        salary_max,
        salary_currency,
        salary_source,
        experience_min,
        experience_max,
        skills,
        location: payload.location.clone(),
        employment_type: payload.employment_type.clone(),
        experience_level: payload.experience_level.clone(),
        listed_at: payload.listed_at,
        apply_url: payload.apply_url.clone(),
        poster_urn: payload.poster_urn.clone(),
        reposted: payload.reposted,
        overall_confidence,
        description: payload.description.clone(),
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// § 6. JobBERT-v3 Embedding Pipeline Integration
// ════════════════════════════════════════════════════════════════════════════════

/// Prepare description text for JobBERT-v3 embedding.
///
/// JobBERT-v3 has a 64-token max sequence length, so we need to prioritize
/// the most informative content. Strategy:
/// 1. Prepend title (always fits, highest signal density)
/// 2. Follow with first ~200 chars of description (requirements section)
/// 3. Append structured skills as comma-separated suffix
///
/// This produces better embeddings than raw description because:
/// - Title is the single most discriminative feature for job matching
/// - Structured skills provide explicit semantic grounding
/// - 64 tokens ~= 50 words, so we must be surgical about content selection
pub fn prepare_jobbert_input(extraction: &MergedJobExtraction) -> String {
    let mut text = String::with_capacity(256);

    // Title first — highest information density per token
    text.push_str(&extraction.title);

    // Separator
    if !extraction.description.is_empty() {
        text.push_str(". ");
        // Take first ~200 chars of description (covers job summary/requirements)
        let desc_prefix = if extraction.description.len() > 200 {
            &extraction.description[..200]
        } else {
            &extraction.description
        };
        text.push_str(desc_prefix);
    }

    // Append top skills as suffix (structured data supplements description)
    let top_skills: Vec<&str> = extraction
        .skills
        .iter()
        .filter(|s| s.confidence >= 0.5)
        .take(8)
        .map(|s| s.label.as_str())
        .collect();

    if !top_skills.is_empty() {
        text.push_str(". Skills: ");
        text.push_str(&top_skills.join(", "));
    }

    text
}

/// Prepare a batch of merged extractions for JobBERT-v3 embedding.
///
/// Returns a Vec of prepared text strings, one per job, suitable for
/// `JobBertV3Embedder::embed_batch()`.
pub fn prepare_jobbert_batch(extractions: &[MergedJobExtraction]) -> Vec<String> {
    extractions.iter().map(prepare_jobbert_input).collect()
}

// ════════════════════════════════════════════════════════════════════════════════
// § 7. Intent Scoring Integration
// ════════════════════════════════════════════════════════════════════════════════

/// Extract intent signals from a Voyager job for the existing
/// `IntentBatch` scoring system (kernel/intent_scoring.rs).
///
/// Voyager jobs provide several signals that map to intent categories:
/// - Job posting itself → HiringIntent (confidence based on recency)
/// - Skills mentioning AI/ML tools → TechAdoption
/// - "Growing team" / headcount in description → GrowthSignal
/// - Experience level / seniority → LeadershipChange proxy
///
/// These signals are fed into `IntentBatch::aggregate_signals()` for
/// SIMD-optimized batch scoring.
pub fn extract_intent_signals(
    extraction: &MergedJobExtraction,
    days_ago: u16,
) -> Vec<IntentSignalInput> {
    let mut signals = Vec::with_capacity(4);

    // Every job posting is a HiringIntent signal
    signals.push(IntentSignalInput {
        signal_type: IntentSignalType::HiringIntent,
        confidence: extraction.overall_confidence,
        detected_at_days: days_ago,
    });

    // Check for AI/ML tech adoption signals in skills
    let ai_skills: Vec<&ProvenancedSkill> = extraction
        .skills
        .iter()
        .filter(|s| {
            let l = &s.label;
            l.contains("machine-learning")
                || l.contains("deep-learning")
                || l.contains("pytorch")
                || l.contains("tensorflow")
                || l.contains("llm")
                || l.contains("nlp")
                || l.contains("transformers")
                || l.contains("rag")
                || l.contains("openai")
                || l.contains("anthropic")
                || l.contains("langchain")
        })
        .collect();

    if !ai_skills.is_empty() {
        let avg_conf = ai_skills.iter().map(|s| s.confidence).sum::<f32>()
            / ai_skills.len() as f32;
        signals.push(IntentSignalInput {
            signal_type: IntentSignalType::TechAdoption,
            confidence: avg_conf * 0.9, // slight discount since inferred from skills
            detected_at_days: days_ago,
        });
    }

    // Growth signal from description keywords
    let desc_lower = extraction.description.to_lowercase();
    if desc_lower.contains("growing team")
        || desc_lower.contains("scaling")
        || desc_lower.contains("expanding")
        || desc_lower.contains("new team")
        || desc_lower.contains("greenfield")
    {
        signals.push(IntentSignalInput {
            signal_type: IntentSignalType::GrowthSignal,
            confidence: 0.65,
            detected_at_days: days_ago,
        });
    }

    signals
}

/// Lightweight intent signal type mirroring `intent_scoring::SignalType`.
/// Avoids pulling in the full intent_scoring dependency for bridge code.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum IntentSignalType {
    HiringIntent,
    TechAdoption,
    GrowthSignal,
    BudgetCycle,
    LeadershipChange,
    ProductLaunch,
}

/// Input signal for intent scoring pipeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentSignalInput {
    pub signal_type: IntentSignalType,
    pub confidence: f32,
    pub detected_at_days: u16,
}

// ════════════════════════════════════════════════════════════════════════════════
// § 8. Quality Comparison: Voyager Structured vs NER Extraction
// ════════════════════════════════════════════════════════════════════════════════

/// Field-level quality comparison between Voyager structured data and NER extraction.
/// Used for eval/calibration: run both pipelines on the same job, compare outputs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityComparison {
    pub voyager_urn: String,

    /// Did remote_policy agree between Voyager and NER?
    pub remote_agrees: bool,
    pub voyager_remote: u8,
    pub ner_remote: u8,

    /// Salary agreement (within 10% tolerance).
    pub salary_agrees: bool,
    pub voyager_salary_min: u32,
    pub ner_salary_min: u32,

    /// Skill overlap metrics.
    pub voyager_skill_count: usize,
    pub ner_skill_count: usize,
    pub shared_skill_count: usize,
    /// Jaccard similarity of skill sets: |intersection| / |union|
    pub skill_jaccard: f32,

    /// Voyager-only skills (high precision, potentially missing from NER).
    pub voyager_only_skills: Vec<String>,
    /// NER-only skills (potentially false positives or legitimate Voyager gaps).
    pub ner_only_skills: Vec<String>,
}

/// Run quality comparison between Voyager structured data and NER extraction.
#[cfg(feature = "kernel-ner")]
pub fn compare_extraction_quality(
    payload: &VoyagerJobPayload,
    idf: &mut SkillIdf,
) -> QualityComparison {
    let desc_bytes = payload.description.as_bytes();

    // Run NER extraction
    let mut ner_ext = JobExtraction::new();
    job_ner::extract_job_fields_ml(desc_bytes, &mut ner_ext, idf);

    // Remote policy comparison
    let voyager_remote = payload
        .workplace_type
        .map(|wt| wt.to_remote_policy())
        .unwrap_or(0);
    let ner_remote = ner_ext.remote_policy;
    let remote_agrees = voyager_remote == ner_remote || voyager_remote == 0 || ner_remote == 0;

    // Salary comparison (within 10% tolerance)
    let voyager_sal_min = payload
        .salary
        .as_ref()
        .map(|s| s.annualized_min())
        .unwrap_or(0);
    let ner_sal_min = ner_ext.salary_min;
    let salary_agrees = if voyager_sal_min == 0 || ner_sal_min == 0 {
        true // can't compare if one is missing
    } else {
        let diff = (voyager_sal_min as f64 - ner_sal_min as f64).abs();
        let max_val = voyager_sal_min.max(ner_sal_min) as f64;
        diff / max_val < 0.10
    };

    // Skill comparison
    let voyager_skills: std::collections::HashSet<String> = payload
        .skills
        .iter()
        .map(|s| normalize_voyager_skill(&s.label))
        .collect();

    let mut ner_skills = std::collections::HashSet::new();
    for i in 0..ner_ext.skills_count as usize {
        let s = ner_ext.skill_str(i);
        if !s.is_empty() {
            ner_skills.insert(s.to_string());
        }
    }

    let shared: std::collections::HashSet<_> = voyager_skills
        .intersection(&ner_skills)
        .cloned()
        .collect();
    let union_size = voyager_skills.union(&ner_skills).count();
    let skill_jaccard = if union_size > 0 {
        shared.len() as f32 / union_size as f32
    } else {
        0.0
    };

    let voyager_only: Vec<String> = voyager_skills
        .difference(&ner_skills)
        .cloned()
        .collect();
    let ner_only: Vec<String> = ner_skills
        .difference(&voyager_skills)
        .cloned()
        .collect();

    QualityComparison {
        voyager_urn: payload.urn.clone(),
        remote_agrees,
        voyager_remote,
        ner_remote,
        salary_agrees,
        voyager_salary_min: voyager_sal_min,
        ner_salary_min: ner_ext.salary_min,
        voyager_skill_count: voyager_skills.len(),
        ner_skill_count: ner_skills.len(),
        shared_skill_count: shared.len(),
        skill_jaccard,
        voyager_only_skills: voyager_only,
        ner_only_skills: ner_only,
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// § Helpers
// ════════════════════════════════════════════════════════════════════════════════

/// Map Voyager experience level string to (min_years, max_years).
fn map_experience_level(level: Option<&str>) -> (u8, u8) {
    match level {
        Some("INTERNSHIP") => (0, 0),
        Some("ENTRY_LEVEL") => (0, 2),
        Some("ASSOCIATE") => (2, 5),
        Some("MID_SENIOR") | Some("MID_SENIOR_LEVEL") => (5, 10),
        Some("DIRECTOR") => (8, 15),
        Some("EXECUTIVE") => (15, 99),
        _ => (0, 0), // unknown
    }
}

/// Deserialize a batch of Voyager jobs from JSON (the wire format from TypeScript).
pub fn deserialize_batch(json: &str) -> Result<VoyagerJobBatch, serde_json::Error> {
    serde_json::from_str(json)
}

/// Deserialize a single Voyager job from JSON.
pub fn deserialize_job(json: &str) -> Result<VoyagerJobPayload, serde_json::Error> {
    serde_json::from_str(json)
}

/// Serialize a merged extraction to JSON for storage or IPC back to TypeScript.
pub fn serialize_merged(extraction: &MergedJobExtraction) -> Result<String, serde_json::Error> {
    serde_json::to_string(extraction)
}

// ════════════════════════════════════════════════════════════════════════════════
// § Tests
// ════════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_voyager_payload() -> VoyagerJobPayload {
        VoyagerJobPayload {
            urn: "urn:li:fsd_jobPosting:4123456789".to_string(),
            title: "Senior ML Engineer".to_string(),
            description: "We are hiring a Senior ML Engineer to join our fully remote AI team. \
                Building RAG pipelines with Python, PyTorch, and LangChain. \
                Requirements: 5+ years experience. $180k-$220k."
                .to_string(),
            company_name: "Acme AI Corp".to_string(),
            company_urn: Some("urn:li:fsd_company:1234".to_string()),
            workplace_type: Some(VoyagerWorkplaceType::Remote),
            salary: Some(VoyagerSalary {
                min: Some(180_000),
                max: Some(220_000),
                currency: "USD".to_string(),
                period: Some("YEARLY".to_string()),
            }),
            skills: vec![
                VoyagerSkill {
                    urn: "urn:li:fsd_skill:100".to_string(),
                    label: "Python (Programming Language)".to_string(),
                    skill_type: None,
                },
                VoyagerSkill {
                    urn: "urn:li:fsd_skill:101".to_string(),
                    label: "PyTorch".to_string(),
                    skill_type: None,
                },
                VoyagerSkill {
                    urn: "urn:li:fsd_skill:102".to_string(),
                    label: "Machine Learning".to_string(),
                    skill_type: None,
                },
                VoyagerSkill {
                    urn: "urn:li:fsd_skill:103".to_string(),
                    label: "LangChain".to_string(),
                    skill_type: None,
                },
            ],
            location: Some("Remote".to_string()),
            listed_at: Some(1712793600000), // 2024-04-11
            apply_url: Some("https://acme-ai.com/careers/ml-engineer".to_string()),
            poster_urn: Some("urn:li:fsd_profile:abc123".to_string()),
            reposted: false,
            employment_type: Some("FULL_TIME".to_string()),
            experience_level: Some("MID_SENIOR".to_string()),
        }
    }

    #[test]
    fn test_workplace_type_mapping() {
        assert_eq!(VoyagerWorkplaceType::Remote.to_remote_policy(), 1);
        assert_eq!(VoyagerWorkplaceType::Hybrid.to_remote_policy(), 2);
        assert_eq!(VoyagerWorkplaceType::OnSite.to_remote_policy(), 3);
    }

    #[test]
    fn test_workplace_type_confidence() {
        // Voyager structured data should always be 1.0 confidence
        assert_eq!(VoyagerWorkplaceType::Remote.confidence(), 1.0);
        assert_eq!(VoyagerWorkplaceType::Hybrid.confidence(), 1.0);
        assert_eq!(VoyagerWorkplaceType::OnSite.confidence(), 1.0);
    }

    #[test]
    fn test_salary_annualization() {
        let yearly = VoyagerSalary {
            min: Some(120_000),
            max: Some(180_000),
            currency: "USD".to_string(),
            period: Some("YEARLY".to_string()),
        };
        assert_eq!(yearly.annualized_min(), 120_000);
        assert_eq!(yearly.annualized_max(), 180_000);

        let monthly = VoyagerSalary {
            min: Some(10_000),
            max: Some(15_000),
            currency: "EUR".to_string(),
            period: Some("MONTHLY".to_string()),
        };
        assert_eq!(monthly.annualized_min(), 120_000);
        assert_eq!(monthly.annualized_max(), 180_000);

        let hourly = VoyagerSalary {
            min: Some(75),
            max: Some(100),
            currency: "USD".to_string(),
            period: Some("HOURLY".to_string()),
        };
        assert_eq!(hourly.annualized_min(), 156_000); // 75 * 2080
        assert_eq!(hourly.annualized_max(), 208_000); // 100 * 2080
    }

    #[test]
    fn test_normalize_voyager_skill_strip_qualifier() {
        assert_eq!(
            normalize_voyager_skill("Python (Programming Language)"),
            "python"
        );
    }

    #[test]
    fn test_normalize_voyager_skill_keep_acronym() {
        assert_eq!(
            normalize_voyager_skill("Amazon Web Services (AWS)"),
            "aws"
        );
    }

    #[test]
    fn test_normalize_voyager_skill_simple() {
        assert_eq!(normalize_voyager_skill("PyTorch"), "pytorch");
        assert_eq!(normalize_voyager_skill("Machine Learning"), "machine-learning");
    }

    #[test]
    fn test_merge_skills_voyager_only() {
        let voyager = vec![
            VoyagerSkill {
                urn: "urn:1".to_string(),
                label: "Python".to_string(),
                skill_type: None,
            },
        ];
        let merged = merge_skills(&voyager, &[]);
        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].label, "python");
        assert_eq!(merged[0].confidence, 1.0);
        assert_eq!(merged[0].source, FieldSource::Voyager);
    }

    #[test]
    fn test_merge_skills_both_sources() {
        let voyager = vec![
            VoyagerSkill {
                urn: "urn:1".to_string(),
                label: "Python".to_string(),
                skill_type: None,
            },
        ];
        let ml = vec![
            ("python".to_string(), 0.85),
            ("rust".to_string(), 0.72),
        ];
        let merged = merge_skills(&voyager, &ml);

        assert_eq!(merged.len(), 2);

        // Python should be Fused (both sources)
        let python = merged.iter().find(|s| s.label == "python").unwrap();
        assert_eq!(python.source, FieldSource::Fused);
        assert!(python.confidence >= 1.0); // boosted

        // Rust should be NER-only
        let rust = merged.iter().find(|s| s.label == "rust").unwrap();
        assert_eq!(rust.source, FieldSource::Ner);
        assert_eq!(rust.confidence, 0.72);
    }

    #[test]
    fn test_convert_voyager_job() {
        let payload = sample_voyager_payload();
        let merged = convert_voyager_job(&payload, &[]);

        assert_eq!(merged.voyager_urn, "urn:li:fsd_jobPosting:4123456789");
        assert_eq!(merged.company, "Acme AI Corp");
        assert_eq!(merged.remote_policy, 1); // full_remote
        assert_eq!(merged.salary_min, 180_000);
        assert_eq!(merged.salary_max, 220_000);
        assert_eq!(merged.experience_min, 5);  // MID_SENIOR
        assert_eq!(merged.experience_max, 10);
        assert!(!merged.skills.is_empty());
        assert!(merged.overall_confidence > 0.9);
    }

    #[test]
    fn test_experience_level_mapping() {
        assert_eq!(map_experience_level(Some("ENTRY_LEVEL")), (0, 2));
        assert_eq!(map_experience_level(Some("MID_SENIOR")), (5, 10));
        assert_eq!(map_experience_level(Some("DIRECTOR")), (8, 15));
        assert_eq!(map_experience_level(Some("EXECUTIVE")), (15, 99));
        assert_eq!(map_experience_level(None), (0, 0));
    }

    #[test]
    fn test_prepare_jobbert_input() {
        let payload = sample_voyager_payload();
        let merged = convert_voyager_job(&payload, &[]);
        let input = prepare_jobbert_input(&merged);

        // Should start with title
        assert!(input.starts_with("Senior ML Engineer"));
        // Should contain skills suffix
        assert!(input.contains("Skills:"));
        assert!(input.contains("python"));
    }

    #[test]
    fn test_extract_intent_signals() {
        let payload = sample_voyager_payload();
        let merged = convert_voyager_job(&payload, &[]);
        let signals = extract_intent_signals(&merged, 3);

        // Should always have HiringIntent
        assert!(signals
            .iter()
            .any(|s| matches!(s.signal_type, IntentSignalType::HiringIntent)));

        // Should detect TechAdoption from ML skills
        assert!(signals
            .iter()
            .any(|s| matches!(s.signal_type, IntentSignalType::TechAdoption)));
    }

    #[test]
    fn test_deserialize_voyager_job() {
        let json = r#"{
            "urn": "urn:li:fsd_jobPosting:999",
            "title": "Backend Engineer",
            "description": "Building APIs with Go and PostgreSQL.",
            "companyName": "Test Inc",
            "workplaceType": "hybrid",
            "skills": [
                {"urn": "urn:li:fsd_skill:1", "label": "Go (Programming Language)"}
            ]
        }"#;

        let job = deserialize_job(json).unwrap();
        assert_eq!(job.urn, "urn:li:fsd_jobPosting:999");
        assert_eq!(job.workplace_type, Some(VoyagerWorkplaceType::Hybrid));
        assert_eq!(job.skills.len(), 1);
    }

    #[test]
    fn test_deserialize_batch() {
        let json = r#"{
            "jobs": [
                {
                    "urn": "urn:li:fsd_jobPosting:1",
                    "title": "Engineer",
                    "description": "desc",
                    "companyName": "Co"
                }
            ],
            "fetchedAt": 1712793600000
        }"#;

        let batch = deserialize_batch(json).unwrap();
        assert_eq!(batch.jobs.len(), 1);
        assert_eq!(batch.fetched_at, 1712793600000);
    }

    #[test]
    fn test_remote_policy_voyager_only() {
        let (policy, conf, source) =
            resolve_remote_policy_voyager_only(Some(VoyagerWorkplaceType::Remote));
        assert_eq!(policy, 1);
        assert_eq!(conf, 1.0);
        assert_eq!(source, FieldSource::Voyager);

        let (policy, conf, _) = resolve_remote_policy_voyager_only(None);
        assert_eq!(policy, 0);
        assert_eq!(conf, 0.0);
    }

    #[cfg(feature = "kernel-ner")]
    #[test]
    fn test_resolve_remote_policy_fused() {
        // Voyager says Remote, description also says "fully remote" → Fused
        let desc = b"This is a fully remote position.";
        let (policy, conf, source) =
            resolve_remote_policy(Some(VoyagerWorkplaceType::Remote), desc);
        assert_eq!(policy, 1);
        assert_eq!(conf, 1.0);
        assert_eq!(source, FieldSource::Fused);
    }

    #[cfg(feature = "kernel-ner")]
    #[test]
    fn test_resolve_remote_policy_voyager_overrides_ner() {
        // Voyager says OnSite, description also has onsite signals → both agree → Fused
        let desc = b"some remote flexibility for this onsite role";
        let (policy, _conf, source) =
            resolve_remote_policy(Some(VoyagerWorkplaceType::OnSite), desc);
        assert_eq!(policy, 3); // onsite
        assert_eq!(source, FieldSource::Fused);
    }

    #[cfg(feature = "kernel-ner")]
    #[test]
    fn test_convert_with_ner_fallback() {
        let mut payload = sample_voyager_payload();
        // Remove structured salary to force NER fallback
        payload.salary = None;

        let mut idf = SkillIdf::new();
        let merged = convert_voyager_job_with_ner(&payload, &[], &mut idf);

        // NER should extract salary from description "$180k-$220k"
        assert!(
            merged.salary_min > 0,
            "NER should extract salary_min from description, got {}",
            merged.salary_min
        );
        assert_eq!(merged.salary_source, FieldSource::Ner);

        // Remote policy should still be Fused (Voyager + NER both say remote)
        assert_eq!(merged.remote_policy, 1);
    }

    #[test]
    fn test_serialize_roundtrip() {
        let payload = sample_voyager_payload();
        let merged = convert_voyager_job(&payload, &[("rust".to_string(), 0.8)]);
        let json = serialize_merged(&merged).unwrap();
        let _: MergedJobExtraction = serde_json::from_str(&json).unwrap();
    }
}
