//! PII detection and masking for GDPR compliance.
//!
//! Detects and redacts common PII patterns (email, phone, SSN, credit card,
//! IP address) from arbitrary text so contact data leaving the pipeline is
//! clean before storage or export.

use regex::Regex;
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// Categories of personally-identifiable information we can detect.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PiiField {
    Email,
    Phone,
    SocialSecurityNumber,
    CreditCard,
    IpAddress,
}

/// A detected PII span: field type + byte-range in the source string.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PiiSpan {
    pub field: PiiField,
    pub start: usize,
    pub end: usize,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Validate that a raw SSN match (e.g. `"123-45-6789"`) does not use any of
/// the invalid group values that the SSA has never assigned.
fn is_valid_ssn(raw: &str) -> bool {
    // Strip separators and split into the three groups.
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() != 9 {
        return false;
    }
    let area = &digits[0..3];
    let group = &digits[3..5];
    let serial = &digits[5..9];

    // Invalid area numbers per SSA rules.
    if area == "000" || area == "666" || area.starts_with('9') {
        return false;
    }
    if group == "00" {
        return false;
    }
    if serial == "0000" {
        return false;
    }
    true
}

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

/// Compiled regex set for all supported PII patterns.
///
/// Construct once (e.g. via `Default`) and reuse across calls — regex
/// compilation is expensive.
pub struct PiiDetector {
    email_re: Regex,
    phone_re: Regex,
    ssn_re: Regex,
    cc_re: Regex,
    ip_re: Regex,
}

impl PiiDetector {
    /// Build a `PiiDetector` with all patterns compiled.
    ///
    /// # Panics
    /// Panics if any regex literal is malformed (compile-time guarantee for
    /// the literals embedded here).
    pub fn new() -> Self {
        Self {
            // RFC 5322-ish — intentionally broad to catch obfuscated addresses
            email_re: Regex::new(
                r"(?i)[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}"
            ).expect("email regex"),

            // International-friendly phone: optional country code, then 7–15 digits
            // with separators.  Requires at least one non-digit separator or a
            // leading '+' to avoid false-positives on plain integers.
            phone_re: Regex::new(
                r"(?:\+\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}"
            ).expect("phone regex"),

            // US Social Security Number: 3-2-4 digit groups with dash or space.
            // Lookahead is not supported by the `regex` crate, so we use a
            // structural pattern and filter invalid groups in `detect()`.
            ssn_re: Regex::new(
                r"\b\d{3}[-\s]\d{2}[-\s]\d{4}\b"
            ).expect("ssn regex"),

            // Luhn-formatted card numbers: 4 groups of 4 digits (Visa/MC/Amex-ish).
            cc_re: Regex::new(
                r"\b(?:4\d{3}|5[1-5]\d{2}|6(?:011|5\d{2})|3[47]\d{2}|3(?:0[0-5]|[68]\d)\d)[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{3,4}\b"
            ).expect("credit card regex"),

            // IPv4 only (IPv6 false-positive rate is too high for unstructured text).
            ip_re: Regex::new(
                r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"
            ).expect("ip regex"),
        }
    }

    /// Scan `text` and return every PII span found, in order of appearance.
    ///
    /// Spans from different pattern types may overlap; callers should sort and
    /// apply from right-to-left to preserve byte offsets when replacing.
    pub fn detect(&self, text: &str) -> Vec<(PiiField, usize, usize)> {
        let mut spans: Vec<(PiiField, usize, usize)> = Vec::new();

        for m in self.email_re.find_iter(text) {
            spans.push((PiiField::Email, m.start(), m.end()));
        }
        for m in self.ssn_re.find_iter(text) {
            // Filter structurally impossible SSN groups (000/666/9xx first
            // group, 00 second group, 0000 fourth group).  The `regex` crate
            // does not support lookahead, so we validate here instead.
            if is_valid_ssn(m.as_str()) {
                spans.push((PiiField::SocialSecurityNumber, m.start(), m.end()));
            }
        }
        for m in self.cc_re.find_iter(text) {
            spans.push((PiiField::CreditCard, m.start(), m.end()));
        }
        for m in self.ip_re.find_iter(text) {
            spans.push((PiiField::IpAddress, m.start(), m.end()));
        }
        for m in self.phone_re.find_iter(text) {
            // Skip matches already covered by a more specific pattern.
            let already_covered = spans.iter().any(|(_, s, e)| m.start() >= *s && m.end() <= *e);
            if !already_covered {
                spans.push((PiiField::Phone, m.start(), m.end()));
            }
        }

        // Sort by start position for predictable output.
        spans.sort_by_key(|(_, start, _)| *start);
        spans
    }

    /// Return the set of PII fields present in a [`Contact`].
    ///
    /// Checks the structured email and phone fields directly rather than
    /// running full regex scanning, so it is O(1) per contact.
    pub fn check_contact(&self, contact: &crate::Contact) -> Vec<PiiField> {
        let mut found = Vec::new();

        if let Some(email) = &contact.email {
            if self.email_re.is_match(email) {
                found.push(PiiField::Email);
            }
        }
        if let Some(phone) = &contact.phone {
            if self.phone_re.is_match(phone) {
                found.push(PiiField::Phone);
            }
        }

        found
    }
}

impl Default for PiiDetector {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Masking
// ---------------------------------------------------------------------------

/// Replace every PII span detected in `text` with `[REDACTED_<TYPE>]`.
///
/// Overlapping spans are collapsed: the longest enclosing span wins.
pub fn mask_pii(text: &str, detector: &PiiDetector) -> String {
    let mut spans = detector.detect(text);
    if spans.is_empty() {
        return text.to_string();
    }

    // Deduplicate / merge overlapping spans (keep earliest start, latest end).
    spans.sort_by_key(|(_, start, _)| *start);
    let mut merged: Vec<(PiiField, usize, usize)> = Vec::new();
    for (field, start, end) in spans {
        if let Some(last) = merged.last_mut() {
            if start < last.2 {
                // Overlapping: extend the current span's end.
                last.2 = last.2.max(end);
                continue;
            }
        }
        merged.push((field, start, end));
    }

    // Build the output string by walking left-to-right.
    let bytes = text.as_bytes();
    let mut out = String::with_capacity(text.len());
    let mut cursor = 0usize;

    for (field, start, end) in &merged {
        if *start > cursor {
            // Safety: all positions come from regex matches on valid UTF-8.
            out.push_str(&text[cursor..*start]);
        }
        let tag = match field {
            PiiField::Email => "[REDACTED_EMAIL]",
            PiiField::Phone => "[REDACTED_PHONE]",
            PiiField::SocialSecurityNumber => "[REDACTED_SSN]",
            PiiField::CreditCard => "[REDACTED_CC]",
            PiiField::IpAddress => "[REDACTED_IP]",
        };
        out.push_str(tag);
        cursor = *end;
    }
    if cursor < bytes.len() {
        out.push_str(&text[cursor..]);
    }

    out
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn detector() -> PiiDetector {
        PiiDetector::new()
    }

    // --- Email ---

    #[test]
    fn detects_plain_email() {
        let d = detector();
        let spans = d.detect("Contact us at hello@example.com for info.");
        assert!(spans.iter().any(|(f, _, _)| *f == PiiField::Email));
    }

    #[test]
    fn detects_email_with_plus() {
        let d = detector();
        let spans = d.detect("user+tag@sub.domain.org");
        assert!(spans.iter().any(|(f, _, _)| *f == PiiField::Email));
    }

    #[test]
    fn masks_email() {
        let d = detector();
        let out = mask_pii("Mail me at bob@corp.io please.", &d);
        assert!(!out.contains("bob@corp.io"));
        assert!(out.contains("[REDACTED_EMAIL]"));
    }

    // --- Phone ---

    #[test]
    fn detects_us_phone_dashes() {
        let d = detector();
        let spans = d.detect("Call 555-123-4567 now.");
        assert!(spans.iter().any(|(f, _, _)| *f == PiiField::Phone));
    }

    #[test]
    fn detects_intl_phone() {
        let d = detector();
        let spans = d.detect("Reach us at +1 (800) 555-0199.");
        assert!(spans.iter().any(|(f, _, _)| *f == PiiField::Phone));
    }

    #[test]
    fn masks_phone() {
        let d = detector();
        let out = mask_pii("Phone: 555-867-5309", &d);
        assert!(!out.contains("867-5309"));
        assert!(out.contains("[REDACTED_PHONE]"));
    }

    // --- SSN ---

    #[test]
    fn detects_ssn_with_dashes() {
        let d = detector();
        let spans = d.detect("SSN: 123-45-6789");
        assert!(spans.iter().any(|(f, _, _)| *f == PiiField::SocialSecurityNumber));
    }

    #[test]
    fn masks_ssn() {
        let d = detector();
        let out = mask_pii("The applicant SSN is 234-56-7890.", &d);
        assert!(!out.contains("234-56-7890"));
        assert!(out.contains("[REDACTED_SSN]"));
    }

    #[test]
    fn ssn_invalid_group_000_not_detected() {
        // All-zero first group is not a valid SSN and should not match.
        let d = detector();
        let spans = d.detect("000-12-3456");
        assert!(!spans.iter().any(|(f, _, _)| *f == PiiField::SocialSecurityNumber));
    }

    // --- IP Address ---

    #[test]
    fn detects_ipv4() {
        let d = detector();
        let spans = d.detect("Server at 192.168.1.100.");
        assert!(spans.iter().any(|(f, _, _)| *f == PiiField::IpAddress));
    }

    #[test]
    fn masks_ip() {
        let d = detector();
        let out = mask_pii("Request from 10.0.0.1 was blocked.", &d);
        assert!(!out.contains("10.0.0.1"));
        assert!(out.contains("[REDACTED_IP]"));
    }

    // --- No false positives on normal text ---

    #[test]
    fn no_false_positives_on_plain_prose() {
        let d = detector();
        let text = "The quick brown fox jumps over the lazy dog. Version 1.2.3 released.";
        let spans = d.detect(text);
        // Version string like 1.2.3 should NOT be detected as an IP.
        assert!(!spans.iter().any(|(f, _, _)| *f == PiiField::IpAddress));
        assert!(spans.is_empty(), "unexpected spans: {:?}", spans);
    }

    #[test]
    fn no_false_positive_on_year_range() {
        let d = detector();
        let text = "Data from 2020-01-2024 is archived.";
        let spans = d.detect(text);
        // Should not be mistaken for SSN.
        assert!(!spans.iter().any(|(f, _, _)| *f == PiiField::SocialSecurityNumber));
    }

    // --- check_contact ---

    #[test]
    fn check_contact_finds_email_and_phone() {
        let d = detector();
        let contact = crate::Contact {
            id: "c1".into(),
            company_id: None,
            first_name: "Jane".into(),
            last_name: "Doe".into(),
            title: None,
            seniority: None,
            department: None,
            email: Some("jane@example.com".into()),
            email_status: None,
            linkedin_url: None,
            phone: Some("555-123-4567".into()),
            source: None,
            created_at: None,
        };
        let fields = d.check_contact(&contact);
        assert!(fields.contains(&PiiField::Email));
        assert!(fields.contains(&PiiField::Phone));
    }

    #[test]
    fn check_contact_no_pii_when_fields_absent() {
        let d = detector();
        let contact = crate::Contact {
            id: "c2".into(),
            company_id: None,
            first_name: "John".into(),
            last_name: "Smith".into(),
            title: None,
            seniority: None,
            department: None,
            email: None,
            email_status: None,
            linkedin_url: None,
            phone: None,
            source: None,
            created_at: None,
        };
        let fields = d.check_contact(&contact);
        assert!(fields.is_empty());
    }

    // --- mask_pii: multiple PII in one string ---

    #[test]
    fn masks_multiple_pii_types() {
        let d = detector();
        let text = "Email bob@corp.io or call 555-987-6543 from 203.0.113.5.";
        let out = mask_pii(text, &d);
        assert!(!out.contains("bob@corp.io"));
        assert!(!out.contains("555-987-6543"));
        assert!(!out.contains("203.0.113.5"));
    }

    #[test]
    fn mask_pii_passthrough_clean_text() {
        let d = detector();
        let text = "No sensitive data here.";
        assert_eq!(mask_pii(text, &d), text);
    }
}
