use ahash::AHashMap;
use parking_lot::RwLock;
use roaring::RoaringBitmap;

// ── Adaptive BM25 ────────────────────────────────────────────

/// BM25 parameters that adapt based on corpus statistics.
#[derive(Debug, Clone)]
pub struct BM25Config {
    pub k1: f64,
    pub b: f64,
    pub avg_dl: f64,
    pub total_docs: u32,
    pub total_terms: u64,
}

impl Default for BM25Config {
    fn default() -> Self {
        Self { k1: 1.2, b: 0.75, avg_dl: 100.0, total_docs: 0, total_terms: 0 }
    }
}

impl BM25Config {
    /// Derive k1 and b from corpus statistics.
    /// Dense corpus → higher b; short docs → higher k1.
    pub fn from_corpus_stats(doc_count: u32, total_terms: u64, avg_doc_len: f64) -> Self {
        let density = if doc_count > 0 { total_terms as f64 / doc_count as f64 } else { 0.0 };
        let b = if density > 100.0 { 0.9 } else if density > 10.0 { 0.75 } else { 0.5 };
        let k1 = if avg_doc_len < 100.0 { 2.0 } else if avg_doc_len < 500.0 { 1.5 } else { 1.2 };
        Self { k1, b, avg_dl: avg_doc_len, total_docs: doc_count, total_terms }
    }

    fn recalculate(&mut self) {
        if self.total_docs > 0 {
            self.avg_dl = self.total_terms as f64 / self.total_docs as f64;
            let derived = Self::from_corpus_stats(self.total_docs, self.total_terms, self.avg_dl);
            self.k1 = derived.k1;
            self.b = derived.b;
        }
    }
}

// ── Inverted Index ───────────────────────────────────────────

pub struct InvertedIndex {
    postings: RwLock<AHashMap<String, RoaringBitmap>>,
    doc_count: std::sync::atomic::AtomicU32,
    /// Per-doc term frequencies: term → (doc_id → count)
    term_freqs: RwLock<AHashMap<String, AHashMap<u32, u32>>>,
    /// Per-doc token count
    doc_lengths: RwLock<AHashMap<u32, u32>>,
    /// Adaptive BM25 configuration
    bm25: RwLock<BM25Config>,
}

impl Default for InvertedIndex {
    fn default() -> Self {
        Self::new()
    }
}

impl InvertedIndex {
    pub fn new() -> Self {
        Self {
            postings: RwLock::new(AHashMap::new()),
            doc_count: std::sync::atomic::AtomicU32::new(0),
            term_freqs: RwLock::new(AHashMap::new()),
            doc_lengths: RwLock::new(AHashMap::new()),
            bm25: RwLock::new(BM25Config::default()),
        }
    }

    pub fn index_document(&self, text: &str) -> u32 {
        let doc_id = self.doc_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        self.index_tokens(doc_id, text);
        doc_id
    }

    pub fn index_with_id(&self, doc_id: u32, text: &str) {
        self.index_tokens(doc_id, text);
    }

    fn index_tokens(&self, doc_id: u32, text: &str) {
        let tokens = tokenize(text);
        let doc_len = tokens.len() as u32;

        // Count per-term frequencies
        let mut local_freqs: AHashMap<String, u32> = AHashMap::new();
        for token in &tokens {
            *local_freqs.entry(token.clone()).or_insert(0) += 1;
        }

        let mut postings = self.postings.write();
        let mut term_freqs = self.term_freqs.write();
        for (token, freq) in &local_freqs {
            postings.entry(token.clone()).or_default().insert(doc_id);
            term_freqs.entry(token.clone()).or_default().insert(doc_id, *freq);
        }

        self.doc_lengths.write().insert(doc_id, doc_len);

        // Update BM25 stats
        let mut bm25 = self.bm25.write();
        bm25.total_docs += 1;
        bm25.total_terms += doc_len as u64;
        bm25.recalculate();
    }

    pub fn search_and(&self, query: &str) -> Vec<u32> {
        let tokens = tokenize(query);
        if tokens.is_empty() { return vec![]; }

        let postings = self.postings.read();
        let mut result: Option<RoaringBitmap> = None;

        for token in &tokens {
            match postings.get(token) {
                Some(bitmap) => {
                    result = Some(match result {
                        Some(existing) => existing & bitmap,
                        None => bitmap.clone(),
                    });
                }
                None => return vec![],
            }
        }

        result.map(|b| b.iter().collect()).unwrap_or_default()
    }

    pub fn search_or(&self, query: &str) -> Vec<u32> {
        let tokens = tokenize(query);
        let postings = self.postings.read();
        let mut result = RoaringBitmap::new();

        for token in &tokens {
            if let Some(bitmap) = postings.get(token) {
                result |= bitmap;
            }
        }

        result.iter().collect()
    }

    pub fn search_prefix(&self, prefix: &str) -> Vec<u32> {
        let prefix_lower = prefix.to_lowercase();
        let postings = self.postings.read();
        let mut result = RoaringBitmap::new();

        for (token, bitmap) in postings.iter() {
            if token.starts_with(&prefix_lower) {
                result |= bitmap;
            }
        }

        result.iter().collect()
    }

    pub fn search_ranked(&self, query: &str, limit: usize) -> Vec<(u32, f64)> {
        let tokens = tokenize(query);
        if tokens.is_empty() { return vec![]; }

        let postings = self.postings.read();
        let term_freqs = self.term_freqs.read();
        let doc_lengths = self.doc_lengths.read();
        let bm25 = self.bm25.read();

        let n = self.doc_count.load(std::sync::atomic::Ordering::SeqCst) as f64;
        let k1 = bm25.k1;
        let b = bm25.b;
        let avg_dl = bm25.avg_dl;

        let mut scores: AHashMap<u32, f64> = AHashMap::new();

        for token in &tokens {
            if let Some(bitmap) = postings.get(token) {
                let df = bitmap.len() as f64;
                let idf = ((n - df + 0.5) / (df + 0.5) + 1.0).ln();

                for doc_id in bitmap.iter() {
                    // Real term frequency from index
                    let tf = term_freqs.get(token)
                        .and_then(|m| m.get(&doc_id))
                        .copied()
                        .unwrap_or(1) as f64;
                    // Real document length
                    let dl = doc_lengths.get(&doc_id).copied().unwrap_or(1) as f64;
                    let tf_norm = (tf * (k1 + 1.0)) / (tf + k1 * (1.0 - b + b * dl / avg_dl));
                    *scores.entry(doc_id).or_insert(0.0) += idf * tf_norm;
                }
            }
        }

        let mut results: Vec<(u32, f64)> = scores.into_iter().collect();
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit);
        results
    }

    /// Get the current BM25 configuration.
    pub fn bm25_config(&self) -> BM25Config {
        self.bm25.read().clone()
    }

    pub fn term_count(&self) -> usize {
        self.postings.read().len()
    }

    pub fn doc_count(&self) -> u32 {
        self.doc_count.load(std::sync::atomic::Ordering::SeqCst)
    }

    pub fn serialize(&self) -> Vec<u8> {
        let postings = self.postings.read();
        let mut buf = Vec::new();

        let dc = self.doc_count.load(std::sync::atomic::Ordering::SeqCst);
        buf.extend_from_slice(&dc.to_le_bytes());
        buf.extend_from_slice(&(postings.len() as u32).to_le_bytes());

        for (token, bitmap) in postings.iter() {
            let token_bytes = token.as_bytes();
            buf.extend_from_slice(&(token_bytes.len() as u16).to_le_bytes());
            buf.extend_from_slice(token_bytes);

            let mut bitmap_bytes = Vec::new();
            bitmap.serialize_into(&mut bitmap_bytes).unwrap();
            buf.extend_from_slice(&(bitmap_bytes.len() as u32).to_le_bytes());
            buf.extend_from_slice(&bitmap_bytes);
        }

        buf
    }

    pub fn deserialize(data: &[u8]) -> Option<Self> {
        if data.len() < 8 { return None; }

        let doc_count = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);
        let term_count = u32::from_le_bytes([data[4], data[5], data[6], data[7]]);

        let mut pos = 8;
        let mut postings = AHashMap::with_capacity(term_count as usize);

        for _ in 0..term_count {
            if pos + 2 > data.len() { return None; }
            let token_len = u16::from_le_bytes([data[pos], data[pos+1]]) as usize;
            pos += 2;

            if pos + token_len > data.len() { return None; }
            let token = std::str::from_utf8(&data[pos..pos+token_len]).ok()?.to_string();
            pos += token_len;

            if pos + 4 > data.len() { return None; }
            let bitmap_len = u32::from_le_bytes([data[pos], data[pos+1], data[pos+2], data[pos+3]]) as usize;
            pos += 4;

            if pos + bitmap_len > data.len() { return None; }
            let bitmap = RoaringBitmap::deserialize_from(&data[pos..pos+bitmap_len]).ok()?;
            pos += bitmap_len;

            postings.insert(token, bitmap);
        }

        Some(Self {
            postings: RwLock::new(postings),
            doc_count: std::sync::atomic::AtomicU32::new(doc_count),
            term_freqs: RwLock::new(AHashMap::new()),
            doc_lengths: RwLock::new(AHashMap::new()),
            bm25: RwLock::new(BM25Config::default()),
        })
    }
}

fn tokenize(text: &str) -> Vec<String> {
    text.split(|c: char| !c.is_alphanumeric() && c != '.' && c != '-')
        .map(|s| s.to_lowercase())
        .filter(|s| s.len() >= 2)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_index_and_search_or() {
        let idx = InvertedIndex::new();
        idx.index_document("machine learning engineer");
        idx.index_document("data scientist python");
        let results = idx.search_or("machine");
        assert_eq!(results, vec![0]);
    }

    #[test]
    fn test_search_and() {
        let idx = InvertedIndex::new();
        idx.index_document("machine learning engineer");
        idx.index_document("machine vision specialist");
        let results = idx.search_and("machine engineer");
        assert_eq!(results, vec![0]); // only doc 0 has both
    }

    #[test]
    fn test_search_ranked_ordering() {
        let idx = InvertedIndex::new();
        idx.index_document("rust rust rust"); // doc 0: high TF for "rust"
        idx.index_document("python java");    // doc 1: no "rust"
        idx.index_document("rust python");    // doc 2: some "rust"
        let ranked = idx.search_ranked("rust", 10);
        assert!(!ranked.is_empty());
        // With real TF, doc 0 (TF=3) should rank higher than doc 2 (TF=1)
        assert_eq!(ranked[0].0, 0, "Doc with 3x 'rust' should rank first");
        assert!(ranked[0].1 > ranked[1].1, "Higher TF → higher score");
        assert!(!ranked.iter().any(|(id, _)| *id == 1));
    }

    #[test]
    fn test_bm25_config_adaptive() {
        let sparse = BM25Config::from_corpus_stats(100, 500, 5.0);
        assert_eq!(sparse.b, 0.5);
        assert_eq!(sparse.k1, 2.0);

        let dense = BM25Config::from_corpus_stats(100, 50_000, 500.0);
        assert_eq!(dense.b, 0.9);
        assert_eq!(dense.k1, 1.2);
    }

    #[test]
    fn test_bm25_stats_update() {
        let idx = InvertedIndex::new();
        idx.index_document("hello world");
        idx.index_document("foo bar baz");
        idx.index_document("rust systems programming");
        let config = idx.bm25_config();
        assert_eq!(config.total_docs, 3);
        assert!(config.total_terms > 0);
        let expected_avg = config.total_terms as f64 / 3.0;
        assert!((config.avg_dl - expected_avg).abs() < 0.01);
    }

    #[test]
    fn test_search_prefix() {
        let idx = InvertedIndex::new();
        idx.index_document("tensorflow pytorch");
        let results = idx.search_prefix("tensor");
        assert_eq!(results, vec![0]);
    }

    #[test]
    fn test_empty_search() {
        let idx = InvertedIndex::new();
        assert!(idx.search_or("anything").is_empty());
        assert!(idx.search_ranked("anything", 10).is_empty());
    }

    #[test]
    fn test_serialize_deserialize_roundtrip() {
        let idx = InvertedIndex::new();
        idx.index_document("hello world");
        idx.index_document("foo bar");
        let bytes = idx.serialize();
        let restored = InvertedIndex::deserialize(&bytes).expect("deserialize failed");
        assert_eq!(restored.doc_count(), 2);
        assert!(!restored.search_or("hello").is_empty());
    }

    #[test]
    fn test_doc_and_term_count() {
        let idx = InvertedIndex::new();
        assert_eq!(idx.doc_count(), 0);
        idx.index_document("alpha beta");
        assert_eq!(idx.doc_count(), 1);
        assert!(idx.term_count() >= 2);
    }
}
