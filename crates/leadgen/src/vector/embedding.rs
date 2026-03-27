use std::sync::Arc;

use anyhow::{Context, Result};
use async_trait::async_trait;

/// Trait for text embedding generation.
#[async_trait]
pub trait Embedder: Send + Sync {
    /// Embed a batch of texts into vectors.
    async fn embed(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>>;

    /// Embed a single text.
    async fn embed_one(&self, text: &str) -> Result<Vec<f32>> {
        let results = self.embed(&[text]).await?;
        results
            .into_iter()
            .next()
            .context("embedding returned no results")
    }

    /// Get the embedding dimension.
    fn dimension(&self) -> usize;
}

// ── Candle Embedder (local Metal GPU inference) ──────────────────────────────

/// In-process embedding via Candle on M1 Metal GPU.
///
/// Loads a BERT-family model (default: all-MiniLM-L6-v2, 384-dim, ~90MB FP32)
/// from HuggingFace Hub and runs inference entirely in-process.
/// No HTTP overhead — expected ~2000-3000 texts/sec on M1.
pub struct CandleEmbedder {
    inner: Arc<CandleInner>,
}

struct CandleInner {
    model: candle::EmbeddingModel,
    dim: usize,
}

// candle::EmbeddingModel holds Tensors which are reference-counted and thread-safe.
// The tokenizer is also Send+Sync. Safe to share across threads via Arc.
unsafe impl Send for CandleInner {}
unsafe impl Sync for CandleInner {}

impl CandleEmbedder {
    /// Load all-MiniLM-L6-v2 (384-dim) on the best available device (Metal → CUDA → CPU).
    pub fn mini_lm() -> Result<Self> {
        Self::from_hf("sentence-transformers/all-MiniLM-L6-v2", 384)
    }

    /// Load any BERT-family model from HuggingFace Hub.
    pub fn from_hf(repo_id: &str, dimension: usize) -> Result<Self> {
        let device = candle::best_device().context("failed to select compute device")?;
        tracing::info!(repo = repo_id, ?device, "loading Candle embedding model");
        let model = candle::EmbeddingModel::from_hf(repo_id, &device)
            .context("failed to load embedding model")?;
        Ok(Self {
            inner: Arc::new(CandleInner { model, dim: dimension }),
        })
    }

    /// Synchronous embed — call from blocking context.
    pub fn embed_sync(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>> {
        let mut all = Vec::with_capacity(texts.len());
        for chunk in texts.chunks(32) {
            let tensor = self.inner.model.embed(chunk).context("candle embed failed")?;
            for i in 0..chunk.len() {
                let row = tensor.get(i).context("index out of bounds")?;
                let vec = row.to_vec1::<f32>().context("tensor to vec failed")?;
                debug_assert_eq!(vec.len(), self.inner.dim, "dimension mismatch");
                all.push(vec);
            }
        }
        Ok(all)
    }
}

#[async_trait]
impl Embedder for CandleEmbedder {
    async fn embed(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        let texts_owned: Vec<String> = texts.iter().map(|s| s.to_string()).collect();
        let inner = Arc::clone(&self.inner);

        tokio::task::spawn_blocking(move || -> Result<Vec<Vec<f32>>> {
            let refs: Vec<&str> = texts_owned.iter().map(|s| s.as_str()).collect();
            let mut all = Vec::with_capacity(refs.len());
            for chunk in refs.chunks(32) {
                let tensor = inner.model.embed(chunk).context("candle embed failed")?;
                for i in 0..chunk.len() {
                    let row = tensor.get(i).context("index out of bounds")?;
                    let vec = row.to_vec1::<f32>().context("tensor to vec failed")?;
                    debug_assert_eq!(vec.len(), inner.dim, "dimension mismatch");
                    all.push(vec);
                }
            }
            Ok(all)
        })
        .await
        .context("spawn_blocking panicked")?
    }

    fn dimension(&self) -> usize {
        self.inner.dim
    }
}

/// Cosine similarity between two vectors.
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a > 0.0 && norm_b > 0.0 {
        dot / (norm_a * norm_b)
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cosine_identical_vectors() {
        let v = vec![1.0, 0.0, 0.0];
        let sim = cosine_similarity(&v, &v);
        assert!((sim - 1.0).abs() < 0.001);
    }

    #[test]
    fn cosine_orthogonal_vectors() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        let sim = cosine_similarity(&a, &b);
        assert!(sim.abs() < 0.001);
    }

    #[test]
    fn cosine_zero_vector() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![0.0, 0.0, 0.0];
        let sim = cosine_similarity(&a, &b);
        assert_eq!(sim, 0.0);
    }
}
