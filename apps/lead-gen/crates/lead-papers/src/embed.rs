use anyhow::{Context, Result};
use candle_core::{DType, Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::{BertModel, Config as BertConfig, HiddenAct};
use hf_hub::{api::tokio::Api, Repo, RepoType};
use tokenizers::{PaddingParams, PaddingStrategy, Tokenizer, TruncationParams};

pub struct Embedder {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
}

impl Embedder {
    pub async fn load(model_id: &str) -> Result<Self> {
        let device = pick_device();
        tracing::info!("embed device: {:?}", device);

        let api = Api::new()?;
        let repo = api.repo(Repo::new(model_id.to_string(), RepoType::Model));
        let config_path = repo.get("config.json").await?;
        let tokenizer_path = repo.get("tokenizer.json").await?;
        let weights_path = repo
            .get("model.safetensors")
            .await
            .or_else(|_| futures::executor::block_on(repo.get("pytorch_model.bin")))
            .context("could not fetch model weights")?;

        let config: BertConfig = serde_json::from_slice(&std::fs::read(config_path)?)?;

        let mut tokenizer = Tokenizer::from_file(&tokenizer_path).map_err(anyhow::Error::msg)?;
        tokenizer
            .with_padding(Some(PaddingParams {
                strategy: PaddingStrategy::BatchLongest,
                ..Default::default()
            }))
            .with_truncation(Some(TruncationParams {
                max_length: 256,
                ..Default::default()
            }))
            .map_err(anyhow::Error::msg)?;

        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[weights_path], DType::F32, &device)?
        };
        let model = BertModel::load(vb, &config)?;

        let _ = HiddenAct::Gelu;

        Ok(Self { model, tokenizer, device })
    }

    /// Embed a batch. Returns (n, 384) f32 row-major Vec.
    pub fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(vec![]);
        }
        let encodings = self
            .tokenizer
            .encode_batch(texts.to_vec(), true)
            .map_err(anyhow::Error::msg)?;

        let max_len = encodings.iter().map(|e| e.len()).max().unwrap_or(0);
        let bsz = encodings.len();

        let mut ids = Vec::with_capacity(bsz * max_len);
        let mut mask = Vec::with_capacity(bsz * max_len);
        let mut ttype = Vec::with_capacity(bsz * max_len);
        for enc in &encodings {
            ids.extend(enc.get_ids().iter().map(|&x| x as i64));
            mask.extend(enc.get_attention_mask().iter().map(|&x| x as i64));
            ttype.extend(enc.get_type_ids().iter().map(|&x| x as i64));
        }

        let ids = Tensor::from_vec(ids, (bsz, max_len), &self.device)?;
        let ttype = Tensor::from_vec(ttype, (bsz, max_len), &self.device)?;
        let mask = Tensor::from_vec(mask, (bsz, max_len), &self.device)?;

        let hidden = self.model.forward(&ids, &ttype, Some(&mask))?;

        let mask_f = mask.to_dtype(DType::F32)?.unsqueeze(2)?;
        let masked = hidden.broadcast_mul(&mask_f)?;
        let summed = masked.sum(1)?;
        let counts = mask_f.sum(1)?.clamp(1e-9, f32::INFINITY as f64)?;
        let pooled = summed.broadcast_div(&counts)?;

        let norm = pooled.sqr()?.sum_keepdim(1)?.sqrt()?;
        let normed = pooled.broadcast_div(&(norm + 1e-12)?)?;

        let rows: Vec<Vec<f32>> = normed.to_vec2()?;
        Ok(rows)
    }
}

fn pick_device() -> Device {
    #[cfg(feature = "cuda")]
    if let Ok(d) = Device::new_cuda(0) { return d; }
    #[cfg(feature = "metal")]
    if let Ok(d) = Device::new_metal(0) { return d; }
    Device::Cpu
}

pub fn cosine(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}
