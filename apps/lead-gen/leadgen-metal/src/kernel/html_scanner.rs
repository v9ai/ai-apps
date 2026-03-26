/// HTML scanner state machine states.
#[derive(Clone, Copy, PartialEq)]
enum HtmlState {
    Text,
    TagOpen,
    TagName,
    InsideTag,
    Script,
    Style,
    Comment,
    ClosingTag,
}

/// Scan HTML and extract visible text + email addresses in a single pass.
/// Zero heap allocations — all output written into caller-provided buffers.
///
/// Returns `(text_len, email_count)`.
///
/// - `text_buf`: output buffer for visible text (whitespace-collapsed)
/// - `emails`: output buffer for discovered email addresses
/// - `max_emails`: maximum number of emails to extract
pub fn scan_html(
    html: &[u8],
    text_buf: &mut [u8],
    emails: &mut [[u8; 128]],
    max_emails: usize,
) -> (usize, usize) {
    let mut state = HtmlState::Text;
    let mut text_pos = 0usize;
    let mut email_count = 0usize;
    let mut tag_name_buf = [0u8; 32];
    let mut tag_name_len = 0usize;
    let mut last_was_space = true;

    // Email extraction state
    let mut email_buf = [0u8; 128];
    let mut email_pos = 0usize;
    let mut in_potential_email = false;

    let mut i = 0;
    while i < html.len() {
        let b = html[i];

        match state {
            HtmlState::Text => {
                match b {
                    b'<' => {
                        state = HtmlState::TagOpen;
                        tag_name_len = 0;

                        // Finalize any in-progress email
                        if in_potential_email && email_pos > 3 {
                            if is_valid_email_fast(&email_buf[..email_pos])
                                && email_count < max_emails {
                                    emails[email_count][..email_pos]
                                        .copy_from_slice(&email_buf[..email_pos]);
                                    if email_pos < 128 {
                                        emails[email_count][email_pos] = 0;
                                    }
                                    email_count += 1;
                                }
                            email_pos = 0;
                            in_potential_email = false;
                        }
                    }
                    b'@' => {
                        // Potential email — scan backward for local part
                        if !in_potential_email && text_pos > 0 {
                            let mut start = text_pos;
                            while start > 0 {
                                let c = text_buf[start - 1];
                                if is_email_char(c) {
                                    start -= 1;
                                } else {
                                    break;
                                }
                            }
                            let local_len = text_pos - start;
                            if local_len > 0 && local_len < 64 {
                                email_buf[..local_len]
                                    .copy_from_slice(&text_buf[start..text_pos]);
                                email_pos = local_len;
                                email_buf[email_pos] = b'@';
                                email_pos += 1;
                                in_potential_email = true;
                            }
                        }
                        if text_pos < text_buf.len() {
                            text_buf[text_pos] = b;
                            text_pos += 1;
                        }
                        last_was_space = false;
                    }
                    _ => {
                        if in_potential_email {
                            if is_email_char(b) || b == b'.' || b == b'-' {
                                if email_pos < 127 {
                                    email_buf[email_pos] = b.to_ascii_lowercase();
                                    email_pos += 1;
                                }
                            } else {
                                // End of potential email
                                if is_valid_email_fast(&email_buf[..email_pos])
                                    && email_count < max_emails {
                                        emails[email_count][..email_pos]
                                            .copy_from_slice(&email_buf[..email_pos]);
                                        if email_pos < 128 {
                                            emails[email_count][email_pos] = 0;
                                        }
                                        email_count += 1;
                                    }
                                email_pos = 0;
                                in_potential_email = false;
                            }
                        }

                        let is_ws =
                            b == b' ' || b == b'\n' || b == b'\r' || b == b'\t';
                        if is_ws {
                            if !last_was_space && text_pos < text_buf.len() {
                                text_buf[text_pos] = b' ';
                                text_pos += 1;
                                last_was_space = true;
                            }
                        } else if text_pos < text_buf.len() {
                            text_buf[text_pos] = b;
                            text_pos += 1;
                            last_was_space = false;
                        }
                    }
                }
            }

            HtmlState::TagOpen => {
                if b == b'!' {
                    if i + 2 < html.len() && html[i + 1] == b'-' && html[i + 2] == b'-' {
                        state = HtmlState::Comment;
                        i += 2;
                    } else {
                        state = HtmlState::InsideTag;
                    }
                } else if b == b'/' {
                    state = HtmlState::ClosingTag;
                    tag_name_len = 0;
                } else if b.is_ascii_alphabetic() {
                    tag_name_buf[0] = b.to_ascii_lowercase();
                    tag_name_len = 1;
                    state = HtmlState::TagName;
                } else {
                    state = HtmlState::Text;
                }
            }

            HtmlState::TagName => {
                if b == b'>'
                    || b == b' '
                    || b == b'/'
                    || b == b'\t'
                    || b == b'\n'
                {
                    let name = &tag_name_buf[..tag_name_len];
                    if name == b"script" {
                        state = HtmlState::Script;
                    } else if name == b"style" {
                        state = HtmlState::Style;
                    } else if b == b'>' {
                        state = HtmlState::Text;
                    } else {
                        state = HtmlState::InsideTag;
                    }
                } else if tag_name_len < 31 {
                    tag_name_buf[tag_name_len] = b.to_ascii_lowercase();
                    tag_name_len += 1;
                }
            }

            HtmlState::InsideTag => {
                if b == b'>' {
                    state = HtmlState::Text;
                }
            }

            HtmlState::ClosingTag => {
                if b == b'>' {
                    state = HtmlState::Text;
                } else if b.is_ascii_alphabetic() && tag_name_len < 31 {
                    tag_name_buf[tag_name_len] = b.to_ascii_lowercase();
                    tag_name_len += 1;
                }
            }

            HtmlState::Script => {
                if b == b'<' && i + 8 < html.len() {
                    let window = &html[i..i + 9];
                    if window.eq_ignore_ascii_case(b"</script>") {
                        i += 8;
                        state = HtmlState::Text;
                    }
                }
            }

            HtmlState::Style => {
                if b == b'<' && i + 7 < html.len() {
                    let window = &html[i..i + 8];
                    if window.eq_ignore_ascii_case(b"</style>") {
                        i += 7;
                        state = HtmlState::Text;
                    }
                }
            }

            HtmlState::Comment => {
                if b == b'-'
                    && i + 2 < html.len()
                    && html[i + 1] == b'-'
                    && html[i + 2] == b'>'
                {
                    i += 2;
                    state = HtmlState::Text;
                }
            }
        }

        i += 1;
    }

    // Finalize trailing email
    if in_potential_email && email_pos > 3
        && is_valid_email_fast(&email_buf[..email_pos]) && email_count < max_emails {
            emails[email_count][..email_pos].copy_from_slice(&email_buf[..email_pos]);
            if email_pos < 128 {
                emails[email_count][email_pos] = 0;
            }
            email_count += 1;
        }

    (text_pos, email_count)
}

#[inline(always)]
fn is_email_char(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'.' || b == b'_' || b == b'-' || b == b'+' || b == b'%'
}

/// Fast email validation — no regex, pure byte scanning.
fn is_valid_email_fast(email: &[u8]) -> bool {
    if email.len() < 5 || email.len() > 127 {
        return false;
    }

    let at_pos = match email.iter().position(|&b| b == b'@') {
        Some(p) => p,
        None => return false,
    };

    // Local part: at least 1 char
    if at_pos == 0 {
        return false;
    }

    // Domain part: at least 3 chars (a.b)
    let domain = &email[at_pos + 1..];
    if domain.len() < 3 {
        return false;
    }

    // Domain must not start or end with a dot
    if domain[0] == b'.' || domain[domain.len() - 1] == b'.' {
        return false;
    }

    // Must have at least one dot in domain
    if !domain.contains(&b'.') {
        return false;
    }

    // Last part (TLD) must be at least 2 chars
    let last_dot = domain.iter().rposition(|&b| b == b'.').unwrap();
    if domain.len() - last_dot - 1 < 2 {
        return false;
    }

    // No consecutive dots
    for w in email.windows(2) {
        if w[0] == b'.' && w[1] == b'.' {
            return false;
        }
    }

    // No dot at start/end of local part
    if email[0] == b'.' || email[at_pos - 1] == b'.' {
        return false;
    }

    true
}

/// Helper: extract a null-terminated string from an email buffer slot.
pub fn email_to_str(slot: &[u8; 128]) -> &str {
    let end = slot.iter().position(|&b| b == 0).unwrap_or(128);
    std::str::from_utf8(&slot[..end]).unwrap_or("")
}

/// Structured scan result with heap-allocated output.
pub struct ScanResult {
    pub text: String,
    pub emails: Vec<String>,
}

/// High-level scan: extracts text + emails (both inline and `mailto:` links).
/// Allocates output on the heap for convenience.
pub fn scan_html_full(html: &[u8]) -> ScanResult {
    let mut text_buf = vec![0u8; html.len().max(4096)];
    let mut email_slots = [[0u8; 128]; 64];

    let (text_len, email_count) = scan_html(html, &mut text_buf, &mut email_slots, 64);

    let text = std::str::from_utf8(&text_buf[..text_len])
        .unwrap_or("")
        .to_string();

    let mut emails: Vec<String> = (0..email_count)
        .map(|i| email_to_str(&email_slots[i]).to_string())
        .collect();

    // Also extract mailto: links
    extract_mailto_emails(html, &mut emails);

    // Deduplicate
    emails.sort();
    emails.dedup();

    ScanResult { text, emails }
}

/// Extract emails from `mailto:` links in HTML.
/// Scans for `mailto:` (case-insensitive) and extracts until `"`, `'`, `>`, `?`, or whitespace.
fn extract_mailto_emails(html: &[u8], emails: &mut Vec<String>) {
    let mailto = b"mailto:";
    let mut i = 0;

    while i + mailto.len() < html.len() {
        // Find "mailto:" (case-insensitive)
        if html[i..i + mailto.len()].eq_ignore_ascii_case(mailto) {
            i += mailto.len();

            // Extract email until delimiter
            let start = i;
            while i < html.len() {
                let b = html[i];
                if b == b'"' || b == b'\'' || b == b'>' || b == b'?' || b == b' '
                    || b == b'\n' || b == b'\r' || b == b'&'
                {
                    break;
                }
                i += 1;
            }

            let email_bytes = &html[start..i];
            if is_valid_email_fast(email_bytes) {
                if let Ok(s) = std::str::from_utf8(email_bytes) {
                    emails.push(s.to_lowercase());
                }
            }
        } else {
            i += 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_text_extraction() {
        let html = b"<html><body><h1>Hello</h1><p>World</p></body></html>";
        let mut text = [0u8; 4096];
        let mut emails = [[0u8; 128]; 32];
        let (tlen, ecount) = scan_html(html, &mut text, &mut emails, 32);

        let text_str = std::str::from_utf8(&text[..tlen]).unwrap();
        assert!(text_str.contains("Hello"));
        assert!(text_str.contains("World"));
        assert_eq!(ecount, 0);
    }

    #[test]
    fn test_script_and_style_skip() {
        let html = b"<html><head><style>body{color:red}</style></head><body>\
                     <script>var x = 'skip';</script><p>Visible</p></body></html>";
        let mut text = [0u8; 4096];
        let mut emails = [[0u8; 128]; 32];
        let (tlen, _) = scan_html(html, &mut text, &mut emails, 32);

        let text_str = std::str::from_utf8(&text[..tlen]).unwrap();
        assert!(text_str.contains("Visible"));
        assert!(!text_str.contains("skip"));
        assert!(!text_str.contains("color:red"));
    }

    #[test]
    fn test_email_extraction() {
        let html = b"<p>Contact us at info@acme.com or sales@acme.com</p>";
        let mut text = [0u8; 4096];
        let mut emails = [[0u8; 128]; 32];
        let (_, ecount) = scan_html(html, &mut text, &mut emails, 32);

        assert_eq!(ecount, 2);

        let e0 = email_to_str(&emails[0]);
        let e1 = email_to_str(&emails[1]);
        assert!(e0 == "info@acme.com" || e1 == "info@acme.com");
        assert!(e0 == "sales@acme.com" || e1 == "sales@acme.com");
    }

    #[test]
    fn test_comment_skip() {
        let html = b"<p>Before</p><!-- hidden@email.com --><p>After</p>";
        let mut text = [0u8; 4096];
        let mut emails = [[0u8; 128]; 32];
        let (tlen, ecount) = scan_html(html, &mut text, &mut emails, 32);

        let text_str = std::str::from_utf8(&text[..tlen]).unwrap();
        assert!(text_str.contains("Before"));
        assert!(text_str.contains("After"));
        assert!(!text_str.contains("hidden"));
        assert_eq!(ecount, 0);
    }

    #[test]
    fn test_whitespace_collapse() {
        let html = b"<p>  hello    world  \n\t  end  </p>";
        let mut text = [0u8; 4096];
        let mut emails = [[0u8; 128]; 32];
        let (tlen, _) = scan_html(html, &mut text, &mut emails, 32);

        let text_str = std::str::from_utf8(&text[..tlen]).unwrap();
        // Should not have consecutive spaces
        assert!(!text_str.contains("  "));
    }

    #[test]
    fn test_email_validation() {
        assert!(is_valid_email_fast(b"user@example.com"));
        assert!(is_valid_email_fast(b"a.b@c.de"));
        assert!(!is_valid_email_fast(b"@example.com"));      // no local
        assert!(!is_valid_email_fast(b"user@com"));           // no dot in domain
        assert!(!is_valid_email_fast(b"user@.com"));          // dot at domain start
        assert!(!is_valid_email_fast(b"user@example.c"));     // TLD too short
        assert!(!is_valid_email_fast(b".user@example.com"));  // dot at local start
        assert!(!is_valid_email_fast(b"user.@example.com"));  // dot at local end
        assert!(!is_valid_email_fast(b"u..r@example.com"));   // consecutive dots
    }

    #[test]
    fn test_max_emails_limit() {
        let html = b"<p>a@b.com c@d.com e@f.com g@h.com</p>";
        let mut text = [0u8; 4096];
        let mut emails = [[0u8; 128]; 2]; // only 2 slots
        let (_, ecount) = scan_html(html, &mut text, &mut emails, 2);

        assert_eq!(ecount, 2); // capped at max
    }

    #[test]
    fn test_complex_html() {
        let html = br#"
            <html><head><title>Test</title><style>body{color:red}</style></head>
            <body>
            <script>var x = "don't extract this";</script>
            <h1>Acme Corp</h1>
            <p>Contact us at info@acme.com or sales@acme.com</p>
            <p>CEO: John Smith</p>
            <!-- comment with hidden@email.com -->
            <footer>Support: help@acme.com</footer>
            </body></html>
        "#;

        let mut text = [0u8; 4096];
        let mut emails = [[0u8; 128]; 32];
        let (tlen, ecount) = scan_html(html, &mut text, &mut emails, 32);

        let text_str = std::str::from_utf8(&text[..tlen]).unwrap();
        assert!(text_str.contains("Acme Corp"));
        assert!(text_str.contains("John Smith"));
        assert!(!text_str.contains("don't extract"));
        assert!(!text_str.contains("color:red"));

        assert!(ecount >= 2); // at least info@ and sales@
    }

    #[test]
    fn test_empty_input() {
        let mut text = [0u8; 4096];
        let mut emails = [[0u8; 128]; 32];
        let (tlen, ecount) = scan_html(b"", &mut text, &mut emails, 32);
        assert_eq!(tlen, 0);
        assert_eq!(ecount, 0);
    }

    #[test]
    fn test_mailto_extraction() {
        let html = br#"<a href="mailto:cto@acme.com">Email CTO</a>
                       <a href="MAILTO:hr@acme.com?subject=Hi">Contact HR</a>"#;
        let result = scan_html_full(html);
        assert!(result.emails.contains(&"cto@acme.com".to_string()));
        assert!(result.emails.contains(&"hr@acme.com".to_string()));
    }

    #[test]
    fn test_scan_html_full_dedup() {
        let html = b"<p>info@acme.com</p><a href=\"mailto:info@acme.com\">mail</a>";
        let result = scan_html_full(html);
        // Should be deduplicated
        let info_count = result.emails.iter().filter(|e| *e == "info@acme.com").count();
        assert_eq!(info_count, 1);
    }

    #[test]
    fn test_scan_result_struct() {
        let html = b"<h1>Company</h1><p>Contact: hello@world.com</p>";
        let result = scan_html_full(html);
        assert!(result.text.contains("Company"));
        assert!(result.emails.contains(&"hello@world.com".to_string()));
    }
}
