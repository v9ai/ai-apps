use regex::Regex;

use crate::constants::{
    normalize_text_for_signals, AGGREGATOR_SOURCE_KINDS, NON_EU_JD_PATTERN,
    NON_EU_LOCATION_PATTERN,
};
use crate::{Confidence, JobClassification, JobRow, SignalSet};

/// Tier 0: Deterministic keyword heuristic for EU remote classification.
///
/// Returns high-confidence results for unambiguous cases.
/// Returns None for anything ambiguous, signalling escalation to the LLM tier.
pub fn keyword_eu_classify(job: &JobRow, signals: &SignalSet) -> Option<JobClassification> {
    let location = job.get_str("location").to_lowercase();
    let source_kind = job.get_str("source_kind").to_lowercase();
    let is_aggregator = AGGREGATOR_SOURCE_KINDS.contains(source_kind.as_str());

    // Negative signals -> reject
    if !signals.negative_signals.is_empty() {
        let joined = signals.negative_signals[..signals.negative_signals.len().min(3)].join(", ");
        return Some(JobClassification {
            is_remote_eu: false,
            confidence: Confidence::High,
            reason: format!("Heuristic: negative signals found: {joined}"),
        });
    }

    // ATS says not remote and location is not remote -> reject
    if !signals.ats_remote && !location.contains("remote") {
        let desc_lower = job.get_str("description").to_lowercase();
        if desc_lower.contains("on-site")
            || desc_lower.contains("onsite")
            || location.contains("hybrid")
            || desc_lower.contains("in office")
        {
            return Some(JobClassification {
                is_remote_eu: false,
                confidence: Confidence::High,
                reason: "Heuristic: not a remote position".to_string(),
            });
        }
    }

    // EU country code + remote flag -> accept
    if signals.eu_country_code && signals.ats_remote {
        let cc = signals.country_code.as_deref().unwrap_or("??");
        return Some(JobClassification {
            is_remote_eu: true,
            confidence: Confidence::High,
            reason: format!("Heuristic: EU country code ({cc}) + ATS remote flag"),
        });
    }

    // Explicit "Remote - EU" / "Remote | EU" in location (exclude "eu timezone")
    let remote_eu_re = Regex::new(r"(?i)\bremote\b.*\beu\b").unwrap();
    if remote_eu_re.is_match(&location) && !Regex::new(r"(?i)\beu\s*timezone\b").unwrap().is_match(&location) {
        return Some(JobClassification {
            is_remote_eu: true,
            confidence: Confidence::High,
            reason: "Heuristic: explicit 'Remote EU' in location".to_string(),
        });
    }

    // EU country names in location + remote
    if !signals.eu_countries_in_location.is_empty() && signals.ats_remote {
        let countries = signals.eu_countries_in_location[..signals.eu_countries_in_location.len().min(3)].join(", ");
        return Some(JobClassification {
            is_remote_eu: true,
            confidence: Confidence::High,
            reason: format!("Heuristic: EU/EEA country in location ({countries}) + ATS remote flag"),
        });
    }

    // "Europe" or "EMEA" in location for aggregator sources
    if is_aggregator {
        let europe_re = Regex::new(r"(?i)\b(europe|emea|european)\b").unwrap();
        if europe_re.is_match(&location) {
            let loc_preview = &location[..location.len().min(60)];
            return Some(JobClassification {
                is_remote_eu: true,
                confidence: Confidence::Medium,
                reason: format!("Heuristic: Europe/EMEA in aggregator location ({loc_preview})"),
            });
        }
    }

    // US-implicit signals + no EU signals -> escalate to LLM
    if !signals.us_implicit_signals.is_empty()
        && !signals.eu_country_code
        && !signals.eu_timezone
        && signals.eu_countries_in_location.is_empty()
    {
        return None;
    }

    // Pre-screen: check location string and JD intro for non-EU regional signals.
    let location_raw = job.get_str("location");
    let desc_raw = job.get_str("description");
    let has_non_eu_location = NON_EU_LOCATION_PATTERN.is_match(location_raw);
    let has_hybrid_location = location.contains("hybrid");
    let has_non_eu_jd = NON_EU_JD_PATTERN.is_match(&desc_raw[..desc_raw.len().min(500)]);

    // Worldwide remote: ATS remote flag + no country code + no negative signals
    if signals.ats_remote && signals.country_code.is_none() {
        if is_aggregator {
            return None; // Aggregator worldwide jobs need LLM review
        }
        // Non-EU location or JD signals → escalate to LLM
        if has_non_eu_location || has_hybrid_location || has_non_eu_jd {
            return None;
        }
        let company_key = job.get_str("company_key");
        if !company_key.is_empty() {
            let digit_count = company_key.chars().filter(|c| c.is_ascii_digit()).count();
            let digit_ratio = digit_count as f64 / company_key.len() as f64;
            if digit_ratio > 0.4 {
                return None; // Suspicious board token
            }
        }
        let desc_len = job.get_str("description").trim().len();
        if desc_len < 100 {
            return None; // Near-empty description
        }
        return Some(JobClassification {
            is_remote_eu: true,
            confidence: Confidence::Medium,
            reason: "Heuristic: worldwide remote (ATS remote flag, no country restriction)"
                .to_string(),
        });
    }

    // Non-EU country but ATS remote + description signals worldwide/global
    let desc_lower = normalize_text_for_signals(&job.get_str("description").to_lowercase());
    if signals.ats_remote && signals.country_code.is_some() && !signals.eu_country_code {
        // Tier A: Explicit "work from anywhere" phrases
        let explicit_re = Regex::new(
            r"(?i)\b(anywhere in the world|work from anywhere|location.agnostic|digital nomad)\b",
        )
        .unwrap();
        if let Some(m) = explicit_re.find(&desc_lower) {
            // Don't auto-accept if JD/location contradicts worldwide claim
            if has_non_eu_location || has_non_eu_jd {
                return None; // Escalate to LLM
            }
            let cc = signals.country_code.as_deref().unwrap_or("??");
            return Some(JobClassification {
                is_remote_eu: true,
                confidence: Confidence::Medium,
                reason: format!(
                    "Heuristic: non-EU HQ ({cc}) but worldwide remote ({})",
                    m.as_str()
                ),
            });
        }

        // Tier B: Vague phrases -> escalate to LLM
        let vague_re = Regex::new(
            r"(?i)\b(global(?:ly)?|worldwide|distributed team|fully distributed|remote.first|remote.friendly)\b",
        )
        .unwrap();
        if vague_re.is_match(&desc_lower) {
            return None;
        }
    }

    // Check description for explicit EU eligibility even without ATS signals
    if signals.ats_remote {
        let eu_desc_re = Regex::new(
            r"(?i)\b(eu\s+(?:based|eligible|residents?|citizens?|work\s*(?:authorization|permit))|european\s+(?:union|economic\s+area)|remote.*\beu\b|emea)\b",
        )
        .unwrap();
        if let Some(m) = eu_desc_re.find(&desc_lower) {
            return Some(JobClassification {
                is_remote_eu: true,
                confidence: Confidence::Medium,
                reason: format!("Heuristic: EU signal in description ({})", m.as_str()),
            });
        }
    }

    None // Ambiguous -- escalate to LLM
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_job(title: &str, location: &str, description: &str) -> JobRow {
        JobRow {
            id: 1,
            title: Some(title.to_string()),
            location: Some(location.to_string()),
            description: Some(description.to_string()),
            ..Default::default()
        }
    }

    #[test]
    fn rejects_us_only() {
        let job = make_job("Engineer", "Remote", "This position is US only.");
        let signals = crate::signals::extract_eu_signals(&job);
        let result = keyword_eu_classify(&job, &signals).unwrap();
        assert!(!result.is_remote_eu);
        assert_eq!(result.confidence, Confidence::High);
    }

    #[test]
    fn accepts_eu_country_remote() {
        let mut job = make_job("Engineer", "Remote", "Build amazing things");
        job.country = Some("DE".to_string());
        job.ashby_is_remote = Some(serde_json::Value::Bool(true));
        let signals = crate::signals::extract_eu_signals(&job);
        let result = keyword_eu_classify(&job, &signals).unwrap();
        assert!(result.is_remote_eu);
        assert_eq!(result.confidence, Confidence::High);
    }

    #[test]
    fn rejects_onsite() {
        let job = make_job("Engineer", "New York, NY", "This is an on-site position in our NYC office.");
        let signals = crate::signals::extract_eu_signals(&job);
        let result = keyword_eu_classify(&job, &signals).unwrap();
        assert!(!result.is_remote_eu);
    }

    #[test]
    fn accepts_remote_eu_in_location() {
        let job = make_job("Engineer", "Remote - EU", "Build amazing things");
        let signals = crate::signals::extract_eu_signals(&job);
        let result = keyword_eu_classify(&job, &signals).unwrap();
        assert!(result.is_remote_eu);
    }

    #[test]
    fn escalates_ambiguous_short_desc() {
        let job = make_job("Engineer", "Remote", "Join our team.");
        let signals = crate::signals::extract_eu_signals(&job);
        // Short description (< 100 chars) + no country -> escalates to LLM
        let result = keyword_eu_classify(&job, &signals);
        assert!(result.is_none());
    }

    #[test]
    fn accepts_worldwide_remote_long_desc() {
        let job = make_job("Engineer", "Remote", &"Join our global team working on interesting problems with competitive salary. We build amazing products used by millions of people worldwide. ".to_string());
        let signals = crate::signals::extract_eu_signals(&job);
        // location="Remote" -> ats_remote=true, no country, desc > 100 chars -> worldwide medium
        let result = keyword_eu_classify(&job, &signals);
        assert!(result.is_some());
        assert!(result.unwrap().is_remote_eu);
    }

    #[test]
    fn accepts_worldwide_with_work_from_anywhere() {
        let mut job = make_job(
            "Engineer",
            "Remote",
            "We are a distributed company. You can work from anywhere in the world.",
        );
        job.country = Some("US".to_string());
        job.ashby_is_remote = Some(serde_json::Value::Bool(true));
        let signals = crate::signals::extract_eu_signals(&job);
        let result = keyword_eu_classify(&job, &signals).unwrap();
        assert!(result.is_remote_eu);
        assert_eq!(result.confidence, Confidence::Medium);
    }

    // =====================================================================
    // Audit false positive regressions
    // =====================================================================

    #[test]
    fn nyc_hybrid_escalates() {
        let mut job = make_job(
            "Engineer",
            "NYC (Hybrid)",
            "We are a fully remote company building developer tools. Join our distributed engineering team and work on cutting-edge problems.",
        );
        job.ashby_is_remote = Some(serde_json::Value::Bool(true));
        let signals = crate::signals::extract_eu_signals(&job);
        let result = keyword_eu_classify(&job, &signals);
        assert!(result.is_none());
    }

    #[test]
    fn canada_remote_escalates() {
        let mut job = make_job(
            "Engineer",
            "Canada (Remote)",
            "Join our team building great products for the Canadian market.",
        );
        job.ashby_is_remote = Some(serde_json::Value::Bool(true));
        let signals = crate::signals::extract_eu_signals(&job);
        assert_eq!(signals.country_code, Some("CA".to_string()));
        let result = keyword_eu_classify(&job, &signals);
        assert!(result.is_none());
    }

    #[test]
    fn remote_denver_escalates() {
        let mut job = make_job(
            "Engineer",
            "Remote - Denver",
            "We are a fully remote company building developer tools. Join our distributed engineering team and work on cutting-edge problems.",
        );
        job.ashby_is_remote = Some(serde_json::Value::Bool(true));
        let signals = crate::signals::extract_eu_signals(&job);
        let result = keyword_eu_classify(&job, &signals);
        assert!(result.is_none());
    }

    #[test]
    fn remote_us_escalates() {
        let mut job = make_job(
            "Engineer",
            "Remote - US",
            "Join our team building great products.",
        );
        job.ashby_is_remote = Some(serde_json::Value::Bool(true));
        let signals = crate::signals::extract_eu_signals(&job);
        assert_eq!(signals.country_code, Some("US".to_string()));
        let result = keyword_eu_classify(&job, &signals);
        assert!(result.is_none());
    }

    #[test]
    fn colombia_latam_staffing_escalates() {
        let mut job = make_job(
            "Engineer",
            "Remote",
            "We connect LATAM talent to help scale U.S. startups. Work from anywhere in Latin America.",
        );
        job.country = Some("Colombia".to_string());
        job.ashby_is_remote = Some(serde_json::Value::Bool(true));
        let signals = crate::signals::extract_eu_signals(&job);
        assert_eq!(signals.country_code, Some("CO".to_string()));
        let result = keyword_eu_classify(&job, &signals);
        assert!(result.is_none());
    }

    #[test]
    fn panama_nearshore_escalates() {
        let mut job = make_job(
            "Engineer",
            "Remote",
            "Nearshore staff augmentation for US tech companies. Work from anywhere in Central America.",
        );
        job.country = Some("Panama".to_string());
        job.ashby_is_remote = Some(serde_json::Value::Bool(true));
        let signals = crate::signals::extract_eu_signals(&job);
        assert_eq!(signals.country_code, Some("PA".to_string()));
        let result = keyword_eu_classify(&job, &signals);
        assert!(result.is_none());
    }

    #[test]
    fn india_work_from_anywhere_with_india_jd_escalates() {
        let mut job = make_job(
            "Engineer",
            "Remote",
            "India-based engineering team. Work from anywhere within India. Flexible hours and great benefits for our Bangalore office.",
        );
        job.country = Some("India".to_string());
        job.ashby_is_remote = Some(serde_json::Value::Bool(true));
        let signals = crate::signals::extract_eu_signals(&job);
        assert_eq!(signals.country_code, Some("IN".to_string()));
        let result = keyword_eu_classify(&job, &signals);
        assert!(result.is_none());
    }
}
