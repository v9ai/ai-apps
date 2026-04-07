/// BGE-small-en-v1.5 embedding client via ONNX Runtime.
///
/// Produces 384-dim L2-normalized embeddings compatible with the existing
/// `EmbeddingIndex` (INT8 quantized, mmap-backed, NEON SIMD search).
///
/// Model: BAAI/bge-small-en-v1.5 (33M params, 14.9M HuggingFace downloads)
/// Export: `mlx-training/export_onnx.py --model bge`
/// Files needed:
///   - `~/.cache/leadgen-ml/bge-small-en-v1.5/model.onnx`
///   - `~/.cache/leadgen-ml/bge-small-en-v1.5/tokenizer.json`

use std::path::Path;
use std::sync::Arc;

use ort::session::Session;
use tokenizers::Tokenizer;

/// Default model directory under user cache.
const DEFAULT_MODEL_DIR: &str = "bge-small-en-v1.5";
const EMBEDDING_DIM: usize = 384;
const MAX_SEQ_LEN: usize = 512;

pub struct BgeEmbedder {
    session: Session,
    tokenizer: Tokenizer,
    dim: usize,
}

/// A batch of embeddings, row-major: [n_texts × dim].
pub struct EmbeddingBatch {
    pub data: Vec<f32>,
    pub dim: usize,
    pub count: usize,
}

impl EmbeddingBatch {
    /// Get the embedding for a specific index.
    pub fn get(&self, idx: usize) -> &[f32] {
        &self.data[idx * self.dim..(idx + 1) * self.dim]
    }
}

impl BgeEmbedder {
    /// Load from a directory containing `model.onnx` and `tokenizer.json`.
    pub fn load(model_dir: &Path) -> anyhow::Result<Self> {
        let onnx_path = model_dir.join("model.onnx");
        let tokenizer_path = model_dir.join("tokenizer.json");

        anyhow::ensure!(onnx_path.exists(), "ONNX model not found: {}", onnx_path.display());
        anyhow::ensure!(tokenizer_path.exists(), "Tokenizer not found: {}", tokenizer_path.display());

        let session = Session::builder()?
            .with_optimization_level(ort::session::builder::GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_file(&onnx_path)?;

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| anyhow::anyhow!("Failed to load tokenizer: {}", e))?;

        Ok(Self {
            session,
            tokenizer,
            dim: EMBEDDING_DIM,
        })
    }

    /// Load from the default cache directory (`~/.cache/leadgen-ml/bge-small-en-v1.5/`).
    pub fn load_default() -> anyhow::Result<Self> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let model_dir = Path::new(&home).join(".cache/leadgen-ml").join(DEFAULT_MODEL_DIR);
        Self::load(&model_dir)
    }

    /// Embedding dimension (384 for bge-small-en-v1.5).
    pub fn dim(&self) -> usize {
        self.dim
    }

    /// Embed a single text. Returns L2-normalized 384-dim vector.
    pub fn embed(&self, text: &str) -> anyhow::Result<Vec<f32>> {
        let batch = self.embed_batch(&[text])?;
        Ok(batch.data)
    }

    /// Embed a batch of texts. Returns row-major [n × 384] L2-normalized vectors.
    pub fn embed_batch(&self, texts: &[&str]) -> anyhow::Result<EmbeddingBatch> {
        let n = texts.len();
        if n == 0 {
            return Ok(EmbeddingBatch { data: Vec::new(), dim: self.dim, count: 0 });
        }

        // Tokenize all texts
        let encodings = self.tokenizer.encode_batch(texts.to_vec(), true)
            .map_err(|e| anyhow::anyhow!("Tokenization failed: {}", e))?;

        // Find max length for padding
        let max_len = encodings.iter()
            .map(|e| e.get_ids().len().min(MAX_SEQ_LEN))
            .max()
            .unwrap_or(0);

        // Build padded tensors: input_ids, attention_mask, token_type_ids
        let mut input_ids = vec![0i64; n * max_len];
        let mut attention_mask = vec![0i64; n * max_len];
        let mut token_type_ids = vec![0i64; n * max_len];

        for (i, encoding) in encodings.iter().enumerate() {
            let ids = encoding.get_ids();
            let mask = encoding.get_attention_mask();
            let type_ids = encoding.get_type_ids();
            let len = ids.len().min(max_len);

            for j in 0..len {
                input_ids[i * max_len + j] = ids[j] as i64;
                attention_mask[i * max_len + j] = mask[j] as i64;
                token_type_ids[i * max_len + j] = type_ids[j] as i64;
            }
        }

        // Run ONNX inference
        let input_ids_array = ndarray::Array2::from_shape_vec((n, max_len), input_ids)?;
        let attention_mask_array = ndarray::Array2::from_shape_vec((n, max_len), attention_mask)?;
        let token_type_ids_array = ndarray::Array2::from_shape_vec((n, max_len), token_type_ids)?;

        let outputs = self.session.run(ort::inputs![
            "input_ids" => input_ids_array.view(),
            "attention_mask" => attention_mask_array.view(),
            "token_type_ids" => token_type_ids_array.view(),
        ]?)?;

        // Extract [CLS] token embeddings (first token of each sequence)
        // Output shape: [batch_size, seq_len, hidden_dim]
        let output_tensor = outputs[0].try_extract_tensor::<f32>()?;
        let output_view = output_tensor.view();

        let mut result = Vec::with_capacity(n * self.dim);
        for i in 0..n {
            // [CLS] pooling: take the first token's hidden state
            for d in 0..self.dim {
                result.push(output_view[[i, 0, d]]);
            }
        }

        // L2 normalize each embedding
        for i in 0..n {
            let start = i * self.dim;
            let end = start + self.dim;
            let slice = &mut result[start..end];

            let norm = slice.iter().map(|x| x * x).sum::<f32>().sqrt();
            if norm > 1e-10 {
                for v in slice.iter_mut() {
                    *v /= norm;
                }
            }
        }

        Ok(EmbeddingBatch { data: result, dim: self.dim, count: n })
    }

    /// Compute cosine similarity between two texts.
    pub fn similarity(&self, text_a: &str, text_b: &str) -> anyhow::Result<f32> {
        let batch = self.embed_batch(&[text_a, text_b])?;
        let a = batch.get(0);
        let b = batch.get(1);
        Ok(dot(a, b)) // already L2-normalized, so dot = cosine
    }
}

#[inline]
fn dot(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

/// Convenience: embed company description for ICP matching.
/// Prepends the BGE instruction prefix for retrieval tasks.
pub fn embed_for_retrieval(embedder: &BgeEmbedder, text: &str) -> anyhow::Result<Vec<f32>> {
    // BGE models use instruction prefixing for asymmetric retrieval
    let query = format!("Represent this sentence for searching relevant passages: {}", text);
    embedder.embed(&query)
}

/// Convenience: embed ICP/query description.
pub fn embed_query(embedder: &BgeEmbedder, query: &str) -> anyhow::Result<Vec<f32>> {
    let prefixed = format!("Represent this sentence for searching relevant passages: {}", query);
    embedder.embed(&prefixed)
}

/// Convenience: embed document/company description (no prefix for documents).
pub fn embed_document(embedder: &BgeEmbedder, doc: &str) -> anyhow::Result<Vec<f32>> {
    embedder.embed(doc)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_l2_normalize() {
        let mut v = vec![3.0, 4.0, 0.0];
        let norm = v.iter().map(|x| x * x).sum::<f32>().sqrt();
        for x in v.iter_mut() {
            *x /= norm;
        }
        let renorm: f32 = v.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((renorm - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_dot_normalized() {
        let a = [1.0, 0.0, 0.0];
        let b = [1.0, 0.0, 0.0];
        assert!((dot(&a, &b) - 1.0).abs() < 1e-6);

        let c = [0.0, 1.0, 0.0];
        assert!(dot(&a, &c).abs() < 1e-6);
    }

    #[test]
    fn test_embedding_batch_get() {
        let batch = EmbeddingBatch {
            data: vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
            dim: 3,
            count: 2,
        };
        assert_eq!(batch.get(0), &[1.0, 2.0, 3.0]);
        assert_eq!(batch.get(1), &[4.0, 5.0, 6.0]);
    }
}
