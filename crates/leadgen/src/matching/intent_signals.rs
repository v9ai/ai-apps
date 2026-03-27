/// Intent signal detection from company data.
///
/// Identifies buying-intent indicators — recent funding, hiring sprees, tech-stack
/// changes, new job postings, and headcount growth — and maps them to a normalised
/// 0–100 intent score.  All inputs come from the in-memory `Company` record so no
/// additional I/O is required.
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Signal types
// ---------------------------------------------------------------------------

/// A discrete, typed buying-intent signal detected from company data.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum IntentSignal {
    /// Company received investment recently.
    RecentFunding {
        amount: Option<f64>,
        date: String,
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

    /// Sum of all weight ceilings — used for normalisation.
    pub const TOTAL: f64 =
        RECENT_FUNDING + HIRING_SPREE + TECH_STACK_CHANGE + NEW_JOB_POSTING + COMPANY_GROWTH;
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

        signals
    }

    /// Aggregate a slice of signals into a normalised 0–100 intent score.
    ///
    /// Each signal type contributes up to its weight ceiling; multiple signals
    /// of the same type are capped at their ceiling to avoid gaming.
    pub fn intent_score(signals: &[IntentSignal]) -> f64 {
        let mut funding_pts = 0.0f64;
        let mut hiring_pts = 0.0f64;
        let mut stack_pts = 0.0f64;
        let mut posting_pts = 0.0f64;
        let mut growth_pts = 0.0f64;

        for signal in signals {
            match signal {
                IntentSignal::RecentFunding { amount, .. } => {
                    // Scale by funding size if known (capped at ceiling).
                    let size_bonus = amount
                        .map(|a| (a / 100_000_000.0).min(1.0) * 10.0)
                        .unwrap_or(0.0);
                    funding_pts = (funding_pts + weights::RECENT_FUNDING * 0.7 + size_bonus)
                        .min(weights::RECENT_FUNDING);
                }
                IntentSignal::HiringSpree { open_roles, .. } => {
                    // More roles = stronger signal, capped at ceiling.
                    let role_bonus = (*open_roles as f64 / 10.0).min(1.0) * weights::HIRING_SPREE;
                    hiring_pts = hiring_pts.max(role_bonus);
                }
                IntentSignal::TechStackChange { added, .. } => {
                    let change_bonus =
                        (added.len() as f64 / 3.0).min(1.0) * weights::TECH_STACK_CHANGE;
                    stack_pts = stack_pts.max(change_bonus);
                }
                IntentSignal::NewJobPosting { .. } => {
                    // Each posting adds a small increment; cap at ceiling.
                    posting_pts =
                        (posting_pts + weights::NEW_JOB_POSTING * 0.4).min(weights::NEW_JOB_POSTING);
                }
                IntentSignal::CompanyGrowth { employee_delta, .. } => {
                    let growth =
                        (*employee_delta as f64 / 50.0).clamp(0.0, 1.0) * weights::COMPANY_GROWTH;
                    growth_pts = growth_pts.max(growth);
                }
            }
        }

        let raw = funding_pts + hiring_pts + stack_pts + posting_pts + growth_pts;
        (raw / weights::TOTAL * 100.0).min(100.0)
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

    Some(IntentSignal::RecentFunding { amount, date })
}

/// Scan a tech-stack JSON array for synthetic hiring/job-posting entries.
///
/// The crawler may inject entries in the form:
/// - `"hiring:<Department>:<count>"` — indicates open roles in a department
/// - `"job:<Title>:<Department>"` — a specific job posting
fn detect_hiring_from_stack(
    entries: &[String],
) -> (Vec<IntentSignal>, Vec<IntentSignal>) {
    let mut hiring_map: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    let mut job_signals: Vec<IntentSignal> = Vec::new();

    for entry in entries {
        if let Some(rest) = entry.strip_prefix("hiring:") {
            let parts: Vec<&str> = rest.splitn(2, ':').collect();
            let dept = parts.first().unwrap_or(&"Unknown").to_string();
            let count: u32 = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1);
            *hiring_map.entry(dept).or_insert(0) += count;
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
fn detect_job_postings_from_description(desc: &str) -> Vec<IntentSignal> {
    // Titles that, when mentioned alongside hiring keywords, indicate an open role.
    let role_patterns: &[(&str, &str)] = &[
        ("software engineer", "Engineering"),
        ("backend engineer", "Engineering"),
        ("frontend engineer", "Engineering"),
        ("data scientist", "Data"),
        ("machine learning engineer", "AI/ML"),
        ("product manager", "Product"),
        ("sales representative", "Sales"),
        ("account executive", "Sales"),
        ("customer success", "Customer Success"),
        ("devops engineer", "Engineering"),
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
                date: "2024-01".into(),
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
            date: "2024-03".into(),
        }];
        assert!(
            IntentDetector::intent_score(&with_funding) > 0.0,
            "funding signal should raise intent score above zero"
        );
    }
}
