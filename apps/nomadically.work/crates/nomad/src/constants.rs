use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::{HashMap, HashSet};

/// EU member state + EEA ISO 3166-1 alpha-2 codes.
pub static EU_ISO_CODES: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
        "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
        "PL", "PT", "RO", "SK", "SI", "ES", "SE",
        // EEA
        "NO", "IS", "LI",
    ]
    .into_iter()
    .collect()
});

/// EU + EEA country names (lowercase) for text matching.
pub static EU_COUNTRY_NAMES: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech republic",
        "czechia", "denmark", "estonia", "finland", "france", "germany", "greece",
        "hungary", "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta",
        "netherlands", "poland", "portugal", "romania", "slovakia", "slovenia",
        "spain", "sweden",
        // EEA
        "norway", "iceland", "liechtenstein",
    ]
    .into_iter()
    .collect()
});

/// Country name -> ISO code mapping (covers common ATS values).
pub static COUNTRY_NAME_TO_ISO: Lazy<HashMap<&'static str, &'static str>> = Lazy::new(|| {
    HashMap::from([
        ("austria", "AT"), ("belgium", "BE"), ("bulgaria", "BG"), ("croatia", "HR"),
        ("cyprus", "CY"), ("czech republic", "CZ"), ("czechia", "CZ"), ("denmark", "DK"),
        ("estonia", "EE"), ("finland", "FI"), ("france", "FR"), ("germany", "DE"),
        ("greece", "GR"), ("hungary", "HU"), ("ireland", "IE"), ("italy", "IT"),
        ("latvia", "LV"), ("lithuania", "LT"), ("luxembourg", "LU"), ("malta", "MT"),
        ("netherlands", "NL"), ("poland", "PL"), ("portugal", "PT"), ("romania", "RO"),
        ("slovakia", "SK"), ("slovenia", "SI"), ("spain", "ES"), ("sweden", "SE"),
        // EEA
        ("norway", "NO"), ("iceland", "IS"), ("liechtenstein", "LI"),
        // Non-EU (for correct negative classification)
        ("united states", "US"), ("usa", "US"), ("u.s.a.", "US"), ("u.s.", "US"),
        ("united kingdom", "GB"), ("uk", "GB"), ("switzerland", "CH"),
        ("canada", "CA"), ("australia", "AU"), ("new zealand", "NZ"),
        ("japan", "JP"), ("singapore", "SG"), ("india", "IN"), ("brazil", "BR"),
        ("israel", "IL"), ("south korea", "KR"), ("china", "CN"),
        // LatAm / other non-EU countries
        ("mexico", "MX"), ("argentina", "AR"), ("colombia", "CO"), ("panama", "PA"),
        ("chile", "CL"), ("peru", "PE"), ("costa rica", "CR"), ("uruguay", "UY"),
        ("philippines", "PH"), ("vietnam", "VN"), ("turkey", "TR"), ("türkiye", "TR"),
        ("south africa", "ZA"), ("nigeria", "NG"), ("kenya", "KE"),
        ("united arab emirates", "AE"), ("uae", "AE"),
    ])
});

/// Negative signal patterns — US-only, no-EU, Swiss-only.
pub static NEGATIVE_EU_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(concat!(
        r"(?i)\b(",
        r"us only|us-only|united states only",
        r"|must be based in the us|must be based in the united states",
        r"|us work authorization|authorized to work in the united states",
        r"|us citizens? (?:and|or) permanent residents?",
        r"|no eu applicants?|cannot accept applications? from eu",
        r"|outside the european union",
        r"|must be based in switzerland|swiss work permit",
        r")\b",
    ))
    .unwrap()
});

/// US-implicit signal patterns — salary in USD, US benefits, US government.
pub static US_IMPLICIT_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(concat!(
        r"(?i)(",
        r"\$\d{2,3}k",
        r"|\$\d{3},?\d{3}",
        r"|USD\s*\d",
        r"|401\(?k\)?",
        r"|medical,?\s*dental,?\s*(?:and\s*)?vision",
        r"|\bDoD\b|\bSBIR\b",
        r"|\bsecurity clearance\b",
        r"|\bW-?2\b",
        r"|\bUS\s*(?:holidays?|PTO)\b",
        r")",
    ))
    .unwrap()
});

/// EU timezone / business hours patterns.
pub static EU_TIMEZONE_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(concat!(
        r"(?i)(",
        r"\beu\s*timezone\b",
        r"|\beuropean business hours\b",
        r"|cet\s*[+-]\s*\d",
        r"|[+-]\s*\d+\s*hours?\s*cet",
        r"|\boverlap with (?:cet|european)\b",
        r")",
    ))
    .unwrap()
});

/// Non-EU location patterns — city/region names indicating non-EU positions.
pub static NON_EU_LOCATION_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(concat!(
        r"(?i)\b(",
        r"nyc|new york|denver|miami|san francisco|los angeles|chicago|seattle|austin",
        r"|boston|atlanta|dallas|houston|portland|phoenix|minneapolis|minnesota",
        r"|toronto|vancouver|montreal|calgary",
        r"|mumbai|bangalore|bengaluru|hyderabad|delhi|chennai|pune",
        r"|são paulo|sao paulo|buenos aires|bogota|bogotá|lima|santiago",
        r"|manila|ho chi minh|jakarta",
        r"|latam|latin america",
        r")\b",
    ))
    .unwrap()
});

/// JD-level signals indicating non-EU regional focus (check first ~500 chars).
pub static NON_EU_JD_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(concat!(
        r"(?i)\b(",
        r"latam|latin america|nearshore|staff augmentation",
        r"|us(?:\s+|-)?(?:based|only)|united states only",
        r"|canada(?:\s+|-)?(?:based|only)|india(?:\s+|-)?(?:based|only)",
        r"|scale u\.?s\.? startups?",
        r")\b",
    ))
    .unwrap()
});

/// Normalize text for signal matching: dehyphenate compound words.
/// "work-from-anywhere" -> "work from anywhere"
pub fn normalize_text_for_signals(text: &str) -> String {
    static RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?P<a>\w)-(?P<b>\w)").unwrap());
    RE.replace_all(text, "$a $b").to_string()
}

/// Remote aggregator source kinds that post worldwide jobs.
pub static AGGREGATOR_SOURCE_KINDS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    ["remoteok", "remotive", "himalayas", "jobicy"]
        .into_iter()
        .collect()
});

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn eu_codes_contain_expected() {
        assert!(EU_ISO_CODES.contains("DE"));
        assert!(EU_ISO_CODES.contains("NO")); // EEA
        assert!(!EU_ISO_CODES.contains("US"));
        assert!(!EU_ISO_CODES.contains("GB"));
        assert_eq!(EU_ISO_CODES.len(), 30);
    }

    #[test]
    fn country_name_to_iso_works() {
        assert_eq!(COUNTRY_NAME_TO_ISO.get("germany"), Some(&"DE"));
        assert_eq!(COUNTRY_NAME_TO_ISO.get("usa"), Some(&"US"));
        assert_eq!(COUNTRY_NAME_TO_ISO.get("nonexistent"), None);
    }

    #[test]
    fn negative_pattern_matches() {
        assert!(NEGATIVE_EU_PATTERN.is_match("us only"));
        assert!(NEGATIVE_EU_PATTERN.is_match("Must be based in the US"));
        assert!(NEGATIVE_EU_PATTERN.is_match("US work authorization"));
        assert!(!NEGATIVE_EU_PATTERN.is_match("remote work in EU"));
    }

    #[test]
    fn us_implicit_pattern_matches() {
        assert!(US_IMPLICIT_PATTERN.is_match("$150k base salary"));
        assert!(US_IMPLICIT_PATTERN.is_match("401(k) matching"));
        assert!(US_IMPLICIT_PATTERN.is_match("medical, dental, and vision"));
        assert!(!US_IMPLICIT_PATTERN.is_match("remote work in EU"));
    }

    #[test]
    fn eu_timezone_pattern_matches() {
        assert!(EU_TIMEZONE_PATTERN.is_match("eu timezone required"));
        assert!(EU_TIMEZONE_PATTERN.is_match("European business hours"));
        assert!(EU_TIMEZONE_PATTERN.is_match("CET +2"));
        assert!(EU_TIMEZONE_PATTERN.is_match("CET -3"));
        assert!(!EU_TIMEZONE_PATTERN.is_match("PST timezone"));
    }

    #[test]
    fn latam_countries_in_map() {
        assert_eq!(COUNTRY_NAME_TO_ISO.get("colombia"), Some(&"CO"));
        assert_eq!(COUNTRY_NAME_TO_ISO.get("argentina"), Some(&"AR"));
        assert_eq!(COUNTRY_NAME_TO_ISO.get("panama"), Some(&"PA"));
        assert_eq!(COUNTRY_NAME_TO_ISO.get("mexico"), Some(&"MX"));
    }

    #[test]
    fn non_eu_location_pattern_matches() {
        assert!(NON_EU_LOCATION_PATTERN.is_match("nyc"));
        assert!(NON_EU_LOCATION_PATTERN.is_match("new york"));
        assert!(NON_EU_LOCATION_PATTERN.is_match("denver"));
        assert!(NON_EU_LOCATION_PATTERN.is_match("toronto"));
        assert!(NON_EU_LOCATION_PATTERN.is_match("bangalore"));
        assert!(NON_EU_LOCATION_PATTERN.is_match("latam"));
        assert!(!NON_EU_LOCATION_PATTERN.is_match("remote"));
        assert!(!NON_EU_LOCATION_PATTERN.is_match("berlin"));
        assert!(!NON_EU_LOCATION_PATTERN.is_match("amsterdam"));
        assert!(!NON_EU_LOCATION_PATTERN.is_match("oslo"));
    }

    #[test]
    fn non_eu_jd_pattern_matches() {
        assert!(NON_EU_JD_PATTERN.is_match("latam"));
        assert!(NON_EU_JD_PATTERN.is_match("latin america"));
        assert!(NON_EU_JD_PATTERN.is_match("nearshore"));
        assert!(NON_EU_JD_PATTERN.is_match("staff augmentation"));
        assert!(NON_EU_JD_PATTERN.is_match("us-based"));
        assert!(NON_EU_JD_PATTERN.is_match("canada-only"));
        assert!(!NON_EU_JD_PATTERN.is_match("remote-first"));
        assert!(!NON_EU_JD_PATTERN.is_match("global team"));
        assert!(!NON_EU_JD_PATTERN.is_match("work from anywhere"));
    }

    #[test]
    fn normalize_dehyphenates() {
        assert_eq!(
            normalize_text_for_signals("work-from-anywhere remote-first"),
            "work from anywhere remote first"
        );
    }
}
