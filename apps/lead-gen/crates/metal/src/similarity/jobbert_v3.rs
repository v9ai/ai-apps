/// TechWolf/JobBERT-v3 embedding client via ONNX Runtime.
///
/// Produces 1024-dim L2-normalized embeddings optimized for job/skill matching.
/// Architecture: XLM-RoBERTa (768 hidden) -> mean pooling -> Dense(768->1024, Tanh) -> L2 norm.
///
/// Model: TechWolf/JobBERT-v3 (278M params, sentence-transformers)
/// Base: XLM-RoBERTa (12 layers, 12 heads, 768 hidden, vocab 250002)
/// Pooling: Mean token pooling (not [CLS])
/// Projection: Linear(768->1024) + Tanh activation (asymmetric anchor/positive heads)
/// Max seq: 64 tokens
/// Similarity: Cosine
///
/// Export: `mlx-training/export_onnx.py --model jobbert-v3`
/// Files needed:
///   - `~/.cache/leadgen-ml/JobBERT-v3/model.onnx`       (transformer weights)
///   - `~/.cache/leadgen-ml/JobBERT-v3/tokenizer.json`    (SentencePiece tokenizer)
///   - `~/.cache/leadgen-ml/JobBERT-v3/dense_weight.bin`  (768x1024 f32, row-major)
///   - `~/.cache/leadgen-ml/JobBERT-v3/dense_bias.bin`    (1024 f32)

use std::path::Path;

use ort::session::Session;
use tokenizers::Tokenizer;

/// Default model directory under user cache.
const DEFAULT_MODEL_DIR: &str = "JobBERT-v3";

/// Final output embedding dimension after Dense projection.
const EMBEDDING_DIM: usize = 1024;

/// Transformer hidden dimension (XLM-RoBERTa base).
const HIDDEN_DIM: usize = 768;

/// Max sequence length from sentence_bert_config.json.
const MAX_SEQ_LEN: usize = 64;

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
/// Loaded from separate binary files exported from the SafeTensors Dense head.
struct DenseProjection {
    /// Weight matrix: [out_features x in_features] row-major.
    weight: Vec<f32>,
    /// Bias vector: [out_features].
    bias: Vec<f32>,
    in_features: usize,
    out_features: usize,
}

impl DenseProjection {
    /// Load from binary files: `dense_weight.bin` (out*in f32s) and `dense_bias.bin` (out f32s).
    fn load(model_dir: &Path) -> anyhow::Result<Self> {
        let weight_path = model_dir.join("dense_weight.bin");
        let bias_path = model_dir.join("dense_bias.bin");

        anyhow::ensure!(weight_path.exists(), "Dense weight not found: {}", weight_path.display());
        anyhow::ensure!(bias_path.exists(), "Dense bias not found: {}", bias_path.display());

        let weight_bytes = std::fs::read(&weight_path)?;
        let bias_bytes = std::fs::read(&bias_path)?;

        let expected_weight_size = EMBEDDING_DIM * HIDDEN_DIM * 4; // f32
        let expected_bias_size = EMBEDDING_DIM * 4;

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

        Ok(Self {
            weight,
            bias,
            in_features: HIDDEN_DIM,
            out_features: EMBEDDING_DIM,
        })
    }

    /// Apply: output = tanh(input @ weight^T + bias).
    /// Input: [in_features], Output: [out_features].
    fn forward(&self, input: &[f32]) -> Vec<f32> {
        debug_assert_eq!(input.len(), self.in_features);
        let mut output = vec![0.0f32; self.out_features];

        // Matrix-vector multiply: out[j] = sum_i(input[i] * weight[j * in + i]) + bias[j]
        for j in 0..self.out_features {
            let row_offset = j * self.in_features;
            let mut sum = 0.0f32;
            for i in 0..self.in_features {
                sum += input[i] * self.weight[row_offset + i];
            }
            // Tanh activation
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

/// Helper to convert ort errors (which may not be Send+Sync) to anyhow.
fn ort_err<R: std::fmt::Display>(e: R) -> anyhow::Error {
    anyhow::anyhow!("{}", e)
}

pub struct JobBertV3Embedder {
    session: Session,
    tokenizer: Tokenizer,
    dense: DenseProjection,
    dim: usize,
}

impl JobBertV3Embedder {
    /// Load from a directory containing `model.onnx`, `tokenizer.json`,
    /// `dense_weight.bin`, and `dense_bias.bin`.
    pub fn load(model_dir: &Path) -> anyhow::Result<Self> {
        let onnx_path = model_dir.join("model.onnx");
        let tokenizer_path = model_dir.join("tokenizer.json");

        anyhow::ensure!(onnx_path.exists(), "ONNX model not found: {}", onnx_path.display());
        anyhow::ensure!(tokenizer_path.exists(), "Tokenizer not found: {}", tokenizer_path.display());

        let mut builder = Session::builder()
            .map_err(ort_err)?
            .with_optimization_level(ort::session::builder::GraphOptimizationLevel::Level3)
            .map_err(ort_err)?
            .with_intra_threads(4)
            .map_err(ort_err)?;
        let session = builder.commit_from_file(&onnx_path).map_err(ort_err)?;

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| anyhow::anyhow!("Failed to load tokenizer: {}", e))?;

        let dense = DenseProjection::load(model_dir)?;

        Ok(Self {
            session,
            tokenizer,
            dense,
            dim: EMBEDDING_DIM,
        })
    }

    /// Load from the default cache directory (`~/.cache/leadgen-ml/JobBERT-v3/`).
    pub fn load_default() -> anyhow::Result<Self> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let model_dir = Path::new(&home).join(".cache/leadgen-ml").join(DEFAULT_MODEL_DIR);
        Self::load(&model_dir)
    }

    /// Embedding dimension (1024 for JobBERT-v3).
    pub fn dim(&self) -> usize {
        self.dim
    }

    /// Hidden dimension from the transformer (768).
    pub fn hidden_dim(&self) -> usize {
        HIDDEN_DIM
    }

    /// Embed a single text. Returns L2-normalized 1024-dim vector.
    pub fn embed(&self, text: &str) -> anyhow::Result<Vec<f32>> {
        let batch = self.embed_batch(&[text])?;
        Ok(batch.data)
    }

    /// Embed a batch of texts. Returns row-major [n x 1024] L2-normalized vectors.
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
        // XLM-RoBERTa has type_vocab_size=1, so token_type_ids are always 0.
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

        let (shape, hidden_data) = self.run_transformer(&input_ids, &attention_mask, n, max_len)?;

        // Mean pooling: average over non-padding tokens using attention_mask
        let hidden_dim = shape[2];
        let mut pooled = vec![0.0f32; n * hidden_dim];
        for i in 0..n {
            let mut token_count = 0.0f32;
            for t in 0..max_len {
                let mask_val = attention_mask[i * max_len + t] as f32;
                if mask_val > 0.0 {
                    for d in 0..hidden_dim {
                        pooled[i * hidden_dim + d] += hidden_data[i * max_len * hidden_dim + t * hidden_dim + d] * mask_val;
                    }
                    token_count += mask_val;
                }
            }
            if token_count > 0.0 {
                for d in 0..hidden_dim {
                    pooled[i * hidden_dim + d] /= token_count;
                }
            }
        }

        // Dense projection: 768 -> 1024 with Tanh
        let projected = self.dense.forward_batch(&pooled, n);

        // L2 normalize each 1024-dim embedding
        let mut result = projected;
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

    /// Get raw mean-pooled hidden states (768-dim) without Dense projection.
    /// Useful for per-token analysis or custom downstream heads.
    pub fn embed_hidden(&self, text: &str) -> anyhow::Result<Vec<f32>> {
        let batch = self.embed_hidden_batch(&[text])?;
        Ok(batch[..HIDDEN_DIM].to_vec())
    }

    /// Batch raw mean-pooled hidden states (768-dim each) without Dense projection.
    /// Returns flat [n x 768] row-major.
    pub fn embed_hidden_batch(&self, texts: &[&str]) -> anyhow::Result<Vec<f32>> {
        let n = texts.len();
        if n == 0 {
            return Ok(Vec::new());
        }

        let encodings = self.tokenizer.encode_batch(texts.to_vec(), true)
            .map_err(|e| anyhow::anyhow!("Tokenization failed: {}", e))?;

        let max_len = encodings.iter()
            .map(|e| e.get_ids().len().min(MAX_SEQ_LEN))
            .max()
            .unwrap_or(0);

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

        let (shape, hidden_data) = self.run_transformer(&input_ids, &attention_mask, n, max_len)?;

        let hidden_dim = shape[2];
        let mut pooled = vec![0.0f32; n * hidden_dim];
        for i in 0..n {
            let mut token_count = 0.0f32;
            for t in 0..max_len {
                let mask_val = attention_mask[i * max_len + t] as f32;
                if mask_val > 0.0 {
                    for d in 0..hidden_dim {
                        pooled[i * hidden_dim + d] += hidden_data[i * max_len * hidden_dim + t * hidden_dim + d] * mask_val;
                    }
                    token_count += mask_val;
                }
            }
            if token_count > 0.0 {
                for d in 0..hidden_dim {
                    pooled[i * hidden_dim + d] /= token_count;
                }
            }
        }

        Ok(pooled)
    }

    /// Extract per-token hidden states (768-dim each) for a single text.
    /// Returns (token_texts, hidden_states) where hidden_states is [n_tokens x 768].
    /// Excludes special tokens ([CLS], [SEP], padding).
    pub fn extract_token_features(&self, text: &str) -> anyhow::Result<TokenFeatures> {
        let encoding = self.tokenizer.encode(text, true)
            .map_err(|e| anyhow::anyhow!("Tokenization failed: {}", e))?;

        let ids = encoding.get_ids();
        let offsets = encoding.get_offsets();
        let special_mask = encoding.get_special_tokens_mask();
        let len = ids.len().min(MAX_SEQ_LEN);

        let input_ids: Vec<i64> = ids[..len].iter().map(|&id| id as i64).collect();
        let attention_mask: Vec<i64> = vec![1i64; len];

        let (shape, hidden_data) = self.run_transformer(&input_ids, &attention_mask, 1, len)?;
        let hidden_dim = shape[2];

        // Collect non-special tokens with their hidden states
        let mut tokens = Vec::new();
        let mut features = Vec::new();

        for t in 0..len {
            // Skip special tokens ([CLS], [SEP], etc.)
            if special_mask[t] == 1 {
                continue;
            }

            let (char_start, char_end) = offsets[t];
            if char_start < text.len() && char_end <= text.len() && char_start < char_end {
                let token_text = text[char_start..char_end].to_string();
                tokens.push(token_text);

                for d in 0..hidden_dim {
                    features.push(hidden_data[t * hidden_dim + d]);
                }
            }
        }

        Ok(TokenFeatures {
            tokens,
            features,
            dim: hidden_dim,
        })
    }

    /// Run the ONNX transformer model and return (shape_dims, flat_data).
    /// Output shape: [batch_size, seq_len, hidden_dim].
    fn run_transformer(
        &self,
        input_ids: &[i64],
        attention_mask: &[i64],
        batch_size: usize,
        seq_len: usize,
    ) -> anyhow::Result<(Vec<usize>, Vec<f32>)> {
        use ort::value::TensorRef;

        let input_ids_array = ndarray::Array2::from_shape_vec(
            (batch_size, seq_len),
            input_ids.to_vec(),
        )?;
        let attention_mask_array = ndarray::Array2::from_shape_vec(
            (batch_size, seq_len),
            attention_mask.to_vec(),
        )?;

        // XLM-RoBERTa: token_type_ids are always 0 (type_vocab_size=1).
        // Some ONNX exports include this input, some don't. We pass it for compatibility.
        let token_type_ids = vec![0i64; batch_size * seq_len];
        let token_type_ids_array = ndarray::Array2::from_shape_vec(
            (batch_size, seq_len),
            token_type_ids,
        )?;

        // Create ort tensor views from ndarray arrays (zero-copy borrow)
        let ids_tensor = TensorRef::<i64>::from_array_view(&input_ids_array).map_err(ort_err)?;
        let mask_tensor = TensorRef::<i64>::from_array_view(&attention_mask_array).map_err(ort_err)?;
        let type_tensor = TensorRef::<i64>::from_array_view(&token_type_ids_array).map_err(ort_err)?;

        let inputs = ort::inputs![
            "input_ids" => ids_tensor,
            "attention_mask" => mask_tensor,
            "token_type_ids" => type_tensor,
        ];

        // run() requires &mut self on Session, but we only hold &self.
        // The session is internally thread-safe for inference. We use a raw pointer cast
        // to work around the API's overly conservative borrow requirement.
        // Safety: ONNX Runtime's InferenceSession is thread-safe for concurrent Run() calls
        // with different input/output buffers, which is our use case.
        let session_ptr = &self.session as *const Session as *mut Session;
        let session_mut = unsafe { &mut *session_ptr };

        let outputs = session_mut.run(inputs).map_err(ort_err)?;

        // Output is a DynValue. Extract as tensor: returns (&Shape, &[f32]).
        let (shape, data) = outputs[0].try_extract_tensor::<f32>().map_err(ort_err)?;

        // Shape dimensions (e.g., [batch_size, seq_len, 768])
        let dims: Vec<usize> = shape.iter().map(|&d| d as usize).collect();
        let flat_data = data.to_vec();

        Ok((dims, flat_data))
    }
}

/// Per-token feature extraction result.
pub struct TokenFeatures {
    /// Token surface forms (subwords from the tokenizer).
    pub tokens: Vec<String>,
    /// Hidden states: [n_tokens x dim] row-major.
    pub features: Vec<f32>,
    /// Feature dimension per token (768).
    pub dim: usize,
}

impl TokenFeatures {
    /// Number of tokens.
    pub fn count(&self) -> usize {
        self.tokens.len()
    }

    /// Get features for a specific token index.
    pub fn get(&self, idx: usize) -> &[f32] {
        &self.features[idx * self.dim..(idx + 1) * self.dim]
    }
}

#[inline]
fn dot(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

// ---------------------------------------------------------------------------
// Feature extraction utilities
// ---------------------------------------------------------------------------

/// Extract the full 1024-dim feature vector from a job description.
/// This is the primary entry point for downstream ML tasks.
pub fn extract_job_features(embedder: &JobBertV3Embedder, job_text: &str) -> anyhow::Result<Vec<f32>> {
    embedder.embed(job_text)
}

/// Batch extract 1024-dim feature vectors from multiple job descriptions.
/// Returns row-major [n x 1024].
pub fn batch_extract_features(
    embedder: &JobBertV3Embedder,
    texts: &[&str],
) -> anyhow::Result<EmbeddingBatch> {
    embedder.embed_batch(texts)
}

/// Compute semantic similarity between two job descriptions.
/// Returns a score in [-1, 1] where 1 = identical meaning.
pub fn job_match_score(
    embedder: &JobBertV3Embedder,
    job_a: &str,
    job_b: &str,
) -> anyhow::Result<f32> {
    embedder.similarity(job_a, job_b)
}

/// Extract per-token features from a job description.
/// Returns 768-dim hidden states for each subword token -- useful for
/// skill span detection, entity highlighting, or attention analysis.
pub fn extract_token_level_features(
    embedder: &JobBertV3Embedder,
    job_text: &str,
) -> anyhow::Result<TokenFeatures> {
    embedder.extract_token_features(job_text)
}

/// Rank a list of candidate jobs by similarity to a reference job description.
/// Returns (index, score) pairs sorted descending by similarity.
pub fn rank_jobs_by_similarity(
    embedder: &JobBertV3Embedder,
    reference: &str,
    candidates: &[&str],
) -> anyhow::Result<Vec<(usize, f32)>> {
    if candidates.is_empty() {
        return Ok(Vec::new());
    }

    let ref_emb = embedder.embed(reference)?;

    // Embed all candidates in one batch
    let batch = embedder.embed_batch(candidates)?;

    let mut scores: Vec<(usize, f32)> = (0..batch.count)
        .map(|i| {
            let score = dot(&ref_emb, batch.get(i));
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
    fn test_dense_projection_forward() {
        // Small 2->3 Dense with known weights
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

        // output[0] = tanh(1*1 + 0*0 + 0) = tanh(1)
        assert!((output[0] - 1.0f32.tanh()).abs() < 1e-6);
        // output[1] = tanh(0*1 + 1*0 + 0) = tanh(0) = 0
        assert!(output[1].abs() < 1e-6);
        // output[2] = tanh(0.5*1 + 0.5*0 + 0) = tanh(0.5)
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
        // output[0] = tanh(1*2 + 0*3 + 0.5) = tanh(2.5)
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

        let inputs = vec![1.0f32, 0.0, 0.0, 1.0]; // 2 vectors of dim 2
        let output = dense.forward_batch(&inputs, 2);

        assert_eq!(output.len(), 4);
        // First vector: tanh([1,0]) = [tanh(1), tanh(0)]
        assert!((output[0] - 1.0f32.tanh()).abs() < 1e-6);
        assert!(output[1].abs() < 1e-6);
        // Second vector: tanh([0,1]) = [tanh(0), tanh(1)]
        assert!(output[2].abs() < 1e-6);
        assert!((output[3] - 1.0f32.tanh()).abs() < 1e-6);
    }

    #[test]
    fn test_dense_identity_like() {
        // When weight is identity and bias is zero, output = tanh(input)
        let dense = DenseProjection {
            weight: vec![
                1.0, 0.0, 0.0, // row 0
                0.0, 1.0, 0.0, // row 1
                0.0, 0.0, 1.0, // row 2
            ],
            bias: vec![0.0, 0.0, 0.0],
            in_features: 3,
            out_features: 3,
        };

        let input = [0.5f32, -0.3, 0.8];
        let output = dense.forward(&input);

        for i in 0..3 {
            assert!((output[i] - input[i].tanh()).abs() < 1e-6);
        }
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
        // Near-orthogonal: dot should be close to 0
        assert!(dot(&a, &b).abs() < 0.01);
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

    #[test]
    fn test_token_features_get() {
        let tf = TokenFeatures {
            tokens: vec!["hello".to_string(), "world".to_string()],
            features: vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
            dim: 3,
        };
        assert_eq!(tf.count(), 2);
        assert_eq!(tf.get(0), &[1.0, 2.0, 3.0]);
        assert_eq!(tf.get(1), &[4.0, 5.0, 6.0]);
    }

    #[test]
    fn test_token_features_empty() {
        let tf = TokenFeatures {
            tokens: Vec::new(),
            features: Vec::new(),
            dim: 768,
        };
        assert_eq!(tf.count(), 0);
    }

    #[test]
    fn test_constants() {
        assert_eq!(EMBEDDING_DIM, 1024);
        assert_eq!(HIDDEN_DIM, 768);
        assert_eq!(MAX_SEQ_LEN, 64);
    }

    #[test]
    fn test_mean_pooling_logic() {
        // Simulate mean pooling with attention mask
        let hidden_dim = 3;
        let seq_len = 4;
        // Two tokens active, two padded
        let attention_mask = [1i64, 1, 0, 0];
        // Hidden states: token 0 = [1,2,3], token 1 = [4,5,6], pad = [0,0,0]
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

        // Mean of [1,2,3] and [4,5,6] = [2.5, 3.5, 4.5]
        assert!((pooled[0] - 2.5).abs() < 1e-6);
        assert!((pooled[1] - 3.5).abs() < 1e-6);
        assert!((pooled[2] - 4.5).abs() < 1e-6);
    }

    #[test]
    fn test_dense_weight_size_calculation() {
        // Verify the expected binary file sizes
        let weight_size = EMBEDDING_DIM * HIDDEN_DIM * 4; // 1024 * 768 * 4
        let bias_size = EMBEDDING_DIM * 4; // 1024 * 4

        assert_eq!(weight_size, 3_145_728); // ~3 MB
        assert_eq!(bias_size, 4_096);
    }
}
