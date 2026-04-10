/// ConTeXT-based skill extraction via ONNX Runtime (TechWolf/ConTeXT-Skill-Extraction-base).
///
/// Embeds job descriptions and skill labels into the same 768-dim space,
/// then uses cosine similarity to match mentioned skills against a taxonomy.
/// Replaces heuristic regex-based skill extraction in `job_ner.rs` for higher accuracy.
///
/// Model: TechWolf/ConTeXT-Skill-Extraction-base (0.1B params, MPNet-based)
/// Base: sentence-transformers/all-mpnet-base-v2
/// Export: `mlx-training/export_onnx.py --model context-skill`
/// Files needed:
///   - `~/.cache/leadgen-ml/ConTeXT-Skill-Extraction-base/model.onnx`
///   - `~/.cache/leadgen-ml/ConTeXT-Skill-Extraction-base/tokenizer.json`

use std::path::Path;

use ort::session::Session;
use tokenizers::Tokenizer;

const DEFAULT_MODEL_DIR: &str = "ConTeXT-Skill-Extraction-base";
const EMBEDDING_DIM: usize = 768;
const MAX_SEQ_LEN: usize = 512;

/// Default cosine similarity threshold for skill matching.
const DEFAULT_THRESHOLD: f32 = 0.45;

/// Default number of top-K skills to return per text.
const DEFAULT_TOP_K: usize = 15;

/// A skill extracted from text with confidence score.
#[derive(Debug, Clone)]
pub struct ExtractedSkill {
    pub skill: String,
    pub confidence: f32,
}

/// Precomputed skill taxonomy embeddings for fast matching.
pub struct SkillTaxonomy {
    labels: Vec<String>,
    /// Flat row-major: [n_skills x EMBEDDING_DIM].
    embeddings: Vec<f32>,
    dim: usize,
}

impl SkillTaxonomy {
    /// Build taxonomy from skill labels by embedding them all at once.
    pub fn from_labels(extractor: &SkillExtractor, labels: &[&str]) -> anyhow::Result<Self> {
        let batch = extractor.embed_batch(labels)?;
        Ok(Self {
            labels: labels.iter().map(|s| s.to_string()).collect(),
            embeddings: batch.data,
            dim: batch.dim,
        })
    }

    /// Number of skills in the taxonomy.
    pub fn len(&self) -> usize {
        self.labels.len()
    }

    /// Whether the taxonomy is empty.
    pub fn is_empty(&self) -> bool {
        self.labels.is_empty()
    }

    /// Get the embedding for a specific skill index.
    fn get_embedding(&self, idx: usize) -> &[f32] {
        &self.embeddings[idx * self.dim..(idx + 1) * self.dim]
    }

    /// Find top-K matching skills for a text embedding.
    /// Returns skills above `threshold` sorted by confidence descending.
    pub fn match_embedding(
        &self,
        text_embedding: &[f32],
        top_k: usize,
        threshold: f32,
    ) -> Vec<ExtractedSkill> {
        let n = self.labels.len();
        if n == 0 {
            return Vec::new();
        }

        let mut scores: Vec<(usize, f32)> = Vec::with_capacity(n);
        for i in 0..n {
            let skill_emb = self.get_embedding(i);
            let sim = cosine_similarity(text_embedding, skill_emb);
            if sim >= threshold {
                scores.push((i, sim));
            }
        }

        // Sort descending by score
        scores.sort_unstable_by(|a, b| {
            b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal)
        });
        scores.truncate(top_k);

        scores
            .into_iter()
            .map(|(idx, score)| ExtractedSkill {
                skill: self.labels[idx].clone(),
                confidence: score,
            })
            .collect()
    }

    /// Convenience: embed text and match against taxonomy in one call.
    pub fn match_text(
        &self,
        extractor: &SkillExtractor,
        text: &str,
        top_k: usize,
        threshold: f32,
    ) -> anyhow::Result<Vec<ExtractedSkill>> {
        let embedding = extractor.embed_text(text)?;
        Ok(self.match_embedding(&embedding, top_k, threshold))
    }
}

/// A batch of embeddings, row-major: [n_texts x dim].
pub struct SkillEmbeddingBatch {
    pub data: Vec<f32>,
    pub dim: usize,
    pub count: usize,
}

impl SkillEmbeddingBatch {
    /// Get the embedding for a specific index.
    pub fn get(&self, idx: usize) -> &[f32] {
        &self.data[idx * self.dim..(idx + 1) * self.dim]
    }
}

pub struct SkillExtractor {
    session: Session,
    tokenizer: Tokenizer,
    dim: usize,
}

impl SkillExtractor {
    /// Load from a directory containing `model.onnx` and `tokenizer.json`.
    pub fn load(model_dir: &Path) -> anyhow::Result<Self> {
        let onnx_path = model_dir.join("model.onnx");
        let tokenizer_path = model_dir.join("tokenizer.json");

        anyhow::ensure!(
            onnx_path.exists(),
            "ConTeXT ONNX model not found: {}",
            onnx_path.display()
        );
        anyhow::ensure!(
            tokenizer_path.exists(),
            "ConTeXT tokenizer not found: {}",
            tokenizer_path.display()
        );

        let session = Session::builder()?
            .with_optimization_level(ort::session::builder::GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_file(&onnx_path)?;

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| anyhow::anyhow!("Failed to load ConTeXT tokenizer: {}", e))?;

        Ok(Self {
            session,
            tokenizer,
            dim: EMBEDDING_DIM,
        })
    }

    /// Load from the default cache directory (`~/.cache/leadgen-ml/ConTeXT-Skill-Extraction-base/`).
    pub fn load_default() -> anyhow::Result<Self> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let model_dir = Path::new(&home).join(".cache/leadgen-ml").join(DEFAULT_MODEL_DIR);
        Self::load(&model_dir)
    }

    /// Embedding dimension (768 for ConTeXT-Skill-Extraction-base).
    pub fn dim(&self) -> usize {
        self.dim
    }

    /// Embed a single text. Returns L2-normalized 768-dim vector.
    pub fn embed_text(&self, text: &str) -> anyhow::Result<Vec<f32>> {
        let batch = self.embed_batch(&[text])?;
        Ok(batch.data)
    }

    /// Embed a batch of texts. Returns row-major [n x 768] L2-normalized vectors.
    ///
    /// Uses mean pooling over non-padding tokens (ConTeXT/MPNet pooling strategy).
    pub fn embed_batch(&self, texts: &[&str]) -> anyhow::Result<SkillEmbeddingBatch> {
        let n = texts.len();
        if n == 0 {
            return Ok(SkillEmbeddingBatch {
                data: Vec::new(),
                dim: self.dim,
                count: 0,
            });
        }

        // Tokenize all texts
        let encodings = self
            .tokenizer
            .encode_batch(texts.to_vec(), true)
            .map_err(|e| anyhow::anyhow!("ConTeXT tokenization failed: {}", e))?;

        // Find max length for padding
        let max_len = encodings
            .iter()
            .map(|e| e.get_ids().len().min(MAX_SEQ_LEN))
            .max()
            .unwrap_or(0);

        // Build padded tensors: input_ids, attention_mask
        // MPNet does not use token_type_ids in the standard sentence-transformers export,
        // but we include them as zeros for ONNX compatibility.
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
        let attention_mask_array =
            ndarray::Array2::from_shape_vec((n, max_len), attention_mask.clone())?;

        let outputs = self.session.run(ort::inputs![
            "input_ids" => input_ids_array.view(),
            "attention_mask" => attention_mask_array.view(),
        ]?)?;

        // Output shape: [batch_size, seq_len, hidden_dim]
        // Apply mean pooling over non-padding tokens.
        let output_tensor = outputs[0].try_extract_tensor::<f32>()?;
        let output_view = output_tensor.view();

        let mut result = Vec::with_capacity(n * self.dim);
        for i in 0..n {
            let mut pooled = vec![0.0f32; self.dim];
            let mut token_count = 0.0f32;

            for t in 0..max_len {
                let mask_val = attention_mask[i * max_len + t] as f32;
                if mask_val > 0.0 {
                    for d in 0..self.dim {
                        pooled[d] += output_view[[i, t, d]] * mask_val;
                    }
                    token_count += mask_val;
                }
            }

            // Divide by token count (mean pooling)
            if token_count > 0.0 {
                for d in 0..self.dim {
                    pooled[d] /= token_count;
                }
            }

            result.extend_from_slice(&pooled);
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

        Ok(SkillEmbeddingBatch {
            data: result,
            dim: self.dim,
            count: n,
        })
    }

    /// Precompute embeddings for a set of skill labels.
    /// Returns a flat vector of [n_skills x dim] L2-normalized embeddings.
    pub fn embed_skills(&self, skill_labels: &[&str]) -> anyhow::Result<SkillEmbeddingBatch> {
        self.embed_batch(skill_labels)
    }

    /// Extract skills from text by comparing against precomputed skill embeddings.
    ///
    /// `skill_labels` and `skill_embeddings` must be aligned (same order).
    /// Returns skills with cosine similarity above `threshold`, sorted descending.
    pub fn extract_skills(
        &self,
        text: &str,
        skill_labels: &[&str],
        skill_embeddings: &SkillEmbeddingBatch,
        threshold: f32,
    ) -> anyhow::Result<Vec<ExtractedSkill>> {
        let text_emb = self.embed_text(text)?;
        let n_skills = skill_labels.len();

        let mut matches: Vec<ExtractedSkill> = Vec::new();
        for i in 0..n_skills {
            let skill_emb = skill_embeddings.get(i);
            let sim = cosine_similarity(&text_emb, skill_emb);
            if sim >= threshold {
                matches.push(ExtractedSkill {
                    skill: skill_labels[i].to_string(),
                    confidence: sim,
                });
            }
        }

        // Sort descending by confidence
        matches.sort_unstable_by(|a, b| {
            b.confidence
                .partial_cmp(&a.confidence)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        Ok(matches)
    }

    /// Extract skills from a job description using default threshold and top-K.
    ///
    /// Convenience wrapper that uses `DEFAULT_THRESHOLD` (0.45) and `DEFAULT_TOP_K` (15).
    pub fn extract_skills_from_job(
        &self,
        job_description: &str,
        skill_labels: &[&str],
        skill_embeddings: &SkillEmbeddingBatch,
    ) -> anyhow::Result<Vec<ExtractedSkill>> {
        let mut skills =
            self.extract_skills(job_description, skill_labels, skill_embeddings, DEFAULT_THRESHOLD)?;
        skills.truncate(DEFAULT_TOP_K);
        Ok(skills)
    }

    /// Batch extract skills from multiple texts.
    ///
    /// More efficient than calling `extract_skills` in a loop because texts
    /// are embedded in a single ONNX batch.
    pub fn extract_skills_batch(
        &self,
        texts: &[&str],
        skill_labels: &[&str],
        skill_embeddings: &SkillEmbeddingBatch,
        threshold: f32,
        top_k: usize,
    ) -> anyhow::Result<Vec<Vec<ExtractedSkill>>> {
        let text_batch = self.embed_batch(texts)?;
        let n_skills = skill_labels.len();

        let mut results = Vec::with_capacity(texts.len());
        for t in 0..texts.len() {
            let text_emb = text_batch.get(t);
            let mut matches: Vec<ExtractedSkill> = Vec::new();

            for s in 0..n_skills {
                let skill_emb = skill_embeddings.get(s);
                let sim = cosine_similarity(text_emb, skill_emb);
                if sim >= threshold {
                    matches.push(ExtractedSkill {
                        skill: skill_labels[s].to_string(),
                        confidence: sim,
                    });
                }
            }

            matches.sort_unstable_by(|a, b| {
                b.confidence
                    .partial_cmp(&a.confidence)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            matches.truncate(top_k);
            results.push(matches);
        }

        Ok(results)
    }
}

/// Cosine similarity between two L2-normalized vectors (= dot product).
#[inline]
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    // Vectors are L2-normalized, so cosine = dot product.
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity_identical() {
        let a = [0.6, 0.8, 0.0];
        assert!((cosine_similarity(&a, &a) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let a = [1.0, 0.0, 0.0];
        let b = [0.0, 1.0, 0.0];
        assert!(cosine_similarity(&a, &b).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_opposite() {
        let a = [1.0, 0.0];
        let b = [-1.0, 0.0];
        assert!((cosine_similarity(&a, &b) + 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_extracted_skill_debug() {
        let skill = ExtractedSkill {
            skill: "Python".to_string(),
            confidence: 0.87,
        };
        let debug = format!("{:?}", skill);
        assert!(debug.contains("Python"));
        assert!(debug.contains("0.87"));
    }

    #[test]
    fn test_skill_embedding_batch_get() {
        let batch = SkillEmbeddingBatch {
            data: vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
            dim: 3,
            count: 2,
        };
        assert_eq!(batch.get(0), &[1.0, 2.0, 3.0]);
        assert_eq!(batch.get(1), &[4.0, 5.0, 6.0]);
    }

    #[test]
    fn test_taxonomy_match_embedding() {
        // Simulate a taxonomy with 3 skills, dim=3
        let taxonomy = SkillTaxonomy {
            labels: vec![
                "Python".to_string(),
                "Rust".to_string(),
                "JavaScript".to_string(),
            ],
            embeddings: vec![
                // Python: [0.8, 0.6, 0.0] normalized
                0.8, 0.6, 0.0,
                // Rust: [0.0, 0.8, 0.6] normalized
                0.0, 0.8, 0.6,
                // JavaScript: [0.6, 0.0, 0.8] normalized
                0.6, 0.0, 0.8,
            ],
            dim: 3,
        };

        // Query embedding close to Python
        let query = [0.85, 0.52, 0.05];
        let results = taxonomy.match_embedding(&query, 3, 0.0);

        assert!(!results.is_empty());
        // Python should be the top match
        assert_eq!(results[0].skill, "Python");
        assert!(results[0].confidence > results[1].confidence);
    }

    #[test]
    fn test_taxonomy_match_with_threshold() {
        let taxonomy = SkillTaxonomy {
            labels: vec!["Python".to_string(), "Rust".to_string()],
            embeddings: vec![
                // Python: mostly along dim 0
                0.95, 0.05,
                // Rust: mostly along dim 1
                0.05, 0.95,
            ],
            dim: 2,
        };

        // Query strongly aligned with Python
        let query = [0.99, 0.01];
        // High threshold should filter out Rust
        let results = taxonomy.match_embedding(&query, 10, 0.8);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].skill, "Python");
    }

    #[test]
    fn test_taxonomy_empty() {
        let taxonomy = SkillTaxonomy {
            labels: Vec::new(),
            embeddings: Vec::new(),
            dim: 768,
        };
        let query = vec![0.0f32; 768];
        let results = taxonomy.match_embedding(&query, 10, 0.0);
        assert!(results.is_empty());
    }

    #[test]
    fn test_taxonomy_len() {
        let taxonomy = SkillTaxonomy {
            labels: vec!["a".to_string(), "b".to_string()],
            embeddings: vec![0.0; 4],
            dim: 2,
        };
        assert_eq!(taxonomy.len(), 2);
        assert!(!taxonomy.is_empty());
    }

    #[test]
    fn test_default_constants() {
        assert_eq!(EMBEDDING_DIM, 768);
        assert_eq!(MAX_SEQ_LEN, 512);
        assert!(DEFAULT_THRESHOLD > 0.0 && DEFAULT_THRESHOLD < 1.0);
        assert!(DEFAULT_TOP_K > 0);
    }
}
