//! JobBERT-v3 embedder: XLMRoberta → mean-pool → asymmetric Dense(768→1024, Tanh) → L2-norm.
//!
//! Model: TechWolf/JobBERT-v3 (sentence-transformers, asymmetric)
//! Two Dense projection heads:
//!   - anchor (query/job title): 2_Asym/6235903824_Dense/
//!   - positive (document/skill): 2_Asym/6235904160_Dense/

use candle_core::{DType, Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::xlm_roberta::{Config, XLMRobertaModel};
use hf_hub::{api::sync::Api, Repo, RepoType};
use tokenizers::Tokenizer;

use crate::{Error, Result};

const REPO_ID: &str = "TechWolf/JobBERT-v3";
const MAX_SEQ_LEN: usize = 64;
const OUTPUT_DIM: usize = 1024;

/// Which asymmetric head to use for encoding.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EncodeMode {
    /// Anchor head — for queries / job titles you're searching for.
    Anchor,
    /// Positive head — for documents / skills / descriptions being indexed.
    Positive,
}

/// Dense projection layer: Linear(768→1024) + Tanh.
struct DenseProjection {
    weight: Tensor,
    bias: Tensor,
}

impl DenseProjection {
    fn load(path: std::path::PathBuf, device: &Device) -> Result<Self> {
        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[path], DType::F32, device)?
        };
        let weight = vb.get((OUTPUT_DIM, 768), "linear.weight")?;
        let bias = vb.get(OUTPUT_DIM, "linear.bias")?;
        Ok(Self { weight, bias })
    }

    fn forward(&self, x: &Tensor) -> Result<Tensor> {
        // x: [batch, 768] → [batch, 1024]
        let out = x.broadcast_matmul(&self.weight.t()?)?;
        let out = out.broadcast_add(&self.bias)?;
        let out = out.tanh()?;
        Ok(out)
    }
}

pub struct JobBertEmbedder {
    model: XLMRobertaModel,
    tokenizer: Tokenizer,
    anchor_dense: DenseProjection,
    positive_dense: DenseProjection,
    device: Device,
}

impl JobBertEmbedder {
    /// Load from HuggingFace Hub. Downloads on first call, cached thereafter.
    pub fn from_hf(device: &Device) -> Result<Self> {
        let api = Api::new().map_err(|e| Error::ModelNotFound(e.to_string()))?;
        let repo = api.repo(Repo::new(REPO_ID.to_string(), RepoType::Model));

        tracing::info!("Loading {REPO_ID}");

        let config_path = repo.get("config.json")
            .map_err(|e| Error::ModelNotFound(e.to_string()))?;
        let tokenizer_path = repo.get("tokenizer.json")
            .map_err(|e| Error::ModelNotFound(e.to_string()))?;
        let weights_path = repo.get("model.safetensors")
            .map_err(|e| Error::ModelNotFound(e.to_string()))?;
        let anchor_dense_path = repo.get("2_Asym/6235903824_Dense/model.safetensors")
            .map_err(|e| Error::ModelNotFound(e.to_string()))?;
        let positive_dense_path = repo.get("2_Asym/6235904160_Dense/model.safetensors")
            .map_err(|e| Error::ModelNotFound(e.to_string()))?;

        let config: Config = serde_json::from_str(&std::fs::read_to_string(&config_path)?)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        let mut tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        // XLMRoberta pad token is <pad> (id=1). Truncate to 64 tokens.
        tokenizer.with_truncation(Some(tokenizers::TruncationParams {
            max_length: MAX_SEQ_LEN,
            ..Default::default()
        })).map_err(|e| Error::Tokenizer(e.to_string()))?;
        tokenizer.with_padding(Some(tokenizers::PaddingParams {
            pad_token: "<pad>".to_string(),
            pad_id: config.pad_token_id,
            ..Default::default()
        }));

        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[weights_path], DType::F32, device)?
        };
        let model = XLMRobertaModel::new(&config, vb)?;

        let anchor_dense = DenseProjection::load(anchor_dense_path, device)?;
        let positive_dense = DenseProjection::load(positive_dense_path, device)?;

        tracing::info!("JobBERT-v3 ready (dim={OUTPUT_DIM}, max_seq={MAX_SEQ_LEN})");

        Ok(Self { model, tokenizer, anchor_dense, positive_dense, device: device.clone() })
    }

    /// Output embedding dimensionality.
    pub fn dim(&self) -> usize {
        OUTPUT_DIM
    }

    /// Embed a batch of texts using the specified asymmetric head.
    pub fn embed_batch(&self, texts: &[&str], mode: EncodeMode) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(vec![]);
        }

        let encodings = self.tokenizer
            .encode_batch(texts.to_vec(), true)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        let max_len = encodings.iter().map(|e| e.get_ids().len()).max().unwrap_or(0);
        let n = texts.len();

        let mut ids_flat = Vec::with_capacity(n * max_len);
        let mut mask_flat = Vec::with_capacity(n * max_len);
        let mut ttype_flat = Vec::with_capacity(n * max_len);

        for enc in &encodings {
            let pad = max_len - enc.get_ids().len();
            ids_flat.extend_from_slice(enc.get_ids());
            ids_flat.extend(std::iter::repeat(0u32).take(pad));
            mask_flat.extend_from_slice(enc.get_attention_mask());
            mask_flat.extend(std::iter::repeat(0u32).take(pad));
            ttype_flat.extend_from_slice(enc.get_type_ids());
            ttype_flat.extend(std::iter::repeat(0u32).take(pad));
        }

        let input_ids = Tensor::from_vec(ids_flat, (n, max_len), &self.device)?;
        let attention_mask = Tensor::from_vec(mask_flat, (n, max_len), &self.device)?;
        let token_type_ids = Tensor::from_vec(ttype_flat, (n, max_len), &self.device)?;

        // XLMRoberta forward: (input_ids, attention_mask, token_type_ids, past_kv, enc_hidden, enc_mask)
        let hidden_states = self.model.forward(
            &input_ids,
            &attention_mask,
            &token_type_ids,
            None, None, None,
        )?;

        // Mean-pool with attention mask (from research/local_embeddings.rs pattern)
        let mask_f = attention_mask.to_dtype(DType::F32)?.unsqueeze(2)?;
        let masked = hidden_states.broadcast_mul(&mask_f)?;
        let summed = masked.sum(1)?;
        let counts = mask_f.sum(1)?.clamp(1e-9, f64::MAX)?;
        let pooled = summed.broadcast_div(&counts)?; // [batch, 768]

        // Asymmetric Dense projection
        let dense = match mode {
            EncodeMode::Anchor => &self.anchor_dense,
            EncodeMode::Positive => &self.positive_dense,
        };
        let projected = dense.forward(&pooled)?; // [batch, 1024]

        // L2-normalize
        let norms = projected.sqr()?.sum_keepdim(1)?.sqrt()?.clamp(1e-12, f64::MAX)?;
        let normed = projected.broadcast_div(&norms)?;

        let flat: Vec<f32> = normed.flatten_all()?.to_vec1()?;
        Ok(flat.chunks(OUTPUT_DIM).map(|c| c.to_vec()).collect())
    }

    /// Embed a single text (anchor mode by default).
    pub fn embed_one(&self, text: &str, mode: EncodeMode) -> Result<Vec<f32>> {
        let mut vecs = self.embed_batch(&[text], mode)?;
        Ok(vecs.remove(0))
    }

    /// Cosine similarity between two vectors (both assumed L2-normalized).
    pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        a.iter().zip(b).map(|(x, y)| x * y).sum()
    }
}
