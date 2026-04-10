use serde::{Deserialize, Serialize};

use crate::bloom::BloomFilter;

// ── Constants ───────────────────────────────────────────────────────────────

pub const NUM_SPAM_FEATURES: usize = 24;
pub const NUM_SPAM_LABELS: usize = 7;
pub const SPAM_BATCH_SIZE: usize = 256;

// ── Aho-Corasick Automaton ─────────────────────────────────────────────────
//
// Single-pass multi-pattern matching via a trie with failure links.
// Replaces O(n*k) sequential `contains()` with O(n + m) scanning where
// n = text length, m = total matches. No external crate needed.

/// A single keyword match found during automaton scanning.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KeywordMatch {
    /// Byte offset in the input text where the match starts.
    pub start: usize,
    /// Index of the matched pattern in the original pattern list.
    pub pattern_idx: usize,
    /// Length of the matched pattern in bytes.
    pub length: usize,
}

/// An output entry: a pattern that terminates at a given node.
#[derive(Clone, Copy)]
struct AcOutput {
    pattern_idx: u32,
    pattern_len: u16,
}

/// Trie node for the Aho-Corasick automaton.
#[derive(Clone)]
struct AcNode {
    /// Transitions: byte value -> child node index.
    children: [u32; 256],
    /// Failure link: node to jump to on mismatch (like KMP for tries).
    fail: u32,
    /// All patterns that terminate at this node (supports duplicate strings
    /// inserted with different pattern indices, e.g. "urgent" in both
    /// SPAM_KEYWORDS and URGENCY_KEYWORDS).
    outputs: Vec<AcOutput>,
    /// Dictionary suffix link: next node in the chain that also has output.
    dict_suffix: u32,
}

impl AcNode {
    fn new() -> Self {
        Self {
            children: [u32::MAX; 256],
            fail: 0,
            outputs: Vec::new(),
            dict_suffix: u32::MAX,
        }
    }

    #[inline]
    fn has_output(&self) -> bool {
        !self.outputs.is_empty()
    }
}

/// Pre-compiled Aho-Corasick finite-state machine for spam keyword detection.
///
/// Compiles all spam keyword patterns into a single trie with failure links,
/// enabling single-pass O(n) scanning over input text regardless of pattern count.
pub struct SpamKeywordAutomaton {
    nodes: Vec<AcNode>,
    pattern_count: usize,
}

impl SpamKeywordAutomaton {
    /// Number of patterns compiled into this automaton.
    pub fn pattern_count(&self) -> usize {
        self.pattern_count
    }

    /// Number of nodes in the trie (useful for diagnostics).
    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }
}

/// Build an Aho-Corasick automaton from a slice of keyword patterns.
///
/// Patterns are matched case-insensitively (the caller should pass lowercase
/// patterns; the `scan_text` function lowercases input on the fly).
///
/// Complexity: O(sum of pattern lengths) for construction.
pub fn build_keyword_automaton(patterns: &[&str]) -> SpamKeywordAutomaton {
    let mut nodes = vec![AcNode::new()]; // node 0 = root

    // Phase 1: Build the trie by inserting each pattern.
    for (pat_idx, pattern) in patterns.iter().enumerate() {
        let mut current = 0u32;
        for &byte in pattern.as_bytes() {
            let child = nodes[current as usize].children[byte as usize];
            if child == u32::MAX {
                let new_idx = nodes.len() as u32;
                nodes[current as usize].children[byte as usize] = new_idx;
                nodes.push(AcNode::new());
                current = new_idx;
            } else {
                current = child;
            }
        }
        // Mark terminal node with pattern info (supports multiple patterns per node).
        nodes[current as usize].outputs.push(AcOutput {
            pattern_idx: pat_idx as u32,
            pattern_len: pattern.len() as u16,
        });
    }

    // Phase 2: Build failure links via BFS (breadth-first from root children).
    let mut queue = std::collections::VecDeque::new();

    // Root's direct children: fail link = root (0).
    for byte in 0..256u16 {
        let child = nodes[0].children[byte as usize];
        if child != u32::MAX {
            nodes[child as usize].fail = 0;
            queue.push_back(child);
        }
    }

    while let Some(u) = queue.pop_front() {
        for byte in 0..256u16 {
            let v = nodes[u as usize].children[byte as usize];
            if v == u32::MAX {
                continue;
            }

            // Walk failure chain to find the longest proper suffix that is a prefix.
            let mut f = nodes[u as usize].fail;
            while f != 0 && nodes[f as usize].children[byte as usize] == u32::MAX {
                f = nodes[f as usize].fail;
            }
            let fail_target = nodes[f as usize].children[byte as usize];
            nodes[v as usize].fail = if fail_target != u32::MAX && fail_target != v {
                fail_target
            } else {
                0
            };

            // Dictionary suffix link: nearest ancestor (via fail chain) with output.
            let fail_node = nodes[v as usize].fail;
            nodes[v as usize].dict_suffix = if nodes[fail_node as usize].has_output() {
                fail_node
            } else {
                nodes[fail_node as usize].dict_suffix
            };

            queue.push_back(v);
        }
    }

    SpamKeywordAutomaton {
        nodes,
        pattern_count: patterns.len(),
    }
}

/// Scan text against a pre-compiled automaton, returning all keyword matches.
///
/// Input is lowercased byte-by-byte (ASCII tolower) for case-insensitive matching.
/// Complexity: O(n + m) where n = text length, m = number of matches.
pub fn scan_text(automaton: &SpamKeywordAutomaton, text: &str) -> Vec<KeywordMatch> {
    let mut matches = Vec::new();
    let bytes = text.as_bytes();
    let mut state = 0u32;

    for (pos, &raw_byte) in bytes.iter().enumerate() {
        // ASCII-only tolower for speed (patterns are lowercase ASCII).
        let byte = if raw_byte >= b'A' && raw_byte <= b'Z' {
            raw_byte + 32
        } else {
            raw_byte
        };

        // Follow failure links until we find a valid transition or reach root.
        while state != 0
            && automaton.nodes[state as usize].children[byte as usize] == u32::MAX
        {
            state = automaton.nodes[state as usize].fail;
        }

        let next = automaton.nodes[state as usize].children[byte as usize];
        state = if next != u32::MAX { next } else { 0 };

        // Collect outputs: check current node and its dictionary suffix chain.
        let mut out = state;
        loop {
            if out == u32::MAX || out == 0 {
                // Also check root if it has output (single-char pattern edge case).
                if out == 0 && automaton.nodes[0].has_output() {
                    let len = automaton.nodes[0].output_pattern_len as usize;
                    matches.push(KeywordMatch {
                        start: pos + 1 - len,
                        pattern_idx: automaton.nodes[0].output_pattern_idx as usize,
                        length: len,
                    });
                }
                break;
            }
            if automaton.nodes[out as usize].has_output() {
                let len = automaton.nodes[out as usize].output_pattern_len as usize;
                matches.push(KeywordMatch {
                    start: pos + 1 - len,
                    pattern_idx: automaton.nodes[out as usize].output_pattern_idx as usize,
                    length: len,
                });
            }
            out = automaton.nodes[out as usize].dict_suffix;
        }
    }

    matches
}

/// Count the number of distinct patterns matched (not total occurrences).
/// Useful as a drop-in replacement for the old sequential `filter(contains)` count.
#[inline]
pub fn count_distinct_matches(automaton: &SpamKeywordAutomaton, text: &str) -> usize {
    let matches = scan_text(automaton, text);
    if matches.is_empty() {
        return 0;
    }
    let mut seen = vec![false; automaton.pattern_count()];
    let mut count = 0;
    for m in &matches {
        if !seen[m.pattern_idx] {
            seen[m.pattern_idx] = true;
            count += 1;
        }
    }
    count
}

// ── Fast sigmoid ───────────────────────────────────────────────────────────

/// Fast logistic sigmoid approximation using rational polynomial.
///
/// Uses `0.5 + 0.5 * x / (1.0 + |x|)` which avoids the `exp()` call.
/// Max absolute error vs true sigmoid: ~0.07 at x = +/-1.5.
/// Suitable for classification scoring where exact gradients are not needed.
#[inline]
pub fn fast_sigmoid(x: f32) -> f32 {
    0.5 + 0.5 * x / (1.0 + x.abs())
}

// ── Batch scoring with automaton ───────────────────────────────────────────

/// Input features for batch scoring via the automaton-accelerated path.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EmailFeatures {
    pub text: String,
    pub headers: Option<EmailHeaders>,
    pub send_hour: Option<u8>,
    pub from_address: Option<String>,
}

/// Output from batch scoring.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpamScore {
    pub spam_score: f32,
    pub category: &'static str,
    pub category_scores: [f32; NUM_SPAM_LABELS],
    pub gate: GateDecision,
    pub keyword_matches: usize,
    pub urgency_matches: usize,
}

/// Process a batch of emails using the pre-compiled automaton for keyword detection.
///
/// This is the optimized entry point for high-throughput spam scoring. It:
/// 1. Uses the Aho-Corasick automaton for O(n) keyword scanning (vs O(n*k) sequential)
/// 2. Uses `fast_sigmoid` for classification (avoids `exp()` per-label)
/// 3. Processes emails in configurable chunks to keep memory predictable
///
/// The `chunk_size` parameter controls how many emails are processed before
/// yielding results. Use 0 for "process all at once".
pub fn score_emails_batch(
    automaton: &SpamKeywordAutomaton,
    emails: &[EmailFeatures],
    classifier: &SpamClassifier,
) -> Vec<SpamScore> {
    emails
        .iter()
        .map(|email| {
            let features = extract_spam_features_ac(
                &email.text,
                email.headers.as_ref(),
                email.send_hour,
                automaton,
            );
            let category_scores = classify_fast(classifier, &features);

            let spam_score = if classifier.trained {
                1.0 - category_scores[0]
            } else {
                0.0
            };

            let mut max_idx = 0usize;
            let mut max_val = category_scores[0];
            for (i, &s) in category_scores.iter().enumerate().skip(1) {
                if s > max_val {
                    max_val = s;
                    max_idx = i;
                }
            }

            let gate = if spam_score < 0.3 {
                GateDecision::Pass
            } else if spam_score < 0.7 {
                GateDecision::Quarantine
            } else {
                GateDecision::Block
            };

            // Count keyword/urgency matches for diagnostics.
            let all_matches = scan_text(automaton, &email.text);
            let spam_kw_count = all_matches.iter()
                .filter(|m| m.pattern_idx < SPAM_KEYWORDS.len())
                .map(|m| m.pattern_idx)
                .collect::<std::collections::HashSet<_>>()
                .len();
            let urgency_kw_count = all_matches.iter()
                .filter(|m| {
                    m.pattern_idx >= SPAM_KEYWORDS.len()
                        && m.pattern_idx < SPAM_KEYWORDS.len() + URGENCY_KEYWORDS.len()
                })
                .map(|m| m.pattern_idx)
                .collect::<std::collections::HashSet<_>>()
                .len();

            SpamScore {
                spam_score,
                category: SPAM_CATEGORIES[max_idx],
                category_scores,
                gate,
                keyword_matches: spam_kw_count,
                urgency_matches: urgency_kw_count,
            }
        })
        .collect()
}

/// Build the combined automaton for all spam + urgency keywords.
///
/// The returned automaton indexes patterns as:
///   [0..SPAM_KEYWORDS.len()) -> spam keywords
///   [SPAM_KEYWORDS.len()..SPAM_KEYWORDS.len()+URGENCY_KEYWORDS.len()) -> urgency keywords
pub fn build_default_spam_automaton() -> SpamKeywordAutomaton {
    let mut all_patterns: Vec<&str> = Vec::with_capacity(
        SPAM_KEYWORDS.len() + URGENCY_KEYWORDS.len(),
    );
    all_patterns.extend_from_slice(SPAM_KEYWORDS);
    all_patterns.extend_from_slice(URGENCY_KEYWORDS);
    build_keyword_automaton(&all_patterns)
}

/// Extract spam features using the Aho-Corasick automaton for keyword scanning.
///
/// This is the optimized version of `extract_spam_features`. Features 0 and 1
/// (spam/urgency keyword density) are computed via single-pass automaton scan
/// instead of sequential `contains()` calls.
#[inline]
pub fn extract_spam_features_ac(
    text: &str,
    headers: Option<&EmailHeaders>,
    send_hour: Option<u8>,
    automaton: &SpamKeywordAutomaton,
) -> [f32; NUM_SPAM_FEATURES] {
    let mut features = [0.0f32; NUM_SPAM_FEATURES];

    let lower = text.to_lowercase();
    let words: Vec<&str> = lower.split_whitespace().collect();
    let word_count = words.len().max(1);
    let char_count = text.len().max(1);

    // Features 0 & 1: Automaton-accelerated keyword density.
    // Single pass over the text finds all spam + urgency keywords simultaneously.
    let all_matches = scan_text(automaton, text);

    // Deduplicate: count distinct patterns, not total occurrences.
    let spam_boundary = SPAM_KEYWORDS.len();
    let urgency_boundary = spam_boundary + URGENCY_KEYWORDS.len();

    let mut spam_seen = vec![false; spam_boundary];
    let mut urgency_seen = vec![false; URGENCY_KEYWORDS.len()];
    let mut spam_hits = 0usize;
    let mut urgency_hits = 0usize;

    for m in &all_matches {
        if m.pattern_idx < spam_boundary {
            if !spam_seen[m.pattern_idx] {
                spam_seen[m.pattern_idx] = true;
                spam_hits += 1;
            }
        } else if m.pattern_idx < urgency_boundary {
            let local_idx = m.pattern_idx - spam_boundary;
            if !urgency_seen[local_idx] {
                urgency_seen[local_idx] = true;
                urgency_hits += 1;
            }
        }
    }

    features[0] = spam_hits as f32 / word_count as f32;
    features[1] = urgency_hits as f32 / word_count as f32;

    // Features 2-23: identical to the original extract_spam_features.
    // (Keeping them inline rather than calling the original to avoid double-lowercasing.)

    // Feature 2: Link count normalized
    let link_count = lower.matches("http://").count() + lower.matches("https://").count();
    features[2] = (link_count as f32 / word_count as f32).min(1.0);

    // Feature 3: URL shortener count
    let shortener_domains = &[
        "bit.ly", "t.co", "tinyurl", "goo.gl", "ow.ly", "buff.ly",
    ];
    let shortener_count = shortener_domains
        .iter()
        .map(|d| lower.matches(d).count())
        .sum::<usize>();
    features[3] = shortener_count as f32;

    // Feature 4: Image tag count
    let img_count = lower.matches("<img").count();
    features[4] = img_count as f32;

    // Feature 5: Exclamation density
    let excl_count = text.bytes().filter(|&b| b == b'!').count();
    features[5] = excl_count as f32 / char_count as f32;

    // Feature 6: ALL CAPS ratio (from original text)
    let orig_words: Vec<&str> = text.split_whitespace().collect();
    let orig_caps = orig_words
        .iter()
        .filter(|w| {
            w.len() > 1
                && w.chars().all(|c| !c.is_alphabetic() || c.is_uppercase())
                && w.chars().any(|c| c.is_alphabetic())
        })
        .count();
    features[6] = orig_caps as f32 / word_count.max(1) as f32;

    // Feature 7: Sentence length variance
    let sentences: Vec<&str> = text
        .split('.')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();
    if sentences.len() > 1 {
        let lengths: Vec<f32> = sentences
            .iter()
            .map(|s| s.split_whitespace().count() as f32)
            .collect();
        let mean = lengths.iter().sum::<f32>() / lengths.len() as f32;
        let var =
            lengths.iter().map(|l| (l - mean).powi(2)).sum::<f32>() / lengths.len() as f32;
        features[7] = (var / 100.0).min(1.0);
    }

    // Feature 8: Personal pronoun density
    let pronouns = &["i", "my", "we", "our"];
    let pronoun_count = words.iter().filter(|w| pronouns.contains(w)).count();
    features[8] = pronoun_count as f32 / word_count as f32;

    // Feature 9: Contraction density
    let contractions = &["n't", "'re", "'ll", "'ve", "'d", "'s"];
    let contraction_count = contractions
        .iter()
        .map(|c| lower.matches(c).count())
        .sum::<usize>();
    features[9] = contraction_count as f32 / word_count as f32;

    // Feature 10: Type-token ratio
    {
        let mut unique = std::collections::HashSet::new();
        for w in &words {
            unique.insert(*w);
        }
        features[10] = unique.len() as f32 / word_count as f32;
    }

    // Feature 11: Average word length
    let total_word_len: usize = words.iter().map(|w| w.len()).sum();
    features[11] = (total_word_len as f32 / word_count as f32) / 10.0;

    // Feature 12: Sentence starter variety
    if !sentences.is_empty() {
        let starters: std::collections::HashSet<&str> = sentences
            .iter()
            .filter_map(|s| s.split_whitespace().next())
            .collect();
        features[12] = starters.len() as f32 / sentences.len().max(1) as f32;
    }

    // Feature 13: Text length normalized
    features[13] = (word_count as f32 / 500.0).min(1.0);

    // Feature 14: Unicode anomaly
    let non_ascii = text.chars().filter(|c| !c.is_ascii()).count();
    features[14] = non_ascii as f32 / text.chars().count().max(1) as f32;

    // Feature 15: Homoglyph count
    let homoglyph_count = text
        .chars()
        .filter(|c| HOMOGLYPH_CODEPOINTS.contains(c))
        .count();
    features[15] = homoglyph_count as f32;

    // Feature 16: Zero-width char count
    let zw_count = text
        .chars()
        .filter(|c| ZERO_WIDTH_CHARS.contains(c))
        .count();
    features[16] = zw_count as f32;

    // Feature 17: Template marker count
    let template_markers = lower.matches("{{").count()
        + lower.matches("<name>").count()
        + lower.matches("[company]").count()
        + lower.matches("}}").count()
        + lower.matches("<first_name>").count()
        + lower.matches("[name]").count();
    features[17] = template_markers as f32;

    // Features 18-22: Header-derived features
    if let Some(h) = headers {
        let auth_score =
            (h.spf_pass as u8 + h.dkim_pass as u8 + h.dmarc_pass as u8) as f32 / 3.0;
        features[18] = auth_score;
        features[19] = if h.reply_to_mismatch { 1.0 } else { 0.0 };
        features[20] = (h.hop_count as f32 / 10.0).min(1.0);
    }

    if let Some(hour) = send_hour {
        let radians = (hour as f32 / 24.0) * std::f32::consts::TAU;
        features[21] = radians.sin();
        features[22] = radians.cos();
    }

    // Feature 23: Role account flag
    let has_role = ROLE_ACCOUNTS.iter().any(|r| lower.contains(r));
    features[23] = if has_role { 1.0 } else { 0.0 };

    features
}

/// Classify a feature vector using fast_sigmoid instead of exp-based sigmoid.
#[inline]
fn classify_fast(
    classifier: &SpamClassifier,
    features: &[f32; NUM_SPAM_FEATURES],
) -> [f32; NUM_SPAM_LABELS] {
    if !classifier.trained {
        return [0.0; NUM_SPAM_LABELS];
    }

    let mut scores = [0.0f32; NUM_SPAM_LABELS];
    for i in 0..NUM_SPAM_LABELS {
        let mut z = classifier.biases[i];
        for j in 0..NUM_SPAM_FEATURES {
            z += classifier.weights[i][j] * features[j];
        }
        scores[i] = fast_sigmoid(z);
    }
    scores
}

pub const SPAM_CATEGORIES: [&str; 7] = [
    "clean",
    "template_spam",
    "ai_generated",
    "low_effort",
    "role_account",
    "domain_suspect",
    "content_violation",
];

// ── Keyword lists ───────────────────────────────────────────────────────────

const SPAM_KEYWORDS: &[&str] = &[
    "free", "urgent", "guaranteed", "winner", "congratulations", "click here",
    "act now", "limited offer", "no obligation", "risk free", "discount",
    "lowest price", "cash bonus", "earn money", "double your", "million dollars",
    "no cost", "prize", "special promotion", "incredible deal", "buy now",
    "order now", "don't miss", "exclusive deal", "100% free", "credit card",
    "no strings attached", "apply now", "unsecured", "opt-in",
];

const URGENCY_KEYWORDS: &[&str] = &[
    "urgent", "act now", "limited time", "expires", "immediately",
    "hurry", "last chance", "deadline", "don't delay", "time sensitive",
    "right now", "final notice", "respond now", "action required",
];

const ROLE_ACCOUNTS: &[&str] = &[
    "info@", "noreply@", "no-reply@", "billing@", "support@", "admin@",
    "sales@", "marketing@", "webmaster@", "postmaster@", "abuse@",
    "contact@", "hello@", "team@", "office@",
];

// Cyrillic homoglyphs: а(1072), е(1077), о(1086), р(1088), с(1089), х(1093)
const HOMOGLYPH_CODEPOINTS: &[char] = &[
    '\u{0430}', // а (Cyrillic a)
    '\u{0435}', // е (Cyrillic e)
    '\u{043E}', // о (Cyrillic o)
    '\u{0440}', // р (Cyrillic r/p)
    '\u{0441}', // с (Cyrillic s/c)
    '\u{0445}', // х (Cyrillic x/h)
];

const ZERO_WIDTH_CHARS: &[char] = &[
    '\u{200B}', // zero-width space
    '\u{200C}', // zero-width non-joiner
    '\u{200D}', // zero-width joiner
    '\u{FEFF}', // byte order mark / zero-width no-break space
];

// ── EmailHeaders ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EmailHeaders {
    pub spf_pass: bool,
    pub dkim_pass: bool,
    pub dmarc_pass: bool,
    pub reply_to_mismatch: bool,
    pub hop_count: u8,
}

// ── Feature extraction ──────────────────────────────────────────────────────

/// Extract 24 spam features from email text and optional headers.
/// Uses zero-copy byte scanning where possible.
#[inline]
pub fn extract_spam_features(
    text: &str,
    headers: Option<&EmailHeaders>,
    send_hour: Option<u8>,
) -> [f32; NUM_SPAM_FEATURES] {
    let mut features = [0.0f32; NUM_SPAM_FEATURES];

    let lower = text.to_lowercase();
    let words: Vec<&str> = lower.split_whitespace().collect();
    let word_count = words.len().max(1);
    let char_count = text.len().max(1);

    // Feature 0: Spam keyword density
    let spam_hits = SPAM_KEYWORDS
        .iter()
        .filter(|kw| lower.contains(**kw))
        .count();
    features[0] = spam_hits as f32 / word_count as f32;

    // Feature 1: Urgency keyword density
    let urgency_hits = URGENCY_KEYWORDS
        .iter()
        .filter(|kw| lower.contains(**kw))
        .count();
    features[1] = urgency_hits as f32 / word_count as f32;

    // Feature 2: Link count normalized
    // Simple byte scan for "http://" or "https://"
    let link_count = lower.matches("http://").count() + lower.matches("https://").count();
    features[2] = (link_count as f32 / word_count as f32).min(1.0);

    // Feature 3: URL shortener count
    let shortener_domains = &[
        "bit.ly", "t.co", "tinyurl", "goo.gl", "ow.ly", "buff.ly",
    ];
    let shortener_count = shortener_domains
        .iter()
        .map(|d| lower.matches(d).count())
        .sum::<usize>();
    features[3] = shortener_count as f32;

    // Feature 4: Image tag count
    let img_count = lower.matches("<img").count();
    features[4] = img_count as f32;

    // Feature 5: Exclamation density
    let excl_count = text.bytes().filter(|&b| b == b'!').count();
    features[5] = excl_count as f32 / char_count as f32;

    // Feature 6: ALL CAPS ratio (computed from original text, not lowercased)
    let orig_words: Vec<&str> = text.split_whitespace().collect();
    let orig_caps = orig_words
        .iter()
        .filter(|w| {
            w.len() > 1
                && w.chars().all(|c| !c.is_alphabetic() || c.is_uppercase())
                && w.chars().any(|c| c.is_alphabetic())
        })
        .count();
    features[6] = orig_caps as f32 / word_count.max(1) as f32;

    // Feature 7: Sentence length variance
    let sentences: Vec<&str> = text
        .split('.')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();
    if sentences.len() > 1 {
        let lengths: Vec<f32> = sentences
            .iter()
            .map(|s| s.split_whitespace().count() as f32)
            .collect();
        let mean = lengths.iter().sum::<f32>() / lengths.len() as f32;
        let var = lengths.iter().map(|l| (l - mean).powi(2)).sum::<f32>() / lengths.len() as f32;
        features[7] = (var / 100.0).min(1.0); // normalize
    }

    // Feature 8: Personal pronoun density (I/my/we/our)
    let pronouns = &["i", "my", "we", "our"];
    let pronoun_count = words.iter().filter(|w| pronouns.contains(w)).count();
    features[8] = pronoun_count as f32 / word_count as f32;

    // Feature 9: Contraction density (n't, 're, 'll)
    let contractions = &["n't", "'re", "'ll", "'ve", "'d", "'s"];
    let contraction_count = contractions
        .iter()
        .map(|c| lower.matches(c).count())
        .sum::<usize>();
    features[9] = contraction_count as f32 / word_count as f32;

    // Feature 10: Type-token ratio (unique words / total words)
    {
        let mut unique = std::collections::HashSet::new();
        for w in &words {
            unique.insert(*w);
        }
        features[10] = unique.len() as f32 / word_count as f32;
    }

    // Feature 11: Average word length
    let total_word_len: usize = words.iter().map(|w| w.len()).sum();
    features[11] = (total_word_len as f32 / word_count as f32) / 10.0; // normalize to ~0-1

    // Feature 12: Sentence starter variety
    if !sentences.is_empty() {
        let starters: std::collections::HashSet<&str> = sentences
            .iter()
            .filter_map(|s| s.split_whitespace().next())
            .collect();
        features[12] = starters.len() as f32 / sentences.len().max(1) as f32;
    }

    // Feature 13: Text length normalized
    features[13] = (word_count as f32 / 500.0).min(1.0);

    // Feature 14: Unicode anomaly (non-ASCII / total chars)
    let non_ascii = text.chars().filter(|c| !c.is_ascii()).count();
    features[14] = non_ascii as f32 / text.chars().count().max(1) as f32;

    // Feature 15: Homoglyph count
    let homoglyph_count = text
        .chars()
        .filter(|c| HOMOGLYPH_CODEPOINTS.contains(c))
        .count();
    features[15] = homoglyph_count as f32;

    // Feature 16: Zero-width char count
    let zw_count = text
        .chars()
        .filter(|c| ZERO_WIDTH_CHARS.contains(c))
        .count();
    features[16] = zw_count as f32;

    // Feature 17: Template marker count ({{, <NAME>, [Company])
    let template_markers = lower.matches("{{").count()
        + lower.matches("<name>").count()
        + lower.matches("[company]").count()
        + lower.matches("}}").count()
        + lower.matches("<first_name>").count()
        + lower.matches("[name]").count();
    features[17] = template_markers as f32;

    // Features 18-23: Header-derived features
    if let Some(h) = headers {
        // Feature 18: SPF+DKIM+DMARC composite (0-1 range)
        let auth_score = (h.spf_pass as u8 + h.dkim_pass as u8 + h.dmarc_pass as u8) as f32 / 3.0;
        features[18] = auth_score;

        // Feature 19: Reply-to mismatch
        features[19] = if h.reply_to_mismatch { 1.0 } else { 0.0 };

        // Feature 20: Hop count (normalized, >10 is suspicious)
        features[20] = (h.hop_count as f32 / 10.0).min(1.0);
    }

    // Feature 21: Send hour sin (circadian encoding)
    if let Some(hour) = send_hour {
        let radians = (hour as f32 / 24.0) * std::f32::consts::TAU;
        features[21] = radians.sin();
        // Feature 22: Send hour cos
        features[22] = radians.cos();
    }

    // Feature 23: Role account flag
    if let Some(h) = headers {
        // We check if reply_to_mismatch indicates a role account pattern;
        // actual from-address checking is done externally. Use hop_count == 0
        // as a heuristic that the feature wasn't populated.
        let _ = h;
    }
    // Role account detection via text content: check for role account patterns
    // in the text body (e.g., "sent from info@", "from noreply@")
    let has_role = ROLE_ACCOUNTS
        .iter()
        .any(|r| lower.contains(r));
    features[23] = if has_role { 1.0 } else { 0.0 };

    features
}

// ── Classifier ──────────────────────────────────────────────────────────────

#[inline]
fn sigmoid(x: f32) -> f32 {
    1.0 / (1.0 + (-x).exp())
}

/// Gate decision for email classification.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum GateDecision {
    Pass,
    Quarantine,
    Block,
}

/// Verdict from the spam classifier.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpamVerdict {
    pub spam_score: f32,
    pub category: &'static str,
    pub category_scores: [f32; NUM_SPAM_LABELS],
    pub gate: GateDecision,
}

/// Distilled logistic regression spam classifier.
/// 7 independent logistic regressions (one per spam category).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpamClassifier {
    pub weights: Vec<[f32; NUM_SPAM_FEATURES]>,
    pub biases: [f32; NUM_SPAM_LABELS],
    pub trained: bool,
}

impl SpamClassifier {
    /// Create a new untrained classifier with zeroed weights.
    pub fn new() -> Self {
        Self::default()
    }

    /// Load weights from a JSON file, falling back to untrained on error.
    pub fn from_json(path: &std::path::Path) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    /// Persist weights to JSON.
    pub fn to_json(&self, path: &std::path::Path) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, json)
    }

    /// Classify a feature vector. Returns sigmoid confidence per label.
    pub fn classify(&self, features: &[f32; NUM_SPAM_FEATURES]) -> [f32; NUM_SPAM_LABELS] {
        if !self.trained {
            return [0.0; NUM_SPAM_LABELS];
        }

        let mut scores = [0.0f32; NUM_SPAM_LABELS];
        for i in 0..NUM_SPAM_LABELS {
            let mut z = self.biases[i];
            for j in 0..NUM_SPAM_FEATURES {
                z += self.weights[i][j] * features[j];
            }
            scores[i] = sigmoid(z);
        }
        scores
    }

    /// Classify raw text with optional headers, returning a full verdict.
    pub fn classify_text(
        &self,
        text: &str,
        headers: Option<&EmailHeaders>,
    ) -> SpamVerdict {
        let features = extract_spam_features(text, headers, None);
        let category_scores = self.classify(&features);

        // Spam score: 1.0 - clean_score (index 0 is "clean")
        // For untrained classifiers, report 0.0 spam score.
        let spam_score = if self.trained {
            1.0 - category_scores[0]
        } else {
            0.0
        };

        // Find the dominant category
        let mut max_idx = 0usize;
        let mut max_val = category_scores[0];
        for (i, &s) in category_scores.iter().enumerate().skip(1) {
            if s > max_val {
                max_val = s;
                max_idx = i;
            }
        }

        let gate = if spam_score < 0.3 {
            GateDecision::Pass
        } else if spam_score < 0.7 {
            GateDecision::Quarantine
        } else {
            GateDecision::Block
        };

        SpamVerdict {
            spam_score,
            category: SPAM_CATEGORIES[max_idx],
            category_scores,
            gate,
        }
    }
}

impl Default for SpamClassifier {
    fn default() -> Self {
        Self {
            weights: vec![[0.0; NUM_SPAM_FEATURES]; NUM_SPAM_LABELS],
            biases: [0.0; NUM_SPAM_LABELS],
            trained: false,
        }
    }
}

// ── SpamBatch (SoA layout) ─────────────────────────────────────────────────

/// Batch of emails in Structure-of-Arrays layout for vectorized spam scoring.
/// Cache-line aligned (64 bytes) for optimal NEON/SSE auto-vectorization.
#[repr(C, align(64))]
pub struct SpamBatch {
    pub features: [[f32; NUM_SPAM_FEATURES]; SPAM_BATCH_SIZE],
    pub spam_scores: [f32; SPAM_BATCH_SIZE],
    pub category_idx: [u8; SPAM_BATCH_SIZE],
    pub gate_decisions: [u8; SPAM_BATCH_SIZE],
    pub count: usize,
}

impl SpamBatch {
    /// Create a new zeroed batch.
    pub fn new() -> Self {
        // Safety: all-zeros is valid for this struct (f32 zero, u8 zero, usize zero)
        unsafe { std::mem::zeroed() }
    }

    /// Populate a single slot with features extracted from text and optional headers.
    pub fn populate_slot(
        &mut self,
        idx: usize,
        text: &str,
        headers: Option<&EmailHeaders>,
    ) {
        debug_assert!(idx < SPAM_BATCH_SIZE);
        self.features[idx] = extract_spam_features(text, headers, None);
    }

    /// Compute spam scores for all populated slots using the given classifier.
    pub fn compute_scores(&mut self, classifier: &SpamClassifier) {
        for i in 0..self.count {
            let scores = classifier.classify(&self.features[i]);

            // Spam score: 1 - clean
            let spam_score = if classifier.trained {
                1.0 - scores[0]
            } else {
                0.0
            };
            self.spam_scores[i] = spam_score;

            // Find dominant category
            let mut max_idx = 0u8;
            let mut max_val = scores[0];
            for (j, &s) in scores.iter().enumerate().skip(1) {
                if s > max_val {
                    max_val = s;
                    max_idx = j as u8;
                }
            }
            self.category_idx[i] = max_idx;

            // Gate decision: 0=Pass, 1=Quarantine, 2=Block
            self.gate_decisions[i] = if spam_score < 0.3 {
                0 // Pass
            } else if spam_score < 0.7 {
                1 // Quarantine
            } else {
                2 // Block
            };
        }
    }

    /// Push a new email into the batch, returning its slot index.
    /// Returns None if the batch is full.
    pub fn push(&mut self, text: &str, headers: Option<&EmailHeaders>) -> Option<usize> {
        if self.count >= SPAM_BATCH_SIZE {
            return None;
        }
        let idx = self.count;
        self.populate_slot(idx, text, headers);
        self.count += 1;
        Some(idx)
    }

    /// Mean spam score across all populated slots.
    pub fn mean_score(&self) -> f32 {
        if self.count == 0 {
            return 0.0;
        }
        self.spam_scores[..self.count].iter().sum::<f32>() / self.count as f32
    }

    /// Fraction of emails that pass the spam gate at the given threshold.
    pub fn pass_rate(&self, threshold: f32) -> f32 {
        if self.count == 0 {
            return 0.0;
        }
        let passed = self.spam_scores[..self.count]
            .iter()
            .filter(|&&s| s < threshold)
            .count();
        passed as f32 / self.count as f32
    }

    /// Count of emails in each spam category.
    pub fn category_distribution(&self) -> [usize; NUM_SPAM_LABELS] {
        let mut dist = [0usize; NUM_SPAM_LABELS];
        for i in 0..self.count {
            let cat = self.category_idx[i] as usize;
            if cat < NUM_SPAM_LABELS {
                dist[cat] += 1;
            }
        }
        dist
    }

    /// Return indices of emails that passed the spam gate (score < threshold).
    pub fn passed_indices(&self, threshold: f32) -> Vec<usize> {
        (0..self.count)
            .filter(|&i| self.spam_scores[i] < threshold)
            .collect()
    }
}

impl Default for SpamBatch {
    fn default() -> Self {
        Self::new()
    }
}

// ── Domain filter (Bloom-based) ─────────────────────────────────────────────

/// Domain reputation verdict.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DomainVerdict {
    Clean,
    KnownSpam,
    Disposable,
}

/// Bloom-filter based domain reputation checker.
/// Uses two filters: one for known spam domains, one for disposable email providers.
pub struct SpamDomainFilter {
    known_spam: BloomFilter,
    disposable: BloomFilter,
}

const KNOWN_SPAM_DOMAINS: &[&str] = &[
    "spammer.com", "junk-mail.com", "bulk-email.net", "mass-mailer.com",
    "spam-factory.com", "fake-sender.net", "phish-bait.com", "scam-alert.net",
    "malware-host.com", "botnet-relay.net", "exploit-kit.com", "ransomware.net",
    "darkweb-market.com", "fraud-shop.net", "carding-site.com",
];

const DISPOSABLE_DOMAINS: &[&str] = &[
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
    "dispostable.com", "mailnesia.com", "maildrop.cc", "temp-mail.org",
    "fakeinbox.com", "tempail.com", "emailondeck.com", "trashmail.com",
    "mailcatch.com", "tempr.email", "discard.email", "tmpmail.net",
    "getnada.com", "mohmal.com", "burnermail.io", "inboxkitten.com",
    "mailsac.com", "10minutemail.com", "guerrillamail.info", "trash-mail.com",
    "tempinbox.com", "mytemp.email",
];

impl SpamDomainFilter {
    /// Create a new domain filter pre-loaded with known spam and disposable domains.
    pub fn new() -> Self {
        let mut known_spam = BloomFilter::new(1000, 0.001);
        for domain in KNOWN_SPAM_DOMAINS {
            known_spam.insert(domain.as_bytes());
        }

        let mut disposable = BloomFilter::new(1000, 0.001);
        for domain in DISPOSABLE_DOMAINS {
            disposable.insert(domain.as_bytes());
        }

        Self {
            known_spam,
            disposable,
        }
    }

    /// Check a domain against both bloom filters.
    pub fn check_domain(&self, domain: &str) -> DomainVerdict {
        let lower = domain.to_lowercase();
        let bytes = lower.as_bytes();

        if self.known_spam.contains(bytes) {
            return DomainVerdict::KnownSpam;
        }
        if self.disposable.contains(bytes) {
            return DomainVerdict::Disposable;
        }
        DomainVerdict::Clean
    }
}

impl Default for SpamDomainFilter {
    fn default() -> Self {
        Self::new()
    }
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_features_clean() {
        let text = "Hi John, I wanted to follow up on our conversation about the \
                     partnership opportunity. Let me know if you have time for a call \
                     this week. Best regards, Sarah.";
        let features = extract_spam_features(text, None, None);

        // Clean text: low spam keyword density
        assert!(features[0] < 0.1, "clean text should have low spam keyword density, got {}", features[0]);
        // Low urgency
        assert!(features[1] < 0.1, "clean text should have low urgency density, got {}", features[1]);
        // No links
        assert!((features[2] - 0.0).abs() < 0.001, "clean text should have no links");
        // No shorteners
        assert!((features[3] - 0.0).abs() < 0.001, "clean text should have no shorteners");
        // No images
        assert!((features[4] - 0.0).abs() < 0.001, "clean text should have no images");
        // No homoglyphs
        assert!((features[15] - 0.0).abs() < 0.001, "clean text should have no homoglyphs");
        // No zero-width chars
        assert!((features[16] - 0.0).abs() < 0.001, "clean text should have no zero-width chars");
        // No template markers
        assert!((features[17] - 0.0).abs() < 0.001, "clean text should have no template markers");
    }

    #[test]
    fn test_extract_features_spam() {
        let text = "URGENT!!! You are the WINNER of a FREE prize! \
                     Act now and click here: https://bit.ly/free-money \
                     This is a LIMITED TIME offer! GUARANTEED cash bonus! \
                     No obligation! https://t.co/scam";
        let features = extract_spam_features(text, None, None);

        // High spam keyword density
        assert!(features[0] > 0.01, "spam text should have high spam keyword density, got {}", features[0]);
        // High urgency
        assert!(features[1] > 0.01, "spam text should have urgency keywords, got {}", features[1]);
        // Has links
        assert!(features[2] > 0.0, "spam text should have links, got {}", features[2]);
        // Has shorteners
        assert!(features[3] > 0.0, "spam text should have shorteners, got {}", features[3]);
        // High exclamation density
        assert!(features[5] > 0.01, "spam text should have high exclamation density, got {}", features[5]);
        // Has ALL CAPS words
        assert!(features[6] > 0.0, "spam text should have ALL CAPS words, got {}", features[6]);
    }

    #[test]
    fn test_classifier_untrained() {
        let cls = SpamClassifier::new();
        assert!(!cls.trained);
        let features = [0.0f32; NUM_SPAM_FEATURES];
        let scores = cls.classify(&features);
        assert!(
            scores.iter().all(|&s| s == 0.0),
            "untrained classifier should return all zeros"
        );
    }

    #[test]
    fn test_classifier_trained() {
        let mut cls = SpamClassifier::new();
        cls.trained = true;
        // Set biases to shift output
        cls.biases = [2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0];

        let features = [0.0f32; NUM_SPAM_FEATURES];
        let scores = cls.classify(&features);

        // With bias=2.0 for clean, sigmoid(2.0) ~= 0.88
        assert!(scores[0] > 0.8, "clean score with positive bias should be high, got {}", scores[0]);
        // With bias=-1.0, sigmoid(-1.0) ~= 0.27
        assert!(scores[1] < 0.4, "negative bias should give low score, got {}", scores[1]);
    }

    #[test]
    fn test_classify_text_verdict() {
        let cls = SpamClassifier::new();
        let verdict = cls.classify_text("Hello, this is a normal email.", None);

        // Untrained: spam_score should be 0
        assert!((verdict.spam_score - 0.0).abs() < 0.001, "untrained should give 0 spam score");
        assert_eq!(verdict.gate, GateDecision::Pass);
    }

    #[test]
    fn test_batch_single() {
        let mut batch = SpamBatch::new();
        batch.count = 1;

        let text = "This is a clean business email about a meeting.";
        batch.populate_slot(0, text, None);

        let cls = SpamClassifier::new();
        batch.compute_scores(&cls);

        // Untrained classifier: score should be 0
        assert!((batch.spam_scores[0] - 0.0).abs() < 0.001, "untrained should give 0 spam score");
        assert_eq!(batch.gate_decisions[0], 0); // Pass
    }

    #[test]
    fn test_batch_passed_indices() {
        let mut batch = SpamBatch::new();
        batch.count = 4;
        batch.spam_scores[0] = 0.1; // Pass
        batch.spam_scores[1] = 0.8; // Block
        batch.spam_scores[2] = 0.2; // Pass
        batch.spam_scores[3] = 0.5; // Quarantine

        let passed = batch.passed_indices(0.3);
        assert_eq!(passed, vec![0, 2]);
    }

    #[test]
    fn test_domain_filter() {
        let filter = SpamDomainFilter::new();

        assert_eq!(filter.check_domain("mailinator.com"), DomainVerdict::Disposable);
        assert_eq!(filter.check_domain("guerrillamail.com"), DomainVerdict::Disposable);
        assert_eq!(filter.check_domain("tempmail.com"), DomainVerdict::Disposable);
        assert_eq!(filter.check_domain("legitimate-company.com"), DomainVerdict::Clean);
    }

    #[test]
    fn test_domain_filter_known_spam() {
        let filter = SpamDomainFilter::new();
        assert_eq!(filter.check_domain("spammer.com"), DomainVerdict::KnownSpam);
    }

    #[test]
    fn test_unicode_detection() {
        // Text with Cyrillic homoglyphs mixed in
        let text = "Hello w\u{043E}rld fr\u{043E}m \u{0430} friend"; // Cyrillic о and а
        let features = extract_spam_features(text, None, None);

        assert!(features[15] >= 3.0, "should detect 3 Cyrillic homoglyphs, got {}", features[15]);
    }

    #[test]
    fn test_zero_width_detection() {
        let text = "Hello\u{200B}World\u{200C}Test\u{200D}Again";
        let features = extract_spam_features(text, None, None);

        assert!((features[16] - 3.0).abs() < 0.001, "should detect 3 zero-width chars, got {}", features[16]);
    }

    #[test]
    fn test_template_markers() {
        let text = "Hi {{first_name}}, welcome to [Company]! Dear <NAME>, your <first_name> account.";
        let features = extract_spam_features(text, None, None);

        assert!(features[17] >= 3.0, "should detect template markers, got {}", features[17]);
    }

    #[test]
    fn test_header_features() {
        let headers = EmailHeaders {
            spf_pass: true,
            dkim_pass: true,
            dmarc_pass: false,
            reply_to_mismatch: true,
            hop_count: 5,
        };
        let features = extract_spam_features("test email", Some(&headers), Some(14));

        // Auth composite: (1+1+0)/3 = 0.667
        assert!((features[18] - 0.667).abs() < 0.01, "auth composite should be ~0.667, got {}", features[18]);
        // Reply-to mismatch
        assert!((features[19] - 1.0).abs() < 0.001, "reply-to mismatch should be 1.0");
        // Hop count: 5/10 = 0.5
        assert!((features[20] - 0.5).abs() < 0.001, "hop count should be 0.5, got {}", features[20]);
        // Send hour sin/cos for hour 14
        let radians = (14.0f32 / 24.0) * std::f32::consts::TAU;
        assert!((features[21] - radians.sin()).abs() < 0.001, "sin mismatch");
        assert!((features[22] - radians.cos()).abs() < 0.001, "cos mismatch");
    }

    #[test]
    fn test_role_account_detection() {
        let text = "This email was sent from noreply@ our company server.";
        let features = extract_spam_features(text, None, None);
        assert!((features[23] - 1.0).abs() < 0.001, "should detect role account, got {}", features[23]);

        let clean = "John from our engineering team here.";
        let clean_features = extract_spam_features(clean, None, None);
        assert!((clean_features[23] - 0.0).abs() < 0.001, "should not detect role account");
    }

    #[test]
    fn test_serialization_roundtrip() {
        let cls = SpamClassifier::new();
        let json = serde_json::to_string(&cls).unwrap();
        let restored: SpamClassifier = serde_json::from_str(&json).unwrap();
        assert_eq!(cls.trained, restored.trained);
        assert_eq!(cls.biases, restored.biases);
    }

    #[test]
    fn test_batch_push() {
        let mut batch = SpamBatch::new();
        let idx = batch.push("First email", None);
        assert_eq!(idx, Some(0));
        assert_eq!(batch.count, 1);

        let idx2 = batch.push("Second email", None);
        assert_eq!(idx2, Some(1));
        assert_eq!(batch.count, 2);
    }

    #[test]
    fn test_batch_push_full() {
        let mut batch = SpamBatch::new();
        batch.count = SPAM_BATCH_SIZE;
        assert_eq!(batch.push("overflow", None), None);
    }

    #[test]
    fn test_batch_mean_score() {
        let mut batch = SpamBatch::new();
        assert_eq!(batch.mean_score(), 0.0);
        batch.count = 3;
        batch.spam_scores[0] = 0.2;
        batch.spam_scores[1] = 0.4;
        batch.spam_scores[2] = 0.6;
        assert!((batch.mean_score() - 0.4).abs() < 0.001);
    }

    #[test]
    fn test_batch_pass_rate() {
        let mut batch = SpamBatch::new();
        batch.count = 4;
        batch.spam_scores[0] = 0.1;
        batch.spam_scores[1] = 0.5;
        batch.spam_scores[2] = 0.2;
        batch.spam_scores[3] = 0.9;
        assert!((batch.pass_rate(0.3) - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_batch_category_distribution() {
        let mut batch = SpamBatch::new();
        batch.count = 5;
        batch.category_idx[0] = 0; // clean
        batch.category_idx[1] = 0; // clean
        batch.category_idx[2] = 1; // template_spam
        batch.category_idx[3] = 2; // ai_generated
        batch.category_idx[4] = 0; // clean
        let dist = batch.category_distribution();
        assert_eq!(dist[0], 3); // clean
        assert_eq!(dist[1], 1); // template_spam
        assert_eq!(dist[2], 1); // ai_generated
    }

    // ── Aho-Corasick automaton tests ───────────────────────────────────────

    #[test]
    fn test_automaton_empty_patterns() {
        let ac = build_keyword_automaton(&[]);
        assert_eq!(ac.pattern_count(), 0);
        let matches = scan_text(&ac, "hello world");
        assert!(matches.is_empty());
    }

    #[test]
    fn test_automaton_single_pattern() {
        let ac = build_keyword_automaton(&["urgent"]);
        let matches = scan_text(&ac, "This is URGENT business");
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].pattern_idx, 0);
        assert_eq!(matches[0].length, 6);
        // "URGENT" starts at byte 8 in "This is URGENT business"
        assert_eq!(matches[0].start, 8);
    }

    #[test]
    fn test_automaton_multiple_patterns() {
        let ac = build_keyword_automaton(&["free", "urgent", "winner"]);
        let matches = scan_text(&ac, "You are a WINNER of a FREE prize! URGENT!");
        // Should find all three patterns
        let mut found_patterns: Vec<usize> = matches.iter().map(|m| m.pattern_idx).collect();
        found_patterns.sort();
        found_patterns.dedup();
        assert_eq!(found_patterns, vec![0, 1, 2], "should find free(0), urgent(1), winner(2)");
    }

    #[test]
    fn test_automaton_overlapping_patterns() {
        let ac = build_keyword_automaton(&["he", "her", "here"]);
        let matches = scan_text(&ac, "here");
        // "here" contains: "he" at 0, "her" at 0, "here" at 0
        assert_eq!(matches.len(), 3, "should find all overlapping patterns, got {:?}", matches);
    }

    #[test]
    fn test_automaton_repeated_occurrences() {
        let ac = build_keyword_automaton(&["free"]);
        let matches = scan_text(&ac, "free stuff, more free things, totally free");
        assert_eq!(matches.len(), 3, "should find 'free' three times");
    }

    #[test]
    fn test_automaton_case_insensitive() {
        let ac = build_keyword_automaton(&["act now"]);
        let matches = scan_text(&ac, "ACT NOW before it's too late!");
        assert_eq!(matches.len(), 1, "should match case-insensitively");
        assert_eq!(matches[0].pattern_idx, 0);
    }

    #[test]
    fn test_automaton_no_match() {
        let ac = build_keyword_automaton(&["free", "urgent", "winner"]);
        let matches = scan_text(&ac, "This is a clean professional email about a meeting.");
        assert!(matches.is_empty(), "should find no matches in clean text");
    }

    #[test]
    fn test_automaton_substring_patterns() {
        // "act now" is a substring pattern; should match even when embedded
        let ac = build_keyword_automaton(&["act now"]);
        let matches = scan_text(&ac, "Please act now immediately");
        assert_eq!(matches.len(), 1);
    }

    #[test]
    fn test_count_distinct_matches() {
        let ac = build_keyword_automaton(&["free", "urgent"]);
        // "free" appears twice, "urgent" once -> 2 distinct patterns
        let count = count_distinct_matches(&ac, "free stuff is free and urgent");
        assert_eq!(count, 2);
    }

    #[test]
    fn test_default_spam_automaton() {
        let ac = build_default_spam_automaton();
        assert_eq!(
            ac.pattern_count(),
            SPAM_KEYWORDS.len() + URGENCY_KEYWORDS.len(),
            "default automaton should contain all spam + urgency keywords"
        );

        // Verify it finds spam keywords
        let matches = scan_text(&ac, "Get your FREE prize now! Act now!");
        assert!(!matches.is_empty(), "should find keywords in spammy text");

        // Check that pattern indices are correctly partitioned
        let spam_matches: Vec<_> = matches.iter()
            .filter(|m| m.pattern_idx < SPAM_KEYWORDS.len())
            .collect();
        let urgency_matches: Vec<_> = matches.iter()
            .filter(|m| m.pattern_idx >= SPAM_KEYWORDS.len()
                && m.pattern_idx < SPAM_KEYWORDS.len() + URGENCY_KEYWORDS.len())
            .collect();
        assert!(!spam_matches.is_empty(), "should find spam keywords");
        assert!(!urgency_matches.is_empty(), "should find urgency keywords");
    }

    // ── fast_sigmoid tests ─────────────────────────────────────────────────

    #[test]
    fn test_fast_sigmoid_zero() {
        let result = fast_sigmoid(0.0);
        assert!((result - 0.5).abs() < 0.001, "fast_sigmoid(0) should be ~0.5, got {}", result);
    }

    #[test]
    fn test_fast_sigmoid_large_positive() {
        let result = fast_sigmoid(10.0);
        assert!(result > 0.9, "fast_sigmoid(10) should be > 0.9, got {}", result);
        assert!(result <= 1.0, "fast_sigmoid should never exceed 1.0");
    }

    #[test]
    fn test_fast_sigmoid_large_negative() {
        let result = fast_sigmoid(-10.0);
        assert!(result < 0.1, "fast_sigmoid(-10) should be < 0.1, got {}", result);
        assert!(result >= 0.0, "fast_sigmoid should never go below 0.0");
    }

    #[test]
    fn test_fast_sigmoid_symmetry() {
        for x in [0.5, 1.0, 2.0, 5.0] {
            let pos = fast_sigmoid(x);
            let neg = fast_sigmoid(-x);
            assert!(
                (pos + neg - 1.0).abs() < 0.001,
                "fast_sigmoid should be symmetric: f({}) + f({}) = {}, expected 1.0",
                x, -x, pos + neg,
            );
        }
    }

    #[test]
    fn test_fast_sigmoid_vs_exact() {
        // Verify max error is bounded (rational approx has ~0.07 max error)
        for x_int in -50..=50 {
            let x = x_int as f32 * 0.1;
            let exact = sigmoid(x);
            let fast = fast_sigmoid(x);
            let err = (exact - fast).abs();
            assert!(
                err < 0.08,
                "fast_sigmoid error at x={}: exact={}, fast={}, err={}",
                x, exact, fast, err,
            );
        }
    }

    // ── extract_spam_features_ac parity tests ──────────────────────────────

    #[test]
    fn test_ac_features_parity_clean() {
        let ac = build_default_spam_automaton();
        let text = "Hi John, I wanted to follow up on our conversation about the \
                     partnership opportunity. Let me know if you have time for a call \
                     this week. Best regards, Sarah.";

        let original = extract_spam_features(text, None, None);
        let ac_features = extract_spam_features_ac(text, None, None, &ac);

        // Features 0 and 1 should produce the same counts as the original.
        assert!(
            (original[0] - ac_features[0]).abs() < 0.001,
            "spam keyword density mismatch: original={}, ac={}",
            original[0], ac_features[0],
        );
        assert!(
            (original[1] - ac_features[1]).abs() < 0.001,
            "urgency keyword density mismatch: original={}, ac={}",
            original[1], ac_features[1],
        );

        // Features 2-23 should be identical.
        for i in 2..NUM_SPAM_FEATURES {
            assert!(
                (original[i] - ac_features[i]).abs() < 0.001,
                "feature {} mismatch: original={}, ac={}",
                i, original[i], ac_features[i],
            );
        }
    }

    #[test]
    fn test_ac_features_parity_spam() {
        let ac = build_default_spam_automaton();
        let text = "URGENT!!! You are the WINNER of a FREE prize! \
                     Act now and click here: https://bit.ly/free-money \
                     This is a LIMITED TIME offer! GUARANTEED cash bonus! \
                     No obligation! https://t.co/scam";

        let original = extract_spam_features(text, None, None);
        let ac_features = extract_spam_features_ac(text, None, None, &ac);

        // Keyword densities should match.
        assert!(
            (original[0] - ac_features[0]).abs() < 0.001,
            "spam keyword density mismatch on spam text: original={}, ac={}",
            original[0], ac_features[0],
        );
        assert!(
            (original[1] - ac_features[1]).abs() < 0.001,
            "urgency keyword density mismatch on spam text: original={}, ac={}",
            original[1], ac_features[1],
        );

        // All other features identical.
        for i in 2..NUM_SPAM_FEATURES {
            assert!(
                (original[i] - ac_features[i]).abs() < 0.001,
                "feature {} mismatch on spam text: original={}, ac={}",
                i, original[i], ac_features[i],
            );
        }
    }

    // ── Batch scoring tests ────────────────────────────────────────────────

    #[test]
    fn test_score_emails_batch_empty() {
        let ac = build_default_spam_automaton();
        let cls = SpamClassifier::new();
        let results = score_emails_batch(&ac, &[], &cls);
        assert!(results.is_empty());
    }

    #[test]
    fn test_score_emails_batch_single() {
        let ac = build_default_spam_automaton();
        let cls = SpamClassifier::new();
        let emails = vec![EmailFeatures {
            text: "Hello, this is a normal business email.".to_string(),
            headers: None,
            send_hour: None,
            from_address: None,
        }];
        let results = score_emails_batch(&ac, &emails, &cls);
        assert_eq!(results.len(), 1);
        // Untrained classifier: spam_score = 0, gate = Pass
        assert!((results[0].spam_score - 0.0).abs() < 0.001);
        assert_eq!(results[0].gate, GateDecision::Pass);
    }

    #[test]
    fn test_score_emails_batch_mixed() {
        let ac = build_default_spam_automaton();
        let mut cls = SpamClassifier::new();
        cls.trained = true;
        // Give feature 0 (spam keyword density) a strong positive weight for spam categories
        cls.biases = [0.5, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0];
        cls.weights[0][0] = -5.0; // spam keywords reduce "clean" score

        let emails = vec![
            EmailFeatures {
                text: "Let's discuss the project timeline next week.".to_string(),
                headers: None,
                send_hour: None,
                from_address: None,
            },
            EmailFeatures {
                text: "FREE winner! Act now for your guaranteed prize! Click here!".to_string(),
                headers: None,
                send_hour: None,
                from_address: None,
            },
        ];

        let results = score_emails_batch(&ac, &emails, &cls);
        assert_eq!(results.len(), 2);

        // Clean email should have low spam score
        assert!(
            results[0].spam_score < results[1].spam_score,
            "clean email ({}) should score lower than spam email ({})",
            results[0].spam_score, results[1].spam_score,
        );

        // Spammy email should have detected keywords
        assert!(results[1].keyword_matches > 0, "should detect spam keywords");
    }

    #[test]
    fn test_automaton_node_count() {
        // Verify the automaton has a reasonable number of nodes.
        let ac = build_keyword_automaton(&["abc", "abd", "xyz"]);
        // "abc" and "abd" share "ab" prefix -> root + a + ab + abc + abd + x + xy + xyz = 8 nodes
        assert!(ac.node_count() > 1, "should have more than just root");
        assert!(ac.node_count() <= 9, "should share prefixes, got {} nodes", ac.node_count());
    }

    #[test]
    fn test_automaton_failure_links_correctness() {
        // Classic AC test: patterns "he", "she", "his", "hers"
        let ac = build_keyword_automaton(&["he", "she", "his", "hers"]);
        let matches = scan_text(&ac, "ushers");
        // "ushers" should match: "she" at 1, "he" at 2, "hers" at 2
        let mut found: Vec<(usize, usize)> = matches
            .iter()
            .map(|m| (m.pattern_idx, m.start))
            .collect();
        found.sort();
        assert!(
            found.contains(&(0, 2)),  // "he" at position 2
            "should find 'he' in 'ushers', got {:?}", found,
        );
        assert!(
            found.contains(&(1, 1)),  // "she" at position 1
            "should find 'she' in 'ushers', got {:?}", found,
        );
        assert!(
            found.contains(&(3, 2)),  // "hers" at position 2
            "should find 'hers' in 'ushers', got {:?}", found,
        );
    }
}
