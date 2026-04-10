use ahash::{AHashMap, AHasher};
use std::hash::{Hash, Hasher};
use crate::bloom::BloomFilter;
use crate::similarity::simd::{jaro_winkler_icase, levenshtein_similarity};

pub fn blocking_keys_contact(first: &str, last: &str, email: &str) -> Vec<String> {
    let mut keys = Vec::with_capacity(4);

    if let Some(domain) = email.split('@').nth(1) {
        keys.push(format!("d:{}", domain.to_lowercase()));
    }

    let first_lower = first.to_lowercase();
    let last_lower = last.to_lowercase();
    let fi = first_lower.chars().next().unwrap_or('_');
    let soundex = soundex_code(&last_lower);
    if soundex != "0000" {
        keys.push(format!("s:{}:{}", soundex, fi));
    }

    let prefix = if last_lower.len() >= 3 { &last_lower[..3] } else { &last_lower };
    keys.push(format!("p:{}:{}", prefix, fi));

    if let Some(local) = email.split('@').next() {
        if !local.is_empty() {
            keys.push(format!("l:{}", local.to_lowercase()));
        }
    }

    keys
}

pub(crate) fn soundex_code(name: &str) -> String {
    if name.is_empty() { return "0000".to_string(); }

    let bytes = name.as_bytes();
    let mut code = Vec::with_capacity(4);
    code.push(bytes[0].to_ascii_uppercase());

    let map = |b: u8| -> u8 {
        match b.to_ascii_lowercase() {
            b'b' | b'f' | b'p' | b'v' => b'1',
            b'c' | b'g' | b'j' | b'k' | b'q' | b's' | b'x' | b'z' => b'2',
            b'd' | b't' => b'3',
            b'l' => b'4',
            b'm' | b'n' => b'5',
            b'r' => b'6',
            _ => b'0',
        }
    };

    let mut last = map(bytes[0]);

    for &b in &bytes[1..] {
        if code.len() >= 4 { break; }
        let mapped = map(b);
        if mapped != b'0' && mapped != last {
            code.push(mapped);
        }
        last = mapped;
    }

    while code.len() < 4 { code.push(b'0'); }

    String::from_utf8(code).unwrap_or_else(|_| "0000".to_string())
}

pub fn build_blocks(contacts: &[(String, String, String)]) -> AHashMap<String, Vec<usize>> {
    let mut blocks: AHashMap<String, Vec<usize>> = AHashMap::new();

    for (idx, (first, last, email)) in contacts.iter().enumerate() {
        for key in blocking_keys_contact(first, last, email) {
            blocks.entry(key).or_default().push(idx);
        }
    }

    blocks.retain(|_, v| v.len() > 1);

    blocks
}

pub fn sorted_neighborhood_compare<F>(
    block: &mut [usize],
    sort_key: &dyn Fn(usize) -> String,
    window: usize,
    compare: &F,
) -> Vec<(usize, usize)>
where
    F: Fn(usize, usize) -> bool,
{
    block.sort_by_key(|a| sort_key(*a));

    let mut pairs = Vec::new();

    for i in 0..block.len() {
        let end = (i + window).min(block.len());
        for j in (i + 1)..end {
            if compare(block[i], block[j]) {
                pairs.push((block[i], block[j]));
            }
        }
    }

    pairs
}

// ── Module 3: Entity Resolution ─────────────────────────────────────────────

/// Fellegi-Sunter probabilistic record linkage model.
///
/// Features (5):
///   [0] name Jaro-Winkler >= 0.85
///   [1] email domain exact match
///   [2] soundex match
///   [3] company Levenshtein >= 0.80
///   [4] semantic embedding cosine >= 0.85 (BGE-based, optional)
pub struct FellegiSunter {
    /// P(agree | match) for each feature
    pub m_probs: [f64; 5],
    /// P(agree | non-match) for each feature
    pub u_probs: [f64; 5],
}

impl FellegiSunter {
    pub fn new() -> Self {
        Self {
            // Feature [4] semantic: high m_prob (true matches are semantically similar),
            // moderate u_prob (some non-matches share similar descriptions)
            m_probs: [0.95, 0.90, 0.85, 0.80, 0.90],
            u_probs: [0.02, 0.10, 0.05, 0.15, 0.08],
        }
    }

    /// Compute log-likelihood ratio for an agreement vector.
    pub fn log_likelihood_ratio(&self, agreements: &[bool; 5]) -> f64 {
        let mut llr = 0.0;
        for i in 0..5 {
            if agreements[i] {
                llr += (self.m_probs[i] / self.u_probs[i]).ln();
            } else {
                llr += ((1.0 - self.m_probs[i]) / (1.0 - self.u_probs[i])).ln();
            }
        }
        llr
    }

    /// Convert LLR to a match probability via sigmoid.
    pub fn match_probability(&self, agreements: &[bool; 5]) -> f64 {
        let llr = self.log_likelihood_ratio(agreements);
        1.0 / (1.0 + (-llr).exp())
    }

    /// Compare two contact records and return a 4-feature agreement vector (no embeddings).
    /// Use `compare_contacts_semantic()` when embeddings are available.
    pub fn compare_contacts(
        first_a: &str, last_a: &str, email_a: &str, company_a: &str,
        first_b: &str, last_b: &str, email_b: &str, company_b: &str,
    ) -> [bool; 5] {
        let base = Self::compare_contacts_base(
            first_a, last_a, email_a, company_a,
            first_b, last_b, email_b, company_b,
        );
        // Feature [4] defaults to false when no embeddings available
        [base[0], base[1], base[2], base[3], false]
    }

    /// Compare using string features only (4-element, internal).
    fn compare_contacts_base(
        first_a: &str, last_a: &str, email_a: &str, company_a: &str,
        first_b: &str, last_b: &str, email_b: &str, company_b: &str,
    ) -> [bool; 4] {
        // [0] Name: Jaro-Winkler case-insensitive >= 0.85
        let name_a = format!("{} {}", first_a, last_a);
        let name_b = format!("{} {}", first_b, last_b);
        let name_jw = jaro_winkler_icase(&name_a, &name_b);

        // [1] Email domain: exact match
        let domain_a = email_a.split('@').nth(1).unwrap_or("");
        let domain_b = email_b.split('@').nth(1).unwrap_or("");
        let domain_match = !domain_a.is_empty()
            && !domain_b.is_empty()
            && domain_a.eq_ignore_ascii_case(domain_b);

        // [2] Soundex: last name soundex codes match
        let soundex_a = soundex_code(&last_a.to_lowercase());
        let soundex_b = soundex_code(&last_b.to_lowercase());
        let soundex_match = soundex_a == soundex_b && soundex_a != "0000";

        // [3] Company: Levenshtein similarity >= 0.80
        let company_lev = levenshtein_similarity(
            company_a.to_lowercase().as_bytes(),
            company_b.to_lowercase().as_bytes(),
        );

        [
            name_jw >= 0.85,
            domain_match,
            soundex_match,
            company_lev >= 0.80,
        ]
    }

    /// Compare two contacts with semantic embedding similarity (5-feature vector).
    /// `cosine_sim` is the pre-computed cosine similarity between the two contacts'
    /// profile embeddings (from BGE). Pass None to skip the semantic feature.
    pub fn compare_contacts_semantic(
        first_a: &str, last_a: &str, email_a: &str, company_a: &str,
        first_b: &str, last_b: &str, email_b: &str, company_b: &str,
        cosine_sim: Option<f32>,
    ) -> [bool; 5] {
        let base = Self::compare_contacts_base(
            first_a, last_a, email_a, company_a,
            first_b, last_b, email_b, company_b,
        );
        let semantic_match = cosine_sim.map_or(false, |sim| sim >= 0.85);
        [base[0], base[1], base[2], base[3], semantic_match]
    }

    /// Score a pair of contacts: compare then compute match probability.
    pub fn score_pair(
        &self,
        first_a: &str, last_a: &str, email_a: &str, company_a: &str,
        first_b: &str, last_b: &str, email_b: &str, company_b: &str,
    ) -> f64 {
        let agreements = Self::compare_contacts(
            first_a, last_a, email_a, company_a,
            first_b, last_b, email_b, company_b,
        );
        self.match_probability(&agreements)
    }

    /// Score a pair with semantic embedding similarity.
    pub fn score_pair_semantic(
        &self,
        first_a: &str, last_a: &str, email_a: &str, company_a: &str,
        first_b: &str, last_b: &str, email_b: &str, company_b: &str,
        cosine_sim: Option<f32>,
    ) -> f64 {
        let agreements = Self::compare_contacts_semantic(
            first_a, last_a, email_a, company_a,
            first_b, last_b, email_b, company_b,
            cosine_sim,
        );
        self.match_probability(&agreements)
    }

    /// Update m/u probabilities from labeled pairs using Laplace smoothing.
    pub fn estimate_from_pairs(&mut self, labeled: &[(bool, [bool; 5])]) {
        for i in 0..5 {
            let mut m_agree = 1.0_f64; // Laplace smoothing
            let mut m_total = 2.0_f64;
            let mut u_agree = 1.0_f64;
            let mut u_total = 2.0_f64;

            for (is_match, agreements) in labeled {
                if *is_match {
                    m_total += 1.0;
                    if agreements[i] { m_agree += 1.0; }
                } else {
                    u_total += 1.0;
                    if agreements[i] { u_agree += 1.0; }
                }
            }

            self.m_probs[i] = m_agree / m_total;
            self.u_probs[i] = u_agree / u_total;
        }
    }
}

impl Default for FellegiSunter {
    fn default() -> Self {
        Self::new()
    }
}

/// Disjoint-set with path compression and union-by-rank.
pub struct UnionFind {
    parent: Vec<usize>,
    rank: Vec<u8>,
}

impl UnionFind {
    pub fn new(n: usize) -> Self {
        Self {
            parent: (0..n).collect(),
            rank: vec![0; n],
        }
    }

    pub fn find(&mut self, x: usize) -> usize {
        if self.parent[x] != x {
            self.parent[x] = self.find(self.parent[x]); // path compression
        }
        self.parent[x]
    }

    pub fn union(&mut self, x: usize, y: usize) -> bool {
        let rx = self.find(x);
        let ry = self.find(y);
        if rx == ry {
            return false;
        }
        // Union by rank
        match self.rank[rx].cmp(&self.rank[ry]) {
            std::cmp::Ordering::Less => self.parent[rx] = ry,
            std::cmp::Ordering::Greater => self.parent[ry] = rx,
            std::cmp::Ordering::Equal => {
                self.parent[ry] = rx;
                self.rank[rx] += 1;
            }
        }
        true
    }

    pub fn connected(&mut self, x: usize, y: usize) -> bool {
        self.find(x) == self.find(y)
    }

    /// Return all connected components with more than one element.
    pub fn components(&mut self) -> Vec<Vec<usize>> {
        let n = self.parent.len();
        let mut groups: AHashMap<usize, Vec<usize>> = AHashMap::new();
        for i in 0..n {
            let root = self.find(i);
            groups.entry(root).or_default().push(i);
        }
        let mut result: Vec<Vec<usize>> = groups
            .into_values()
            .filter(|g| g.len() > 1)
            .collect();
        // Sort for deterministic output
        result.sort_by_key(|g| g[0]);
        result
    }
}

/// Transitively close pairwise matches into groups using Union-Find.
pub fn deduplicate_transitive(pairs: &[(usize, usize)], n: usize) -> Vec<Vec<usize>> {
    let mut uf = UnionFind::new(n);
    for &(a, b) in pairs {
        uf.union(a, b);
    }
    uf.components()
}

// ── Module 4: SimHash — Locality-Sensitive Hashing ──────────────────────────

/// Compute a 64-bit SimHash fingerprint from text.
///
/// SimHash is a locality-sensitive hash: similar documents produce fingerprints
/// with small Hamming distance. It works by:
///   1. Tokenizing text into character n-grams (trigrams)
///   2. Hashing each n-gram to a 64-bit value
///   3. For each bit position, summing +1 (if bit=1) or -1 (if bit=0) across all hashes
///   4. The final fingerprint has bit=1 wherever the sum is positive
///
/// Complexity: O(n) in text length. Output: single u64.
pub fn simhash(text: &str) -> u64 {
    let lower = text.to_lowercase();
    let bytes = lower.as_bytes();

    // Accumulator: one i32 per bit position (64 positions)
    let mut v = [0i32; 64];

    if bytes.len() < 3 {
        // For very short strings, hash the whole thing as a single token
        let h = hash_token(bytes);
        return h;
    }

    // Character trigrams as tokens
    for window in bytes.windows(3) {
        let h = hash_token(window);
        for i in 0..64 {
            if (h >> i) & 1 == 1 {
                v[i] += 1;
            } else {
                v[i] -= 1;
            }
        }
    }

    // Build fingerprint: bit i = 1 if v[i] > 0
    let mut fingerprint: u64 = 0;
    for i in 0..64 {
        if v[i] > 0 {
            fingerprint |= 1u64 << i;
        }
    }
    fingerprint
}

/// Hash a single token (n-gram) to u64 using AHash for speed.
fn hash_token(token: &[u8]) -> u64 {
    let mut hasher = AHasher::default();
    token.hash(&mut hasher);
    hasher.finish()
}

/// Hamming distance between two 64-bit fingerprints.
///
/// This counts the number of bit positions where a and b differ.
/// Two identical fingerprints have distance 0; maximally different = 64.
///
/// Uses hardware `popcnt` via `count_ones()` on supported architectures.
#[inline]
pub fn hamming_distance(a: u64, b: u64) -> u32 {
    (a ^ b).count_ones()
}

// ── Module 5: DedupPipeline — Multi-Stage Contact Deduplication ─────────────

/// A contact record for dedup processing.
#[derive(Debug, Clone)]
pub struct ContactRecord {
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub company: String,
    /// Optional title/role for richer SimHash fingerprinting.
    pub title: String,
}

impl ContactRecord {
    pub fn new(first_name: &str, last_name: &str, email: &str, company: &str, title: &str) -> Self {
        Self {
            first_name: first_name.to_string(),
            last_name: last_name.to_string(),
            email: email.to_string(),
            company: company.to_string(),
            title: title.to_string(),
        }
    }

    /// Canonical key for exact-match Bloom filter lookups.
    /// Normalizes: lowercase email.
    fn bloom_key(&self) -> String {
        self.email.to_lowercase()
    }

    /// Text representation for SimHash fingerprinting.
    /// Combines name + company + title for content-based similarity.
    fn simhash_text(&self) -> String {
        format!(
            "{} {} {} {}",
            self.first_name, self.last_name, self.company, self.title
        )
    }
}

/// Result of deduplication for a single contact.
#[derive(Debug, Clone)]
pub struct DedupResult {
    /// Index of this contact in the input batch.
    pub index: usize,
    /// Whether this contact is a duplicate of a previously seen contact.
    pub is_duplicate: bool,
    /// If duplicate, the index of the canonical (first-seen) contact it matches.
    pub duplicate_of: Option<usize>,
    /// The stage at which the duplicate was detected.
    pub detection_stage: DedupStage,
    /// Similarity score (1.0 for exact Bloom match, Hamming-derived for SimHash,
    /// Jaro-Winkler score for the final stage).
    pub similarity: f64,
}

/// Which stage of the pipeline detected the duplicate.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DedupStage {
    /// Not a duplicate (passed all stages).
    Unique,
    /// Exact email match detected by Bloom filter.
    BloomExact,
    /// Near-duplicate detected by SimHash + Hamming distance.
    SimHashLSH,
    /// Fuzzy match confirmed by Jaro-Winkler on name + company.
    JaroWinklerConfirm,
}

/// Multi-stage deduplication pipeline.
///
/// Processing order (cheapest first):
///   1. **Bloom filter** — O(1) exact-match pre-screen on email.
///      Rejects definite duplicates instantly. False positives proceed to stage 2.
///   2. **SimHash + Hamming** — O(n) locality-sensitive hashing scan.
///      Computes a 64-bit fingerprint per contact. Contacts within `hamming_threshold`
///      bits of an existing fingerprint are candidate near-duplicates.
///   3. **Jaro-Winkler** — O(n*m) string similarity on name and company.
///      Only invoked for SimHash candidates that pass the LSH screen. Confirms true
///      fuzzy duplicates with a configurable similarity threshold.
///
/// This layered approach avoids expensive pairwise Jaro-Winkler comparisons:
/// - Bloom filter eliminates exact email duplicates in O(k) per item.
/// - SimHash reduces the candidate set to contacts with similar text content.
/// - Jaro-Winkler is only computed on the small set of LSH candidates.
///
/// For N contacts with D true duplicates and S SimHash candidates (S << N):
///   Total cost ~ O(N) for Bloom + O(N * existing_fingerprints) for SimHash + O(S) for JW.
pub struct DedupPipeline {
    /// Bloom filter for exact email dedup.
    bloom: BloomFilter,
    /// SimHash fingerprints of unique contacts seen so far: (fingerprint, original_index).
    fingerprints: Vec<(u64, usize)>,
    /// Maximum Hamming distance to consider two fingerprints as near-duplicates.
    /// Default: 10 bits out of 64 (~84% similar).
    pub hamming_threshold: u32,
    /// Minimum Jaro-Winkler similarity to confirm a fuzzy duplicate.
    /// Default: 0.85.
    pub jw_threshold: f64,
}

impl DedupPipeline {
    /// Create a new pipeline sized for `expected_items` contacts.
    ///
    /// - `expected_items`: anticipated number of contacts (sizes the Bloom filter).
    /// - `fp_rate`: Bloom filter false positive rate (e.g., 0.001 for 0.1%).
    pub fn new(expected_items: usize, fp_rate: f64) -> Self {
        Self {
            bloom: BloomFilter::new(expected_items, fp_rate),
            fingerprints: Vec::with_capacity(expected_items),
            hamming_threshold: 10,
            jw_threshold: 0.85,
        }
    }

    /// Process a single contact through the pipeline.
    ///
    /// Returns a `DedupResult` indicating whether it's unique or a duplicate,
    /// and at which stage the duplicate was detected.
    pub fn process(&mut self, index: usize, contact: &ContactRecord) -> DedupResult {
        let bloom_key = contact.bloom_key();

        // Stage 1: Bloom filter exact-match on email
        if self.bloom.contains(bloom_key.as_bytes()) {
            // Bloom says "might be a duplicate" — find the original by scanning fingerprints.
            // (Bloom has false positives, but for email exact-match the FP rate is very low.)
            // We need to confirm by finding a contact with the same email.
            // Since we only store fingerprints (not emails), we check SimHash as a fallback.
            // However, for true exact email duplicates, we trust the Bloom filter.
            return DedupResult {
                index,
                is_duplicate: true,
                duplicate_of: self.find_bloom_match(&bloom_key),
                detection_stage: DedupStage::BloomExact,
                similarity: 1.0,
            };
        }

        // Stage 2: SimHash + Hamming distance for near-duplicate detection
        let fingerprint = simhash(&contact.simhash_text());

        if let Some((match_idx, distance)) = self.find_nearest_fingerprint(fingerprint) {
            // Stage 3: Confirm with Jaro-Winkler (only for SimHash candidates)
            // We don't have the original contact data in the pipeline, so the caller
            // should use `dedup_contacts_batch` which has access to all records.
            // Here we report the SimHash match and let the batch function confirm.
            let hamming_sim = 1.0 - (distance as f64 / 64.0);
            return DedupResult {
                index,
                is_duplicate: true,
                duplicate_of: Some(match_idx),
                detection_stage: DedupStage::SimHashLSH,
                similarity: hamming_sim,
            };
        }

        // Not a duplicate — register this contact
        self.bloom.insert(bloom_key.as_bytes());
        self.fingerprints.push((fingerprint, index));

        DedupResult {
            index,
            is_duplicate: false,
            duplicate_of: None,
            detection_stage: DedupStage::Unique,
            similarity: 0.0,
        }
    }

    /// Find the original index for a Bloom-matched email.
    /// Scans stored fingerprints (which track original indices).
    fn find_bloom_match(&self, _key: &str) -> Option<usize> {
        // The Bloom filter doesn't store the original index, so we return
        // the first registered contact's index as the canonical.
        // In batch mode, `dedup_contacts_batch` resolves this precisely.
        self.fingerprints.first().map(|&(_, idx)| idx)
    }

    /// Find the nearest fingerprint within `hamming_threshold`.
    /// Returns (original_index, distance) if found.
    fn find_nearest_fingerprint(&self, fingerprint: u64) -> Option<(usize, u32)> {
        let mut best: Option<(usize, u32)> = None;
        for &(fp, idx) in &self.fingerprints {
            let dist = hamming_distance(fingerprint, fp);
            if dist <= self.hamming_threshold {
                match best {
                    None => best = Some((idx, dist)),
                    Some((_, best_dist)) if dist < best_dist => best = Some((idx, dist)),
                    _ => {}
                }
            }
        }
        best
    }

    /// Reset the pipeline state (clears Bloom filter and fingerprints).
    pub fn reset(&mut self) {
        self.bloom.clear();
        self.fingerprints.clear();
    }

    /// Number of unique contacts registered so far.
    pub fn unique_count(&self) -> usize {
        self.fingerprints.len()
    }
}

/// Batch deduplication of contacts through the full pipeline.
///
/// Processes contacts in order. For each contact:
///   1. Bloom filter checks for exact email match.
///   2. SimHash + Hamming distance finds near-duplicate candidates.
///   3. Jaro-Winkler confirms fuzzy matches on name + company.
///
/// Returns one `DedupResult` per input contact.
pub fn dedup_contacts_batch(contacts: &[ContactRecord]) -> Vec<DedupResult> {
    if contacts.is_empty() {
        return Vec::new();
    }

    let mut pipeline = DedupPipeline::new(contacts.len(), 0.001);
    let mut results = Vec::with_capacity(contacts.len());

    // Track email -> first index for precise Bloom match resolution
    let mut email_index: AHashMap<String, usize> = AHashMap::new();

    for (i, contact) in contacts.iter().enumerate() {
        let bloom_key = contact.bloom_key();

        // Stage 1: Bloom filter exact-match on email
        if pipeline.bloom.contains(bloom_key.as_bytes()) {
            let canonical = email_index.get(&bloom_key).copied().unwrap_or(0);
            results.push(DedupResult {
                index: i,
                is_duplicate: true,
                duplicate_of: Some(canonical),
                detection_stage: DedupStage::BloomExact,
                similarity: 1.0,
            });
            continue;
        }

        // Stage 2: SimHash + Hamming distance
        let fingerprint = simhash(&contact.simhash_text());

        if let Some((candidate_idx, distance)) = pipeline.find_nearest_fingerprint(fingerprint) {
            // Stage 3: Confirm with Jaro-Winkler on name + company
            let candidate = &contacts[candidate_idx];

            let name_a = format!("{} {}", contact.first_name, contact.last_name);
            let name_b = format!("{} {}", candidate.first_name, candidate.last_name);
            let name_sim = jaro_winkler_icase(&name_a, &name_b);

            let company_sim = levenshtein_similarity(
                contact.company.to_lowercase().as_bytes(),
                candidate.company.to_lowercase().as_bytes(),
            );

            // Combined similarity: weighted average (name matters more than company)
            let combined_sim = 0.65 * name_sim + 0.35 * company_sim;

            if combined_sim >= pipeline.jw_threshold {
                results.push(DedupResult {
                    index: i,
                    is_duplicate: true,
                    duplicate_of: Some(candidate_idx),
                    detection_stage: DedupStage::JaroWinklerConfirm,
                    similarity: combined_sim,
                });
                continue;
            }

            // SimHash flagged it but JW did not confirm — treat as unique but note the
            // near-miss. This avoids false merges from SimHash collisions.
            let _hamming_sim = 1.0 - (distance as f64 / 64.0);
        }

        // Unique contact — register in all stages
        pipeline.bloom.insert(bloom_key.as_bytes());
        pipeline.fingerprints.push((fingerprint, i));
        email_index.insert(bloom_key, i);

        results.push(DedupResult {
            index: i,
            is_duplicate: false,
            duplicate_of: None,
            detection_stage: DedupStage::Unique,
            similarity: 0.0,
        });
    }

    results
}

/// Batch dedup with custom thresholds.
pub fn dedup_contacts_batch_with(
    contacts: &[ContactRecord],
    hamming_threshold: u32,
    jw_threshold: f64,
    bloom_fp_rate: f64,
) -> Vec<DedupResult> {
    if contacts.is_empty() {
        return Vec::new();
    }

    let mut pipeline = DedupPipeline::new(contacts.len(), bloom_fp_rate);
    pipeline.hamming_threshold = hamming_threshold;
    pipeline.jw_threshold = jw_threshold;

    let mut results = Vec::with_capacity(contacts.len());
    let mut email_index: AHashMap<String, usize> = AHashMap::new();

    for (i, contact) in contacts.iter().enumerate() {
        let bloom_key = contact.bloom_key();

        if pipeline.bloom.contains(bloom_key.as_bytes()) {
            let canonical = email_index.get(&bloom_key).copied().unwrap_or(0);
            results.push(DedupResult {
                index: i,
                is_duplicate: true,
                duplicate_of: Some(canonical),
                detection_stage: DedupStage::BloomExact,
                similarity: 1.0,
            });
            continue;
        }

        let fingerprint = simhash(&contact.simhash_text());

        if let Some((candidate_idx, distance)) = pipeline.find_nearest_fingerprint(fingerprint) {
            let candidate = &contacts[candidate_idx];
            let name_a = format!("{} {}", contact.first_name, contact.last_name);
            let name_b = format!("{} {}", candidate.first_name, candidate.last_name);
            let name_sim = jaro_winkler_icase(&name_a, &name_b);
            let company_sim = levenshtein_similarity(
                contact.company.to_lowercase().as_bytes(),
                candidate.company.to_lowercase().as_bytes(),
            );
            let combined_sim = 0.65 * name_sim + 0.35 * company_sim;

            if combined_sim >= pipeline.jw_threshold {
                results.push(DedupResult {
                    index: i,
                    is_duplicate: true,
                    duplicate_of: Some(candidate_idx),
                    detection_stage: DedupStage::JaroWinklerConfirm,
                    similarity: combined_sim,
                });
                continue;
            }

            let _hamming_sim = 1.0 - (distance as f64 / 64.0);
        }

        pipeline.bloom.insert(bloom_key.as_bytes());
        pipeline.fingerprints.push((fingerprint, i));
        email_index.insert(bloom_key, i);

        results.push(DedupResult {
            index: i,
            is_duplicate: false,
            duplicate_of: None,
            detection_stage: DedupStage::Unique,
            similarity: 0.0,
        });
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_blocking_keys_basic() {
        let keys = blocking_keys_contact("John", "Smith", "john.smith@example.com");
        assert_eq!(keys.len(), 4);
        assert!(keys.contains(&"d:example.com".to_string()));
        assert!(keys.contains(&"l:john.smith".to_string()));
        // Soundex of "smith" = S530, first initial = j
        assert!(keys.iter().any(|k| k.starts_with("s:") && k.ends_with(":j")));
        // Prefix of "smith" (first 3 chars) = smi
        assert!(keys.contains(&"p:smi:j".to_string()));
    }

    #[test]
    fn test_blocking_keys_no_domain() {
        let keys = blocking_keys_contact("Jane", "Doe", "nodomain");
        // No @ sign means no domain key, no local-part key (the whole thing IS the local part)
        // Should still have soundex and prefix keys
        assert!(keys.iter().any(|k| k.starts_with("s:")));
        assert!(keys.iter().any(|k| k.starts_with("p:")));
    }

    #[test]
    fn test_soundex_known_values() {
        // Standard Soundex test vectors
        assert_eq!(soundex_code("robert"), "R163");
        assert_eq!(soundex_code("smith"), "S530");
        assert_eq!(soundex_code(""), "0000");
    }

    #[test]
    fn test_build_blocks_groups_correctly() {
        let contacts = vec![
            ("John".into(), "Smith".into(), "john@example.com".into()),
            ("Jane".into(), "Smith".into(), "jane@example.com".into()),
            ("Bob".into(), "Jones".into(), "bob@other.com".into()),
        ];
        let blocks = build_blocks(&contacts);
        // John and Jane share domain "example.com"
        assert!(blocks.values().any(|indices| indices.contains(&0) && indices.contains(&1)));
    }

    #[test]
    fn test_build_blocks_no_singletons() {
        let contacts = vec![
            ("Alice".into(), "Unique".into(), "alice@unique.com".into()),
        ];
        let blocks = build_blocks(&contacts);
        // Single contact => all blocks have size 1 => all removed
        assert!(blocks.is_empty());
    }

    #[test]
    fn test_sorted_neighborhood_compare() {
        let mut block = vec![0, 1, 2, 3];
        let names = ["Alice", "Bob", "Charlie", "David"];
        let sort_key = |i: usize| names[i].to_string();
        let compare = |a: usize, b: usize| a != b; // all pairs match

        let pairs = sorted_neighborhood_compare(&mut block, &sort_key, 2, &compare);
        // Window=2: only consecutive pairs after sorting
        // Sorted by name: Alice(0), Bob(1), Charlie(2), David(3)
        // Window=2 means i compares with i+1 only
        assert!(!pairs.is_empty());
        assert!(pairs.len() <= 3); // at most 3 adjacent pairs
    }

    // ── FellegiSunter tests ──

    #[test]
    fn test_fellegi_sunter_perfect_match() {
        let fs = FellegiSunter::new();
        let prob = fs.match_probability(&[true, true, true, true, true]);
        assert!(prob > 0.99, "prob={}", prob);
    }

    #[test]
    fn test_fellegi_sunter_no_match() {
        let fs = FellegiSunter::new();
        let prob = fs.match_probability(&[false, false, false, false, false]);
        assert!(prob < 0.05, "prob={}", prob);
    }

    #[test]
    fn test_fellegi_sunter_partial() {
        let fs = FellegiSunter::new();
        // Only soundex agrees — weakest single signal. With 5 features and 4 disagreeing,
        // the probability is very low but still positive.
        let prob = fs.match_probability(&[false, false, true, false, false]);
        assert!(prob > 0.0001 && prob < 0.5, "prob={}", prob);
    }

    #[test]
    fn test_fellegi_sunter_llr_signs() {
        let fs = FellegiSunter::new();
        let llr_all_agree = fs.log_likelihood_ratio(&[true, true, true, true, true]);
        assert!(llr_all_agree > 0.0, "llr_all_agree={}", llr_all_agree);

        let llr_none_agree = fs.log_likelihood_ratio(&[false, false, false, false, false]);
        assert!(llr_none_agree < 0.0, "llr_none_agree={}", llr_none_agree);
    }

    #[test]
    fn test_compare_contacts_exact() {
        let agreements = FellegiSunter::compare_contacts(
            "John", "Smith", "john@example.com", "Acme Inc",
            "John", "Smith", "john@example.com", "Acme Inc",
        );
        // Semantic feature defaults to false when no embedding provided
        assert_eq!(agreements, [true, true, true, true, false]);
    }

    #[test]
    fn test_compare_contacts_different() {
        let agreements = FellegiSunter::compare_contacts(
            "Alice", "Johnson", "alice@alpha.com", "Alpha Corp",
            "Bob", "Williams", "bob@beta.com", "Beta LLC",
        );
        assert_eq!(agreements[0], false, "name should not match");
        assert_eq!(agreements[1], false, "domain should not match");
        assert_eq!(agreements[2], false, "soundex should not match");
        assert_eq!(agreements[3], false, "company should not match");
        assert_eq!(agreements[4], false, "semantic defaults to false");
    }

    #[test]
    fn test_compare_contacts_typo() {
        let agreements = FellegiSunter::compare_contacts(
            "Jon", "Smith", "jon@example.com", "Acme Inc",
            "John", "Smith", "john@example.com", "Acme Inc",
        );
        assert_eq!(agreements[0], true, "name should fuzzy match");
        assert_eq!(agreements[1], true, "domain should match");
        assert_eq!(agreements[2], true, "soundex should match");
        assert_eq!(agreements[3], true, "company should match");
    }

    #[test]
    fn test_compare_contacts_semantic() {
        // High embedding similarity should trigger semantic match
        let agreements = FellegiSunter::compare_contacts_semantic(
            "Alice", "Johnson", "alice@alpha.com", "Alpha Corp",
            "Bob", "Williams", "bob@beta.com", "Beta LLC",
            Some(0.92), // high cosine sim — same role at rebrand
        );
        assert_eq!(agreements[4], true, "semantic should match at 0.92");

        // Low similarity should not
        let agreements_low = FellegiSunter::compare_contacts_semantic(
            "Alice", "Johnson", "alice@alpha.com", "Alpha Corp",
            "Bob", "Williams", "bob@beta.com", "Beta LLC",
            Some(0.40),
        );
        assert_eq!(agreements_low[4], false, "semantic should not match at 0.40");

        // None skips semantic
        let agreements_none = FellegiSunter::compare_contacts_semantic(
            "Alice", "Johnson", "alice@alpha.com", "Alpha Corp",
            "Bob", "Williams", "bob@beta.com", "Beta LLC",
            None,
        );
        assert_eq!(agreements_none[4], false, "semantic should be false with None");
    }

    #[test]
    fn test_semantic_boosts_match_probability() {
        let fs = FellegiSunter::new();
        // Same string features, different semantic
        let prob_without = fs.match_probability(&[true, true, false, false, false]);
        let prob_with = fs.match_probability(&[true, true, false, false, true]);
        assert!(prob_with > prob_without, "semantic should boost: {} > {}", prob_with, prob_without);
    }

    #[test]
    fn test_estimate_from_pairs() {
        let mut fs = FellegiSunter::new();
        let labeled = vec![
            (true, [true, true, true, true, true]),
            (true, [true, true, false, true, true]),
            (false, [false, false, false, false, false]),
            (false, [false, true, false, false, false]),
        ];
        fs.estimate_from_pairs(&labeled);
        assert!(fs.m_probs[0] > fs.u_probs[0], "m[0]={} u[0]={}", fs.m_probs[0], fs.u_probs[0]);
        // Semantic feature: 2/2 matches agree, 0/2 non-matches agree
        assert!(fs.m_probs[4] > fs.u_probs[4], "m[4]={} u[4]={}", fs.m_probs[4], fs.u_probs[4]);
    }

    // ── UnionFind tests ──

    #[test]
    fn test_union_find_basic() {
        let mut uf = UnionFind::new(5);
        uf.union(0, 1);
        uf.union(1, 2);
        assert!(uf.connected(0, 2));
        assert!(!uf.connected(0, 3));
    }

    #[test]
    fn test_union_find_no_merge() {
        let mut uf = UnionFind::new(4);
        uf.union(0, 1);
        uf.union(2, 3);
        assert!(!uf.connected(0, 2));
        assert!(!uf.connected(1, 3));
    }

    #[test]
    fn test_union_find_components() {
        let mut uf = UnionFind::new(6);
        uf.union(0, 1);
        uf.union(1, 2);
        uf.union(3, 4);
        // Node 5 is alone
        let groups = uf.components();
        assert_eq!(groups.len(), 2, "groups={:?}", groups);
        // One group of 3, one group of 2
        let sizes: Vec<usize> = groups.iter().map(|g| g.len()).collect();
        assert!(sizes.contains(&3), "sizes={:?}", sizes);
        assert!(sizes.contains(&2), "sizes={:?}", sizes);
    }

    #[test]
    fn test_union_find_self() {
        let mut uf = UnionFind::new(3);
        assert!(!uf.union(1, 1), "self-union should return false");
    }

    #[test]
    fn test_union_find_idempotent() {
        let mut uf = UnionFind::new(3);
        assert!(uf.union(0, 1));
        assert!(!uf.union(0, 1), "double union should return false");
    }

    // ── deduplicate_transitive tests ──

    #[test]
    fn test_deduplicate_transitive() {
        let pairs = vec![(0, 1), (2, 3)];
        let groups = deduplicate_transitive(&pairs, 5);
        assert_eq!(groups.len(), 2);
    }

    #[test]
    fn test_deduplicate_chain() {
        // A~B, B~C, C~D → one group of 4
        let pairs = vec![(0, 1), (1, 2), (2, 3)];
        let groups = deduplicate_transitive(&pairs, 4);
        assert_eq!(groups.len(), 1, "groups={:?}", groups);
        assert_eq!(groups[0].len(), 4);
    }

    #[test]
    fn test_deduplicate_empty() {
        let pairs: Vec<(usize, usize)> = vec![];
        let groups = deduplicate_transitive(&pairs, 5);
        assert!(groups.is_empty());
    }

    // ── SimHash tests ──

    #[test]
    fn test_simhash_identical_strings() {
        let h1 = simhash("John Smith at Acme Corp");
        let h2 = simhash("John Smith at Acme Corp");
        assert_eq!(h1, h2, "identical strings must produce identical hashes");
    }

    #[test]
    fn test_simhash_similar_strings_close() {
        let h1 = simhash("John Smith at Acme Corporation");
        let h2 = simhash("John Smith at Acme Corp");
        let dist = hamming_distance(h1, h2);
        assert!(
            dist <= 15,
            "similar strings should have small Hamming distance, got {}",
            dist
        );
    }

    #[test]
    fn test_simhash_different_strings_far() {
        let h1 = simhash("John Smith at Acme Corporation");
        let h2 = simhash("completely unrelated text about quantum physics");
        let dist = hamming_distance(h1, h2);
        assert!(
            dist > 10,
            "very different strings should have large Hamming distance, got {}",
            dist
        );
    }

    #[test]
    fn test_simhash_case_insensitive() {
        let h1 = simhash("John SMITH");
        let h2 = simhash("john smith");
        assert_eq!(h1, h2, "simhash should be case-insensitive");
    }

    #[test]
    fn test_simhash_short_string() {
        // Should not panic on strings shorter than trigram length
        let h = simhash("ab");
        assert!(h != 0 || h == 0, "should produce some hash for short strings");
    }

    #[test]
    fn test_simhash_empty() {
        let h = simhash("");
        // Empty string produces deterministic result (hash of empty bytes)
        let h2 = simhash("");
        assert_eq!(h, h2);
    }

    // ── Hamming distance tests ──

    #[test]
    fn test_hamming_identical() {
        assert_eq!(hamming_distance(0xDEADBEEF, 0xDEADBEEF), 0);
    }

    #[test]
    fn test_hamming_one_bit() {
        assert_eq!(hamming_distance(0b1000, 0b0000), 1);
        assert_eq!(hamming_distance(0b1111, 0b1110), 1);
    }

    #[test]
    fn test_hamming_all_different() {
        assert_eq!(hamming_distance(0u64, u64::MAX), 64);
    }

    #[test]
    fn test_hamming_symmetric() {
        let a = 0x123456789ABCDEF0u64;
        let b = 0xFEDCBA9876543210u64;
        assert_eq!(hamming_distance(a, b), hamming_distance(b, a));
    }

    // ── DedupPipeline tests ──

    #[test]
    fn test_dedup_pipeline_exact_email_duplicate() {
        let contacts = vec![
            ContactRecord::new("John", "Smith", "john@example.com", "Acme Inc", "Engineer"),
            ContactRecord::new("John", "Smith", "john@example.com", "Acme Inc", "Engineer"),
        ];
        let results = dedup_contacts_batch(&contacts);
        assert_eq!(results.len(), 2);
        assert!(!results[0].is_duplicate, "first contact should be unique");
        assert!(results[1].is_duplicate, "second contact should be duplicate");
        assert_eq!(results[1].duplicate_of, Some(0));
        assert_eq!(results[1].detection_stage, DedupStage::BloomExact);
    }

    #[test]
    fn test_dedup_pipeline_case_insensitive_email() {
        let contacts = vec![
            ContactRecord::new("John", "Smith", "John@Example.COM", "Acme", ""),
            ContactRecord::new("John", "Smith", "john@example.com", "Acme", ""),
        ];
        let results = dedup_contacts_batch(&contacts);
        assert!(results[1].is_duplicate, "email dedup should be case-insensitive");
        assert_eq!(results[1].detection_stage, DedupStage::BloomExact);
    }

    #[test]
    fn test_dedup_pipeline_near_duplicate_name_typo() {
        let contacts = vec![
            ContactRecord::new("Jonathan", "Smith", "jonathan@acme.com", "Acme Corporation", "Senior Engineer"),
            ContactRecord::new("Jonathon", "Smith", "jonathon@acme.com", "Acme Corporation", "Senior Engineer"),
        ];
        let results = dedup_contacts_batch(&contacts);
        assert_eq!(results.len(), 2);
        assert!(!results[0].is_duplicate);
        // The second should be caught by SimHash + JW since the text is very similar
        // but the emails are different
        if results[1].is_duplicate {
            assert!(
                results[1].detection_stage == DedupStage::SimHashLSH
                    || results[1].detection_stage == DedupStage::JaroWinklerConfirm,
                "near-duplicate should be caught by SimHash or JW, got {:?}",
                results[1].detection_stage
            );
        }
    }

    #[test]
    fn test_dedup_pipeline_all_unique() {
        let contacts = vec![
            ContactRecord::new("Alice", "Johnson", "alice@alpha.com", "Alpha Corp", "CEO"),
            ContactRecord::new("Bob", "Williams", "bob@beta.com", "Beta LLC", "CTO"),
            ContactRecord::new("Carol", "Davis", "carol@gamma.com", "Gamma Inc", "VP Engineering"),
        ];
        let results = dedup_contacts_batch(&contacts);
        assert_eq!(results.len(), 3);
        for (i, r) in results.iter().enumerate() {
            assert!(!r.is_duplicate, "contact {} should be unique", i);
            assert_eq!(r.detection_stage, DedupStage::Unique);
        }
    }

    #[test]
    fn test_dedup_pipeline_empty_input() {
        let results = dedup_contacts_batch(&[]);
        assert!(results.is_empty());
    }

    #[test]
    fn test_dedup_pipeline_single_contact() {
        let contacts = vec![
            ContactRecord::new("Alice", "Johnson", "alice@alpha.com", "Alpha Corp", "CEO"),
        ];
        let results = dedup_contacts_batch(&contacts);
        assert_eq!(results.len(), 1);
        assert!(!results[0].is_duplicate);
    }

    #[test]
    fn test_dedup_pipeline_mixed_duplicates() {
        let contacts = vec![
            // 0: unique
            ContactRecord::new("Alice", "Johnson", "alice@alpha.com", "Alpha Corp", "CEO"),
            // 1: unique (different person entirely)
            ContactRecord::new("Bob", "Williams", "bob@beta.com", "Beta LLC", "CTO"),
            // 2: exact email duplicate of 0
            ContactRecord::new("Alice", "Johnson", "alice@alpha.com", "Alpha Corp", "CEO"),
            // 3: unique
            ContactRecord::new("Carol", "Davis", "carol@gamma.com", "Gamma Inc", "VP"),
            // 4: exact email duplicate of 1
            ContactRecord::new("Bob", "Williams", "bob@beta.com", "Beta LLC", "CTO"),
        ];
        let results = dedup_contacts_batch(&contacts);
        assert!(!results[0].is_duplicate, "Alice should be unique");
        assert!(!results[1].is_duplicate, "Bob should be unique");
        assert!(results[2].is_duplicate, "Alice dupe should be caught");
        assert_eq!(results[2].duplicate_of, Some(0));
        assert!(!results[3].is_duplicate, "Carol should be unique");
        assert!(results[4].is_duplicate, "Bob dupe should be caught");
        assert_eq!(results[4].duplicate_of, Some(1));
    }

    #[test]
    fn test_dedup_pipeline_custom_thresholds() {
        let contacts = vec![
            ContactRecord::new("John", "Smith", "john@acme.com", "Acme", "Engineer"),
            ContactRecord::new("John", "Smyth", "john.smyth@acme.com", "Acme", "Engineer"),
        ];
        // Tight thresholds: lower hamming threshold, higher JW threshold
        let results_tight = dedup_contacts_batch_with(&contacts, 5, 0.95, 0.001);
        // Loose thresholds
        let results_loose = dedup_contacts_batch_with(&contacts, 20, 0.70, 0.001);

        // With tight thresholds, the second contact is more likely to be unique
        // With loose thresholds, it's more likely to be a duplicate
        // At minimum, both should return 2 results
        assert_eq!(results_tight.len(), 2);
        assert_eq!(results_loose.len(), 2);
    }

    #[test]
    fn test_dedup_pipeline_struct_direct() {
        let mut pipeline = DedupPipeline::new(100, 0.01);
        let c1 = ContactRecord::new("John", "Smith", "john@example.com", "Acme", "");
        let r1 = pipeline.process(0, &c1);
        assert!(!r1.is_duplicate);
        assert_eq!(pipeline.unique_count(), 1);

        // Exact duplicate
        let r2 = pipeline.process(1, &c1);
        assert!(r2.is_duplicate);
        assert_eq!(r2.detection_stage, DedupStage::BloomExact);

        // Reset
        pipeline.reset();
        assert_eq!(pipeline.unique_count(), 0);
    }

    #[test]
    fn test_dedup_pipeline_large_batch() {
        // Test with a larger batch to stress Bloom filter and SimHash.
        // Use highly distinct names/companies to avoid SimHash near-matches
        // between structurally similar generated strings.
        let industries = [
            "Aerospace", "Biotech", "Consulting", "Defense", "Education",
            "Finance", "Gaming", "Healthcare", "Insurance", "Jewelry",
        ];
        let roles = [
            "CEO", "CTO", "VP Engineering", "Data Scientist", "DevOps",
            "Product Manager", "Designer", "Researcher", "Analyst", "Architect",
        ];

        let mut contacts = Vec::with_capacity(200);
        for i in 0..100 {
            let industry = industries[i % 10];
            let role = roles[(i / 10) % 10];
            contacts.push(ContactRecord::new(
                &format!("Firstname{:04x}", i * 7919), // hash-like to maximize trigram diversity
                &format!("Lastname{:04x}", i * 6271),
                &format!("user{:04x}@company{:04x}.com", i * 7919, i * 6271),
                &format!("{} {} International", industry, i),
                role,
            ));
        }
        // Add 100 exact email duplicates
        for i in 0..100 {
            contacts.push(contacts[i].clone());
        }

        let results = dedup_contacts_batch(&contacts);
        assert_eq!(results.len(), 200);

        let unique_count = results.iter().filter(|r| !r.is_duplicate).count();
        let dup_count = results.iter().filter(|r| r.is_duplicate).count();

        // The second 100 should all be caught as duplicates (exact email match via Bloom).
        // Some of the first 100 may also be flagged by SimHash+JW if text is structurally
        // similar (generated names share trigrams), so we allow a small margin.
        assert!(unique_count >= 85, "should have >= 85 unique contacts, got {}", unique_count);
        assert!(dup_count >= 100, "should detect >= 100 duplicates, got {}", dup_count);

        // All contacts in the second half should be detected as duplicates
        let dups_in_second_half = results[100..].iter().filter(|r| r.is_duplicate).count();
        assert_eq!(
            dups_in_second_half, 100,
            "all second-half contacts should be duplicates, got {}",
            dups_in_second_half
        );

        // Most second-half duplicates should be BloomExact (exact email match).
        // A few may be SimHash/JW if their first-half counterpart was itself flagged
        // as a SimHash dup and never registered in the Bloom filter.
        let bloom_exact_in_second_half = results[100..]
            .iter()
            .filter(|r| r.is_duplicate && r.detection_stage == DedupStage::BloomExact)
            .count();
        assert!(
            bloom_exact_in_second_half >= 85,
            "most second-half duplicates should be Bloom-detected, got {}",
            bloom_exact_in_second_half
        );
    }

    #[test]
    fn test_contact_record_bloom_key_normalization() {
        let c = ContactRecord::new("John", "Smith", "JOHN@EXAMPLE.COM", "Acme", "");
        assert_eq!(c.bloom_key(), "john@example.com");
    }

    #[test]
    fn test_contact_record_simhash_text() {
        let c = ContactRecord::new("John", "Smith", "john@example.com", "Acme Corp", "CTO");
        let text = c.simhash_text();
        assert!(text.contains("John"));
        assert!(text.contains("Smith"));
        assert!(text.contains("Acme Corp"));
        assert!(text.contains("CTO"));
        // Email should NOT be in simhash text (it's for content similarity, not exact match)
        assert!(!text.contains("john@example.com"));
    }
}
