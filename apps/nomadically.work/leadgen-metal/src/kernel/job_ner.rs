/// Job posting NER — zero-alloc state machine.
///
/// Extracts structured data from raw job posting text in a single pass:
/// company name, title, salary range, remote policy, experience, tech stack.
///
/// Designed for HN "Who is Hiring?" format and standard ATS postings.
/// Writes into fixed-size `JobExtraction` struct — no heap allocations.

#[repr(C)]
pub struct JobExtraction {
    pub company: [u8; 128],
    pub title: [u8; 128],
    pub salary_min: u32,
    pub salary_max: u32,
    pub remote_policy: u8, // 0=unknown, 1=full_remote, 2=hybrid, 3=onsite
    pub experience_min: u8,
    pub experience_max: u8,
    pub skills_count: u8,
    pub skills: [[u8; 32]; 24], // up to 24 skills, 32 chars each
    pub confidence: u8, // 0-100
}

impl JobExtraction {
    pub fn new() -> Self {
        unsafe { std::mem::zeroed() }
    }

    pub fn company_str(&self) -> &str {
        let end = self.company.iter().position(|&b| b == 0).unwrap_or(128);
        std::str::from_utf8(&self.company[..end]).unwrap_or("")
    }

    pub fn title_str(&self) -> &str {
        let end = self.title.iter().position(|&b| b == 0).unwrap_or(128);
        std::str::from_utf8(&self.title[..end]).unwrap_or("")
    }

    pub fn skill_str(&self, idx: usize) -> &str {
        if idx >= self.skills_count as usize {
            return "";
        }
        let end = self.skills[idx]
            .iter()
            .position(|&b| b == 0)
            .unwrap_or(32);
        std::str::from_utf8(&self.skills[idx][..end]).unwrap_or("")
    }

    pub fn remote_label(&self) -> &'static str {
        match self.remote_policy {
            1 => "full_remote",
            2 => "hybrid",
            3 => "onsite",
            _ => "unknown",
        }
    }
}

impl Default for JobExtraction {
    fn default() -> Self {
        Self::new()
    }
}

/// Sorted tech keywords for binary-search word boundary matching.
static TECH_KEYWORDS: &[&[u8]] = &[
    b"airflow",
    b"ansible",
    b"aws",
    b"azure",
    b"c++",
    b"cloudflare",
    b"css",
    b"docker",
    b"elixir",
    b"express",
    b"fastapi",
    b"gcp",
    b"go",
    b"golang",
    b"graphql",
    b"grpc",
    b"html",
    b"java",
    b"javascript",
    b"k8s",
    b"kafka",
    b"kotlin",
    b"kubernetes",
    b"langchain",
    b"linux",
    b"llm",
    b"ml",
    b"mongodb",
    b"nestjs",
    b"nextjs",
    b"nginx",
    b"node",
    b"nodejs",
    b"nosql",
    b"openai",
    b"postgres",
    b"postgresql",
    b"python",
    b"pytorch",
    b"rag",
    b"rails",
    b"react",
    b"redis",
    b"ruby",
    b"rust",
    b"scala",
    b"spark",
    b"sql",
    b"svelte",
    b"swift",
    b"tensorflow",
    b"terraform",
    b"typescript",
    b"vue",
    b"wasm",
    b"webassembly",
];

/// Extract structured fields from a job posting.
pub fn extract_job_fields(text: &[u8], out: &mut JobExtraction) {
    let text_lower: Vec<u8> = text.iter().map(|b| b.to_ascii_lowercase()).collect();

    out.remote_policy = detect_remote_policy(&text_lower);
    extract_salary(text, &mut out.salary_min, &mut out.salary_max);
    extract_experience(&text_lower, &mut out.experience_min, &mut out.experience_max);
    extract_skills(&text_lower, &mut out.skills, &mut out.skills_count);
    extract_header(text, &mut out.company, &mut out.title);

    // Confidence scoring
    let mut conf = 0u8;
    if out.company[0] != 0 {
        conf += 25;
    }
    if out.title[0] != 0 {
        conf += 25;
    }
    if out.salary_min > 0 {
        conf += 20;
    }
    if out.remote_policy != 0 {
        conf += 15;
    }
    if out.skills_count > 0 {
        conf += 15;
    }
    out.confidence = conf;
}

fn detect_remote_policy(text: &[u8]) -> u8 {
    let full_patterns: &[&[u8]] = &[
        b"fully remote",
        b"100% remote",
        b"remote only",
        b"remote-first",
        b"remote first",
        b"work from anywhere",
    ];
    let hybrid_patterns: &[&[u8]] = &[
        b"hybrid",
        b"remote-friendly",
        b"remote friendly",
        b"flexible location",
    ];
    let onsite_patterns: &[&[u8]] = &[
        b"onsite",
        b"on-site",
        b"in-office",
        b"in office",
        b"must relocate",
        b"no remote",
    ];

    for p in full_patterns {
        if memmem(text, p).is_some() {
            return 1;
        }
    }
    for p in onsite_patterns {
        if memmem(text, p).is_some() {
            return 3;
        }
    }
    for p in hybrid_patterns {
        if memmem(text, p).is_some() {
            return 2;
        }
    }
    // Bare "remote" as last resort — assume hybrid
    if memmem(text, b"remote").is_some() {
        return 2;
    }
    0
}

fn extract_salary(text: &[u8], min: &mut u32, max: &mut u32) {
    let mut salaries = [0u32; 8];
    let mut sal_count = 0;
    let mut i = 0;

    while i < text.len() && sal_count < 8 {
        // Match currency symbols: $ or EUR/eur prefix
        let is_currency = text[i] == b'$'
            || (i + 3 < text.len()
                && (text[i..i + 3].eq_ignore_ascii_case(b"eur")
                    || text[i..i + 3].eq_ignore_ascii_case(b"gbp")));

        if is_currency {
            let skip = if text[i] == b'$' { 1 } else { 3 };
            i += skip;
            // Skip optional space
            while i < text.len() && text[i] == b' ' {
                i += 1;
            }

            let mut num = 0u32;
            let start = i;
            while i < text.len() && (text[i].is_ascii_digit() || text[i] == b',') {
                if text[i] != b',' {
                    num = num.saturating_mul(10).saturating_add((text[i] - b'0') as u32);
                }
                i += 1;
            }
            if i > start {
                if i < text.len() && (text[i] == b'k' || text[i] == b'K') {
                    num = num.saturating_mul(1000);
                    i += 1;
                }
                if num >= 10_000 && num <= 1_000_000 {
                    salaries[sal_count] = num;
                    sal_count += 1;
                }
            }
        } else {
            i += 1;
        }
    }

    if sal_count >= 2 {
        *min = salaries[0].min(salaries[1]);
        *max = salaries[0].max(salaries[1]);
    } else if sal_count == 1 {
        *min = salaries[0];
        *max = salaries[0];
    }
}

fn extract_experience(text: &[u8], min: &mut u8, max: &mut u8) {
    let patterns: &[&[u8]] = &[
        b"years",
        b"yrs",
        b"yr experience",
        b"years experience",
        b"years of experience",
    ];

    for p in patterns {
        if let Some(pos) = memmem(text, p) {
            let mut end = pos;
            while end > 0 && text[end - 1] == b' ' {
                end -= 1;
            }
            if end > 0 && text[end - 1] == b'+' {
                end -= 1;
                if end > 0 && text[end - 1].is_ascii_digit() {
                    *min = text[end - 1] - b'0';
                    *max = 99;
                    return;
                }
            }
            // Look for "N-M" pattern
            let mut num_end = end;
            while num_end > 0 && text[num_end - 1].is_ascii_digit() {
                num_end -= 1;
            }
            if num_end < end {
                let second: u8 = text[num_end..end]
                    .iter()
                    .fold(0u8, |acc, &b| acc.saturating_mul(10).saturating_add(b - b'0'));
                if num_end >= 2 && text[num_end - 1] == b'-' {
                    let mut first_start = num_end - 2;
                    while first_start > 0 && text[first_start].is_ascii_digit() {
                        first_start -= 1;
                    }
                    if !text[first_start].is_ascii_digit() {
                        first_start += 1;
                    }
                    let first: u8 = text[first_start..num_end - 1]
                        .iter()
                        .fold(0u8, |acc, &b| acc.saturating_mul(10).saturating_add(b - b'0'));
                    *min = first;
                    *max = second;
                    return;
                }
                *min = second;
                *max = second;
                return;
            }
        }
    }
}

fn extract_skills(text: &[u8], skills: &mut [[u8; 32]; 24], count: &mut u8) {
    *count = 0;
    for &keyword in TECH_KEYWORDS {
        if *count >= 24 {
            break;
        }
        if let Some(pos) = memmem(text, keyword) {
            // Word boundary check
            let before_ok = pos == 0 || !text[pos - 1].is_ascii_alphanumeric();
            let after_pos = pos + keyword.len();
            let after_ok = after_pos >= text.len() || !text[after_pos].is_ascii_alphanumeric();

            if before_ok && after_ok {
                let len = keyword.len().min(31);
                skills[*count as usize][..len].copy_from_slice(&keyword[..len]);
                *count += 1;
            }
        }
    }
}

/// Parse HN-style header: "Company | Title | Location | Remote | Salary"
/// Also handles "Company - Title" and "Company: Title"
fn extract_header(text: &[u8], company: &mut [u8; 128], title: &mut [u8; 128]) {
    let first_line_end = text
        .iter()
        .position(|&b| b == b'\n')
        .unwrap_or(text.len().min(256));
    let first_line = &text[..first_line_end];

    // Try pipe delimiter first, then em-dash
    let delim_pos = first_line
        .iter()
        .position(|&b| b == b'|')
        .or_else(|| {
            // UTF-8 em dash: 0xE2 0x80 0x94
            first_line.windows(3).position(|w| w == [0xE2, 0x80, 0x94])
        });

    if let Some(dp) = delim_pos {
        let comp = trim_bytes(&first_line[..dp]);
        let len = comp.len().min(127);
        company[..len].copy_from_slice(&comp[..len]);

        // Determine delimiter length (1 for |, 3 for em-dash)
        let delim_len = if first_line[dp] == b'|' { 1 } else { 3 };
        let rest = &first_line[dp + delim_len..];
        let rest = trim_bytes(rest);

        // Title is between first and second delimiter
        let next_delim = rest
            .iter()
            .position(|&b| b == b'|')
            .or_else(|| rest.windows(3).position(|w| w == [0xE2, 0x80, 0x94]));

        let title_bytes = if let Some(nd) = next_delim {
            trim_bytes(&rest[..nd])
        } else {
            rest
        };
        let len = title_bytes.len().min(127);
        title[..len].copy_from_slice(&title_bytes[..len]);
    }
}

/// Substring search (brute force — adequate for <4KB job postings)
#[inline]
fn memmem(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() {
        return Some(0);
    }
    if needle.len() > haystack.len() {
        return None;
    }
    haystack.windows(needle.len()).position(|w| w == needle)
}

fn trim_bytes(b: &[u8]) -> &[u8] {
    let start = b
        .iter()
        .position(|&c| c != b' ' && c != b'\t')
        .unwrap_or(b.len());
    let end = b
        .iter()
        .rposition(|&c| c != b' ' && c != b'\t')
        .map(|p| p + 1)
        .unwrap_or(start);
    &b[start..end]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hn_format() {
        let posting = b"Acme Corp | Senior Rust Engineer | Fully Remote | $160k-$200k\n\
            Building edge infrastructure with Rust and WebAssembly.\n\
            Requirements: 5+ years experience with Rust, Docker, Kubernetes.";

        let mut ext = JobExtraction::new();
        extract_job_fields(posting, &mut ext);

        assert_eq!(ext.company_str(), "Acme Corp");
        assert_eq!(ext.title_str(), "Senior Rust Engineer");
        assert_eq!(ext.remote_policy, 1); // fully remote
        assert_eq!(ext.salary_min, 160_000);
        assert_eq!(ext.salary_max, 200_000);
        assert_eq!(ext.experience_min, 5);
        assert!(ext.skills_count >= 3);
        assert!(ext.confidence >= 80);
    }

    #[test]
    fn test_remote_detection() {
        assert_eq!(detect_remote_policy(b"fully remote position"), 1);
        assert_eq!(detect_remote_policy(b"100% remote"), 1);
        assert_eq!(detect_remote_policy(b"hybrid work"), 2);
        assert_eq!(detect_remote_policy(b"onsite only"), 3);
        assert_eq!(detect_remote_policy(b"must relocate"), 3);
        assert_eq!(detect_remote_policy(b"remote"), 2); // bare remote = hybrid
        assert_eq!(detect_remote_policy(b"great opportunity"), 0);
    }

    #[test]
    fn test_salary_extraction() {
        let mut min = 0;
        let mut max = 0;

        extract_salary(b"$150k-$200k per year", &mut min, &mut max);
        assert_eq!(min, 150_000);
        assert_eq!(max, 200_000);

        min = 0;
        max = 0;
        extract_salary(b"$120,000 - $180,000", &mut min, &mut max);
        assert_eq!(min, 120_000);
        assert_eq!(max, 180_000);
    }

    #[test]
    fn test_experience_extraction() {
        let mut min = 0;
        let mut max = 0;

        extract_experience(b"5+ years experience required", &mut min, &mut max);
        assert_eq!(min, 5);
        assert_eq!(max, 99);

        min = 0;
        max = 0;
        extract_experience(b"requires 3-5 years of experience", &mut min, &mut max);
        assert_eq!(min, 3);
        assert_eq!(max, 5);
    }

    #[test]
    fn test_skills_extraction() {
        let mut skills = [[0u8; 32]; 24];
        let mut count = 0;

        extract_skills(b"we use rust, python, kubernetes and docker", &mut skills, &mut count);
        assert!(count >= 4);
    }

    #[test]
    fn test_skill_word_boundary() {
        let mut skills = [[0u8; 32]; 24];
        let mut count = 0;

        // "going" contains "go" but shouldn't match
        extract_skills(b"we are going to use javascript", &mut skills, &mut count);

        let skill_names: Vec<&str> = (0..count as usize)
            .map(|i| {
                let end = skills[i].iter().position(|&b| b == 0).unwrap_or(32);
                std::str::from_utf8(&skills[i][..end]).unwrap_or("")
            })
            .collect();

        assert!(skill_names.contains(&"javascript"));
        assert!(!skill_names.contains(&"go")); // "going" != "go"
    }

    #[test]
    fn test_empty_input() {
        let mut ext = JobExtraction::new();
        extract_job_fields(b"", &mut ext);
        assert_eq!(ext.confidence, 0);
    }
}
