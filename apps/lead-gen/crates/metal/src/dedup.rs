use ahash::AHashMap;
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
    keys.push(format!("s:{}:{}", soundex, fi));

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
/// Features: [0] name JW >= 0.85, [1] email domain exact, [2] soundex match, [3] company Lev >= 0.80
pub struct FellegiSunter {
    /// P(agree | match) for each feature
    pub m_probs: [f64; 4],
    /// P(agree | non-match) for each feature
    pub u_probs: [f64; 4],
}

impl FellegiSunter {
    pub fn new() -> Self {
        Self {
            m_probs: [0.95, 0.90, 0.85, 0.80],
            u_probs: [0.02, 0.10, 0.05, 0.15],
        }
    }

    /// Compute log-likelihood ratio for an agreement vector.
    pub fn log_likelihood_ratio(&self, agreements: &[bool; 4]) -> f64 {
        let mut llr = 0.0;
        for i in 0..4 {
            if agreements[i] {
                llr += (self.m_probs[i] / self.u_probs[i]).ln();
            } else {
                llr += ((1.0 - self.m_probs[i]) / (1.0 - self.u_probs[i])).ln();
            }
        }
        llr
    }

    /// Convert LLR to a match probability via sigmoid.
    pub fn match_probability(&self, agreements: &[bool; 4]) -> f64 {
        let llr = self.log_likelihood_ratio(agreements);
        1.0 / (1.0 + (-llr).exp())
    }

    /// Compare two contact records and return a 4-feature agreement vector.
    pub fn compare_contacts(
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

    /// Update m/u probabilities from labeled pairs using Laplace smoothing.
    pub fn estimate_from_pairs(&mut self, labeled: &[(bool, [bool; 4])]) {
        for i in 0..4 {
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
        let prob = fs.match_probability(&[true, true, true, true]);
        assert!(prob > 0.99, "prob={}", prob);
    }

    #[test]
    fn test_fellegi_sunter_no_match() {
        let fs = FellegiSunter::new();
        let prob = fs.match_probability(&[false, false, false, false]);
        assert!(prob < 0.05, "prob={}", prob);
    }

    #[test]
    fn test_fellegi_sunter_partial() {
        let fs = FellegiSunter::new();
        // Only soundex agrees — weakest single signal
        let prob = fs.match_probability(&[false, false, true, false]);
        assert!(prob > 0.01 && prob < 0.5, "prob={}", prob);
    }

    #[test]
    fn test_fellegi_sunter_llr_signs() {
        let fs = FellegiSunter::new();
        let llr_all_agree = fs.log_likelihood_ratio(&[true, true, true, true]);
        assert!(llr_all_agree > 0.0, "llr_all_agree={}", llr_all_agree);

        let llr_none_agree = fs.log_likelihood_ratio(&[false, false, false, false]);
        assert!(llr_none_agree < 0.0, "llr_none_agree={}", llr_none_agree);
    }

    #[test]
    fn test_compare_contacts_exact() {
        let agreements = FellegiSunter::compare_contacts(
            "John", "Smith", "john@example.com", "Acme Inc",
            "John", "Smith", "john@example.com", "Acme Inc",
        );
        assert_eq!(agreements, [true, true, true, true]);
    }

    #[test]
    fn test_compare_contacts_different() {
        let agreements = FellegiSunter::compare_contacts(
            "Alice", "Johnson", "alice@alpha.com", "Alpha Corp",
            "Bob", "Williams", "bob@beta.com", "Beta LLC",
        );
        // Name JW < 0.85, domains differ, soundex differs, company Lev < 0.80
        assert_eq!(agreements[0], false, "name should not match");
        assert_eq!(agreements[1], false, "domain should not match");
        // soundex: J525 vs W452 — differ
        assert_eq!(agreements[2], false, "soundex should not match");
        assert_eq!(agreements[3], false, "company should not match");
    }

    #[test]
    fn test_compare_contacts_typo() {
        let agreements = FellegiSunter::compare_contacts(
            "Jon", "Smith", "jon@example.com", "Acme Inc",
            "John", "Smith", "john@example.com", "Acme Inc",
        );
        // Name: "Jon Smith" vs "John Smith" — JW should be >= 0.85
        assert_eq!(agreements[0], true, "name should fuzzy match");
        // Domain: both example.com
        assert_eq!(agreements[1], true, "domain should match");
        // Soundex: smith = smith
        assert_eq!(agreements[2], true, "soundex should match");
        // Company: exact
        assert_eq!(agreements[3], true, "company should match");
    }

    #[test]
    fn test_estimate_from_pairs() {
        let mut fs = FellegiSunter::new();
        let labeled = vec![
            (true, [true, true, true, true]),
            (true, [true, true, false, true]),
            (false, [false, false, false, false]),
            (false, [false, true, false, false]),
        ];
        fs.estimate_from_pairs(&labeled);
        // m_probs should reflect matches: feature 0 had 2/2 agree among matches
        // u_probs should reflect non-matches: feature 0 had 0/2 agree among non-matches
        // With Laplace smoothing: m[0] = (1+2)/(2+2) = 0.75, u[0] = (1+0)/(2+2) = 0.25
        assert!(fs.m_probs[0] > fs.u_probs[0], "m[0]={} u[0]={}", fs.m_probs[0], fs.u_probs[0]);
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
}
