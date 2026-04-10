/// TechWolf/JobBERT-v2 embedding client via ONNX Runtime.
///
/// Produces L2-normalized embeddings optimized for job title/description similarity.
/// Architecture: MPNet (768 hidden) -> mean pooling -> optional Dense(768->1024, Tanh) -> L2 norm.
///
/// Model: TechWolf/JobBERT-v2 (109M params, sentence-transformers)
/// Base: sentence-transformers/all-mpnet-base-v2 (12 layers, 12 heads, 768 hidden, vocab 30527)
/// Pooling: Mean token pooling (not [CLS])
/// Projection: Optional Linear(768->1024) + Tanh (asymmetric anchor/positive heads)
/// Max seq: 514 positions (64 recommended for job titles)
/// Similarity: Cosine
///
/// Export: `mlx-training/export_onnx.py --model jobbert-v2`
/// Files needed:
///   - `~/.cache/leadgen-ml/JobBERT-v2/model.onnx`        (transformer weights)
///   - `~/.cache/leadgen-ml/JobBERT-v2/tokenizer.json`     (MPNet WordPiece tokenizer)
///   - `~/.cache/leadgen-ml/JobBERT-v2/dense_weight.bin`   (optional: 768x1024 f32, row-major)
///   - `~/.cache/leadgen-ml/JobBERT-v2/dense_bias.bin`     (optional: 1024 f32)

use std::path::Path;

use ort::session::Session;
use tokenizers::Tokenizer;

/// Default model directory under user cache.
const DEFAULT_MODEL_DIR: &str = "JobBERT-v2";

/// Transformer hidden dimension (MPNet base).
const HIDDEN_DIM: usize = 768;

/// Output dimension after Dense projection (when Dense weights are present).
const PROJECTED_DIM: usize = 1024;

/// Max sequence length (MPNet max_position_embeddings = 514).
/// Model card recommends 64 for job titles; longer text is truncated.
const MAX_SEQ_LEN: usize = 514;

/// A batch of embeddings, row-major: [n_texts x dim].
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

/// Dense projection layer: Linear(in_features -> out_features) + Tanh.
/// Loaded from binary files exported from the SafeTensors Dense head.
struct DenseProjection {
    /// Weight matrix: [out_features x in_features] row-major.
    weight: Vec<f32>,
    /// Bias vector: [out_features].
    bias: Vec<f32>,
    in_features: usize,
    out_features: usize,
}

impl DenseProjection {
    /// Load from binary files: `dense_weight.bin` and `dense_bias.bin`.
    fn load(model_dir: &Path) -> anyhow::Result<Option<Self>> {
        let weight_path = model_dir.join("dense_weight.bin");
        let bias_path = model_dir.join("dense_bias.bin");

        // Dense projection is optional — if files don't exist, output raw 768-dim.
        if !weight_path.exists() || !bias_path.exists() {
            return Ok(None);
        }

        let weight_bytes = std::fs::read(&weight_path)?;
        let bias_bytes = std::fs::read(&bias_path)?;

        let expected_weight_size = PROJECTED_DIM * HIDDEN_DIM * 4;
        let expected_bias_size = PROJECTED_DIM * 4;

        anyhow::ensure!(
            weight_bytes.len() == expected_weight_size,
            "Dense weight size mismatch: expected {} bytes, got {}",
            expected_weight_size,
            weight_bytes.len()
        );
        anyhow::ensure!(
            bias_bytes.len() == expected_bias_size,
            "Dense bias size mismatch: expected {} bytes, got {}",
            expected_bias_size,
            bias_bytes.len()
        );

        let weight: Vec<f32> = weight_bytes
            .chunks_exact(4)
            .map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]]))
            .collect();
        let bias: Vec<f32> = bias_bytes
            .chunks_exact(4)
            .map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]]))
            .collect();

        Ok(Some(Self {
            weight,
            bias,
            in_features: HIDDEN_DIM,
            out_features: PROJECTED_DIM,
        }))
    }

    /// Apply: output = tanh(input @ weight^T + bias).
    fn forward(&self, input: &[f32]) -> Vec<f32> {
        debug_assert_eq!(input.len(), self.in_features);
        let mut output = vec![0.0f32; self.out_features];

        for j in 0..self.out_features {
            let row_offset = j * self.in_features;
            let mut sum = 0.0f32;
            for i in 0..self.in_features {
                sum += input[i] * self.weight[row_offset + i];
            }
            output[j] = (sum + self.bias[j]).tanh();
        }

        output
    }

    /// Batch forward: apply Dense projection to multiple vectors.
    fn forward_batch(&self, inputs: &[f32], count: usize) -> Vec<f32> {
        let mut output = Vec::with_capacity(count * self.out_features);
        for i in 0..count {
            let start = i * self.in_features;
            let end = start + self.in_features;
            let projected = self.forward(&inputs[start..end]);
            output.extend_from_slice(&projected);
        }
        output
    }
}

pub struct JobBertEmbedder {
    session: Session,
    tokenizer: Tokenizer,
    dense: Option<DenseProjection>,
    /// Output dimension: 1024 if Dense projection loaded, 768 otherwise.
    dim: usize,
}

impl JobBertEmbedder {
    /// Load from a directory containing `model.onnx`, `tokenizer.json`,
    /// and optionally `dense_weight.bin` + `dense_bias.bin`.
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

        let dense = DenseProjection::load(model_dir)?;
        let dim = if dense.is_some() { PROJECTED_DIM } else { HIDDEN_DIM };

        Ok(Self { session, tokenizer, dense, dim })
    }

    /// Load from the default cache directory (`~/.cache/leadgen-ml/JobBERT-v2/`).
    pub fn load_default() -> anyhow::Result<Self> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let model_dir = Path::new(&home).join(".cache/leadgen-ml").join(DEFAULT_MODEL_DIR);
        Self::load(&model_dir)
    }

    /// Output embedding dimension (1024 with Dense projection, 768 without).
    pub fn dim(&self) -> usize {
        self.dim
    }

    /// Whether Dense projection is active.
    pub fn has_dense_projection(&self) -> bool {
        self.dense.is_some()
    }

    /// Embed a single text. Returns L2-normalized vector.
    pub fn embed(&self, text: &str) -> anyhow::Result<Vec<f32>> {
        let batch = self.embed_batch(&[text])?;
        Ok(batch.data)
    }

    /// Embed a batch of texts. Returns row-major [n x dim] L2-normalized vectors.
    pub fn embed_batch(&self, texts: &[&str]) -> anyhow::Result<EmbeddingBatch> {
        let n = texts.len();
        if n == 0 {
            return Ok(EmbeddingBatch { data: Vec::new(), dim: self.dim, count: 0 });
        }

        // Tokenize all texts
        let encodings = self.tokenizer.encode_batch(texts.to_vec(), true)
            .map_err(|e| anyhow::anyhow!("Tokenization failed: {}", e))?;

        // Find max length for padding (capped at MAX_SEQ_LEN)
        let max_len = encodings.iter()
            .map(|e| e.get_ids().len().min(MAX_SEQ_LEN))
            .max()
            .unwrap_or(0);

        // Build padded tensors: input_ids, attention_mask
        // MPNet does not use token_type_ids.
        let mut input_ids = vec![0i64; n * max_len];
        let mut attention_mask = vec![0i64; n * max_len];

        for (i, encoding) in encodings.iter().enumerate() {
            let ids = encoding.get_ids();
            let mask = encoding.get_attention_mask();
            let len = ids.len().min(max_len);

            for j in 0..len {
                input_ids[i * max_len + j] = ids[j] as i64;
                attention_mask[i * max_len + j] = mask[j] as i64;
            }
        }

        // Run ONNX inference
        let input_ids_array = ndarray::Array2::from_shape_vec((n, max_len), input_ids)?;
        let attention_mask_array = ndarray::Array2::from_shape_vec((n, max_len), attention_mask.clone())?;

        let outputs = self.session.run(ort::inputs![
            "input_ids" => input_ids_array.view(),
            "attention_mask" => attention_mask_array.view(),
        ]?)?;

        // Output shape: [batch_size, seq_len, hidden_dim]
        let output_tensor = outputs[0].try_extract_tensor::<f32>()?;
        let output_view = output_tensor.view();

        // Mean pooling: average over non-padding tokens using attention_mask
        let mut pooled = vec![0.0f32; n * HIDDEN_DIM];
        for i in 0..n {
            let mut token_count = 0.0f32;
            for t in 0..max_len {
                let mask_val = attention_mask[i * max_len + t] as f32;
                if mask_val > 0.0 {
                    for d in 0..HIDDEN_DIM {
                        pooled[i * HIDDEN_DIM + d] += output_view[[i, t, d]] * mask_val;
                    }
                    token_count += mask_val;
                }
            }
            if token_count > 0.0 {
                for d in 0..HIDDEN_DIM {
                    pooled[i * HIDDEN_DIM + d] /= token_count;
                }
            }
        }

        // Apply Dense projection if available, otherwise use 768-dim directly
        let mut result = if let Some(ref dense) = self.dense {
            dense.forward_batch(&pooled, n)
        } else {
            pooled
        };

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

// ---------------------------------------------------------------------------
// Job-specific convenience functions
// ---------------------------------------------------------------------------

/// Embed a job title. JobBERT-v2 was trained on job titles — no prefix needed.
pub fn embed_job_title(embedder: &JobBertEmbedder, title: &str) -> anyhow::Result<Vec<f32>> {
    embedder.embed(title)
}

/// Embed a job description. Longer text may be truncated at 514 tokens.
pub fn embed_job_description(embedder: &JobBertEmbedder, description: &str) -> anyhow::Result<Vec<f32>> {
    embedder.embed(description)
}

/// Compare two job titles for semantic similarity.
/// Returns a score in [-1, 1] where 1 = identical meaning.
pub fn job_title_similarity(
    embedder: &JobBertEmbedder,
    title_a: &str,
    title_b: &str,
) -> anyhow::Result<f32> {
    embedder.similarity(title_a, title_b)
}

/// Match a job description against a search query.
/// Returns cosine similarity in [-1, 1].
pub fn match_job_to_query(
    embedder: &JobBertEmbedder,
    job_description: &str,
    search_query: &str,
) -> anyhow::Result<f32> {
    embedder.similarity(job_description, search_query)
}

/// Rank a list of job titles/descriptions by similarity to a reference.
/// Returns (index, score) pairs sorted descending by similarity.
pub fn rank_jobs_by_query(
    embedder: &JobBertEmbedder,
    query: &str,
    candidates: &[&str],
) -> anyhow::Result<Vec<(usize, f32)>> {
    if candidates.is_empty() {
        return Ok(Vec::new());
    }

    let query_emb = embedder.embed(query)?;
    let batch = embedder.embed_batch(candidates)?;

    let mut scores: Vec<(usize, f32)> = (0..batch.count)
        .map(|i| {
            let score = dot(&query_emb, batch.get(i));
            (i, score)
        })
        .collect();

    scores.sort_unstable_by(|a, b| {
        b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(scores)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_constants() {
        assert_eq!(HIDDEN_DIM, 768);
        assert_eq!(PROJECTED_DIM, 1024);
        assert_eq!(MAX_SEQ_LEN, 514);
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
    fn test_dot_orthogonal() {
        let a = [0.707, 0.707, 0.0];
        let b = [-0.707, 0.707, 0.0];
        assert!(dot(&a, &b).abs() < 0.01);
    }

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
    fn test_embedding_batch_get_768() {
        let batch = EmbeddingBatch {
            data: vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
            dim: 3,
            count: 2,
        };
        assert_eq!(batch.get(0), &[1.0, 2.0, 3.0]);
        assert_eq!(batch.get(1), &[4.0, 5.0, 6.0]);
    }

    #[test]
    fn test_dense_projection_forward() {
        let dense = DenseProjection {
            weight: vec![
                1.0, 0.0, // row 0
                0.0, 1.0, // row 1
                0.5, 0.5, // row 2
            ],
            bias: vec![0.0, 0.0, 0.0],
            in_features: 2,
            out_features: 3,
        };

        let input = [1.0f32, 0.0];
        let output = dense.forward(&input);

        assert!((output[0] - 1.0f32.tanh()).abs() < 1e-6);
        assert!(output[1].abs() < 1e-6);
        assert!((output[2] - 0.5f32.tanh()).abs() < 1e-6);
    }

    #[test]
    fn test_dense_projection_with_bias() {
        let dense = DenseProjection {
            weight: vec![1.0, 0.0],
            bias: vec![0.5],
            in_features: 2,
            out_features: 1,
        };

        let input = [2.0f32, 3.0];
        let output = dense.forward(&input);
        assert!((output[0] - 2.5f32.tanh()).abs() < 1e-6);
    }

    #[test]
    fn test_dense_batch_forward() {
        let dense = DenseProjection {
            weight: vec![1.0, 0.0, 0.0, 1.0],
            bias: vec![0.0, 0.0],
            in_features: 2,
            out_features: 2,
        };

        let inputs = vec![1.0f32, 0.0, 0.0, 1.0];
        let output = dense.forward_batch(&inputs, 2);

        assert_eq!(output.len(), 4);
        assert!((output[0] - 1.0f32.tanh()).abs() < 1e-6);
        assert!(output[1].abs() < 1e-6);
        assert!(output[2].abs() < 1e-6);
        assert!((output[3] - 1.0f32.tanh()).abs() < 1e-6);
    }

    #[test]
    fn test_mean_pooling_logic() {
        let hidden_dim = 3;
        let seq_len = 4;
        let attention_mask = [1i64, 1, 0, 0];
        let hidden = [1.0f32, 2.0, 3.0, 4.0, 5.0, 6.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

        let mut pooled = vec![0.0f32; hidden_dim];
        let mut count = 0.0f32;
        for t in 0..seq_len {
            let mask = attention_mask[t] as f32;
            if mask > 0.0 {
                for d in 0..hidden_dim {
                    pooled[d] += hidden[t * hidden_dim + d] * mask;
                }
                count += mask;
            }
        }
        if count > 0.0 {
            for d in 0..hidden_dim {
                pooled[d] /= count;
            }
        }

        assert!((pooled[0] - 2.5).abs() < 1e-6);
        assert!((pooled[1] - 3.5).abs() < 1e-6);
        assert!((pooled[2] - 4.5).abs() < 1e-6);
    }

    #[test]
    fn test_dense_weight_size_calculation() {
        let weight_size = PROJECTED_DIM * HIDDEN_DIM * 4;
        let bias_size = PROJECTED_DIM * 4;

        assert_eq!(weight_size, 3_145_728); // ~3 MB
        assert_eq!(bias_size, 4_096);
    }
}
