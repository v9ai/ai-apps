/// Cross-encoder reranker via ONNX Runtime (ms-marco-MiniLM-L6-v2).
///
/// Takes (query, document) pairs and produces calibrated relevance scores.
/// Used for two-stage retrieval: fast embedding recall → accurate reranking.
///
/// Model: cross-encoder/ms-marco-MiniLM-L6-v2 (22M params, 15.9M HuggingFace downloads)
/// Export: `mlx-training/export_onnx.py --model reranker`
/// Files needed:
///   - `~/.cache/leadgen-ml/ms-marco-MiniLM-L6-v2/model.onnx`
///   - `~/.cache/leadgen-ml/ms-marco-MiniLM-L6-v2/tokenizer.json`

use std::path::Path;

use ort::session::Session;
use tokenizers::Tokenizer;

const DEFAULT_MODEL_DIR: &str = "ms-marco-MiniLM-L6-v2";
const MAX_SEQ_LEN: usize = 512;

pub struct Reranker {
    session: Session,
    tokenizer: Tokenizer,
}

/// A scored (query, document) pair.
#[derive(Debug, Clone)]
pub struct RerankResult {
    pub index: usize,
    pub score: f32,
}

impl Reranker {
    /// Load from a directory containing `model.onnx` and `tokenizer.json`.
    pub fn load(model_dir: &Path) -> anyhow::Result<Self> {
        let onnx_path = model_dir.join("model.onnx");
        let tokenizer_path = model_dir.join("tokenizer.json");

        anyhow::ensure!(onnx_path.exists(), "Reranker ONNX model not found: {}", onnx_path.display());
        anyhow::ensure!(tokenizer_path.exists(), "Reranker tokenizer not found: {}", tokenizer_path.display());

        let session = Session::builder()?
            .with_optimization_level(ort::session::builder::GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_file(&onnx_path)?;

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| anyhow::anyhow!("Failed to load reranker tokenizer: {}", e))?;

        Ok(Self { session, tokenizer })
    }

    /// Load from the default cache directory.
    pub fn load_default() -> anyhow::Result<Self> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let model_dir = Path::new(&home).join(".cache/leadgen-ml").join(DEFAULT_MODEL_DIR);
        Self::load(&model_dir)
    }

    /// Score a single (query, document) pair. Returns relevance score.
    /// Higher = more relevant. Raw logit, not calibrated to [0,1].
    pub fn score(&self, query: &str, document: &str) -> anyhow::Result<f32> {
        let scores = self.score_batch(query, &[document])?;
        Ok(scores[0].score)
    }

    /// Score a batch of documents against a single query.
    /// Returns scores sorted descending (most relevant first).
    pub fn score_batch(&self, query: &str, documents: &[&str]) -> anyhow::Result<Vec<RerankResult>> {
        let n = documents.len();
        if n == 0 {
            return Ok(Vec::new());
        }

        // Tokenize (query, document) pairs — cross-encoder uses [SEP] between them
        let pairs: Vec<(String, String)> = documents.iter()
            .map(|doc| (query.to_string(), doc.to_string()))
            .collect();

        let pair_refs: Vec<(&str, &str)> = pairs.iter()
            .map(|(q, d)| (q.as_str(), d.as_str()))
            .collect();

        let encodings = self.tokenizer.encode_batch(pair_refs, true)
            .map_err(|e| anyhow::anyhow!("Reranker tokenization failed: {}", e))?;

        let max_len = encodings.iter()
            .map(|e| e.get_ids().len().min(MAX_SEQ_LEN))
            .max()
            .unwrap_or(0);

        // Build padded tensors
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

        // Output shape: [batch_size, 1] — single relevance score per pair
        let scores_tensor = outputs[0].try_extract_tensor::<f32>()?;
        let scores_view = scores_tensor.view();

        let mut results: Vec<RerankResult> = (0..n)
            .map(|i| {
                let raw_score = scores_view[[i, 0]];
                // Sigmoid to calibrate to [0, 1]
                let calibrated = 1.0 / (1.0 + (-raw_score).exp());
                RerankResult { index: i, score: calibrated }
            })
            .collect();

        // Sort descending by score
        results.sort_unstable_by(|a, b| {
            b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal)
        });

        Ok(results)
    }

    /// Rerank documents and return top-K indices with scores.
    pub fn rerank_top_k(
        &self,
        query: &str,
        documents: &[&str],
        k: usize,
    ) -> anyhow::Result<Vec<RerankResult>> {
        let mut results = self.score_batch(query, documents)?;
        results.truncate(k);
        Ok(results)
    }
}

/// Two-stage retrieval: fast embedding recall → accurate cross-encoder reranking.
///
/// Stage 1: Use `EmbeddingIndex::search()` to get top-N candidates by cosine similarity.
/// Stage 2: Use `Reranker::rerank_top_k()` to rerank candidates by cross-attention.
pub struct TwoStageRetriever {
    pub reranker: Reranker,
}

impl TwoStageRetriever {
    pub fn new(reranker: Reranker) -> Self {
        Self { reranker }
    }

    /// Rerank pre-retrieved candidates.
    /// `candidates` are (id, text) pairs from Stage 1 embedding retrieval.
    /// Returns top-K reranked results with original IDs.
    pub fn rerank(
        &self,
        query: &str,
        candidates: &[(u32, &str)],
        top_k: usize,
    ) -> anyhow::Result<Vec<(u32, f32)>> {
        let docs: Vec<&str> = candidates.iter().map(|(_, text)| *text).collect();
        let results = self.reranker.rerank_top_k(query, &docs, top_k)?;

        Ok(results.iter().map(|r| {
            (candidates[r.index].0, r.score)
        }).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sigmoid_calibration() {
        // sigmoid(0) = 0.5
        let score = 1.0 / (1.0 + (0.0f32).exp());
        assert!((score - 0.5).abs() < 1e-6);

        // sigmoid(large positive) ≈ 1.0
        let score_high = 1.0 / (1.0 + (-10.0f32).exp());
        assert!(score_high > 0.99);

        // sigmoid(large negative) ≈ 0.0
        let score_low = 1.0 / (1.0 + (10.0f32).exp());
        assert!(score_low < 0.01);
    }

    #[test]
    fn test_rerank_result_sorting() {
        let mut results = vec![
            RerankResult { index: 0, score: 0.3 },
            RerankResult { index: 1, score: 0.9 },
            RerankResult { index: 2, score: 0.6 },
        ];
        results.sort_unstable_by(|a, b| {
            b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal)
        });
        assert_eq!(results[0].index, 1);
        assert_eq!(results[1].index, 2);
        assert_eq!(results[2].index, 0);
    }
}
