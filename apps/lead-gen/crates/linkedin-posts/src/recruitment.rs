//! Recruitment company detection via employee headline analysis.
//!
//! Analyses LinkedIn people headlines for a given company to determine
//! if the majority of employees are recruiters/talent acquisition —
//! a strong signal that the company is a recruitment agency.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

// ── Recruiter keyword patterns ──────────────────────────────────────────────

/// Patterns that strongly indicate a recruiter role.
static RECRUITER_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    [
        // Core recruiter titles
        r"\b(recruiter|recruiting|recruitment)\b",
        r"\btalen(t\s+)?acquisi(tion|er)\b",
        r"\bheadhunt(er|ing)\b",
        r"\bsourc(er|ing)\b",
        r"\bstaffing\b",
        r"\bplacement\b",
        r"\bresourc(er|ing)\b",
        // Agency-specific titles
        r"\b(360|delivery|principal)\s+consultant\b",
        r"\brecruitment\s+(consultant|advisor|specialist|coordinator|lead|manager|director)\b",
        r"\btalent\s+(partner|consultant|advisor|specialist|scout)\b",
        r"\bpeople\s+(partner|advisor)\b",
        // Senior recruiter/TA titles
        r"\b(head|vp|director)\s+of\s+(talent|recruiting|recruitment|people|resourcing)\b",
        r"\bchief\s+people\b",
        // HR generalists often found at agencies
        r"\bhrbp\b",
        r"\bhr\s+(manager|director|business\s+partner)\b",
        r"\bhuman\s+resources\b",
        r"\bpeople\s+operations\b",
        // Business development at recruitment agencies
        r"\b(account\s+manager|business\s+development)\b.*\b(recruit|talent|staff)\b",
    ]
    .iter()
    .map(|p| Regex::new(p).expect("invalid recruiter regex"))
    .collect()
});

/// Patterns for non-recruiter roles that should NOT be counted.
/// Even at recruitment companies, some people have ops/tech/finance roles.
static NON_RECRUITER_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    [
        r"\b(software|backend|frontend|full\s*stack|data|devops|sre|ml|ai)\s+(engineer|developer|architect)\b",
        r"\b(cto|cfo|chief\s+technology|chief\s+financial)\b",
        r"\b(accountant|finance\s+manager|controller)\b",
        r"\b(marketing\s+manager|content\s+manager|seo\s+specialist)\b",
        r"\b(product\s+manager|product\s+owner|ux\s+designer)\b",
    ]
    .iter()
    .map(|p| Regex::new(p).expect("invalid non-recruiter regex"))
    .collect()
});

/// Default threshold: if >= 40% of people are recruiters, flag as recruitment company.
pub const DEFAULT_RECRUITER_RATIO_THRESHOLD: f32 = 0.40;

/// Minimum number of people needed for a reliable signal.
pub const MIN_PEOPLE_FOR_DETECTION: usize = 3;

// ── Detection logic ─────────────────────────────────────────────────────────

/// Check if a single headline matches recruiter patterns.
pub fn is_recruiter_headline(headline: &str) -> bool {
    let lower = headline.to_lowercase();

    // Skip if it matches non-recruiter patterns (tech/finance roles)
    for pat in NON_RECRUITER_PATTERNS.iter() {
        if pat.is_match(&lower) {
            return false;
        }
    }

    // Check recruiter patterns
    for pat in RECRUITER_PATTERNS.iter() {
        if pat.is_match(&lower) {
            return true;
        }
    }

    false
}

/// Analyse a batch of headlines and return detection result.
pub fn detect_recruitment_company(
    headlines: &[String],
    threshold: Option<f32>,
) -> RecruitmentDetectionResult {
    let threshold = threshold.unwrap_or(DEFAULT_RECRUITER_RATIO_THRESHOLD);
    let total = headlines.len();

    if total < MIN_PEOPLE_FOR_DETECTION {
        return RecruitmentDetectionResult {
            is_recruitment_company: false,
            recruiter_count: 0,
            total_people: total,
            recruiter_ratio: 0.0,
            threshold,
            sample_recruiter_titles: vec![],
            sample_non_recruiter_titles: vec![],
            confidence: 0.0,
            reason: format!(
                "Insufficient data: only {} people found (need >= {})",
                total, MIN_PEOPLE_FOR_DETECTION
            ),
        };
    }

    let mut recruiter_count = 0;
    let mut sample_recruiter: Vec<String> = Vec::new();
    let mut sample_non_recruiter: Vec<String> = Vec::new();

    for headline in headlines {
        if headline.trim().is_empty() {
            continue;
        }
        if is_recruiter_headline(headline) {
            recruiter_count += 1;
            if sample_recruiter.len() < 5 {
                sample_recruiter.push(headline.clone());
            }
        } else if sample_non_recruiter.len() < 5 {
            sample_non_recruiter.push(headline.clone());
        }
    }

    let ratio = recruiter_count as f32 / total as f32;
    let is_recruitment = ratio >= threshold;

    // Confidence based on sample size and how far ratio is from threshold
    let sample_confidence = (total as f32 / 20.0).min(1.0); // max confidence at 20+ people
    let ratio_distance = (ratio - threshold).abs();
    let confidence = sample_confidence * (0.5 + ratio_distance.min(0.5));

    let reason = if is_recruitment {
        format!(
            "{}/{} people ({:.0}%) have recruiter titles — exceeds {:.0}% threshold",
            recruiter_count,
            total,
            ratio * 100.0,
            threshold * 100.0,
        )
    } else {
        format!(
            "{}/{} people ({:.0}%) have recruiter titles — below {:.0}% threshold",
            recruiter_count,
            total,
            ratio * 100.0,
            threshold * 100.0,
        )
    };

    RecruitmentDetectionResult {
        is_recruitment_company: is_recruitment,
        recruiter_count,
        total_people: total,
        recruiter_ratio: (ratio * 1000.0).round() / 1000.0,
        threshold,
        sample_recruiter_titles: sample_recruiter,
        sample_non_recruiter_titles: sample_non_recruiter,
        confidence: (confidence * 100.0).round() / 100.0,
        reason,
    }
}

// ── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecruitmentDetectionResult {
    pub is_recruitment_company: bool,
    pub recruiter_count: usize,
    pub total_people: usize,
    pub recruiter_ratio: f32,
    pub threshold: f32,
    pub sample_recruiter_titles: Vec<String>,
    pub sample_non_recruiter_titles: Vec<String>,
    pub confidence: f32,
    pub reason: String,
}

/// Request body for POST /companies/detect-recruitment
#[derive(Debug, Deserialize)]
pub struct DetectRecruitmentRequest {
    /// If provided, analyse these headlines directly (pre-check from Chrome extension).
    pub headlines: Option<Vec<String>>,
    /// If provided (and headlines is None), query contacts from Neon DB by company_id.
    pub company_id: Option<i32>,
    /// Override the default threshold (0.40).
    pub threshold: Option<f32>,
    /// If true and detected as recruitment, block the company in Neon.
    #[serde(default)]
    pub auto_block: bool,
}

/// Response for POST /companies/detect-recruitment
#[derive(Debug, Serialize)]
pub struct DetectRecruitmentResponse {
    pub result: RecruitmentDetectionResult,
    /// Whether the company was blocked in the DB (only if auto_block=true).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blocked: Option<bool>,
    /// Company name if resolved from DB.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_name: Option<String>,
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recruiter_headlines() {
        assert!(is_recruiter_headline("Senior Technical Recruiter"));
        assert!(is_recruiter_headline("Talent Acquisition Specialist"));
        assert!(is_recruiter_headline("IT Recruitment Consultant"));
        assert!(is_recruiter_headline("Headhunter | Technology"));
        assert!(is_recruiter_headline("360 Consultant - Cloud & DevOps"));
        assert!(is_recruiter_headline("Sourcer at Big Corp"));
        assert!(is_recruiter_headline("Head of Talent Acquisition"));
        assert!(is_recruiter_headline("Director of Recruiting"));
        assert!(is_recruiter_headline("Staffing Manager"));
    }

    #[test]
    fn test_non_recruiter_headlines() {
        assert!(!is_recruiter_headline("Software Engineer"));
        assert!(!is_recruiter_headline("Senior Backend Developer"));
        assert!(!is_recruiter_headline("CTO at StartupCo"));
        assert!(!is_recruiter_headline("Product Manager"));
        assert!(!is_recruiter_headline("Data Scientist"));
        assert!(!is_recruiter_headline("UX Designer"));
        assert!(!is_recruiter_headline("Marketing Manager"));
    }

    #[test]
    fn test_detect_recruitment_company() {
        let headlines: Vec<String> = vec![
            "Senior Recruiter".into(),
            "IT Recruitment Consultant".into(),
            "Talent Acquisition Manager".into(),
            "360 Consultant".into(),
            "Sourcer".into(),
            "Finance Manager".into(), // non-recruiter
            "Office Manager".into(),  // non-recruiter
        ];
        let result = detect_recruitment_company(&headlines, None);
        assert!(result.is_recruitment_company);
        assert_eq!(result.recruiter_count, 5);
        assert_eq!(result.total_people, 7);
    }

    #[test]
    fn test_detect_non_recruitment_company() {
        let headlines: Vec<String> = vec![
            "Software Engineer".into(),
            "Senior Backend Developer".into(),
            "Product Manager".into(),
            "CTO".into(),
            "Data Scientist".into(),
            "Recruiter".into(), // only 1 recruiter
        ];
        let result = detect_recruitment_company(&headlines, None);
        assert!(!result.is_recruitment_company);
        assert_eq!(result.recruiter_count, 1);
    }

    #[test]
    fn test_insufficient_data() {
        let headlines: Vec<String> = vec!["Recruiter".into(), "Recruiter".into()];
        let result = detect_recruitment_company(&headlines, None);
        assert!(!result.is_recruitment_company);
        assert_eq!(result.confidence, 0.0);
    }
}
