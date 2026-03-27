use ahash::AHashMap;
use parking_lot::RwLock;
use roaring::RoaringBitmap;

pub struct InvertedIndex {
    postings: RwLock<AHashMap<String, RoaringBitmap>>,
    doc_count: std::sync::atomic::AtomicU32,
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
        }
    }

    pub fn index_document(&self, text: &str) -> u32 {
        let doc_id = self.doc_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        let tokens = tokenize(text);

        let mut postings = self.postings.write();
        for token in tokens {
            postings
                .entry(token)
                .or_default()
                .insert(doc_id);
        }

        doc_id
    }

    pub fn index_with_id(&self, doc_id: u32, text: &str) {
        let tokens = tokenize(text);
        let mut postings = self.postings.write();
        for token in tokens {
            postings
                .entry(token)
                .or_default()
                .insert(doc_id);
        }
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
        let n = self.doc_count.load(std::sync::atomic::Ordering::SeqCst) as f64;
        let k1 = 1.2f64;
        let b = 0.75f64;
        let avg_dl = 100.0f64;

        let mut scores: AHashMap<u32, f64> = AHashMap::new();

        for token in &tokens {
            if let Some(bitmap) = postings.get(token) {
                let df = bitmap.len() as f64;
                let idf = ((n - df + 0.5) / (df + 0.5) + 1.0).ln();

                for doc_id in bitmap.iter() {
                    let tf = 1.0;
                    let dl = avg_dl;
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
        })
    }
}

fn tokenize(text: &str) -> Vec<String> {
    text.split(|c: char| !c.is_alphanumeric() && c != '.' && c != '-')
        .map(|s| s.to_lowercase())
        .filter(|s| s.len() >= 2)
        .collect()
}
