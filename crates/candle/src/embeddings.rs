use candle_core::{Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::{BertModel, Config as BertConfig};
use hf_hub::{api::sync::Api, Repo, RepoType};
use tokenizers::Tokenizer;

use crate::{Error, Result};

pub struct EmbeddingModel {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
}

impl EmbeddingModel {
    pub fn from_hf(repo_id: &str, device: &Device) -> Result<Self> {
        let api = Api::new().map_err(|e| Error::ModelNotFound(e.to_string()))?;
        let repo = api.repo(Repo::new(repo_id.to_string(), RepoType::Model));

        let config_path = repo
            .get("config.json")
            .map_err(|e| Error::ModelNotFound(e.to_string()))?;
        let tokenizer_path = repo
            .get("tokenizer.json")
            .map_err(|e| Error::ModelNotFound(e.to_string()))?;
        let weights_path = repo
            .get("model.safetensors")
            .map_err(|e| Error::ModelNotFound(e.to_string()))?;

        let config: BertConfig =
            serde_json::from_str(&std::fs::read_to_string(config_path)?)
                .map_err(|e| Error::Tokenizer(e.to_string()))?;

        let tokenizer = Tokenizer::from_file(tokenizer_path)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[weights_path], candle_core::DType::F32, device)?
        };
        let model = BertModel::load(vb, &config)?;

        Ok(Self {
            model,
            tokenizer,
            device: device.clone(),
        })
    }

    pub fn embed(&self, texts: &[&str]) -> Result<Tensor> {
        let encodings = self
            .tokenizer
            .encode_batch(texts.to_vec(), true)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        // Pad all sequences to max length in the batch
        let max_len = encodings.iter().map(|e| e.get_ids().len()).max().unwrap_or(0);

        let token_ids: Vec<Tensor> = encodings
            .iter()
            .map(|enc| {
                let mut ids: Vec<u32> = enc.get_ids().to_vec();
                ids.resize(max_len, 0); // pad with 0
                Tensor::new(ids.as_slice(), &self.device)
            })
            .collect::<std::result::Result<Vec<_>, _>>()?;

        // Build attention mask: 1 for real tokens, 0 for padding
        let attention_masks: Vec<Tensor> = encodings
            .iter()
            .map(|enc| {
                let len = enc.get_ids().len();
                let mut mask = vec![1.0f32; len];
                mask.resize(max_len, 0.0);
                Tensor::new(mask.as_slice(), &self.device)
            })
            .collect::<std::result::Result<Vec<_>, _>>()?;

        let token_ids = Tensor::stack(&token_ids, 0)?;
        let attention_mask = Tensor::stack(&attention_masks, 0)?;

        let token_type_ids = token_ids.zeros_like()?;
        let embeddings = self.model.forward(&token_ids, &token_type_ids, None)?;

        // Masked mean pooling: only average over real tokens, not padding
        let mask_expanded = attention_mask.unsqueeze(2)?.broadcast_as(embeddings.shape())?;
        let masked = (embeddings * mask_expanded)?;
        let sum = masked.sum(1)?;
        let counts = attention_mask.sum(1)?.unsqueeze(1)?.broadcast_as(sum.shape())?;
        let mean = (sum / counts)?;

        Ok(mean)
    }

    pub fn embed_one(&self, text: &str) -> Result<Vec<f32>> {
        let tensor = self.embed(&[text])?;
        let vec = tensor.squeeze(0)?.to_vec1::<f32>()?;
        Ok(vec)
    }
}
