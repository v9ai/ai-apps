/// LinkedIn post NER — zero-alloc entity extraction.
///
/// Extracts structured signals from LinkedIn post text in a single pass:
/// company names, role titles, tech skills, remote policy, seniority.
///
/// Follows the `JobExtraction` pattern from `metal/src/kernel/job_ner.rs`:
/// writes into fixed-size `PostEntities` struct — no heap allocations.

use serde::{Deserialize, Serialize};

// ── Fixed-size extraction struct ─────────────────────────────────────────────

#[repr(C)]
pub struct PostEntities {
    pub companies: [[u8; 64]; 4],
    pub company_count: u8,
    pub roles: [[u8; 64]; 4],
    pub role_count: u8,
    pub tech_skills: [[u8; 32]; 16],
    pub skill_count: u8,
    pub remote_policy: u8, // 0=unknown, 1=full_remote, 2=hybrid, 3=onsite
    pub seniority: u8,     // 0=unknown, 1=junior, 2=mid, 3=senior, 4=staff, 5=principal, 6=director, 7=vp, 8=c_level
    pub confidence: u8,    // 0-100
}

impl PostEntities {
    pub fn new() -> Self {
        unsafe { std::mem::zeroed() }
    }

    pub fn company_str(&self, idx: usize) -> &str {
        if idx >= self.company_count as usize {
            return "";
        }
        let end = self.companies[idx]
            .iter()
            .position(|&b| b == 0)
            .unwrap_or(64);
        std::str::from_utf8(&self.companies[idx][..end]).unwrap_or("")
    }

    pub fn role_str(&self, idx: usize) -> &str {
        if idx >= self.role_count as usize {
            return "";
        }
        let end = self.roles[idx]
            .iter()
            .position(|&b| b == 0)
            .unwrap_or(64);
        std::str::from_utf8(&self.roles[idx][..end]).unwrap_or("")
    }

    pub fn skill_str(&self, idx: usize) -> &str {
        if idx >= self.skill_count as usize {
            return "";
        }
        let end = self.tech_skills[idx]
            .iter()
            .position(|&b| b == 0)
            .unwrap_or(32);
        std::str::from_utf8(&self.tech_skills[idx][..end]).unwrap_or("")
    }

    pub fn remote_label(&self) -> &'static str {
        match self.remote_policy {
            1 => "full_remote",
            2 => "hybrid",
            3 => "onsite",
            _ => "unknown",
        }
    }

    pub fn seniority_label(&self) -> &'static str {
        match self.seniority {
            1 => "junior",
            2 => "mid",
            3 => "senior",
            4 => "staff",
            5 => "principal",
            6 => "director",
            7 => "vp",
            8 => "c_level",
            _ => "unknown",
        }
    }

    /// Convert to serializable form.
    pub fn to_serde(&self) -> PostEntitiesSerde {
        let companies: Vec<String> = (0..self.company_count as usize)
            .map(|i| self.company_str(i).to_string())
            .collect();
        let roles: Vec<String> = (0..self.role_count as usize)
            .map(|i| self.role_str(i).to_string())
            .collect();
        let tech_skills: Vec<String> = (0..self.skill_count as usize)
            .map(|i| self.skill_str(i).to_string())
            .collect();
        PostEntitiesSerde {
            companies,
            roles,
            tech_skills,
            remote_policy: self.remote_label().to_string(),
            seniority: self.seniority_label().to_string(),
            confidence: self.confidence,
        }
    }
}

impl Default for PostEntities {
    fn default() -> Self {
        Self::new()
    }
}

// ── Serializable mirror ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostEntitiesSerde {
    pub companies: Vec<String>,
    pub roles: Vec<String>,
    pub tech_skills: Vec<String>,
    pub remote_policy: String,
    pub seniority: String,
    pub confidence: u8,
}

impl Default for PostEntitiesSerde {
    fn default() -> Self {
        Self {
            companies: Vec::new(),
            roles: Vec::new(),
            tech_skills: Vec::new(),
            remote_policy: "unknown".to_string(),
            seniority: "unknown".to_string(),
            confidence: 0,
        }
    }
}

// ── Extraction engine ────────────────────────────────────────────────────────

/// Extract structured entities from LinkedIn post text.
pub fn extract_post_entities(text: &str, out: &mut PostEntities) {
    let bytes = text.as_bytes();
    let lower: Vec<u8> = bytes.iter().map(|b| b.to_ascii_lowercase()).collect();

    extract_companies(text, &lower, out);
    extract_roles(text, &lower, out);
    extract_tech_skills(&lower, out);
    out.remote_policy = detect_remote_policy(&lower);
    out.seniority = detect_seniority(&lower);

    // Confidence: how many entity types were found
    let mut conf = 0u8;
    if out.company_count > 0 {
        conf += 25;
    }
    if out.role_count > 0 {
        conf += 25;
    }
    if out.skill_count > 0 {
        conf += 20;
    }
    if out.remote_policy != 0 {
        conf += 15;
    }
    if out.seniority != 0 {
        conf += 15;
    }
    out.confidence = conf;
}

// ── Company extraction ───────────────────────────────────────────────────────

/// Patterns: "at {Company}", "{Company} is hiring", "joined {Company}", "@{Company}"
fn extract_companies(original: &str, lower: &[u8], out: &mut PostEntities) {
    let patterns: &[(&[u8], bool)] = &[
        // (pattern, extract_after?) — if true, company name follows the pattern
        (b" at ", true),
        (b" @", true),
        (b"joined ", true),
        (b"working at ", true),
        (b"work at ", true),
    ];

    let suffix_patterns: &[&[u8]] = &[
        b" is hiring",
        b" is looking",
        b" is growing",
        b" is building",
    ];

    // "at {Company}" pattern — extract word(s) after marker
    for &(pattern, _) in patterns {
        let mut pos = 0;
        while let Some(idx) = memmem(&lower[pos..], pattern) {
            let start = pos + idx + pattern.len();
            if let Some(name) = extract_capitalized_phrase(original, start) {
                if name.len() >= 2 && out.company_count < 4 {
                    write_slot(&mut out.companies[out.company_count as usize], &name);
                    out.company_count += 1;
                }
            }
            pos = start;
        }
    }

    // "{Company} is hiring" pattern — extract word(s) before marker
    for pattern in suffix_patterns {
        if let Some(idx) = memmem(lower, pattern) {
            if let Some(name) = extract_preceding_phrase(original, idx) {
                if name.len() >= 2 && out.company_count < 4 {
                    write_slot(&mut out.companies[out.company_count as usize], &name);
                    out.company_count += 1;
                }
            }
        }
    }
}

// ── Role extraction ──────────────────────────────────────────────────────────

/// Extract role titles near hiring keywords.
fn extract_roles(_original: &str, lower: &[u8], out: &mut PostEntities) {
    // Look for "hiring {role}", "looking for {role}", "open position: {role}"
    let markers: &[&[u8]] = &[
        b"hiring a ",
        b"hiring an ",
        b"hiring ",
        b"looking for a ",
        b"looking for an ",
        b"looking for ",
        b"seeking a ",
        b"seeking an ",
        b"open role: ",
        b"open position: ",
        b"role: ",
    ];

    for marker in markers {
        let mut pos = 0;
        while let Some(idx) = memmem(&lower[pos..], marker) {
            let start = pos + idx + marker.len();
            if let Some(role) = extract_role_phrase(_original, start) {
                if role.len() >= 3 && out.role_count < 4 {
                    write_slot(&mut out.roles[out.role_count as usize], &role);
                    out.role_count += 1;
                }
            }
            pos = start;
        }
    }
}

// ── Tech skill extraction ────────────────────────────────────────────────────

/// Sorted tech keywords for binary-search matching (reused from job_ner.rs).
static TECH_KEYWORDS: &[&[u8]] = &[
    b"airflow",
    b"ansible",
    b"aws",
    b"azure",
    b"c++",
    b"candle",
    b"cloudflare",
    b"css",
    b"cuda",
    b"dbt",
    b"deepseek",
    b"docker",
    b"elixir",
    b"express",
    b"fastapi",
    b"gcp",
    b"go",
    b"golang",
    b"graphql",
    b"grpc",
    b"huggingface",
    b"java",
    b"javascript",
    b"jax",
    b"k8s",
    b"kafka",
    b"kotlin",
    b"kubernetes",
    b"langchain",
    b"lancedb",
    b"linux",
    b"llama",
    b"llm",
    b"mistral",
    b"ml",
    b"mlx",
    b"mongodb",
    b"nestjs",
    b"nextjs",
    b"nginx",
    b"node",
    b"nodejs",
    b"nosql",
    b"ollama",
    b"openai",
    b"onnx",
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
    b"transformers",
    b"triton",
    b"typescript",
    b"vllm",
    b"vue",
    b"wasm",
    b"webassembly",
];

fn extract_tech_skills(lower: &[u8], out: &mut PostEntities) {
    let words = split_words(lower);
    for word in words {
        if out.skill_count >= 16 {
            break;
        }
        if TECH_KEYWORDS
            .binary_search_by(|kw| kw.cmp(&&*word))
            .is_ok()
        {
            // Deduplicate
            let already = (0..out.skill_count as usize).any(|i| {
                let existing = &out.tech_skills[i];
                let end = existing.iter().position(|&b| b == 0).unwrap_or(32);
                &existing[..end] == &word[..]
            });
            if !already {
                write_slot(&mut out.tech_skills[out.skill_count as usize], &word);
                out.skill_count += 1;
            }
        }
    }
}

// ── Remote policy detection ──────────────────────────────────────────────────

fn detect_remote_policy(lower: &[u8]) -> u8 {
    let full: &[&[u8]] = &[
        b"fully remote",
        b"100% remote",
        b"remote only",
        b"remote-first",
        b"remote first",
        b"work from anywhere",
        b"remote position",
        b"remote role",
        b"remote opportunity",
        b"distributed team",
        b"async-first",
    ];
    let hybrid: &[&[u8]] = &[b"hybrid", b"remote-friendly", b"flexible location"];
    let onsite: &[&[u8]] = &[
        b"onsite",
        b"on-site",
        b"in-office",
        b"in office",
        b"must relocate",
    ];

    for p in full {
        if memmem(lower, p).is_some() {
            return 1;
        }
    }
    for p in onsite {
        if memmem(lower, p).is_some() {
            return 3;
        }
    }
    for p in hybrid {
        if memmem(lower, p).is_some() {
            return 2;
        }
    }
    0
}

// ── Seniority detection ──────────────────────────────────────────────────────

fn detect_seniority(lower: &[u8]) -> u8 {
    // Ordered from most specific (highest) to least
    let patterns: &[(&[u8], u8)] = &[
        (b"ceo", 8),
        (b"cto", 8),
        (b"cfo", 8),
        (b"coo", 8),
        (b"cpo", 8),
        (b"c-level", 8),
        (b"chief ", 8),
        (b"co-founder", 8),
        (b"founder", 8),
        (b"vice president", 7),
        (b"vp ", 7),
        (b"vp,", 7),
        (b"svp", 7),
        (b"evp", 7),
        (b"principal", 5),
        (b"distinguished", 5),
        (b"director", 6),
        (b"head of", 6),
        (b"staff engineer", 4),
        (b"staff ", 4),
        (b"senior ", 3),
        (b"sr.", 3),
        (b"sr ", 3),
        (b"lead ", 3),
        (b"tech lead", 3),
        (b"mid-level", 2),
        (b"mid level", 2),
        (b"junior", 1),
        (b"jr.", 1),
        (b"jr ", 1),
        (b"entry-level", 1),
        (b"entry level", 1),
        (b"intern", 1),
    ];

    for &(pattern, level) in patterns {
        if memmem(lower, pattern).is_some() {
            return level;
        }
    }
    0
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Simple substring search (like memmem).
fn memmem(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() || needle.len() > haystack.len() {
        return None;
    }
    haystack
        .windows(needle.len())
        .position(|w| w == needle)
}

/// Write a string into a fixed-size byte buffer.
fn write_slot(slot: &mut [u8], value: &[u8]) {
    let len = value.len().min(slot.len() - 1);
    slot[..len].copy_from_slice(&value[..len]);
    if len < slot.len() {
        slot[len] = 0;
    }
}

/// Extract a capitalized phrase starting at `pos` in the original text.
/// Stops at punctuation, newline, or after 5 words.
fn extract_capitalized_phrase(text: &str, start: usize) -> Option<Vec<u8>> {
    let bytes = text.as_bytes();
    if start >= bytes.len() {
        return None;
    }

    // Skip leading whitespace
    let mut i = start;
    while i < bytes.len() && bytes[i] == b' ' {
        i += 1;
    }

    let phrase_start = i;
    let mut word_count = 0;

    while i < bytes.len() && word_count < 5 {
        // Must start with uppercase or digit
        if word_count == 0 && !bytes[i].is_ascii_uppercase() && !bytes[i].is_ascii_digit() {
            return None;
        }

        // Read one word
        while i < bytes.len()
            && bytes[i] != b' '
            && bytes[i] != b'\n'
            && bytes[i] != b','
            && bytes[i] != b'.'
            && bytes[i] != b';'
            && bytes[i] != b'!'
            && bytes[i] != b'?'
            && bytes[i] != b'('
            && bytes[i] != b')'
        {
            i += 1;
        }
        word_count += 1;

        // Check for stop conditions
        if i >= bytes.len() || bytes[i] != b' ' {
            break;
        }

        // Peek next char — stop if not uppercase (company names are capitalized)
        if i + 1 < bytes.len() && !bytes[i + 1].is_ascii_uppercase() && !bytes[i + 1].is_ascii_digit() {
            break;
        }
        i += 1; // skip space
    }

    if i > phrase_start {
        Some(bytes[phrase_start..i].to_vec())
    } else {
        None
    }
}

/// Extract preceding phrase (before an index), looking backwards for capitalized words.
fn extract_preceding_phrase(text: &str, end_idx: usize) -> Option<Vec<u8>> {
    let bytes = text.as_bytes();
    if end_idx == 0 || end_idx > bytes.len() {
        return None;
    }

    let mut i = end_idx;
    // Skip trailing whitespace
    while i > 0 && bytes[i - 1] == b' ' {
        i -= 1;
    }

    let phrase_end = i;
    let mut word_count = 0;

    // Walk backwards over capitalized words
    while i > 0 && word_count < 5 {
        // Walk back one word
        let word_end = i;
        while i > 0
            && bytes[i - 1] != b' '
            && bytes[i - 1] != b'\n'
            && bytes[i - 1] != b','
            && bytes[i - 1] != b'.'
        {
            i -= 1;
        }

        // Check if word starts with uppercase
        if i < bytes.len() && bytes[i].is_ascii_uppercase() {
            word_count += 1;
        } else {
            i = word_end; // undo
            break;
        }

        // Skip space before this word
        if i > 0 && bytes[i - 1] == b' ' {
            i -= 1;
        } else {
            break;
        }
    }

    if phrase_end > i && word_count > 0 {
        Some(bytes[i..phrase_end].to_vec())
    } else {
        None
    }
}

/// Extract a role phrase: reads until punctuation, newline, or 6 words.
fn extract_role_phrase(text: &str, start: usize) -> Option<Vec<u8>> {
    let bytes = text.as_bytes();
    if start >= bytes.len() {
        return None;
    }

    let mut i = start;
    while i < bytes.len() && bytes[i] == b' ' {
        i += 1;
    }

    let phrase_start = i;
    let mut word_count = 0;
    let stop_words: &[&[u8]] = &[b"to ", b"for ", b"who ", b"with ", b"in ", b"and "];

    while i < bytes.len() && word_count < 6 {
        // Read one word
        while i < bytes.len()
            && bytes[i] != b' '
            && bytes[i] != b'\n'
            && bytes[i] != b'.'
            && bytes[i] != b'!'
            && bytes[i] != b'?'
            && bytes[i] != b','
        {
            i += 1;
        }
        word_count += 1;

        if i >= bytes.len() || bytes[i] != b' ' {
            break;
        }

        // Check for stop words
        let remaining = &bytes[i + 1..].iter().map(|b| b.to_ascii_lowercase()).collect::<Vec<_>>();
        let should_stop = stop_words.iter().any(|sw| remaining.starts_with(sw));
        if should_stop {
            break;
        }

        i += 1; // skip space
    }

    if i > phrase_start {
        Some(bytes[phrase_start..i].to_vec())
    } else {
        None
    }
}

/// Split text into lowercase words at word boundaries.
fn split_words(lower: &[u8]) -> Vec<Vec<u8>> {
    let mut words = Vec::new();
    let mut i = 0;
    while i < lower.len() {
        // Skip non-alphanumeric
        while i < lower.len() && !lower[i].is_ascii_alphanumeric() && lower[i] != b'+' {
            i += 1;
        }
        let start = i;
        while i < lower.len() && (lower[i].is_ascii_alphanumeric() || lower[i] == b'+' || lower[i] == b'#') {
            i += 1;
        }
        if i > start {
            words.push(lower[start..i].to_vec());
        }
    }
    words
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_company_at_pattern() {
        let mut e = PostEntities::new();
        extract_post_entities("I'm thrilled to announce I've joined at Google to work on AI.", &mut e);
        assert!(e.company_count >= 1, "company_count={}", e.company_count);
        assert_eq!(e.company_str(0), "Google");
    }

    #[test]
    fn extracts_company_hiring_pattern() {
        let mut e = PostEntities::new();
        extract_post_entities("Anthropic is hiring ML engineers for their safety team.", &mut e);
        assert!(e.company_count >= 1, "company_count={}", e.company_count);
        assert_eq!(e.company_str(0), "Anthropic");
    }

    #[test]
    fn extracts_roles() {
        let mut e = PostEntities::new();
        extract_post_entities(
            "We're hiring a Senior ML Engineer to join our distributed team. Looking for a Staff Backend Engineer too.",
            &mut e,
        );
        assert!(e.role_count >= 1, "role_count={}", e.role_count);
    }

    #[test]
    fn extracts_tech_skills() {
        let mut e = PostEntities::new();
        extract_post_entities(
            "Our stack: Python, PyTorch, Kubernetes, Redis. Building RAG pipelines with LLM orchestration.",
            &mut e,
        );
        assert!(e.skill_count >= 3, "skill_count={}", e.skill_count);
    }

    #[test]
    fn detects_full_remote() {
        let mut e = PostEntities::new();
        extract_post_entities("This is a fully remote position, work from anywhere.", &mut e);
        assert_eq!(e.remote_policy, 1);
        assert_eq!(e.remote_label(), "full_remote");
    }

    #[test]
    fn detects_seniority() {
        let mut e = PostEntities::new();
        extract_post_entities("Our VP of Engineering is looking for senior engineers.", &mut e);
        // "vp " should be detected
        assert!(e.seniority >= 3, "seniority={}", e.seniority);
    }

    #[test]
    fn empty_text() {
        let mut e = PostEntities::new();
        extract_post_entities("", &mut e);
        assert_eq!(e.company_count, 0);
        assert_eq!(e.role_count, 0);
        assert_eq!(e.skill_count, 0);
        assert_eq!(e.confidence, 0);
    }

    #[test]
    fn serde_roundtrip() {
        let mut e = PostEntities::new();
        extract_post_entities(
            "Anthropic is hiring a Senior ML Engineer. Fully remote. Python, PyTorch, Rust.",
            &mut e,
        );
        let s = e.to_serde();
        let json = serde_json::to_string(&s).unwrap();
        let deserialized: PostEntitiesSerde = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.remote_policy, "full_remote");
        assert!(!deserialized.tech_skills.is_empty());
    }
}
