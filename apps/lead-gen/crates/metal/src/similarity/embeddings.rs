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

    pub fn is_empty(&self) -> bool {
        self.ids.read().is_empty()
    }
}

/// Dot product — auto-vectorized by LLVM to NEON on M1.
#[inline]
fn dot(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

/// INT8 quantized embedding store — 4x memory reduction over FP32.
/// Each vector stored as i8 with per-vector scale and bias for dequantization.
/// 10,000 contacts × 384 dims = 3.84 MB (FP32) → 960 KB (INT8) — fits in M1 SLC.
pub struct QuantizedEmbeddingStore {
    dim: usize,
    data: RwLock<Vec<i8>>,
    scales: RwLock<Vec<f32>>,
    biases: RwLock<Vec<f32>>,
    ids: RwLock<Vec<u32>>,
}

impl QuantizedEmbeddingStore {
    pub fn new(dim: usize) -> Self {
        Self {
            dim,
            data: RwLock::new(Vec::new()),
            scales: RwLock::new(Vec::new()),
            biases: RwLock::new(Vec::new()),
            ids: RwLock::new(Vec::new()),
        }
    }

    /// Insert a float embedding — quantizes to INT8 on insert.
    pub fn insert(&self, id: u32, embedding: &[f32]) {
        assert_eq!(embedding.len(), self.dim);

        let (quantized, scale, bias) = quantize_to_int8(embedding);

        self.data.write().extend_from_slice(&quantized);
        self.scales.write().push(scale);
        self.biases.write().push(bias);
        self.ids.write().push(id);
    }

    /// Brute-force top-K cosine similarity with fused dequant+dot.
    pub fn top_k(&self, query: &[f32], k: usize) -> Vec<(u32, f32)> {
        assert_eq!(query.len(), self.dim);

        let data = self.data.read();
        let scales = self.scales.read();
        let biases = self.biases.read();
        let ids = self.ids.read();
        let n = ids.len();
        if n == 0 { return Vec::new(); }

        let q_norm = dot(query, query).sqrt();
        if q_norm == 0.0 { return Vec::new(); }

        let mut scores: Vec<(u32, f32)> = Vec::with_capacity(n);
        for i in 0..n {
            let start = i * self.dim;
            let qdata = &data[start..start + self.dim];
            let scale = scales[i];
            let bias = biases[i];

            // Fused dequant + dot product (auto-vectorizable)
            let mut dot_prod = 0.0f32;
            let mut norm_sq = 0.0f32;
            for j in 0..self.dim {
                let dequant = qdata[j] as f32 * scale + bias;
                dot_prod += query[j] * dequant;
                norm_sq += dequant * dequant;
            }

            let c_norm = norm_sq.sqrt();
            let sim = if c_norm > 0.0 { dot_prod / (q_norm * c_norm) } else { 0.0 };
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

    pub fn is_empty(&self) -> bool {
        self.ids.read().is_empty()
    }

    /// Memory used by quantized vectors (bytes).
    pub fn memory_bytes(&self) -> usize {
        let n = self.ids.read().len();
        // INT8 data + per-vector scale + bias
        n * self.dim + n * 8
    }
}

/// Quantize FP32 vector to INT8 with per-vector min-max scaling.
/// Returns (quantized_bytes, scale, bias) where: float = int8 * scale + bias
fn quantize_to_int8(values: &[f32]) -> (Vec<i8>, f32, f32) {
    let mut min_val = f32::MAX;
    let mut max_val = f32::MIN;
    for &v in values {
        if v < min_val { min_val = v; }
        if v > max_val { max_val = v; }
    }

    let range = max_val - min_val;
    if range == 0.0 {
        return (vec![0i8; values.len()], 0.0, min_val);
    }

    // Map [min, max] → [-127, 127]
    let scale = range / 255.0;
    let bias = min_val + 127.0 * scale;

    let quantized: Vec<i8> = values.iter().map(|&v| {
        
        ((v - bias) / scale).round().clamp(-127.0, 127.0) as i8
    }).collect();

    (quantized, scale, bias)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quantized_cosine_accuracy() {
        let store = QuantizedEmbeddingStore::new(4);
        store.insert(1, &[1.0, 0.0, 0.0, 0.0]);
        store.insert(2, &[0.9, 0.1, 0.0, 0.0]);
        store.insert(3, &[0.0, 0.0, 1.0, 0.0]);

        let results = store.top_k(&[1.0, 0.0, 0.0, 0.0], 3);
        assert_eq!(results.len(), 3);
        // ID 1 should be most similar
        assert_eq!(results[0].0, 1);
        // ID 2 should be second
        assert_eq!(results[1].0, 2);
        // Scores should be reasonable (>0.9 for perfect match)
        assert!(results[0].1 > 0.95, "perfect match score: {}", results[0].1);
    }

    #[test]
    fn test_quantized_memory_savings() {
        let fp32_store = EmbeddingStore::new(384);
        let int8_store = QuantizedEmbeddingStore::new(384);

        let emb: Vec<f32> = (0..384).map(|i| (i as f32 / 384.0) - 0.5).collect();

        for i in 0..100 {
            fp32_store.insert(i, &emb);
            int8_store.insert(i, &emb);
        }

        // INT8 should use ~4x less memory for vectors
        let int8_bytes = int8_store.memory_bytes();
        let fp32_bytes = 100 * 384 * 4; // 100 vectors × 384 dims × 4 bytes
        assert!(int8_bytes < fp32_bytes / 3, "INT8={} should be <33% of FP32={}", int8_bytes, fp32_bytes);
    }

    #[test]
    fn test_quantize_roundtrip() {
        let values = vec![0.1, 0.5, -0.3, 0.8, -0.1];
        let (quantized, scale, bias) = quantize_to_int8(&values);

        // Dequantize and check accuracy
        for (i, &orig) in values.iter().enumerate() {
            let restored = quantized[i] as f32 * scale + bias;
            let error = (orig - restored).abs();
            assert!(error < 0.02, "too much error: orig={}, restored={}, err={}", orig, restored, error);
        }
    }
}
