//! BGE-M3 embedder: XLMRoberta → CLS-pool → L2-norm.
//!
//! Model: BAAI/bge-m3 (XLMRoberta base, dense retrieval head, 1024-dim, 8k ctx).
//! CLS token is the canonical pooling strategy for BGE dense retrieval.
//!
//! BGE-M3 convention: prefix queries with `"query: "` and documents with
//! `"passage: "`. Caller is responsible for prefixing — this module embeds
//! raw strings as-is so it can also be used for ad-hoc similarity checks.

use candle_core::{DType, Device, IndexOp, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::xlm_roberta::{Config, XLMRobertaModel};
use hf_hub::{api::sync::Api, Repo, RepoType};
use tokenizers::Tokenizer;

use crate::{Error, Result};

const REPO_ID: &str = "BAAI/bge-m3";
const MAX_SEQ_LEN: usize = 512;
pub const OUTPUT_DIM: usize = 1024;

pub struct IcpEmbedder {
    model: XLMRobertaModel,
    tokenizer: Tokenizer,
    device: Device,
}

impl IcpEmbedder {
    /// Load from HuggingFace Hub. Downloads on first call, cached thereafter.
    pub fn from_hf(device: &Device) -> Result<Self> {
        let api = Api::new().map_err(|e| Error::ModelNotFound(e.to_string()))?;
        let repo = api.repo(Repo::new(REPO_ID.to_string(), RepoType::Model));

        tracing::info!("Loading {REPO_ID}");

        let config_path = repo
            .get("config.json")
            .map_err(|e| Error::ModelNotFound(e.to_string()))?;
        let tokenizer_path = repo
            .get("tokenizer.json")
            .map_err(|e| Error::ModelNotFound(e.to_string()))?;
        let weights_path = repo
            .get("model.safetensors")
            .map_err(|e| Error::ModelNotFound(e.to_string()))?;

        let config: Config = serde_json::from_str(&std::fs::read_to_string(&config_path)?)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        let mut tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        tokenizer
            .with_truncation(Some(tokenizers::TruncationParams {
                max_length: MAX_SEQ_LEN,
                ..Default::default()
            }))
            .map_err(|e| Error::Tokenizer(e.to_string()))?;
        tokenizer.with_padding(Some(tokenizers::PaddingParams {
            pad_token: "<pad>".to_string(),
            pad_id: config.pad_token_id,
            ..Default::default()
        }));

        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[weights_path], DType::F32, device)?
        };
        let model = XLMRobertaModel::new(&config, vb)?;

        tracing::info!("bge-m3 ready (dim={OUTPUT_DIM}, max_seq={MAX_SEQ_LEN})");

        Ok(Self {
            model,
            tokenizer,
            device: device.clone(),
        })
    }

    pub fn dim(&self) -> usize {
        OUTPUT_DIM
    }

    /// Embed a batch of texts. Returns L2-normalized 1024-dim vectors.
    pub fn embed_batch(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(vec![]);
        }

        let encodings = self
            .tokenizer
            .encode_batch(texts.to_vec(), true)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

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
            ids_flat.extend(std::iter::repeat(0u32).take(pad));
            mask_flat.extend_from_slice(enc.get_attention_mask());
            mask_flat.extend(std::iter::repeat(0u32).take(pad));
            ttype_flat.extend_from_slice(enc.get_type_ids());
            ttype_flat.extend(std::iter::repeat(0u32).take(pad));
        }

        let input_ids = Tensor::from_vec(ids_flat, (n, max_len), &self.device)?;
        let attention_mask = Tensor::from_vec(mask_flat, (n, max_len), &self.device)?;
        let token_type_ids = Tensor::from_vec(ttype_flat, (n, max_len), &self.device)?;

        let hidden_states = self.model.forward(
            &input_ids,
            &attention_mask,
            &token_type_ids,
            None,
            None,
            None,
        )?;

        // CLS pooling: take the first token ([CLS]) representation.
        let cls = hidden_states.i((.., 0, ..))?; // [batch, hidden]

        // L2-normalize
        let norms = cls.sqr()?.sum_keepdim(1)?.sqrt()?.clamp(1e-12, f64::MAX)?;
        let normed = cls.broadcast_div(&norms)?;

        let flat: Vec<f32> = normed.flatten_all()?.to_vec1()?;
        Ok(flat.chunks(OUTPUT_DIM).map(|c| c.to_vec()).collect())
    }

    pub fn embed_one(&self, text: &str) -> Result<Vec<f32>> {
        let mut vecs = self.embed_batch(&[text])?;
        Ok(vecs.remove(0))
    }

    pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        a.iter().zip(b).map(|(x, y)| x * y).sum()
    }
}

