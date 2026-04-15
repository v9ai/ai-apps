/// Local semantic scorer using candle BERT embeddings.
///
/// Loads `BAAI/bge-small-en-v1.5` from the HuggingFace Hub cache
/// (downloaded once, ~130 MB).  Runs on Metal (macOS) or CPU — no cloud.
///
/// Use `EmbedScorer::new()` once at startup, then call `score()` per org.
/// Scores return cosine similarity ∈ [–1, 1]; typical AI-heavy orgs score
/// 0.5–0.8 against the AI archetype.
use candle::{best_device, EmbeddingModel};

use crate::error::{GhError, Result};

/// Archetype text that represents an AI-first company.
const AI_ARCHETYPE: &str =
    "machine learning deep learning neural network large language model \
     LLM generative AI embeddings transformers fine-tuning inference \
     artificial intelligence research foundation model";

/// Archetype for active product companies (hiring signal proxy).
const PRODUCT_ARCHETYPE: &str =
    "product engineering team fast-moving startup scale distributed systems \
     platform API developer tools cloud infrastructure";

pub struct EmbedScorer {
    model: EmbeddingModel,
    ai_archetype: Vec<f32>,
    product_archetype: Vec<f32>,
}

impl EmbedScorer {
    /// Load BAAI/bge-small-en-v1.5 from the HuggingFace Hub cache.
    /// Downloads the model on the first call (~130 MB), then uses the cache.
    /// This is blocking — call from a thread or `spawn_blocking`.
    pub fn new() -> Result<Self> {
        let device = best_device().map_err(|e| GhError::Other(e.to_string()))?;
        let model = EmbeddingModel::from_hf("BAAI/bge-small-en-v1.5", &device)
            .map_err(|e| GhError::Other(e.to_string()))?;

        let ai_archetype = model
            .embed_one(AI_ARCHETYPE)
            .map_err(|e| GhError::Other(e.to_string()))?;

        let product_archetype = model
            .embed_one(PRODUCT_ARCHETYPE)
            .map_err(|e| GhError::Other(e.to_string()))?;

        Ok(Self { model, ai_archetype, product_archetype })
    }

    /// Cosine similarity of `text` against the AI archetype.
    /// Returns 0.0 on embed failure.
    pub fn ai_score(&self, text: &str) -> f32 {
        self.model
            .embed_one(text)
            .map(|v| cosine(&v, &self.ai_archetype))
            .unwrap_or(0.0)
    }

    /// Cosine similarity of `text` against the product/engineering archetype.
    pub fn product_score(&self, text: &str) -> f32 {
        self.model
            .embed_one(text)
            .map(|v| cosine(&v, &self.product_archetype))
            .unwrap_or(0.0)
    }

    /// Build a combined text blob from an org's description and top repo descriptions.
    pub fn org_text(description: Option<&str>, repo_descriptions: &[Option<String>]) -> String {
        let mut parts: Vec<&str> = Vec::new();
        if let Some(d) = description {
            parts.push(d);
        }
        let descs: Vec<String> = repo_descriptions
            .iter()
            .filter_map(|d| d.as_deref().map(str::to_string))
            .take(5)
            .collect();
        let mut text = parts.join(" ");
        for d in &descs {
            text.push(' ');
            text.push_str(d);
        }
        text
    }
}

fn cosine(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32    = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 { 0.0 } else { dot / (norm_a * norm_b) }
}

#[cfg(test)]
mod tests {
    use super::cosine;

    #[test]
    fn cosine_identical_vectors_is_one() {
        let v = vec![1.0_f32, 2.0, 3.0];
        assert!((cosine(&v, &v) - 1.0).abs() < 1e-5);
    }

    #[test]
    fn cosine_orthogonal_vectors_is_zero() {
        let a = vec![1.0_f32, 0.0];
        let b = vec![0.0_f32, 1.0];
        assert!(cosine(&a, &b).abs() < 1e-5);
    }

    #[test]
    fn cosine_opposite_vectors_is_minus_one() {
        let a = vec![1.0_f32, 0.0];
        let b = vec![-1.0_f32, 0.0];
        assert!((cosine(&a, &b) + 1.0).abs() < 1e-5);
    }

    #[test]
    fn cosine_zero_vector_returns_zero_not_nan() {
        let zero = vec![0.0_f32, 0.0];
        let v    = vec![1.0_f32, 2.0];
        assert_eq!(cosine(&zero, &v), 0.0);
        assert_eq!(cosine(&v, &zero), 0.0);
    }
}
