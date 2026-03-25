use anyhow::{Context, Result};
use candle_core::{Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::{BertModel, Config as BertConfig};
use hf_hub::api::sync::Api;
use tokenizers::Tokenizer;

#[allow(dead_code)]
pub struct Embedder {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
    dim: usize,
}

impl Embedder {
    pub fn load(model_id: &str, device: &Device) -> Result<Self> {
        let api = Api::new()?;
        let repo = api.model(model_id.to_string());

        tracing::info!("Downloading/loading {model_id}...");
        let config_path = repo.get("config.json").context("config.json")?;
        let tokenizer_path = repo.get("tokenizer.json").context("tokenizer.json")?;
        let weights_path = repo.get("model.safetensors").context("model.safetensors")?;

        let config_str = std::fs::read_to_string(&config_path)?;
        let config: BertConfig = serde_json::from_str(&config_str)?;
        let dim = config.hidden_size;

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| anyhow::anyhow!("tokenizer: {e}"))?;

        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[weights_path], candle_core::DType::F32, device)?
        };
        let model = BertModel::load(vb, &config)?;

        tracing::info!("Embedding model loaded: {model_id} (dim={dim})");
        Ok(Self {
            model,
            tokenizer,
            device: device.clone(),
            dim,
        })
    }

    #[allow(dead_code)]
    pub fn dim(&self) -> usize {
        self.dim
    }

    pub fn embed(&self, text: &str) -> Result<Vec<f32>> {
        let encoding = self
            .tokenizer
            .encode(text, true)
            .map_err(|e| anyhow::anyhow!("tokenize: {e}"))?;

        let ids = encoding.get_ids();
        let mask = encoding.get_attention_mask();

        let token_ids = Tensor::new(ids, &self.device)?.unsqueeze(0)?;
        let attention_mask = Tensor::new(mask, &self.device)?.unsqueeze(0)?;
        let token_type_ids = token_ids.zeros_like()?;

        let output = self
            .model
            .forward(&token_ids, &token_type_ids, Some(&attention_mask))?;

        // Mean pooling over sequence length (dim 1), respecting attention mask
        let mask_f = attention_mask
            .unsqueeze(2)?
            .to_dtype(candle_core::DType::F32)?;
        let masked = output.broadcast_mul(&mask_f)?;
        let summed = masked.sum(1)?;
        let count = mask_f.sum(1)?;
        let pooled = summed.broadcast_div(&count)?;

        // L2 normalize
        let pooled = pooled.squeeze(0)?;
        let norm = pooled
            .sqr()?
            .sum_all()?
            .sqrt()?
            .to_scalar::<f32>()?;
        let normalized = if norm > 0.0 {
            (pooled / norm as f64)?
        } else {
            pooled
        };

        let vec = normalized.to_vec1::<f32>()?;
        Ok(vec)
    }

    pub fn embed_batch(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>> {
        texts.iter().map(|t| self.embed(t)).collect()
    }
}
