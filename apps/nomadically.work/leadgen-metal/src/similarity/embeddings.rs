use parking_lot::RwLock;

/// In-memory embedding store with brute-force cosine similarity.
/// Flat buffer layout for cache-friendly M1 access (fits in 8MB SLC at INT8).
pub struct EmbeddingStore {
    dim: usize,
    /// Flat: [id0_emb..., id1_emb..., ...] — sequential for NEON auto-vectorization.
    data: RwLock<Vec<f32>>,
    ids: RwLock<Vec<u32>>,
}

impl EmbeddingStore {
    pub fn new(dim: usize) -> Self {
        Self {
            dim,
            data: RwLock::new(Vec::new()),
            ids: RwLock::new(Vec::new()),
        }
    }

    pub fn insert(&self, id: u32, embedding: &[f32]) {
        assert_eq!(embedding.len(), self.dim);
        self.data.write().extend_from_slice(embedding);
        self.ids.write().push(id);
    }

    /// Brute-force top-K cosine similarity. Returns (id, score) descending.
    pub fn top_k(&self, query: &[f32], k: usize) -> Vec<(u32, f32)> {
        assert_eq!(query.len(), self.dim);

        let data = self.data.read();
        let ids = self.ids.read();
        let n = ids.len();
        if n == 0 { return Vec::new(); }

        let q_norm = dot(query, query).sqrt();
        if q_norm == 0.0 { return Vec::new(); }

        let mut scores: Vec<(u32, f32)> = Vec::with_capacity(n);
        for i in 0..n {
            let start = i * self.dim;
            let candidate = &data[start..start + self.dim];
            let d = dot(query, candidate);
            let c_norm = dot(candidate, candidate).sqrt();
            let sim = if c_norm > 0.0 { d / (q_norm * c_norm) } else { 0.0 };
            scores.push((ids[i], sim));
        }

        if k < n {
            scores.select_nth_unstable_by(k, |a, b| {
                b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal)
            });
            scores.truncate(k);
        }
        scores.sort_unstable_by(|a, b| {
            b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal)
        });

        scores
    }

    pub fn len(&self) -> usize {
        self.ids.read().len()
    }
}

/// Dot product — auto-vectorized by LLVM to NEON on M1.
#[inline]
fn dot(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}
