//! Local embedding engine: Candle + all-MiniLM-L6-v2 (384-dim).
//! Adapted from crates/research/src/local_embeddings.rs.

use anyhow::{Context, Result};
use candle_core::{DType, Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::{BertModel, Config as BertConfig};
use hf_hub::{api::sync::Api, Repo, RepoType};
use tokenizers::Tokenizer;
use tracing::info;

/// Embedding dimensionality (all-MiniLM-L6-v2 outputs 384-d vectors).
pub const DIM: usize = 384;

/// On-device sentence embedding engine using Candle + all-MiniLM-L6-v2.
///
/// Downloads model weights from HuggingFace Hub on first use, then runs
/// fully offline. All outputs are L2-normalised.
pub struct EmbeddingEngine {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
}

impl EmbeddingEngine {
    /// Load the model onto `device` (CPU or Metal). Downloads weights on first call.
    pub fn new(device: Device) -> Result<Self> {
        let repo_id = "sentence-transformers/all-MiniLM-L6-v2";
        info!("Loading {repo_id}");

        let api = Api::new()?;
        let repo = api.repo(Repo::new(repo_id.into(), RepoType::Model));

        let config_path = repo.get("config.json").context("config.json")?;
        let tok_path = repo.get("tokenizer.json").context("tokenizer.json")?;
        let weights_path = repo.get("model.safetensors").context("model.safetensors")?;

        let config: BertConfig =
            serde_json::from_str(&std::fs::read_to_string(&config_path)?)?;
        let tokenizer = Tokenizer::from_file(&tok_path)
            .map_err(|e| anyhow::anyhow!("tokenizer: {e}"))?;

        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[weights_path], DType::F32, &device)?
        };
        let model = BertModel::load(vb, &config)?;

        info!("Embedding model ready (dim={DIM})");
        Ok(Self {
            model,
            tokenizer,
            device,
        })
    }

    /// Embed N texts, returning Vec of 384-d normalized f32 vectors.
    pub fn embed_batch(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(vec![]);
        }

        let encodings = self
            .tokenizer
            .encode_batch(texts.to_vec(), true)
            .map_err(|e| anyhow::anyhow!("tokenize: {e}"))?;

        let max_len = encodings
            .iter()
            .map(|e| e.get_ids().len())
            .max()
            .unwrap_or(0);
        let n = texts.len();

        let mut ids_flat = Vec::with_capacity(n * max_len);
        let mut mask_flat = Vec::with_capacity(n * max_len);
        let mut ttype_flat = Vec::with_capacity(n * max_len);

        for enc in &encodings {
            let pad = max_len - enc.get_ids().len();
            ids_flat.extend_from_slice(enc.get_ids());
            ids_flat.extend(std::iter::repeat_n(0u32, pad));
            mask_flat.extend_from_slice(enc.get_attention_mask());
            mask_flat.extend(std::iter::repeat_n(0u32, pad));
            ttype_flat.extend_from_slice(enc.get_type_ids());
            ttype_flat.extend(std::iter::repeat_n(0u32, pad));
        }

        let input_ids = Tensor::from_vec(ids_flat, (n, max_len), &self.device)?;
        let mask = Tensor::from_vec(mask_flat, (n, max_len), &self.device)?;
        let ttype = Tensor::from_vec(ttype_flat, (n, max_len), &self.device)?;

        let output = self.model.forward(&input_ids, &ttype, Some(&mask))?;

        // Mean-pool with attention mask
        let mask_f = mask.to_dtype(DType::F32)?.unsqueeze(2)?;
        let masked = output.broadcast_mul(&mask_f)?;
        let summed = masked.sum(1)?;
        let counts = mask_f.sum(1)?.clamp(1e-9, f64::MAX)?;
        let pooled = summed.broadcast_div(&counts)?;

        // L2-normalize
        let norms = pooled
            .sqr()?
            .sum_keepdim(1)?
            .sqrt()?
            .clamp(1e-12, f64::MAX)?;
        let normed = pooled.broadcast_div(&norms)?;

        let flat: Vec<f32> = normed.flatten_all()?.to_vec1()?;
        Ok(flat.chunks(DIM).map(|c| c.to_vec()).collect())
    }

    /// Embed a single string.
    pub fn embed_one(&self, text: &str) -> Result<Vec<f32>> {
        let mut vecs = self.embed_batch(&[text])?;
        vecs.pop().context("empty embedding result")
    }
}
