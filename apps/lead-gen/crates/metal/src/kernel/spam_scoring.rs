use serde::{Deserialize, Serialize};

use crate::bloom::BloomFilter;

// ── Constants ───────────────────────────────────────────────────────────────

pub const NUM_SPAM_FEATURES: usize = 24;
pub const NUM_SPAM_LABELS: usize = 7;
pub const SPAM_BATCH_SIZE: usize = 256;

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

    // Feature 6: ALL CAPS ratio
    let caps_words = words
        .iter()
        .filter(|w| {
            w.len() > 1
                && w.chars().all(|c| !c.is_alphabetic() || c.is_uppercase())
                && w.chars().any(|c| c.is_alphabetic())
        })
        .count();
    // Use the original text words for caps detection
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
    // Suppress unused variable warning
    let _ = caps_words;

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
}
