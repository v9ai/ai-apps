use regex::Regex;

use crate::constants::{
    COUNTRY_NAME_TO_ISO, EU_COUNTRY_NAMES, EU_ISO_CODES, EU_TIMEZONE_PATTERN,
    NEGATIVE_EU_PATTERN, US_IMPLICIT_PATTERN, normalize_text_for_signals,
};
use crate::{JobRow, SignalSet};

/// Extract deterministic EU-related signals from ATS-enriched job data.
pub fn extract_eu_signals(job: &JobRow) -> SignalSet {
    let mut signals = SignalSet::default();

    // ATS remote flag
    let workplace = job.get_str("workplace_type").to_lowercase();
    let location_lower = job.get_str("location").to_lowercase().trim().to_string();

    if job.ashby_is_remote_bool()
        || workplace == "remote"
        || location_lower == "remote"
        || location_lower.starts_with("remote ")
    {
        signals.ats_remote = true;
    }

    // Country code -> EU membership check
    let raw_country = job.get_str("country").trim().to_string();
    let country_upper = raw_country.to_uppercase();

    if !country_upper.is_empty() && is_iso_code(&country_upper) {
        signals.country_code = Some(country_upper.clone());
        if EU_ISO_CODES.contains(country_upper.as_str()) {
            signals.eu_country_code = true;
        }
    } else if !raw_country.is_empty() {
        if let Some(&iso) = COUNTRY_NAME_TO_ISO.get(raw_country.to_lowercase().as_str()) {
            signals.country_code = Some(iso.to_string());
            if EU_ISO_CODES.contains(iso) {
                signals.eu_country_code = true;
            }
        }
    }

    // Fallback: extract country from ashby_address
    if signals.country_code.is_none() {
        if let Some(ref addr_str) = job.ashby_address {
            if let Ok(addr) = serde_json::from_str::<serde_json::Value>(addr_str) {
                let postal = addr.get("postalAddress").unwrap_or(&addr);
                for key in &["addressCountry", "addressLocality"] {
                    if let Some(candidate) = postal.get(key).and_then(|v| v.as_str()) {
                        let candidate = candidate.trim();
                        if candidate.is_empty() {
                            continue;
                        }
                        let upper = candidate.to_uppercase();
                        if is_iso_code(&upper) {
                            signals.country_code = Some(upper.clone());
                            if EU_ISO_CODES.contains(upper.as_str()) {
                                signals.eu_country_code = true;
                            }
                            break;
                        }
                        if let Some(&iso) =
                            COUNTRY_NAME_TO_ISO.get(candidate.to_lowercase().as_str())
                        {
                            signals.country_code = Some(iso.to_string());
                            if EU_ISO_CODES.contains(iso) {
                                signals.eu_country_code = true;
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    // Fallback: extract country from location string (e.g. "USA | Remote")
    if signals.country_code.is_none() && !location_lower.is_empty() {
        let split_re = Regex::new(r"[|,/()\-\u{2013}\u{2014}]+").unwrap();
        for token in split_re.split(&location_lower) {
            let token = token.trim().trim_end_matches('.');
            if token.is_empty() || token == "remote" {
                continue;
            }
            if let Some(&iso) = COUNTRY_NAME_TO_ISO.get(token) {
                signals.country_code = Some(iso.to_string());
                if EU_ISO_CODES.contains(iso) {
                    signals.eu_country_code = true;
                }
                break;
            }
            let upper = token.to_uppercase();
            if upper.len() == 2 && upper.chars().all(|c| c.is_ascii_alphabetic()) {
                signals.country_code = Some(upper.clone());
                if EU_ISO_CODES.contains(upper.as_str()) {
                    signals.eu_country_code = true;
                }
                break;
            }
        }
    }

    // Negative signals via regex on description
    let desc = &job.get_str("description")[..job.get_str("description").len().min(8000)];
    let location = job.get_str("location").to_lowercase();
    let full_text = normalize_text_for_signals(&format!("{} {}", location, desc.to_lowercase()));

    for m in NEGATIVE_EU_PATTERN.find_iter(&full_text) {
        signals.negative_signals.push(m.as_str().to_string());
    }

    // US-implicit signals
    for m in US_IMPLICIT_PATTERN.find_iter(&full_text) {
        signals.us_implicit_signals.push(m.as_str().to_string());
    }

    // EU timezone / business hours
    if EU_TIMEZONE_PATTERN.is_match(&full_text) {
        signals.eu_timezone = true;
    }

    // EU country names in location string
    for name in EU_COUNTRY_NAMES.iter() {
        if location.contains(name) {
            signals.eu_countries_in_location.push(name.to_string());
        }
    }

    // Aggregate all ATS locations
    let mut all_locs: Vec<String> = Vec::new();
    if !job.get_str("location").is_empty() {
        all_locs.push(job.get_str("location").to_string());
    }

    // offices (Greenhouse JSON array)
    if let Some(ref offices_str) = job.offices {
        if let Ok(offices) = serde_json::from_str::<serde_json::Value>(offices_str) {
            if let Some(arr) = offices.as_array() {
                for o in arr {
                    let name = o
                        .get("name")
                        .or_else(|| o.get("location"))
                        .and_then(|v| v.as_str());
                    if let Some(name) = name {
                        all_locs.push(name.to_string());
                    }
                }
            }
        }
    }

    // categories.allLocations (Ashby/Lever JSON)
    if let Some(ref cats_str) = job.categories {
        if let Ok(cats) = serde_json::from_str::<serde_json::Value>(cats_str) {
            if let Some(locs) = cats.get("allLocations").and_then(|v| v.as_array()) {
                for loc in locs {
                    if let Some(s) = loc.as_str() {
                        if !s.is_empty() && !all_locs.contains(&s.to_string()) {
                            all_locs.push(s.to_string());
                        }
                    }
                }
            }
        }
    }

    // ashby_secondary_locations
    if let Some(ref sec_str) = job.ashby_secondary_locations {
        if let Ok(sec) = serde_json::from_str::<serde_json::Value>(sec_str) {
            if let Some(arr) = sec.as_array() {
                for s in arr {
                    let loc_name = s
                        .get("location")
                        .and_then(|v| v.as_str())
                        .or_else(|| s.as_str());
                    if let Some(name) = loc_name {
                        if !name.is_empty() && !all_locs.contains(&name.to_string()) {
                            all_locs.push(name.to_string());
                        }
                    }
                }
            }
        }
    }

    signals.all_locations = all_locs;
    signals
}

/// Format extracted signals as a text block for the LLM prompt.
pub fn format_signals(signals: &SignalSet) -> String {
    let mut parts: Vec<String> = Vec::new();

    if signals.ats_remote {
        parts.push("- ATS remote flag: YES".to_string());
    }
    if let Some(ref cc) = signals.country_code {
        let eu_label = if signals.eu_country_code {
            " (EU member)"
        } else {
            " (NOT EU)"
        };
        parts.push(format!("- Country code: {cc}{eu_label}"));
    }
    if !signals.negative_signals.is_empty() {
        let joined = signals.negative_signals[..signals.negative_signals.len().min(5)].join(", ");
        parts.push(format!("- Negative signals: {joined}"));
    }
    if signals.eu_timezone {
        parts.push("- EU timezone/business hours signal detected".to_string());
    }
    if !signals.eu_countries_in_location.is_empty() {
        let joined =
            signals.eu_countries_in_location[..signals.eu_countries_in_location.len().min(5)]
                .join(", ");
        parts.push(format!("- EU countries in location: {joined}"));
    }
    if signals.all_locations.len() > 1 {
        let joined = signals.all_locations[..signals.all_locations.len().min(8)].join(", ");
        parts.push(format!("- All ATS locations: {joined}"));
    }

    if parts.is_empty() {
        "- No structured ATS signals available".to_string()
    } else {
        parts.join("\n")
    }
}

fn is_iso_code(s: &str) -> bool {
    (s.len() == 2 || s.len() == 3) && s.chars().all(|c| c.is_ascii_alphabetic())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_eu_country_from_country_field() {
        let job = JobRow {
            id: 1,
            country: Some("DE".to_string()),
            ..Default::default()
        };
        let signals = extract_eu_signals(&job);
        assert!(signals.eu_country_code);
        assert_eq!(signals.country_code, Some("DE".to_string()));
    }

    #[test]
    fn extracts_remote_from_ashby() {
        let job = JobRow {
            id: 2,
            ashby_is_remote: Some(serde_json::Value::Bool(true)),
            ..Default::default()
        };
        let signals = extract_eu_signals(&job);
        assert!(signals.ats_remote);
    }

    #[test]
    fn extracts_us_country_from_name() {
        let job = JobRow {
            id: 3,
            country: Some("united states".to_string()),
            ..Default::default()
        };
        let signals = extract_eu_signals(&job);
        assert!(!signals.eu_country_code);
        assert_eq!(signals.country_code, Some("US".to_string()));
    }

    #[test]
    fn detects_negative_signals() {
        let job = JobRow {
            id: 4,
            description: Some("This role is US only and requires US work authorization".to_string()),
            ..Default::default()
        };
        let signals = extract_eu_signals(&job);
        assert!(!signals.negative_signals.is_empty());
    }

    #[test]
    fn detects_eu_timezone() {
        let job = JobRow {
            id: 5,
            description: Some("Must work in EU timezone".to_string()),
            ..Default::default()
        };
        let signals = extract_eu_signals(&job);
        assert!(signals.eu_timezone);
    }

    #[test]
    fn extracts_country_from_location_fallback() {
        let job = JobRow {
            id: 6,
            location: Some("USA | Remote".to_string()),
            ..Default::default()
        };
        let signals = extract_eu_signals(&job);
        assert_eq!(signals.country_code, Some("US".to_string()));
        assert!(!signals.eu_country_code);
    }

    #[test]
    fn format_signals_empty() {
        let signals = SignalSet::default();
        assert_eq!(format_signals(&signals), "- No structured ATS signals available");
    }

    #[test]
    fn format_signals_full() {
        let signals = SignalSet {
            ats_remote: true,
            eu_country_code: true,
            country_code: Some("DE".to_string()),
            eu_timezone: true,
            ..Default::default()
        };
        let text = format_signals(&signals);
        assert!(text.contains("ATS remote flag: YES"));
        assert!(text.contains("DE (EU member)"));
        assert!(text.contains("EU timezone"));
    }
}
