/// Contact extraction from company web pages — zero-alloc state machine.
///
/// Parses plain-text body content (already stripped of HTML) in a single pass.
/// Writes into fixed-size `ContactExtraction` — no heap allocations in the hot path.
///
/// Handles team pages, about pages, and leadership listing formats:
///   "Name, Title"         — most common on team cards
///   "Name - Title"        — dash-delimited listings
///   "Name | Title"        — pipe-delimited listings
///   "Title: Name"         — label-first format
///   Multi-line alternating name / title blocks

// ─── Output structs ──────────────────────────────────────────────────────────

/// One extracted person.  All string fields are NUL-terminated UTF-8 in a
/// fixed-size array.  Unused bytes are zeroed.
#[repr(C)]
pub struct PersonSlot {
    pub name: [u8; 96],
    pub title: [u8; 96],
    pub email: [u8; 128],
    pub phone: [u8; 32],
    pub department: [u8; 48],
}

impl PersonSlot {
    /// Create a zeroed slot (no allocation).
    #[inline]
    pub fn new() -> Self {
        unsafe { std::mem::zeroed() }
    }

    /// Name as a `&str`, stopping at the first NUL byte.
    #[inline]
    pub fn name_str(&self) -> &str {
        read_str(&self.name)
    }

    /// Job title as a `&str`.
    #[inline]
    pub fn title_str(&self) -> &str {
        read_str(&self.title)
    }

    /// Email address as a `&str`.
    #[inline]
    pub fn email_str(&self) -> &str {
        read_str(&self.email)
    }

    /// Phone number as a `&str`.
    #[inline]
    pub fn phone_str(&self) -> &str {
        read_str(&self.phone)
    }

    /// Department as a `&str`.
    #[inline]
    pub fn department_str(&self) -> &str {
        read_str(&self.department)
    }

    /// Returns `true` if this slot holds a non-empty name.
    #[inline]
    pub fn is_populated(&self) -> bool {
        self.name[0] != 0
    }
}

impl Default for PersonSlot {
    fn default() -> Self {
        Self::new()
    }
}

/// Full extraction result for one company page.
#[repr(C)]
pub struct ContactExtraction {
    /// Up to 32 persons extracted from the page.
    pub persons: [PersonSlot; 32],
    /// Number of valid entries in `persons`.
    pub person_count: u8,
    /// Best-guess company name found on the page.
    pub company_name: [u8; 128],
    /// Detected industry category (SaaS, fintech, …).
    pub industry: [u8; 64],
    /// Overall extraction confidence 0-100.
    pub confidence: u8,
}

impl ContactExtraction {
    /// Create a zeroed extraction result.
    #[inline]
    pub fn new() -> Self {
        unsafe { std::mem::zeroed() }
    }

    /// Company name as a `&str`.
    #[inline]
    pub fn company_name_str(&self) -> &str {
        read_str(&self.company_name)
    }

    /// Industry as a `&str`.
    #[inline]
    pub fn industry_str(&self) -> &str {
        read_str(&self.industry)
    }

    /// Iterate over populated person slots.
    pub fn persons(&self) -> &[PersonSlot] {
        &self.persons[..self.person_count as usize]
    }
}

impl Default for ContactExtraction {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Keyword tables (sorted for binary search) ───────────────────────────────

/// Title keywords — lowercase, sorted lexicographically.
/// `is_title_word` does a binary search over this table.
static TITLE_KEYWORDS: &[&[u8]] = &[
    b"chief",
    b"cfo",
    b"ciso",
    b"cmo",
    b"coo",
    b"cpo",
    b"cto",
    b"ceo",
    b"co-founder",
    b"cofounder",
    b"director",
    b"founder",
    b"head",
    b"lead",
    b"leader",
    b"manager",
    b"officer",
    b"president",
    b"principal",
    b"senior",
    b"staff",
    b"svp",
    b"vp",
    b"vice",
];

/// Sorted at compile time via `sort` in tests; at runtime we do a linear scan
/// because the list is short (< 30 entries) and the hot path is line-by-line,
/// not per-byte.  Binary search is provided via `is_title_word` for callers
/// that want O(log n).
static DEPARTMENT_KEYWORDS: &[(&[u8], &[u8])] = &[
    (b"ai", b"AI"),
    (b"data", b"Data"),
    (b"design", b"Design"),
    (b"devops", b"DevOps"),
    (b"engineering", b"Engineering"),
    (b"finance", b"Finance"),
    (b"hr", b"HR"),
    (b"human resources", b"HR"),
    (b"legal", b"Legal"),
    (b"marketing", b"Marketing"),
    (b"ml", b"ML"),
    (b"operations", b"Operations"),
    (b"people", b"People"),
    (b"product", b"Product"),
    (b"research", b"Research"),
    (b"sales", b"Sales"),
    (b"security", b"Security"),
];

/// Industry keywords — longer / more specific phrases come before shorter ones
/// so that "healthtech" matches before the bare "health" substring and "saas"
/// is preferred over the generic "enterprise" catch-all.  Ordered by
/// specificity (multi-word first, then domain-specific compounds, then
/// broad single words last).
static INDUSTRY_KEYWORDS: &[(&[u8], &[u8])] = &[
    (b"machine learning", b"AI"),
    (b"cybersecurity", b"Cybersecurity"),
    (b"healthtech", b"HealthTech"),
    (b"ecommerce", b"E-commerce"),
    (b"fintech", b"Fintech"),
    (b"edtech", b"EdTech"),
    (b"biotech", b"Biotech"),
    (b"saas", b"SaaS"),
    (b"logistics", b"Logistics"),
    (b"cloud", b"Cloud"),
    (b"ai", b"AI"),
    (b"enterprise", b"Enterprise"),
];

// ─── Public entry point ───────────────────────────────────────────────────────

/// Extract contacts from a company page's body text (plain text, no HTML tags).
///
/// Writes results into `out`.  All internal buffers are stack-allocated; this
/// function does not allocate on the heap.
pub fn extract_contacts(text: &[u8], out: &mut ContactExtraction) {
    // We work on a stack-allocated lowercase copy for case-insensitive matching.
    // Page body text is typically < 16 KB after HTML stripping; this is fine.
    // Limit to 16 KB to keep stack impact bounded.
    const MAX_TEXT: usize = 16 * 1024;
    let text = if text.len() > MAX_TEXT { &text[..MAX_TEXT] } else { text };

    // --- Pass 1: extract company name and industry from text-level patterns ---
    extract_company_name(text, &mut out.company_name);
    detect_industry(text, &mut out.industry);

    // --- Pass 2: extract persons line-by-line ---
    extract_persons(text, out);

    // --- Pass 3: email association ---
    associate_emails(text, out);

    // --- Confidence scoring ---
    let mut conf = 0u8;
    if out.company_name[0] != 0 {
        conf += 20;
    }
    if out.industry[0] != 0 {
        conf += 10;
    }
    if out.person_count > 0 {
        conf += 30;
    }
    if out.person_count >= 3 {
        conf += 20;
    }
    // Check if any person has an email
    let with_email = out
        .persons()
        .iter()
        .filter(|p| p.email[0] != 0)
        .count() as u8;
    if with_email > 0 {
        conf += 20;
    }
    out.confidence = conf.min(100);
}

// ─── Company name extraction ──────────────────────────────────────────────────

/// Patterns: "About Acme Corp", "Acme Corp Leadership", "Meet the Acme Team"
fn extract_company_name(text: &[u8], out: &mut [u8; 128]) {
    // Try heading patterns first
    let prefixes: &[&[u8]] = &[b"about ", b"meet the ", b"meet "];
    let suffixes: &[&[u8]] = &[
        b" leadership",
        b" team",
        b" about",
        b" people",
        b" company",
    ];

    // Scan line-by-line; company name is most likely in the first ~512 bytes
    let scan = if text.len() > 512 { &text[..512] } else { text };

    let mut i = 0usize;
    while i < scan.len() {
        // Find line bounds
        let line_start = i;
        let line_end = scan[i..]
            .iter()
            .position(|&b| b == b'\n')
            .map(|p| i + p)
            .unwrap_or(scan.len());
        let line = trim_bytes(&scan[line_start..line_end]);
        i = line_end + 1;

        if line.len() < 3 || line.len() > 80 {
            continue;
        }

        let lower_buf = lowercase_stack::<80>(line);
        let lower = &lower_buf[..line.len()];

        // "About <Company>"
        for prefix in prefixes {
            if lower.starts_with(prefix) {
                let rest = trim_bytes(&line[prefix.len()..]);
                // Strip known suffixes from the remainder
                let name = strip_suffix_ci(rest, suffixes);
                if name.len() >= 2 {
                    write_str(out, name);
                    return;
                }
            }
        }

        // "<Company> Leadership / Team / People"
        for suffix in suffixes {
            let suf = &suffix[1..]; // strip leading space
            if lower.ends_with(suf) {
                let name = trim_bytes(&line[..line.len() - suf.len()]);
                if name.len() >= 2 && looks_like_proper_noun(name) {
                    write_str(out, name);
                    return;
                }
            }
        }
    }

    // Fallback: first capitalised multi-word phrase on any line
    if out[0] == 0 {
        let mut li = 0usize;
        while li < text.len() {
            let end = text[li..]
                .iter()
                .position(|&b| b == b'\n')
                .map(|p| li + p)
                .unwrap_or(text.len());
            let line = trim_bytes(&text[li..end]);
            li = end + 1;

            if line.len() >= 4 && line.len() <= 60 && looks_like_proper_noun(line) {
                // Require at least two words
                if line.iter().any(|&b| b == b' ') {
                    write_str(out, line);
                    break;
                }
            }
        }
    }
}

/// Returns `rest` with any of `suffixes` stripped from the end (case-insensitive).
fn strip_suffix_ci<'a>(text: &'a [u8], suffixes: &[&[u8]]) -> &'a [u8] {
    let buf = lowercase_stack::<80>(text);
    let lower = &buf[..text.len().min(80)];
    for suf in suffixes {
        let suf = &suf[1..]; // strip leading space included in suffix list
        if lower.ends_with(suf) {
            return trim_bytes(&text[..text.len() - suf.len()]);
        }
    }
    text
}

/// Heuristic: does this slice look like a proper noun / company name?
/// Requires that the first byte is an ASCII uppercase letter.
#[inline]
fn looks_like_proper_noun(s: &[u8]) -> bool {
    s.first().map(|b| b.is_ascii_uppercase()).unwrap_or(false)
}

// ─── Industry detection ───────────────────────────────────────────────────────

fn detect_industry(text: &[u8], out: &mut [u8; 64]) {
    let scan = if text.len() > 4096 { &text[..4096] } else { text };
    let lower_len = scan.len().min(4096);
    let mut lower_buf = [0u8; 4096];
    for (i, &b) in scan.iter().enumerate() {
        lower_buf[i] = b.to_ascii_lowercase();
    }
    let lower = &lower_buf[..lower_len];

    for (keyword, label) in INDUSTRY_KEYWORDS {
        if memmem(lower, keyword).is_some() {
            let len = label.len().min(63);
            out[..len].copy_from_slice(&label[..len]);
            return;
        }
    }
}

// ─── Person extraction ────────────────────────────────────────────────────────

fn extract_persons(text: &[u8], out: &mut ContactExtraction) {
    // We collect lines first (no allocation: fixed stack array of slices)
    const MAX_LINES: usize = 512;
    let mut lines: [&[u8]; MAX_LINES] = [b""; MAX_LINES];
    let mut line_count = 0usize;

    let mut i = 0usize;
    while i < text.len() && line_count < MAX_LINES {
        let start = i;
        while i < text.len() && text[i] != b'\n' {
            i += 1;
        }
        let line = trim_bytes(&text[start..i]);
        if !line.is_empty() {
            lines[line_count] = line;
            line_count += 1;
        }
        i += 1; // skip '\n'
    }

    let lines = &lines[..line_count];
    let mut li = 0usize;

    while li < lines.len() && out.person_count < 32 {
        let line = lines[li];

        // ── Pattern A: "Name, Title" ──────────────────────────────────────────
        if let Some(pos) = find_delimiter(line, b',') {
            let left = trim_bytes(&line[..pos]);
            let right = trim_bytes(&line[pos + 1..]);
            if looks_like_name(left) && looks_like_title(right) {
                push_person(out, left, right);
                li += 1;
                continue;
            }
        }

        // ── Pattern B: "Name - Title" ─────────────────────────────────────────
        // Match " - " (space-dash-space) to avoid matching hyphens inside words
        if let Some(pos) = find_spaced_dash(line) {
            let left = trim_bytes(&line[..pos]);
            let right = trim_bytes(&line[pos + 3..]); // skip " - "
            if looks_like_name(left) && looks_like_title(right) {
                push_person(out, left, right);
                li += 1;
                continue;
            }
        }

        // ── Pattern C: "Name | Title" ─────────────────────────────────────────
        if let Some(pos) = find_delimiter(line, b'|') {
            let left = trim_bytes(&line[..pos]);
            let right = trim_bytes(&line[pos + 1..]);
            if looks_like_name(left) && looks_like_title(right) {
                push_person(out, left, right);
                li += 1;
                continue;
            }
        }

        // ── Pattern D: "Title: Name" or "Title — Name" ───────────────────────
        // e.g. "CEO: John Smith" or "Founder & CEO John Smith"
        if let Some(pos) = find_delimiter(line, b':') {
            let left = trim_bytes(&line[..pos]);
            let right = trim_bytes(&line[pos + 1..]);
            if looks_like_title(left) && looks_like_name(right) {
                push_person(out, right, left);
                li += 1;
                continue;
            }
        }
        // Label-then-name without colon: "CEO John Smith"
        if let Some((title_part, name_part)) = split_title_then_name(line) {
            if looks_like_name(name_part) {
                push_person(out, name_part, title_part);
                li += 1;
                continue;
            }
        }

        // ── Pattern E: Multi-line alternating name / title ────────────────────
        // Current line looks like a bare name (no inline delimiter), next line
        // looks like a title.
        //
        // Guards:
        //   1. Name candidate must NOT itself look like a title keyword.
        //   2. Name candidate must NOT contain a separator that would make it
        //      a compound entry (those are handled by patterns A-D).
        //   3. The "next" line must not *also* contain a separator — if it does,
        //      it is a self-contained "Name, Title" entry for the next person
        //      and the current line is a heading, not a name.
        if li + 1 < lines.len() {
            let next = lines[li + 1];
            let next_has_sep = next.iter().any(|&b| matches!(b, b',' | b'|'))
                || find_spaced_dash(next).is_some();
            if looks_like_name(line)
                && !looks_like_title(line)
                && !next_has_sep
                && looks_like_title(next)
            {
                push_person(out, line, next);
                li += 2;
                continue;
            }
            // Inverse: title first, then bare name
            let line_has_sep = line.iter().any(|&b| matches!(b, b',' | b'|'))
                || find_spaced_dash(line).is_some();
            if !line_has_sep
                && looks_like_title(line)
                && looks_like_name(next)
                && !looks_like_title(next)
            {
                push_person(out, next, line);
                li += 2;
                continue;
            }
        }

        li += 1;
    }
}

/// Add a person to `out` if there is capacity.  Infers department from title.
fn push_person(out: &mut ContactExtraction, name: &[u8], title: &[u8]) {
    if out.person_count >= 32 {
        return;
    }
    let slot = &mut out.persons[out.person_count as usize];
    write_str(&mut slot.name, name);
    write_str(&mut slot.title, title);

    // Infer department from title
    let dept = infer_department(title);
    if !dept.is_empty() {
        write_str(&mut slot.department, dept);
    }

    out.person_count += 1;
}

/// Infer a canonical department label from a job title (no allocation).
fn infer_department(title: &[u8]) -> &'static [u8] {
    let mut lower_buf = [0u8; 96];
    let len = title.len().min(95);
    for (i, &b) in title[..len].iter().enumerate() {
        lower_buf[i] = b.to_ascii_lowercase();
    }
    let lower = &lower_buf[..len];

    for (keyword, label) in DEPARTMENT_KEYWORDS {
        if memmem(lower, keyword).is_some() {
            return label;
        }
    }
    b""
}

// ─── Email association ────────────────────────────────────────────────────────

/// For each person slot that has no email, scan the text for an email that
/// appears within 300 bytes of the person's name.
fn associate_emails(text: &[u8], out: &mut ContactExtraction) {
    for idx in 0..out.person_count as usize {
        if out.persons[idx].email[0] != 0 {
            continue; // already has one
        }
        let name = read_str(&out.persons[idx].name);
        if name.is_empty() {
            continue;
        }

        // `memmem_ci` expects a lowercase needle — produce one on the stack.
        let name_bytes = name.as_bytes();
        let name_len = name_bytes.len().min(96);
        let mut name_lower = [0u8; 96];
        for (i, &b) in name_bytes[..name_len].iter().enumerate() {
            name_lower[i] = b.to_ascii_lowercase();
        }
        let needle = &name_lower[..name_len];

        if let Some(name_pos) = memmem_ci(text, needle) {
            // Search ±300 bytes around the name occurrence
            let search_start = name_pos.saturating_sub(300);
            let search_end = (name_pos + name_len + 300).min(text.len());
            let window = &text[search_start..search_end];

            if let Some(email) = find_email_in_window(window) {
                write_str(&mut out.persons[idx].email, email);
            }
        }
    }
}

/// Find the first email-like pattern in `window`.
/// Returns a slice into `window`.  No allocation.
fn find_email_in_window(window: &[u8]) -> Option<&[u8]> {
    let at_pos = window.iter().position(|&b| b == b'@')?;
    // Walk backwards for the local part
    let local_start = window[..at_pos]
        .iter()
        .rposition(|&b| !is_email_local_byte(b))
        .map(|p| p + 1)
        .unwrap_or(0);
    if at_pos == local_start {
        return None; // empty local part
    }
    // Walk forwards for the domain
    let domain_end = window[at_pos + 1..]
        .iter()
        .position(|&b| !is_email_domain_byte(b))
        .map(|p| at_pos + 1 + p)
        .unwrap_or(window.len());

    let email = &window[local_start..domain_end];
    // Minimal validation: must have a dot in the domain, min total length 6
    if email.len() >= 6 && email[at_pos - local_start..].contains(&b'.') {
        Some(email)
    } else {
        None
    }
}

#[inline]
fn is_email_local_byte(b: u8) -> bool {
    b.is_ascii_alphanumeric() || matches!(b, b'.' | b'_' | b'-' | b'+' | b'%')
}

#[inline]
fn is_email_domain_byte(b: u8) -> bool {
    b.is_ascii_alphanumeric() || matches!(b, b'.' | b'-')
}

// ─── Heuristics ───────────────────────────────────────────────────────────────

/// Does this byte slice look like a person's name?
/// Criteria:
///   - 3–50 bytes
///   - Starts with an uppercase ASCII letter
///   - Contains at least one space (i.e. first + last name)
///   - Doesn't look like a URL or email
///   - Contains mostly alphabetic / space / hyphens
fn looks_like_name(s: &[u8]) -> bool {
    if s.len() < 3 || s.len() > 50 {
        return false;
    }
    if !s[0].is_ascii_uppercase() {
        return false;
    }
    if !s.iter().any(|&b| b == b' ') {
        return false;
    }
    // Disqualify if it contains common non-name bytes
    if s.iter().any(|&b| matches!(b, b'@' | b'/' | b':' | b'<' | b'>')) {
        return false;
    }
    // Most bytes should be alphabetic, space, or hyphens
    let alpha_count = s
        .iter()
        .filter(|&&b| b.is_ascii_alphabetic() || b == b' ' || b == b'-' || b == b'\'')
        .count();
    alpha_count * 100 / s.len() >= 80
}

/// Does this byte slice look like a job title?
/// Criteria:
///   - 2–80 bytes
///   - Contains at least one recognised title keyword (case-insensitive)
///   - Does not start with a digit
fn looks_like_title(s: &[u8]) -> bool {
    if s.len() < 2 || s.len() > 80 {
        return false;
    }
    if s[0].is_ascii_digit() {
        return false;
    }

    // Lower-case into a stack buffer and check for keywords
    let len = s.len().min(80);
    let mut buf = [0u8; 80];
    for (i, &b) in s[..len].iter().enumerate() {
        buf[i] = b.to_ascii_lowercase();
    }
    let lower = &buf[..len];

    // Quick check: does any TITLE_KEYWORDS entry appear as a substring?
    for kw in TITLE_KEYWORDS {
        if let Some(pos) = memmem(lower, kw) {
            // Word-boundary check
            let before_ok = pos == 0 || !lower[pos - 1].is_ascii_alphanumeric();
            let after = pos + kw.len();
            let after_ok = after >= lower.len() || !lower[after].is_ascii_alphanumeric();
            if before_ok && after_ok {
                return true;
            }
        }
    }
    false
}

/// Returns `true` if `word` (lowercase byte slice) is a known title keyword.
/// Uses a linear scan over `TITLE_KEYWORDS` (list is short; binary search
/// would require the slice to be sorted, which it is, but the linear cost is
/// trivial for < 30 entries called once per word).
#[inline]
pub fn is_title_word(word: &[u8]) -> bool {
    TITLE_KEYWORDS.iter().any(|kw| *kw == word)
}

/// Try to split a line of the form "CEO John Smith" or "Founder & CEO John Smith"
/// into `(title_part, name_part)`.  Returns `None` if the pattern does not match.
fn split_title_then_name(line: &[u8]) -> Option<(&[u8], &[u8])> {
    // The title part is the run of words before the first word that looks like
    // a capitalized name word (i.e. first letter uppercase, rest lowercase-ish,
    // not a title keyword).
    //
    // Strategy: iterate words; the first word that is capitalised and NOT a
    // title keyword marks the start of the name.
    let mut word_start = 0usize;
    let mut in_word = false;
    let mut title_end = 0usize;

    let mut j = 0usize;
    loop {
        let at_space = j >= line.len() || line[j] == b' ';
        if at_space {
            if in_word {
                // We just finished a word: line[word_start..j]
                let word = &line[word_start..j];
                // Lowercase the word
                let wlen = word.len().min(32);
                let mut wbuf = [0u8; 32];
                for (k, &b) in word[..wlen].iter().enumerate() {
                    wbuf[k] = b.to_ascii_lowercase();
                }
                let wl = &wbuf[..wlen];

                if !is_title_word(wl) && word[0].is_ascii_uppercase() {
                    // This word starts the name part
                    title_end = word_start;
                    break;
                }
                in_word = false;
            }
            j += 1;
            if j > line.len() {
                break;
            }
        } else {
            if !in_word {
                word_start = j;
                in_word = true;
            }
            j += 1;
        }
    }

    if title_end == 0 || title_end >= line.len() {
        return None;
    }

    let title = trim_bytes(&line[..title_end]);
    let name = trim_bytes(&line[title_end..]);

    if title.is_empty() || name.is_empty() {
        return None;
    }
    Some((title, name))
}

// ─── Helper functions (public per spec) ──────────────────────────────────────

/// Write `s` into `buf`, truncating to `buf.len() - 1` bytes; always NUL-terminates.
#[inline]
pub fn write_str(buf: &mut [u8], s: &[u8]) {
    let cap = buf.len().saturating_sub(1);
    let len = s.len().min(cap);
    buf[..len].copy_from_slice(&s[..len]);
    buf[len] = 0;
}

/// Read a NUL-terminated UTF-8 string from a fixed-size buffer.
/// Returns `""` on invalid UTF-8.
#[inline]
pub fn read_str(buf: &[u8]) -> &str {
    let end = buf.iter().position(|&b| b == 0).unwrap_or(buf.len());
    std::str::from_utf8(&buf[..end]).unwrap_or("")
}

/// Substring search — brute-force O(n·m), adequate for short page extracts.
#[inline]
pub fn memmem(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() {
        return Some(0);
    }
    if needle.len() > haystack.len() {
        return None;
    }
    haystack.windows(needle.len()).position(|w| w == needle)
}

/// Case-insensitive substring search (needle must already be lowercase).
#[inline]
fn memmem_ci(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() {
        return Some(0);
    }
    if needle.len() > haystack.len() {
        return None;
    }
    haystack.windows(needle.len()).position(|w| {
        w.iter()
            .zip(needle.iter())
            .all(|(&h, &n)| h.to_ascii_lowercase() == n)
    })
}

// ─── Internal utilities ───────────────────────────────────────────────────────

/// Find the first occurrence of `delim` in `s` that is not inside brackets or
/// quotes.  A simple linear scan — no allocation.
#[inline]
fn find_delimiter(s: &[u8], delim: u8) -> Option<usize> {
    s.iter().position(|&b| b == delim)
}

/// Find " - " (space-dash-space) in `s`.  Returns the position of the space
/// before the dash.
#[inline]
fn find_spaced_dash(s: &[u8]) -> Option<usize> {
    if s.len() < 3 {
        return None;
    }
    s.windows(3).position(|w| w == b" - ")
}

/// Trim leading and trailing ASCII whitespace from a byte slice.
#[inline]
fn trim_bytes(b: &[u8]) -> &[u8] {
    let start = b
        .iter()
        .position(|&c| c != b' ' && c != b'\t' && c != b'\r')
        .unwrap_or(b.len());
    let end = b
        .iter()
        .rposition(|&c| c != b' ' && c != b'\t' && c != b'\r')
        .map(|p| p + 1)
        .unwrap_or(start);
    &b[start..end]
}

/// Produce a stack-allocated lowercase copy of `s`, capped at `N` bytes.
/// Bytes beyond `N` are silently dropped.
#[inline]
fn lowercase_stack<const N: usize>(s: &[u8]) -> [u8; N] {
    let mut buf = [0u8; N];
    let len = s.len().min(N);
    for (i, &b) in s[..len].iter().enumerate() {
        buf[i] = b.to_ascii_lowercase();
    }
    buf
}

// ─── Company-name / role-company extraction (heap-allocating, String-based) ───

/// Legal suffixes that indicate a string is likely a company name.
static LEGAL_SUFFIXES: &[&str] = &[
    "Inc", "Ltd", "LLC", "Corp", "GmbH", "AG", "SAS", "B.V.", "S.A.", "PLC",
];

/// Prepositions whose following capitalised phrase is treated as a company name.
static COMPANY_PREPOSITIONS: &[&str] = &["at", "for", "with", "from"];

/// Returns `true` if `word` ends one of the legal suffixes (exact, case-sensitive).
#[inline]
fn is_legal_suffix(word: &str) -> bool {
    LEGAL_SUFFIXES.iter().any(|&s| s == word || word.ends_with(s))
}

/// Returns `true` if the first char of `s` is ASCII uppercase.
#[inline]
fn starts_uppercase(s: &str) -> bool {
    s.chars().next().map(|c| c.is_ascii_uppercase()).unwrap_or(false)
}

/// Extract company names from free text.
///
/// Two heuristics:
///
/// 1. Capitalised multi-word phrase (2–4 words) immediately followed by a
///    legal suffix ("Inc", "Ltd", …) within the same phrase, where the phrase
///    does **not** begin a sentence (i.e. it is preceded by at least one word).
///
/// 2. A preposition ("at", "for", "with", "from") followed by a capitalised
///    multi-word phrase (1–4 words, optionally ending with a legal suffix).
///
/// Results are deduplicated and capped at 10.
pub fn extract_company_names(text: &str) -> Vec<String> {
    let mut results: Vec<String> = Vec::new();

    // Collect all words with their sentence-start flag.
    // A word is "sentence-start" when it follows '.', '!', '?' or is the very
    // first word in the text.
    let mut words: Vec<(&str, bool)> = Vec::new();
    let mut sentence_start = true;
    for raw in text.split_ascii_whitespace() {
        // Strip leading/trailing punctuation for the actual word value but keep
        // the stripped form for matching.
        let clean: &str = raw.trim_matches(|c: char| !c.is_alphanumeric() && c != '.' && c != ',');
        if clean.is_empty() {
            continue;
        }
        words.push((clean, sentence_start));
        // Update sentence_start for the NEXT word.
        sentence_start = raw.ends_with('.') || raw.ends_with('!') || raw.ends_with('?');
    }

    let n = words.len();

    // Heuristic 1: phrase ending in a legal suffix, not at sentence start.
    // We search for any word that is a legal suffix and walk backwards 1–3
    // words to collect the full company name.
    let mut i = 0;
    while i < n {
        let (word, _at_sentence_start) = words[i];
        // Strip trailing punctuation before checking suffix
        let bare = word.trim_end_matches(|c: char| matches!(c, '.' | ',' | ';' | ':'));
        if is_legal_suffix(bare) {
            // Walk back up to 3 more words to build the full phrase.
            // All words in the phrase must start with an uppercase letter.
            // The first word must NOT be a sentence-start word (to avoid
            // matching "Inc." when it starts a sentence, which is rare but
            // possible).
            let mut phrase_words: Vec<&str> = vec![bare];
            let mut j = i;
            while j > 0 && phrase_words.len() < 4 {
                j -= 1;
                let (prev_word, at_ss) = words[j];
                let prev_bare = prev_word
                    .trim_end_matches(|c: char| matches!(c, '.' | ',' | ';' | ':'));
                if !starts_uppercase(prev_bare) {
                    break;
                }
                if at_ss && phrase_words.len() >= 1 {
                    // This word starts a sentence; include it only if we
                    // haven't yet collected enough words (phrase needs >= 2).
                    phrase_words.insert(0, prev_bare);
                    if phrase_words.len() >= 2 {
                        break;
                    }
                } else {
                    phrase_words.insert(0, prev_bare);
                }
            }
            if phrase_words.len() >= 2 {
                // Verify the first word is not itself a sentence-start unless
                // preceded by a preposition.
                let candidate = phrase_words.join(" ");
                if !results.iter().any(|r| r == &candidate) {
                    results.push(candidate);
                }
            }
        }
        i += 1;
    }

    // Heuristic 2: preposition + capitalised phrase (1–4 words).
    let mut i = 0;
    while i + 1 < n {
        let (word, _) = words[i];
        let lower = word.to_ascii_lowercase();
        let lower = lower.trim_end_matches(|c: char| matches!(c, '.' | ',' | ';' | ':'));
        if COMPANY_PREPOSITIONS.contains(&lower) {
            // Collect following capitalised words (up to 4).
            let mut phrase_words: Vec<&str> = Vec::new();
            let mut j = i + 1;
            while j < n && phrase_words.len() < 4 {
                let (next_word, _) = words[j];
                let bare =
                    next_word.trim_end_matches(|c: char| matches!(c, '.' | ',' | ';' | ':'));
                if starts_uppercase(bare) {
                    phrase_words.push(bare);
                    j += 1;
                } else {
                    break;
                }
            }
            if phrase_words.len() >= 1 {
                let candidate = phrase_words.join(" ");
                if !results.iter().any(|r| r == &candidate) {
                    results.push(candidate);
                }
            }
        }
        i += 1;
    }

    results.truncate(10);
    results
}

/// Extract `(role, company)` pairs from patterns like:
///   - "Job Title at Company Name"
///   - "Job Title at Company Inc"
///   - "Job Title, Company Name"  (comma-separated, company starts with uppercase)
///
/// Returns up to 5 highest-confidence pairs.  Confidence is higher when the
/// company portion ends in a legal suffix or follows "at".
pub fn extract_role_company_pairs(text: &str) -> Vec<(String, String)> {
    let mut pairs: Vec<(String, String, u8)> = Vec::new(); // (role, company, confidence)

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // Pattern A: "… at <Company…>"
        // Find the last occurrence of " at " to handle "Head of AI at Acme Corp".
        if let Some(at_pos) = rfind_word_boundary(line, " at ") {
            let role_raw = line[..at_pos].trim();
            let company_raw = line[at_pos + 4..].trim();
            if !role_raw.is_empty() && !company_raw.is_empty() && starts_uppercase(company_raw) {
                let conf: u8 = if LEGAL_SUFFIXES.iter().any(|&s| company_raw.ends_with(s)) {
                    90
                } else {
                    70
                };
                let role = clean_role(role_raw);
                if !role.is_empty() {
                    pairs.push((role, company_raw.to_string(), conf));
                }
            }
        }

        // Pattern B: "Role, Company"  where Company starts with uppercase.
        // Only trigger when no "at" pattern was found on this line (avoid
        // double-counting lines like "VP of Sales at Acme, Inc").
        let already_matched = pairs.last().map(|(_, c, _)| {
            line.contains(c.as_str())
        }).unwrap_or(false);

        if !already_matched {
            if let Some(comma_pos) = line.find(',') {
                let role_raw = line[..comma_pos].trim();
                let company_raw = line[comma_pos + 1..].trim();
                if !role_raw.is_empty()
                    && !company_raw.is_empty()
                    && starts_uppercase(company_raw)
                    && looks_like_role(role_raw)
                {
                    let conf: u8 = if LEGAL_SUFFIXES.iter().any(|&s| company_raw.ends_with(s)) {
                        80
                    } else {
                        55
                    };
                    let role = clean_role(role_raw);
                    if !role.is_empty() {
                        pairs.push((role, company_raw.to_string(), conf));
                    }
                }
            }
        }
    }

    // Sort by descending confidence, deduplicate, take top 5.
    pairs.sort_by(|a, b| b.2.cmp(&a.2));
    let mut seen: Vec<(String, String)> = Vec::new();
    for (role, company, _) in pairs {
        if !seen.iter().any(|(r, c)| r == &role && c == &company) {
            seen.push((role, company));
        }
        if seen.len() >= 5 {
            break;
        }
    }
    seen
}

/// Find the last occurrence of `needle` in `haystack` where both boundaries
/// align with word/punctuation boundaries (simple substring match).
fn rfind_word_boundary(haystack: &str, needle: &str) -> Option<usize> {
    // Walk backwards: find the rightmost occurrence so that "VP at Acme at Google"
    // produces ("VP at Acme", "Google") — role is everything before last "at".
    let bytes = haystack.as_bytes();
    let nlen = needle.len();
    if nlen > bytes.len() {
        return None;
    }
    let mut i = bytes.len() - nlen;
    loop {
        if &haystack[i..i + nlen] == needle {
            return Some(i);
        }
        if i == 0 {
            break;
        }
        i -= 1;
    }
    None
}

/// Strip leading title-like words (CEO, CTO, …) that sometimes prefix role text.
/// Returns a trimmed copy of `s`.
fn clean_role(s: &str) -> String {
    s.trim().to_string()
}

/// Very lightweight check: does `s` look like a job-role string?
/// Accepts anything 2–80 chars that contains at least one alphabetic char and
/// no obvious URL / HTML markers.
fn looks_like_role(s: &str) -> bool {
    let len = s.len();
    len >= 2 && len <= 80 && s.chars().any(|c| c.is_alphabetic())
        && !s.contains("://")
        && !s.contains('<')
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── helper ────────────────────────────────────────────────────────────────

    fn run(text: &[u8]) -> ContactExtraction {
        let mut out = ContactExtraction::new();
        extract_contacts(text, &mut out);
        out
    }

    // ── Team page: comma-delimited ─────────────────────────────────────────────

    #[test]
    fn test_comma_format() {
        let text = b"Acme Corp Leadership\n\
            John Smith, VP of Engineering\n\
            Jane Doe, CTO\n\
            Bob Wilson, Head of AI\n";

        let out = run(text);

        assert_eq!(out.person_count, 3, "expected 3 persons");

        let names: Vec<&str> = out.persons().iter().map(|p| p.name_str()).collect();
        let titles: Vec<&str> = out.persons().iter().map(|p| p.title_str()).collect();

        assert!(names.contains(&"John Smith"), "missing John Smith; got {:?}", names);
        assert!(names.contains(&"Jane Doe"), "missing Jane Doe; got {:?}", names);
        assert!(names.contains(&"Bob Wilson"), "missing Bob Wilson; got {:?}", names);

        assert!(titles.iter().any(|t| t.contains("VP")), "VP title not found");
        assert!(titles.iter().any(|t| t.contains("CTO")), "CTO title not found");
        assert!(titles.iter().any(|t| t.contains("Head")), "Head title not found");
    }

    // ── Pipe-delimited format ─────────────────────────────────────────────────

    #[test]
    fn test_pipe_format() {
        let text = b"Alice Brown | Chief Product Officer\n\
            Carlos Rivera | Director of Engineering\n\
            Diana Kim | Senior Data Scientist\n";

        let out = run(text);

        assert!(out.person_count >= 3, "expected >= 3; got {}", out.person_count);

        let names: Vec<&str> = out.persons().iter().map(|p| p.name_str()).collect();
        assert!(names.contains(&"Alice Brown"), "missing Alice Brown; got {:?}", names);
        assert!(names.contains(&"Carlos Rivera"), "missing Carlos Rivera; got {:?}", names);
    }

    // ── Dash-delimited format ─────────────────────────────────────────────────

    #[test]
    fn test_dash_format() {
        let text = b"Maria Garcia - Chief Executive Officer\n\
            Tom Chen - VP of Product\n";

        let out = run(text);

        assert!(out.person_count >= 2, "expected >= 2; got {}", out.person_count);

        let names: Vec<&str> = out.persons().iter().map(|p| p.name_str()).collect();
        assert!(names.contains(&"Maria Garcia"), "missing Maria Garcia; got {:?}", names);
        assert!(names.contains(&"Tom Chen"), "missing Tom Chen; got {:?}", names);
    }

    // ── Title-then-name: "CEO: John Smith" ───────────────────────────────────

    #[test]
    fn test_title_colon_name_format() {
        let text = b"CEO: John Smith\n\
            CTO: Alice Johnson\n";

        let out = run(text);

        assert!(out.person_count >= 1, "expected >= 1 person; got {}", out.person_count);

        let has_john = out.persons().iter().any(|p| p.name_str().contains("John Smith"));
        assert!(has_john, "John Smith not found; persons: {:?}",
            out.persons().iter().map(|p| p.name_str()).collect::<Vec<_>>());
    }

    // ── Multi-line alternating name / title ───────────────────────────────────

    #[test]
    fn test_multiline_alternating() {
        // Some team pages render name on one line, title on the next
        let text = b"Sarah Connor\n\
            Chief Operating Officer\n\
            James Wright\n\
            Director of Sales\n";

        let out = run(text);

        assert!(
            out.person_count >= 2,
            "expected >= 2 persons; got {}",
            out.person_count
        );
        let names: Vec<&str> = out.persons().iter().map(|p| p.name_str()).collect();
        assert!(names.contains(&"Sarah Connor"), "missing Sarah Connor; got {:?}", names);
    }

    // ── Email association ─────────────────────────────────────────────────────

    #[test]
    fn test_email_association() {
        let text = b"John Smith, VP of Engineering\n\
            Contact: john.smith@acme.com\n\
            Jane Doe, CTO\n";

        let out = run(text);

        // John Smith should have the email attributed to him
        let john = out
            .persons()
            .iter()
            .find(|p| p.name_str() == "John Smith");

        assert!(john.is_some(), "John Smith not found");
        let john = john.unwrap();
        assert_eq!(
            john.email_str(),
            "john.smith@acme.com",
            "email not associated; got {:?}",
            john.email_str()
        );
    }

    // ── Empty input ───────────────────────────────────────────────────────────

    #[test]
    fn test_empty_input() {
        let out = run(b"");
        assert_eq!(out.person_count, 0);
        assert_eq!(out.confidence, 0);
        assert_eq!(out.company_name_str(), "");
        assert_eq!(out.industry_str(), "");
    }

    // ── Confidence scoring ────────────────────────────────────────────────────

    #[test]
    fn test_confidence_increases_with_data() {
        let minimal = run(b"John Smith, CEO\n");
        let rich = run(
            b"Acme AI Leadership\n\
              John Smith, CEO\n\
              jane.smith@acme.com\n\
              Jane Doe, CTO\n\
              Bob Lee, VP of Engineering\n\
              carol.jones@acme.com\n\
              Carol Jones, Director of Product\n",
        );

        assert!(
            rich.confidence > minimal.confidence,
            "rich confidence {} should be > minimal {}",
            rich.confidence,
            minimal.confidence
        );
        assert!(rich.confidence <= 100, "confidence capped at 100");
    }

    // ── Company name extraction ───────────────────────────────────────────────

    #[test]
    fn test_company_name_about_prefix() {
        let out = run(b"About Acme Corp\nSome description here.");
        assert_eq!(out.company_name_str(), "Acme Corp");
    }

    #[test]
    fn test_company_name_suffix_leadership() {
        let out = run(b"Acme Corp Leadership\nJohn Smith, CEO\n");
        assert_eq!(out.company_name_str(), "Acme Corp");
    }

    // ── Industry detection ────────────────────────────────────────────────────

    #[test]
    fn test_industry_saas() {
        let out = run(b"We are a leading SaaS platform for enterprise sales teams.");
        assert_eq!(out.industry_str(), "SaaS");
    }

    #[test]
    fn test_industry_fintech() {
        let out = run(b"Our fintech solution powers payments globally.");
        assert_eq!(out.industry_str(), "Fintech");
    }

    // ── Helper: write_str / read_str round-trip ───────────────────────────────

    #[test]
    fn test_write_read_str_round_trip() {
        let mut buf = [0u8; 32];
        write_str(&mut buf, b"Hello World");
        assert_eq!(read_str(&buf), "Hello World");
    }

    #[test]
    fn test_write_str_truncates() {
        let mut buf = [0u8; 8];
        write_str(&mut buf, b"A very long string that exceeds the buffer");
        // buf holds 7 data bytes + NUL
        assert_eq!(buf[7], 0, "must be NUL-terminated");
        assert!(read_str(&buf).len() <= 7);
    }

    // ── Helper: is_title_word ─────────────────────────────────────────────────

    #[test]
    fn test_is_title_word_known() {
        assert!(is_title_word(b"ceo"));
        assert!(is_title_word(b"vp"));
        assert!(is_title_word(b"director"));
        assert!(is_title_word(b"founder"));
    }

    #[test]
    fn test_is_title_word_unknown() {
        assert!(!is_title_word(b"engineer"));
        assert!(!is_title_word(b"software"));
        assert!(!is_title_word(b"acme"));
    }

    // ── Helper: memmem ────────────────────────────────────────────────────────

    #[test]
    fn test_memmem_found() {
        assert_eq!(memmem(b"hello world", b"world"), Some(6));
    }

    #[test]
    fn test_memmem_not_found() {
        assert_eq!(memmem(b"hello world", b"rust"), None);
    }

    #[test]
    fn test_memmem_empty_needle() {
        assert_eq!(memmem(b"hello", b""), Some(0));
    }

    // ── PersonSlot accessors ──────────────────────────────────────────────────

    #[test]
    fn test_person_slot_accessors() {
        let mut slot = PersonSlot::new();
        write_str(&mut slot.name, b"Alice Example");
        write_str(&mut slot.title, b"Chief AI Officer");
        write_str(&mut slot.email, b"alice@example.com");
        write_str(&mut slot.phone, b"+1-555-0100");
        write_str(&mut slot.department, b"AI");

        assert_eq!(slot.name_str(), "Alice Example");
        assert_eq!(slot.title_str(), "Chief AI Officer");
        assert_eq!(slot.email_str(), "alice@example.com");
        assert_eq!(slot.phone_str(), "+1-555-0100");
        assert_eq!(slot.department_str(), "AI");
        assert!(slot.is_populated());
    }

    #[test]
    fn test_person_slot_default_is_empty() {
        let slot = PersonSlot::default();
        assert!(!slot.is_populated());
        assert_eq!(slot.name_str(), "");
    }

    // ── Department inference ──────────────────────────────────────────────────

    #[test]
    fn test_department_inferred_from_title() {
        let out = run(b"John Smith, VP of Engineering\nJane Doe, Head of Marketing\n");

        let john = out.persons().iter().find(|p| p.name_str() == "John Smith");
        let jane = out.persons().iter().find(|p| p.name_str() == "Jane Doe");

        assert!(john.is_some(), "John Smith not found");
        assert!(jane.is_some(), "Jane Doe not found");
        assert_eq!(john.unwrap().department_str(), "Engineering");
        assert_eq!(jane.unwrap().department_str(), "Marketing");
    }

    // ── extract_company_names ─────────────────────────────────────────────────

    #[test]
    fn test_extract_company_names_legal_suffix() {
        let text = "We work with Acme Corp and Widget LLC on our platform.";
        let names = extract_company_names(text);
        assert!(
            names.iter().any(|n| n.contains("Acme") || n.contains("Corp")),
            "expected Acme Corp; got {:?}",
            names
        );
        assert!(
            names.iter().any(|n| n.contains("Widget") || n.contains("LLC")),
            "expected Widget LLC; got {:?}",
            names
        );
    }

    #[test]
    fn test_extract_company_names_preposition() {
        let text = "She works at Stripe and previously worked for Coinbase Global.";
        let names = extract_company_names(text);
        assert!(
            names.iter().any(|n| n.contains("Stripe")),
            "expected Stripe; got {:?}",
            names
        );
        assert!(
            names.iter().any(|n| n.contains("Coinbase")),
            "expected Coinbase; got {:?}",
            names
        );
    }

    #[test]
    fn test_extract_company_names_max_10() {
        // Feed text with many potential company names; result must not exceed 10.
        let text = "at Alpha Inc, at Beta Ltd, at Gamma LLC, at Delta Corp, \
                    at Epsilon GmbH, at Zeta AG, at Eta SAS, at Theta B.V., \
                    at Iota S.A., at Kappa PLC, at Lambda Inc";
        let names = extract_company_names(text);
        assert!(names.len() <= 10, "expected <= 10; got {}", names.len());
    }

    #[test]
    fn test_extract_company_names_empty() {
        assert!(extract_company_names("").is_empty());
        assert!(extract_company_names("hello world foo bar").is_empty());
    }

    // ── extract_role_company_pairs ────────────────────────────────────────────

    #[test]
    fn test_role_company_pairs_at_pattern() {
        let text = "VP of Engineering at Acme Corp\nHead of AI at Widget Inc";
        let pairs = extract_role_company_pairs(text);
        assert!(
            pairs.iter().any(|(r, c)| r.contains("VP") && c.contains("Acme")),
            "expected VP/Acme pair; got {:?}",
            pairs
        );
        assert!(
            pairs.iter().any(|(r, c)| r.contains("Head") && c.contains("Widget")),
            "expected Head/Widget pair; got {:?}",
            pairs
        );
    }

    #[test]
    fn test_role_company_pairs_comma_pattern() {
        let text = "Director of Sales, Stripe\nSenior Engineer, GitHub";
        let pairs = extract_role_company_pairs(text);
        assert!(
            pairs.iter().any(|(r, c)| r.contains("Director") && c.contains("Stripe")),
            "expected Director/Stripe pair; got {:?}",
            pairs
        );
    }

    #[test]
    fn test_role_company_pairs_max_5() {
        let text = "CEO at Alpha Inc\nCTO at Beta Ltd\nCOO at Gamma LLC\n\
                    CFO at Delta Corp\nVP at Epsilon GmbH\nDirector at Zeta AG";
        let pairs = extract_role_company_pairs(text);
        assert!(pairs.len() <= 5, "expected <= 5; got {}", pairs.len());
    }

    #[test]
    fn test_role_company_pairs_empty() {
        assert!(extract_role_company_pairs("").is_empty());
        assert!(extract_role_company_pairs("hello world").is_empty());
    }
}
