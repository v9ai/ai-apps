/// Zero-copy FSM parser for email headers.
/// Single-pass byte scanning with no heap allocation for the parsed result.

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AuthResult {
    Pass,
    Fail,
    SoftFail,
    None,
}

/// Parsed email headers extracted in a single pass. Zero heap allocation —
/// all string slices borrow from the input byte buffer.
pub struct ParsedHeaders<'a> {
    pub spf_result: AuthResult,
    pub dkim_result: AuthResult,
    pub dmarc_result: AuthResult,
    pub from_domain: &'a str,
    pub reply_to_domain: Option<&'a str>,
    pub return_path_domain: Option<&'a str>,
    pub received_count: u8,
    pub has_list_unsubscribe: bool,
    pub x_mailer: Option<&'a str>,
}

impl<'a> Default for ParsedHeaders<'a> {
    fn default() -> Self {
        Self {
            spf_result: AuthResult::None,
            dkim_result: AuthResult::None,
            dmarc_result: AuthResult::None,
            from_domain: "",
            reply_to_domain: None,
            return_path_domain: None,
            received_count: 0,
            has_list_unsubscribe: false,
            x_mailer: None,
        }
    }
}

/// Which field we're currently accumulating value for
#[derive(Debug, Clone, Copy, PartialEq)]
enum CurrentField {
    Unknown,
    AuthenticationResults,
    From,
    ReplyTo,
    ReturnPath,
    Received,
    ListUnsubscribe,
    XMailer,
}

/// Case-insensitive byte comparison.
#[inline]
fn eq_icase(a: u8, b: u8) -> bool {
    a.to_ascii_lowercase() == b.to_ascii_lowercase()
}

/// Case-insensitive check if `raw[pos..]` starts with `needle`.
#[inline]
fn starts_with_icase(raw: &[u8], pos: usize, needle: &[u8]) -> bool {
    if pos + needle.len() > raw.len() {
        return false;
    }
    for (i, &n) in needle.iter().enumerate() {
        if !eq_icase(raw[pos + i], n) {
            return false;
        }
    }
    true
}

/// Extract the domain from an email-like value.
/// Finds '@' then takes bytes until whitespace, '>', ',', or newline.
/// Returns a str slice borrowed from `raw`.
fn extract_domain_from_range<'a>(raw: &'a [u8], start: usize, end: usize) -> Option<&'a str> {
    let slice = &raw[start..end];
    let at_pos = slice.iter().position(|&b| b == b'@')?;
    let domain_start = at_pos + 1;
    if domain_start >= slice.len() {
        return None;
    }

    let domain_end = slice[domain_start..]
        .iter()
        .position(|&b| b == b' ' || b == b'\t' || b == b'>' || b == b',' || b == b'\r' || b == b'\n' || b == b';')
        .map(|p| domain_start + p)
        .unwrap_or(slice.len());

    if domain_end <= domain_start {
        return None;
    }

    std::str::from_utf8(&slice[domain_start..domain_end]).ok()
}

/// Parse an Authentication-Results field value for SPF/DKIM/DMARC results.
fn parse_auth_result(value: &[u8]) -> (AuthResult, AuthResult, AuthResult) {
    let mut spf = AuthResult::None;
    let mut dkim = AuthResult::None;
    let mut dmarc = AuthResult::None;

    let lower: Vec<u8> = value.iter().map(|b| b.to_ascii_lowercase()).collect();

    // Scan for "spf=", "dkim=", "dmarc="
    for i in 0..lower.len() {
        if i + 4 <= lower.len() && &lower[i..i + 4] == b"spf=" {
            spf = parse_auth_value(&lower[i + 4..]);
        } else if i + 5 <= lower.len() && &lower[i..i + 5] == b"dkim=" {
            dkim = parse_auth_value(&lower[i + 5..]);
        } else if i + 6 <= lower.len() && &lower[i..i + 6] == b"dmarc=" {
            dmarc = parse_auth_value(&lower[i + 6..]);
        }
    }

    (spf, dkim, dmarc)
}

/// Parse an auth value token (pass, fail, softfail, none).
fn parse_auth_value(rest: &[u8]) -> AuthResult {
    if rest.starts_with(b"pass") {
        AuthResult::Pass
    } else if rest.starts_with(b"fail") {
        AuthResult::Fail
    } else if rest.starts_with(b"softfail") {
        AuthResult::SoftFail
    } else if rest.starts_with(b"none") {
        AuthResult::None
    } else {
        AuthResult::None
    }
}

/// Parse raw email headers in a single pass. Zero heap allocation for the result.
///
/// Handles folded headers (continuation lines starting with space/tab).
/// Field name matching is case-insensitive.
pub fn parse_headers(raw: &[u8]) -> ParsedHeaders<'_> {
    let mut result = ParsedHeaders::default();

    if raw.is_empty() {
        return result;
    }

    let mut pos = 0;
    let len = raw.len();

    // We process line by line. A "line" ends at \r\n or \n.
    // If the next line starts with space/tab, it's a continuation (folded header).

    while pos < len {
        // Find the end of the field name (terminated by ':')
        let line_start = pos;

        // Skip if this is a blank line (end of headers)
        if pos < len && (raw[pos] == b'\r' || raw[pos] == b'\n') {
            break;
        }

        // Find the colon that separates field name from value
        let mut colon_pos = None;
        let mut scan = pos;
        while scan < len && raw[scan] != b'\n' && raw[scan] != b'\r' {
            if raw[scan] == b':' && colon_pos.is_none() {
                colon_pos = Some(scan);
                break;
            }
            scan += 1;
        }

        let colon = match colon_pos {
            Some(c) => c,
            None => {
                // No colon found — skip to next line
                while pos < len && raw[pos] != b'\n' {
                    pos += 1;
                }
                if pos < len {
                    pos += 1; // skip \n
                }
                continue;
            }
        };

        let field_name_start = line_start;
        let field_name_end = colon;

        // Value starts after colon (skip optional whitespace)
        let mut value_start = colon + 1;
        while value_start < len && (raw[value_start] == b' ' || raw[value_start] == b'\t') {
            value_start += 1;
        }

        // Find the end of this header value, including folded continuation lines.
        // A continuation line starts with space or tab.
        let mut value_end = value_start;

        // First, find end of current line
        while value_end < len && raw[value_end] != b'\n' {
            value_end += 1;
        }

        // Skip the \n
        let mut next_line = value_end;
        if next_line < len && raw[next_line] == b'\n' {
            next_line += 1;
        }
        // Handle \r\n: if the char before \n was \r, that's fine — it's part of the value
        // but we trim it later. Check for continuation.

        // Check for folded lines
        while next_line < len && (raw[next_line] == b' ' || raw[next_line] == b'\t') {
            // This is a continuation line — extend value_end
            while next_line < len && raw[next_line] != b'\n' {
                next_line += 1;
            }
            value_end = next_line;
            if next_line < len && raw[next_line] == b'\n' {
                next_line += 1;
            }
        }

        // Trim trailing \r from value
        let mut trimmed_end = value_end;
        while trimmed_end > value_start && (raw[trimmed_end - 1] == b'\r' || raw[trimmed_end - 1] == b'\n') {
            trimmed_end -= 1;
        }

        // Now identify the field
        let field = identify_field(raw, field_name_start, field_name_end);

        match field {
            CurrentField::AuthenticationResults => {
                let (spf, dkim, dmarc) = parse_auth_result(&raw[value_start..trimmed_end]);
                if spf != AuthResult::None {
                    result.spf_result = spf;
                }
                if dkim != AuthResult::None {
                    result.dkim_result = dkim;
                }
                if dmarc != AuthResult::None {
                    result.dmarc_result = dmarc;
                }
            }
            CurrentField::From => {
                if result.from_domain.is_empty() {
                    if let Some(domain) = extract_domain_from_range(raw, value_start, trimmed_end) {
                        result.from_domain = domain;
                    }
                }
            }
            CurrentField::ReplyTo => {
                if result.reply_to_domain.is_none() {
                    result.reply_to_domain =
                        extract_domain_from_range(raw, value_start, trimmed_end);
                }
            }
            CurrentField::ReturnPath => {
                if result.return_path_domain.is_none() {
                    result.return_path_domain =
                        extract_domain_from_range(raw, value_start, trimmed_end);
                }
            }
            CurrentField::Received => {
                result.received_count = result.received_count.saturating_add(1);
            }
            CurrentField::ListUnsubscribe => {
                result.has_list_unsubscribe = true;
            }
            CurrentField::XMailer => {
                if result.x_mailer.is_none() {
                    result.x_mailer =
                        std::str::from_utf8(&raw[value_start..trimmed_end]).ok();
                }
            }
            CurrentField::Unknown => {}
        }

        pos = next_line;
    }

    result
}

/// Identify which field we're looking at from the field name bytes.
fn identify_field(raw: &[u8], start: usize, end: usize) -> CurrentField {
    let name_len = end - start;

    // Quick length-based dispatch for performance
    match name_len {
        4 => {
            // "From"
            if starts_with_icase(raw, start, b"From") {
                return CurrentField::From;
            }
        }
        8 => {
            // "Reply-To", "Received"
            if starts_with_icase(raw, start, b"Reply-To") {
                return CurrentField::ReplyTo;
            }
            if starts_with_icase(raw, start, b"Received") {
                return CurrentField::Received;
            }
            // "X-Mailer"
            if starts_with_icase(raw, start, b"X-Mailer") {
                return CurrentField::XMailer;
            }
        }
        11 => {
            // "Return-Path"
            if starts_with_icase(raw, start, b"Return-Path") {
                return CurrentField::ReturnPath;
            }
        }
        16 => {
            // "List-Unsubscribe"
            if starts_with_icase(raw, start, b"List-Unsubscribe") {
                return CurrentField::ListUnsubscribe;
            }
        }
        22 => {
            // "Authentication-Results"
            if starts_with_icase(raw, start, b"Authentication-Results") {
                return CurrentField::AuthenticationResults;
            }
        }
        _ => {}
    }

    CurrentField::Unknown
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_full_headers() {
        let raw = b"From: sender@example.com\n\
                     Reply-To: replyto@other.com\n\
                     Return-Path: <bounce@example.com>\n\
                     Received: from mx1.example.com\n\
                     Received: from mx2.example.com\n\
                     Authentication-Results: mx.example.com; spf=pass; dkim=pass; dmarc=pass\n\
                     List-Unsubscribe: <mailto:unsub@example.com>\n\
                     X-Mailer: MyApp 1.0\n\
                     Subject: Test\n\
                     \n\
                     Body here\n";

        let parsed = parse_headers(raw);

        assert_eq!(parsed.from_domain, "example.com");
        assert_eq!(parsed.reply_to_domain, Some("other.com"));
        assert_eq!(parsed.return_path_domain, Some("example.com"));
        assert_eq!(parsed.received_count, 2);
        assert_eq!(parsed.spf_result, AuthResult::Pass);
        assert_eq!(parsed.dkim_result, AuthResult::Pass);
        assert_eq!(parsed.dmarc_result, AuthResult::Pass);
        assert!(parsed.has_list_unsubscribe);
        assert_eq!(parsed.x_mailer, Some("MyApp 1.0"));
    }

    #[test]
    fn test_parse_minimal() {
        let raw = b"From: user@minimal.io\n\n";
        let parsed = parse_headers(raw);

        assert_eq!(parsed.from_domain, "minimal.io");
        assert_eq!(parsed.reply_to_domain, None);
        assert_eq!(parsed.return_path_domain, None);
        assert_eq!(parsed.received_count, 0);
        assert_eq!(parsed.spf_result, AuthResult::None);
        assert_eq!(parsed.dkim_result, AuthResult::None);
        assert_eq!(parsed.dmarc_result, AuthResult::None);
        assert!(!parsed.has_list_unsubscribe);
        assert_eq!(parsed.x_mailer, None);
    }

    #[test]
    fn test_parse_auth_results() {
        let raw = b"Authentication-Results: mx.google.com; spf=pass smtp.mailfrom=example.com; dkim=fail; dmarc=softfail\n\n";
        let parsed = parse_headers(raw);

        assert_eq!(parsed.spf_result, AuthResult::Pass);
        assert_eq!(parsed.dkim_result, AuthResult::Fail);
        assert_eq!(parsed.dmarc_result, AuthResult::SoftFail);
    }

    #[test]
    fn test_parse_empty() {
        let parsed = parse_headers(b"");
        assert_eq!(parsed.from_domain, "");
        assert_eq!(parsed.received_count, 0);
        assert_eq!(parsed.spf_result, AuthResult::None);
    }

    #[test]
    fn test_parse_folded_headers() {
        let raw = b"Authentication-Results: mx.example.com;\n \tspf=pass;\n \tdkim=pass;\n \tdmarc=fail\nFrom: test@fold.com\n\n";
        let parsed = parse_headers(raw);

        assert_eq!(parsed.spf_result, AuthResult::Pass);
        assert_eq!(parsed.dkim_result, AuthResult::Pass);
        assert_eq!(parsed.dmarc_result, AuthResult::Fail);
        assert_eq!(parsed.from_domain, "fold.com");
    }

    #[test]
    fn test_parse_case_insensitive() {
        let raw = b"FROM: admin@UPPER.COM\nRECEIVED: from server\nreceived: from another\n\n";
        let parsed = parse_headers(raw);

        assert_eq!(parsed.from_domain, "UPPER.COM");
        assert_eq!(parsed.received_count, 2);
    }

    #[test]
    fn test_parse_crlf() {
        let raw = b"From: user@crlf.com\r\nReceived: from mx\r\nX-Mailer: Test\r\n\r\n";
        let parsed = parse_headers(raw);

        assert_eq!(parsed.from_domain, "crlf.com");
        assert_eq!(parsed.received_count, 1);
        assert_eq!(parsed.x_mailer, Some("Test"));
    }

    #[test]
    fn test_extract_domain_angle_brackets() {
        let raw = b"From: \"John Doe\" <john@brackets.com>\n\n";
        let parsed = parse_headers(raw);
        assert_eq!(parsed.from_domain, "brackets.com");
    }

    #[test]
    fn test_multiple_received() {
        let raw = b"Received: from a\nReceived: from b\nReceived: from c\nReceived: from d\n\n";
        let parsed = parse_headers(raw);
        assert_eq!(parsed.received_count, 4);
    }
}
