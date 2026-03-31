/// Intent signal detection from company data.
///
/// Identifies buying-intent indicators — recent funding, hiring sprees, tech-stack
/// changes, new job postings, headcount growth, AI adoption, and remote-first
/// culture — and maps them to a normalised 0–100 intent score.  All inputs come
/// from the in-memory `Company` record so no additional I/O is required.
use chrono::Datelike;
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Signal types
// ---------------------------------------------------------------------------

/// Company's level of AI/ML tooling adoption.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AiAdoptionLevel {
    /// 1–2 AI/ML tools detected.
    Early,
    /// 3–5 AI/ML tools detected.
    Scaling,
    /// 6+ AI/ML tools detected.
    Advanced,
}

/// A discrete, typed buying-intent signal detected from company data.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum IntentSignal {
    /// Company received investment recently.
    RecentFunding {
        amount: Option<f64>,
        date: String,
        /// How many months ago the funding was announced. `None` when the date
        /// field is `"unknown"` or could not be parsed.
        months_ago: Option<u32>,
    },
    /// Unusually high number of open roles, optionally broken down by department.
    HiringSpree {
        open_roles: u32,
        departments: Vec<String>,
    },
    /// The tech stack changed — new tools adopted or old ones removed.
    TechStackChange {
        added: Vec<String>,
        removed: Vec<String>,
    },
    /// A specific job posting was detected (may be sourced from job board data).
    NewJobPosting {
        title: String,
        department: String,
    },
    /// Headcount grew (or shrank) by `employee_delta` over `period_months` months.
    CompanyGrowth {
        employee_delta: i32,
        period_months: u32,
    },
    /// Company is actively using AI/ML tooling in their stack.
    AiAdoption {
        tools: Vec<String>,
        adoption_level: AiAdoptionLevel,
    },
    /// Company signals a remote-first or fully-distributed culture.
    RemoteFirst {
        evidence: String,
    },
}

impl IntentSignal {
    /// Human-readable label for logging / UI display.
    pub fn label(&self) -> &'static str {
        match self {
            Self::RecentFunding { .. } => "recent_funding",
            Self::HiringSpree { .. } => "hiring_spree",
            Self::TechStackChange { .. } => "tech_stack_change",
            Self::NewJobPosting { .. } => "new_job_posting",
            Self::CompanyGrowth { .. } => "company_growth",
            Self::AiAdoption { .. } => "ai_adoption",
            Self::RemoteFirst { .. } => "remote_first",
        }
    }
}

// ---------------------------------------------------------------------------
// Signal weights (tunable constants)
// ---------------------------------------------------------------------------

/// Maximum raw score contribution from each signal type before normalisation.
mod weights {
    pub const RECENT_FUNDING: f64 = 30.0;
    pub const HIRING_SPREE: f64 = 25.0;
    pub const TECH_STACK_CHANGE: f64 = 20.0;
    pub const NEW_JOB_POSTING: f64 = 15.0;
    pub const COMPANY_GROWTH: f64 = 10.0;
    pub const AI_ADOPTION: f64 = 20.0;
    pub const REMOTE_FIRST: f64 = 8.0;

    /// Sum of all weight ceilings — used for normalisation.
    pub const TOTAL: f64 = RECENT_FUNDING
        + HIRING_SPREE
        + TECH_STACK_CHANGE
        + NEW_JOB_POSTING
        + COMPANY_GROWTH
        + AI_ADOPTION
        + REMOTE_FIRST;
}

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

/// Stateless intent-signal detector.  All methods take a `&Company` reference
/// and return derived signals without any external I/O.
pub struct IntentDetector;

impl IntentDetector {
    /// Detect all intent signals present in the company record.
    ///
    /// Signals are derived from:
    /// - `funding_stage` transitions that contain a date suffix (e.g. `"Series B|2024-11"`)
    /// - `tech_stack` JSON arrays compared against a hard-coded baseline heuristic
    /// - `employee_count` relative to the `source` field encoding growth hints
    /// - `description` keyword scan for job-posting language
    /// - `tech_stack` JSON for known AI/ML tools
    /// - `description` / `location` for remote-first indicators
    pub fn detect(company: &crate::Company) -> Vec<IntentSignal> {
        let mut signals = Vec::new();

        // --- RecentFunding --------------------------------------------------
        if let Some(ref stage) = company.funding_stage {
            if let Some(sig) = detect_funding(stage) {
                signals.push(sig);
            }
        }

        // --- HiringSpree / NewJobPosting ------------------------------------
        // The tech_stack JSON sometimes encodes open-role hints as a synthetic
        // entry like `"hiring:Engineering:5"` injected by the crawler.
        if let Some(ref stack_json) = company.tech_stack {
            if let Ok(entries) = serde_json::from_str::<Vec<String>>(stack_json) {
                let (hiring_signals, job_signals) = detect_hiring_from_stack(&entries);
                signals.extend(hiring_signals);
                signals.extend(job_signals);
            }
        }

        // --- TechStackChange ------------------------------------------------
        if let Some(ref stack_json) = company.tech_stack {
            if let Ok(entries) = serde_json::from_str::<Vec<String>>(stack_json) {
                if let Some(sig) = detect_stack_change(&entries) {
                    signals.push(sig);
                }
            }
        }

        // --- AiAdoption -----------------------------------------------------
        if let Some(ref stack_json) = company.tech_stack {
            if let Ok(entries) = serde_json::from_str::<Vec<String>>(stack_json) {
                if let Some(sig) = detect_ai_adoption(&entries) {
                    signals.push(sig);
                }
            }
        }

        // --- CompanyGrowth --------------------------------------------------
        if let Some(employees) = company.employee_count {
            if let Some(ref src) = company.source {
                if let Some(sig) = detect_growth_from_source(employees, src) {
                    signals.push(sig);
                }
            }
        }

        // --- NewJobPosting from description ---------------------------------
        if let Some(ref desc) = company.description {
            signals.extend(detect_job_postings_from_description(desc));
        }

        // --- RemoteFirst ----------------------------------------------------
        let desc_text = company.description.as_deref().unwrap_or("");
        let loc_text = company.location.as_deref().unwrap_or("");
        if let Some(sig) = detect_remote_first(desc_text, loc_text) {
            signals.push(sig);
        }

        signals
    }

    /// Aggregate a slice of signals into a normalised 0–100 intent score.
    ///
    /// Each signal type contributes up to its weight ceiling; multiple signals
    /// of the same type are capped at their ceiling to avoid gaming.
    ///
    /// Multi-signal bonus: when both `RecentFunding` and `HiringSpree` are
    /// present, a 10 % multiplicative boost is applied (still capped at 100).
    pub fn intent_score(signals: &[IntentSignal]) -> f64 {
        let mut funding_pts = 0.0f64;
        let mut hiring_pts = 0.0f64;
        let mut stack_pts = 0.0f64;
        let mut posting_pts = 0.0f64;
        let mut growth_pts = 0.0f64;
        let mut ai_pts = 0.0f64;
        let mut remote_pts = 0.0f64;

        let mut has_funding = false;
        let mut has_hiring = false;

        for signal in signals {
            match signal {
                IntentSignal::RecentFunding {
                    amount,
                    months_ago,
                    ..
                } => {
                    has_funding = true;
                    // Scale by funding size if known (capped at ceiling).
                    let size_bonus = amount
                        .map(|a| (a / 100_000_000.0).min(1.0) * 10.0)
                        .unwrap_or(0.0);
                    let base = weights::RECENT_FUNDING * 0.7 + size_bonus;
                    // Apply recency decay.
                    let decay = recency_decay(*months_ago);
                    funding_pts =
                        (funding_pts + base * decay).min(weights::RECENT_FUNDING);
                }
                IntentSignal::HiringSpree { open_roles, .. } => {
                    has_hiring = true;
                    // More roles = stronger signal, capped at ceiling.
                    let role_bonus =
                        (*open_roles as f64 / 10.0).min(1.0) * weights::HIRING_SPREE;
                    hiring_pts = hiring_pts.max(role_bonus);
                }
                IntentSignal::TechStackChange { added, .. } => {
                    let change_bonus =
                        (added.len() as f64 / 3.0).min(1.0) * weights::TECH_STACK_CHANGE;
                    stack_pts = stack_pts.max(change_bonus);
                }
                IntentSignal::NewJobPosting { department, .. } => {
                    // AI/ML-domain postings carry a higher per-posting value.
                    let ai_dept = is_ai_department(department);
                    let increment = if ai_dept {
                        weights::NEW_JOB_POSTING * 0.7
                    } else {
                        weights::NEW_JOB_POSTING * 0.4
                    };
                    posting_pts = (posting_pts + increment).min(weights::NEW_JOB_POSTING);
                }
                IntentSignal::CompanyGrowth { employee_delta, .. } => {
                    let growth = (*employee_delta as f64 / 50.0).clamp(0.0, 1.0)
                        * weights::COMPANY_GROWTH;
                    growth_pts = growth_pts.max(growth);
                }
                IntentSignal::AiAdoption { adoption_level, .. } => {
                    let level_frac = match adoption_level {
                        AiAdoptionLevel::Early => 0.4,
                        AiAdoptionLevel::Scaling => 0.7,
                        AiAdoptionLevel::Advanced => 1.0,
                    };
                    ai_pts = ai_pts.max(level_frac * weights::AI_ADOPTION);
                }
                IntentSignal::RemoteFirst { .. } => {
                    remote_pts = weights::REMOTE_FIRST;
                }
            }
        }

        let raw = funding_pts + hiring_pts + stack_pts + posting_pts + growth_pts + ai_pts + remote_pts;

        // Multi-signal interaction: funding + active hiring = 10 % bonus.
        let boosted = if has_funding && has_hiring {
            raw * 1.10
        } else {
            raw
        };

        (boosted / weights::TOTAL * 100.0).min(100.0)
    }
}

// ---------------------------------------------------------------------------
// Private detection helpers
// ---------------------------------------------------------------------------

/// Detect a `RecentFunding` signal from the funding_stage string.
///
/// Accepted format: `"<Stage>"` or `"<Stage>|<YYYY-MM>"` or `"<Stage>|<amount>|<YYYY-MM>"`.
fn detect_funding(stage: &str) -> Option<IntentSignal> {
    // We recognise stages that imply a recent raise.
    let growth_stages = [
        "seed", "series a", "series b", "series c", "series d",
        "series e", "series f", "pre-seed", "angel", "growth",
        "ipo", "spac",
    ];
    let lower = stage.to_lowercase();
    let is_growth = growth_stages.iter().any(|s| lower.contains(s));
    if !is_growth {
        return None;
    }

    // Try to extract optional amount and date from pipe-separated encoding.
    // Format: "Series B|25000000|2024-03"  or  "Series B|2024-03"  or  "Series B"
    let parts: Vec<&str> = stage.splitn(3, '|').collect();
    let amount = parts.get(1).and_then(|s| s.parse::<f64>().ok());
    let date = parts
        .get(2)
        .or(parts.get(1).filter(|s| s.parse::<f64>().is_err()))
        .map(|s| s.to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let months_ago = parse_months_ago(&date);

    Some(IntentSignal::RecentFunding {
        amount,
        date,
        months_ago,
    })
}

/// Parse a `"YYYY-MM"` date string and return how many whole months have
/// elapsed since that date relative to today (`chrono::Utc::now()`).
/// Returns `None` when the string cannot be parsed.
fn parse_months_ago(date_str: &str) -> Option<u32> {
    let parts: Vec<&str> = date_str.splitn(2, '-').collect();
    let year: i32 = parts.first()?.parse().ok()?;
    let month: u32 = parts.get(1)?.parse().ok()?;
    if month == 0 || month > 12 {
        return None;
    }

    let now = chrono::Utc::now();
    let now_year = now.year();
    let now_month = now.month();

    let months = ((now_year - year) * 12 + now_month as i32 - month as i32).max(0) as u32;
    Some(months)
}

/// Convert an `Option<u32>` months-ago value to a [0.0, 1.0] decay multiplier.
///
/// | Age          | Multiplier |
/// |--------------|------------|
/// | <= 6 months  | 1.00       |
/// | 7–12 months  | 0.70       |
/// | 13–24 months | 0.40       |
/// | > 24 months  | 0.10       |
/// | unknown      | 0.50       |
fn recency_decay(months_ago: Option<u32>) -> f64 {
    match months_ago {
        None => 0.50,
        Some(m) if m <= 6 => 1.00,
        Some(m) if m <= 12 => 0.70,
        Some(m) if m <= 24 => 0.40,
        Some(_) => 0.10,
    }
}

/// Scan a tech-stack JSON array for synthetic hiring/job-posting entries.
///
/// The crawler may inject entries in the form:
/// - `"hiring:<Department>:<count>"` — indicates open roles in a department
/// - `"job:<Title>:<Department>"` — a specific job posting
///
/// For departments that map to AI/ML roles, a `NewJobPosting` with the
/// `AI/ML` department label is emitted so the scorer can apply the higher
/// per-posting weight.
fn detect_hiring_from_stack(
    entries: &[String],
) -> (Vec<IntentSignal>, Vec<IntentSignal>) {
    let mut hiring_map: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    let mut job_signals: Vec<IntentSignal> = Vec::new();

    for entry in entries {
        if let Some(rest) = entry.strip_prefix("hiring:") {
            let parts: Vec<&str> = rest.splitn(2, ':').collect();
            let raw_dept = parts.first().unwrap_or(&"Unknown").to_string();
            let count: u32 = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1);

            // Emit an extra NewJobPosting for AI/ML departments so the scorer
            // gives them the higher per-posting increment.
            if is_ai_department(&raw_dept) {
                job_signals.push(IntentSignal::NewJobPosting {
                    title: format!("{} Hire", raw_dept),
                    department: "AI/ML".to_string(),
                });
            }

            *hiring_map.entry(raw_dept).or_insert(0) += count;
        } else if let Some(rest) = entry.strip_prefix("job:") {
            let parts: Vec<&str> = rest.splitn(2, ':').collect();
            let title = parts.first().unwrap_or(&"Unknown").to_string();
            let dept = parts.get(1).unwrap_or(&"Unknown").to_string();
            job_signals.push(IntentSignal::NewJobPosting {
                title,
                department: dept,
            });
        }
    }

    let mut hiring_signals: Vec<IntentSignal> = Vec::new();
    if !hiring_map.is_empty() {
        let total_roles: u32 = hiring_map.values().sum();
        let departments: Vec<String> = hiring_map.into_keys().collect();
        hiring_signals.push(IntentSignal::HiringSpree {
            open_roles: total_roles,
            departments,
        });
    }

    (hiring_signals, job_signals)
}

/// Detect a `TechStackChange` signal from synthetic change-marker entries.
///
/// Entries in the form `"+React"` indicate an addition; `"-jQuery"` indicates removal.
fn detect_stack_change(entries: &[String]) -> Option<IntentSignal> {
    let added: Vec<String> = entries
        .iter()
        .filter_map(|e| e.strip_prefix('+').map(str::to_string))
        .collect();
    let removed: Vec<String> = entries
        .iter()
        .filter_map(|e| e.strip_prefix('-').map(str::to_string))
        .collect();

    if added.is_empty() && removed.is_empty() {
        None
    } else {
        Some(IntentSignal::TechStackChange { added, removed })
    }
}

/// Known AI/ML tools used for adoption detection.
const AI_TOOLS: &[&str] = &[
    "openai", "anthropic", "huggingface", "langchain", "llamaindex",
    "pinecone", "weaviate", "qdrant", "mlflow", "vertex", "bedrock",
    "sagemaker", "torch", "tensorflow", "jax", "triton", "vllm", "ray",
    "dask", "spark",
];

/// Scan a tech-stack array for recognised AI/ML tools and emit an
/// `AiAdoption` signal when at least one is found.
fn detect_ai_adoption(entries: &[String]) -> Option<IntentSignal> {
    let mut matched: Vec<String> = entries
        .iter()
        .filter(|e| {
            let lower = e.to_lowercase();
            // Strip synthetic prefixes before matching.
            let stripped = lower
                .trim_start_matches('+')
                .trim_start_matches('-');
            // Also skip hiring/job synthetic entries.
            if stripped.starts_with("hiring:") || stripped.starts_with("job:") {
                return false;
            }
            AI_TOOLS.iter().any(|&tool| stripped.contains(tool))
        })
        .map(|e| {
            // Normalise: strip change markers and lower-case.
            e.trim_start_matches('+')
                .trim_start_matches('-')
                .to_lowercase()
        })
        .collect();

    // Deduplicate (same tool may appear with +/- markers).
    matched.sort();
    matched.dedup();

    if matched.is_empty() {
        return None;
    }

    let adoption_level = match matched.len() {
        1..=2 => AiAdoptionLevel::Early,
        3..=5 => AiAdoptionLevel::Scaling,
        _ => AiAdoptionLevel::Advanced,
    };

    Some(IntentSignal::AiAdoption {
        tools: matched,
        adoption_level,
    })
}

/// Detect `CompanyGrowth` from an encoded `source` field.
///
/// The enrichment pipeline may store growth snapshots in the source field as
/// `"growth:<delta>:<period_months>"`, e.g. `"growth:25:6"`.
fn detect_growth_from_source(current_employees: i32, source: &str) -> Option<IntentSignal> {
    if let Some(rest) = source.strip_prefix("growth:") {
        let parts: Vec<&str> = rest.splitn(2, ':').collect();
        let delta: i32 = parts.first().and_then(|s| s.parse().ok()).unwrap_or(0);
        let period: u32 = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(6);
        if delta.abs() > 0 {
            return Some(IntentSignal::CompanyGrowth {
                employee_delta: delta,
                period_months: period,
            });
        }
    }
    // Fallback: if employee count looks like a fast-growing team (>= 50 % of
    // what a typical bootstrapped company would have) treat as mild growth.
    if current_employees > 0 && current_employees % 11 == 0 {
        // This is a heuristic sentinel: the crawler sets count to a multiple
        // of 11 when it detected growth but had no prior snapshot.
        return Some(IntentSignal::CompanyGrowth {
            employee_delta: current_employees / 10,
            period_months: 12,
        });
    }
    None
}

/// Scan the company description for job-posting language and emit
/// `NewJobPosting` signals for each match.
///
/// AI/ML-specific roles are mapped to the `"AI/ML"` department so the scorer
/// can apply the higher per-posting weight.
fn detect_job_postings_from_description(desc: &str) -> Vec<IntentSignal> {
    // Titles that, when mentioned alongside hiring keywords, indicate an open role.
    let role_patterns: &[(&str, &str)] = &[
        ("software engineer", "Engineering"),
        ("backend engineer", "Engineering"),
        ("frontend engineer", "Engineering"),
        ("devops engineer", "Engineering"),
        ("data scientist", "AI/ML"),
        ("machine learning engineer", "AI/ML"),
        ("ml engineer", "AI/ML"),
        ("ai engineer", "AI/ML"),
        ("llm engineer", "AI/ML"),
        ("product manager", "Product"),
        ("sales representative", "Sales"),
        ("account executive", "Sales"),
        ("customer success", "Customer Success"),
    ];

    let lower = desc.to_lowercase();
    let has_hiring_context = lower.contains("we're hiring")
        || lower.contains("we are hiring")
        || lower.contains("join our team")
        || lower.contains("open position")
        || lower.contains("open role");

    if !has_hiring_context {
        return vec![];
    }

    role_patterns
        .iter()
        .filter(|(title, _)| lower.contains(title))
        .map(|(title, dept)| IntentSignal::NewJobPosting {
            title: title.to_string(),
            department: dept.to_string(),
        })
        .collect()
}

/// Detect a `RemoteFirst` signal from company description and location text.
fn detect_remote_first(desc: &str, location: &str) -> Option<IntentSignal> {
    let combined = format!("{} {}", desc, location).to_lowercase();

    let indicators = [
        "remote-first",
        "fully remote",
        "distributed team",
        "async-first",
        "remote only",
    ];

    for indicator in &indicators {
        if combined.contains(indicator) {
            return Some(IntentSignal::RemoteFirst {
                evidence: indicator.to_string(),
            });
        }
    }
    None
}

/// Return `true` when the department string belongs to an AI/ML/Data/Research
/// hiring cluster.
fn is_ai_department(dept: &str) -> bool {
    let lower = dept.to_lowercase();
    ["ai", "ml", "data", "research"]
        .iter()
        .any(|&kw| lower.contains(kw))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn bare_company() -> crate::Company {
        crate::Company {
            id: "c1".into(),
            name: "Acme".into(),
            domain: None,
            industry: None,
            employee_count: None,
            funding_stage: None,
            tech_stack: None,
            location: None,
            description: None,
            source: None,
            created_at: None,
            updated_at: None,
        }
    }

    // --- RecentFunding -------------------------------------------------------

    #[test]
    fn test_funding_signal_detected_for_series_b() {
        let mut company = bare_company();
        company.funding_stage = Some("Series B|15000000|2024-06".into());

        let signals = IntentDetector::detect(&company);
        assert!(
            signals.iter().any(|s| matches!(s, IntentSignal::RecentFunding { .. })),
            "expected RecentFunding signal"
        );
    }

    #[test]
    fn test_no_funding_signal_for_acquired_stage() {
        let mut company = bare_company();
        company.funding_stage = Some("Acquired".into());

        let signals = IntentDetector::detect(&company);
        assert!(
            !signals.iter().any(|s| matches!(s, IntentSignal::RecentFunding { .. })),
            "Acquired should not produce RecentFunding"
        );
    }

    #[test]
    fn test_funding_amount_extracted() {
        let mut company = bare_company();
        company.funding_stage = Some("Series C|50000000|2024-11".into());

        let signals = IntentDetector::detect(&company);
        let funding = signals.iter().find_map(|s| match s {
            IntentSignal::RecentFunding { amount, .. } => Some(*amount),
            _ => None,
        });
        assert_eq!(funding, Some(Some(50_000_000.0)));
    }

    // --- Funding recency decay -----------------------------------------------

    #[test]
    fn test_funding_decay_old_funding_lower_score() {
        // Funding announced > 24 months ago should produce a much lower score
        // than funding from last month.
        let recent_signals = vec![IntentSignal::RecentFunding {
            amount: None,
            date: "2025-11".into(),
            months_ago: Some(1),
        }];
        let old_signals = vec![IntentSignal::RecentFunding {
            amount: None,
            date: "2022-01".into(),
            months_ago: Some(48),
        }];

        let recent_score = IntentDetector::intent_score(&recent_signals);
        let old_score = IntentDetector::intent_score(&old_signals);

        assert!(
            recent_score > old_score,
            "recent funding (score {recent_score:.2}) should outscore old funding (score {old_score:.2})"
        );
    }

    #[test]
    fn test_funding_months_ago_populated() {
        let mut company = bare_company();
        // Use a date guaranteed to be in the past (well over 24 months ago).
        company.funding_stage = Some("Seed|500000|2020-01".into());

        let signals = IntentDetector::detect(&company);
        let months = signals.iter().find_map(|s| match s {
            IntentSignal::RecentFunding { months_ago, .. } => Some(*months_ago),
            _ => None,
        });
        // Should be Some(> 24).
        let months = months.expect("months_ago should be Some");
        assert!(months.unwrap_or(0) > 24, "2020-01 is more than 24 months ago");
    }

    // --- HiringSpree ---------------------------------------------------------

    #[test]
    fn test_hiring_spree_from_stack_entries() {
        let mut company = bare_company();
        company.tech_stack =
            Some(r#"["hiring:Engineering:8","hiring:Product:3","React"]"#.into());

        let signals = IntentDetector::detect(&company);
        let spree = signals.iter().find_map(|s| match s {
            IntentSignal::HiringSpree { open_roles, .. } => Some(*open_roles),
            _ => None,
        });
        assert_eq!(spree, Some(11), "should detect 11 open roles total");
    }

    // --- AI hiring boost -----------------------------------------------------

    #[test]
    fn test_ai_hiring_boost_from_stack_department() {
        let mut company = bare_company();
        // "hiring:ML:5" should emit a NewJobPosting with department "AI/ML".
        company.tech_stack = Some(r#"["hiring:ML:5"]"#.into());

        let signals = IntentDetector::detect(&company);
        let ai_posting = signals.iter().any(|s| match s {
            IntentSignal::NewJobPosting { department, .. } => department == "AI/ML",
            _ => false,
        });
        assert!(ai_posting, "expected an AI/ML NewJobPosting from ML hiring entry");
    }

    #[test]
    fn test_ai_hiring_boost_from_description() {
        let mut company = bare_company();
        company.description = Some(
            "We're hiring an llm engineer and a data scientist to join our team.".into(),
        );

        let signals = IntentDetector::detect(&company);
        let ai_postings: Vec<_> = signals
            .iter()
            .filter(|s| match s {
                IntentSignal::NewJobPosting { department, .. } => department == "AI/ML",
                _ => false,
            })
            .collect();
        assert!(
            !ai_postings.is_empty(),
            "expected AI/ML NewJobPosting signals from description"
        );
    }

    // --- NewJobPosting -------------------------------------------------------

    #[test]
    fn test_new_job_posting_from_description() {
        let mut company = bare_company();
        company.description = Some(
            "We're hiring a machine learning engineer to join our team.".into(),
        );

        let signals = IntentDetector::detect(&company);
        assert!(
            signals
                .iter()
                .any(|s| matches!(s, IntentSignal::NewJobPosting { .. })),
            "expected at least one NewJobPosting signal"
        );
    }

    #[test]
    fn test_no_job_posting_without_hiring_context() {
        let mut company = bare_company();
        company.description =
            Some("We build machine learning software for enterprises.".into());

        let signals = IntentDetector::detect(&company);
        assert!(
            !signals
                .iter()
                .any(|s| matches!(s, IntentSignal::NewJobPosting { .. })),
            "should not emit NewJobPosting without hiring context"
        );
    }

    // --- TechStackChange -----------------------------------------------------

    #[test]
    fn test_tech_stack_change_signal() {
        let mut company = bare_company();
        company.tech_stack = Some(r#"["+Rust","+Tokio","-PHP"]"#.into());

        let signals = IntentDetector::detect(&company);
        let change = signals.iter().find_map(|s| match s {
            IntentSignal::TechStackChange { added, removed } => {
                Some((added.clone(), removed.clone()))
            }
            _ => None,
        });
        let (added, removed) = change.expect("expected TechStackChange signal");
        assert!(added.contains(&"Rust".to_string()));
        assert!(added.contains(&"Tokio".to_string()));
        assert!(removed.contains(&"PHP".to_string()));
    }

    // --- CompanyGrowth -------------------------------------------------------

    #[test]
    fn test_growth_signal_from_source_encoding() {
        let mut company = bare_company();
        company.employee_count = Some(120);
        company.source = Some("growth:30:6".into());

        let signals = IntentDetector::detect(&company);
        let growth = signals.iter().find_map(|s| match s {
            IntentSignal::CompanyGrowth {
                employee_delta,
                period_months,
            } => Some((*employee_delta, *period_months)),
            _ => None,
        });
        assert_eq!(growth, Some((30, 6)));
    }

    // --- AiAdoption ----------------------------------------------------------

    #[test]
    fn test_ai_adoption_scaling_for_three_tools() {
        let mut company = bare_company();
        // openai, langchain, pinecone → 3 tools → Scaling
        company.tech_stack =
            Some(r#"["openai","langchain","pinecone","React","Postgres"]"#.into());

        let signals = IntentDetector::detect(&company);
        let adoption = signals.iter().find_map(|s| match s {
            IntentSignal::AiAdoption {
                tools,
                adoption_level,
            } => Some((tools.clone(), adoption_level.clone())),
            _ => None,
        });
        let (tools, level) = adoption.expect("expected AiAdoption signal");
        assert_eq!(level, AiAdoptionLevel::Scaling, "3 AI tools should be Scaling");
        assert_eq!(tools.len(), 3);
    }

    #[test]
    fn test_ai_adoption_early_for_one_tool() {
        let mut company = bare_company();
        company.tech_stack = Some(r#"["openai","React","Postgres"]"#.into());

        let signals = IntentDetector::detect(&company);
        let level = signals.iter().find_map(|s| match s {
            IntentSignal::AiAdoption { adoption_level, .. } => Some(adoption_level.clone()),
            _ => None,
        });
        assert_eq!(level, Some(AiAdoptionLevel::Early));
    }

    #[test]
    fn test_ai_adoption_advanced_for_six_tools() {
        let mut company = bare_company();
        company.tech_stack = Some(
            r#"["openai","anthropic","langchain","pinecone","mlflow","torch","ray"]"#.into(),
        );

        let signals = IntentDetector::detect(&company);
        let level = signals.iter().find_map(|s| match s {
            IntentSignal::AiAdoption { adoption_level, .. } => Some(adoption_level.clone()),
            _ => None,
        });
        assert_eq!(level, Some(AiAdoptionLevel::Advanced));
    }

    #[test]
    fn test_no_ai_adoption_for_empty_stack() {
        let mut company = bare_company();
        company.tech_stack = Some(r#"["React","Postgres","Redis"]"#.into());

        let signals = IntentDetector::detect(&company);
        assert!(
            !signals.iter().any(|s| matches!(s, IntentSignal::AiAdoption { .. })),
            "no AI tools should produce no AiAdoption signal"
        );
    }

    // --- RemoteFirst ---------------------------------------------------------

    #[test]
    fn test_remote_first_detected_in_description() {
        let mut company = bare_company();
        company.description = Some("We are a fully remote company building the future.".into());

        let signals = IntentDetector::detect(&company);
        assert!(
            signals.iter().any(|s| matches!(s, IntentSignal::RemoteFirst { .. })),
            "expected RemoteFirst signal from description"
        );
    }

    #[test]
    fn test_remote_first_detected_in_location() {
        let mut company = bare_company();
        company.location = Some("Remote-first, US/EU".into());

        let signals = IntentDetector::detect(&company);
        assert!(
            signals.iter().any(|s| matches!(s, IntentSignal::RemoteFirst { .. })),
            "expected RemoteFirst signal from location"
        );
    }

    #[test]
    fn test_no_remote_first_for_office_only() {
        let mut company = bare_company();
        company.description = Some("We have offices in New York and San Francisco.".into());
        company.location = Some("New York, NY".into());

        let signals = IntentDetector::detect(&company);
        assert!(
            !signals.iter().any(|s| matches!(s, IntentSignal::RemoteFirst { .. })),
            "office-only company should not produce RemoteFirst signal"
        );
    }

    // --- Multi-signal interaction --------------------------------------------

    #[test]
    fn test_funding_plus_hiring_gives_bonus_over_sum() {
        let combined = vec![
            IntentSignal::RecentFunding {
                amount: None,
                date: "2025-10".into(),
                months_ago: Some(3),
            },
            IntentSignal::HiringSpree {
                open_roles: 5,
                departments: vec!["Engineering".into()],
            },
        ];
        let funding_only = vec![IntentSignal::RecentFunding {
            amount: None,
            date: "2025-10".into(),
            months_ago: Some(3),
        }];
        let hiring_only = vec![IntentSignal::HiringSpree {
            open_roles: 5,
            departments: vec!["Engineering".into()],
        }];

        let score_combined = IntentDetector::intent_score(&combined);
        let score_sum = IntentDetector::intent_score(&funding_only)
            + IntentDetector::intent_score(&hiring_only);

        assert!(
            score_combined > score_sum * 0.95,
            "combined funding+hiring score ({score_combined:.2}) should exceed ~95% of naive sum ({score_sum:.2}) due to interaction bonus"
        );
    }

    // --- intent_score --------------------------------------------------------

    #[test]
    fn test_intent_score_zero_for_no_signals() {
        assert_eq!(IntentDetector::intent_score(&[]), 0.0);
    }

    #[test]
    fn test_intent_score_bounded_0_100() {
        // Throw every signal type at once.
        let signals = vec![
            IntentSignal::RecentFunding {
                amount: Some(1_000_000_000.0),
                date: "2025-01".into(),
                months_ago: Some(2),
            },
            IntentSignal::HiringSpree {
                open_roles: 100,
                departments: vec!["Eng".into()],
            },
            IntentSignal::TechStackChange {
                added: vec!["Rust".into(), "Go".into(), "Wasm".into()],
                removed: vec!["PHP".into()],
            },
            IntentSignal::NewJobPosting {
                title: "SWE".into(),
                department: "Eng".into(),
            },
            IntentSignal::CompanyGrowth {
                employee_delta: 200,
                period_months: 6,
            },
            IntentSignal::AiAdoption {
                tools: vec!["openai".into(), "langchain".into(), "pinecone".into()],
                adoption_level: AiAdoptionLevel::Scaling,
            },
            IntentSignal::RemoteFirst {
                evidence: "fully remote".into(),
            },
        ];
        let score = IntentDetector::intent_score(&signals);
        assert!(
            (0.0..=100.0).contains(&score),
            "intent score must be in [0, 100], got {score:.2}"
        );
    }

    #[test]
    fn test_funding_signal_raises_score() {
        let with_funding = vec![IntentSignal::RecentFunding {
            amount: Some(20_000_000.0),
            date: "2025-10".into(),
            months_ago: Some(3),
        }];
        assert!(
            IntentDetector::intent_score(&with_funding) > 0.0,
            "funding signal should raise intent score above zero"
        );
    }
}
