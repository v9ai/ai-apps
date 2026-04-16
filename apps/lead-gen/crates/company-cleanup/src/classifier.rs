/// Crypto classifier: Candle embeddings -> LanceDB kNN -> majority vote.
///
/// Embeds the company text, queries the reference corpus for the top-7 nearest
/// neighbours, and returns a verdict based on majority label + distance-weighted
/// confidence.

use anyhow::Result;
use candle_core::{Device, Tensor, D};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::{BertModel, Config as BertConfig};
use hf_hub::{api::sync::Api, Repo, RepoType};
use tokenizers::Tokenizer;

use crate::store::CorpusStore;
use crate::Verdict;

const MODEL_ID: &str = "sentence-transformers/all-MiniLM-L6-v2";
const TOP_K: usize = 7;

/// Candle BERT embedding model (all-MiniLM-L6-v2, 384-dim).
pub struct EmbeddingModel {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
}

impl EmbeddingModel {
    pub fn load(device: &Device) -> Result<Self> {
        let api = Api::new()?;
        let repo = api.repo(Repo::new(MODEL_ID.to_string(), RepoType::Model));

        let config_path = repo.get("config.json")?;
        let tokenizer_path = repo.get("tokenizer.json")?;
        let weights_path = repo.get("model.safetensors")?;

        let config: BertConfig =
            serde_json::from_str(&std::fs::read_to_string(config_path)?)?;

        let tokenizer = Tokenizer::from_file(tokenizer_path)
            .map_err(|e| anyhow::anyhow!("tokenizer: {e}"))?;

        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(
                &[weights_path],
                candle_core::DType::F32,
                device,
            )?
        };
        let model = BertModel::load(vb, &config)?;

        Ok(Self {
            model,
            tokenizer,
            device: device.clone(),
        })
    }

    /// Embed a single text -> L2-normalised 384-dim vector.
    pub fn embed_one(&self, text: &str) -> Result<Vec<f32>> {
        let mut tokenizer = self.tokenizer.clone();
        let pad_id = tokenizer.token_to_id("[PAD]").unwrap_or(0);
        tokenizer.with_padding(Some(tokenizers::PaddingParams {
            pad_id,
            pad_token: "[PAD]".to_string(),
            ..Default::default()
        }));

        let encoding = tokenizer
            .encode(text, true)
            .map_err(|e| anyhow::anyhow!("encode: {e}"))?;

        let ids = encoding.get_ids().to_vec();
        let mask: Vec<f32> = encoding
            .get_attention_mask()
            .iter()
            .map(|&v| v as f32)
            .collect();

        let token_ids = Tensor::new(ids.as_slice(), &self.device)?.unsqueeze(0)?;
        let attention_mask = Tensor::new(mask.as_slice(), &self.device)?.unsqueeze(0)?;
        let token_type_ids = token_ids.zeros_like()?;

        let embeddings = self.model.forward(&token_ids, &token_type_ids, None)?;

        // Masked mean pooling
        let mask_expanded = attention_mask
            .unsqueeze(2)?
            .broadcast_as(embeddings.shape())?;
        let masked = (embeddings * mask_expanded)?;
        let summed = masked.sum(1)?;
        let counts = attention_mask
            .sum(1)?
            .unsqueeze(1)?
            .clamp(1e-12, f64::MAX)?;
        let mean = summed.broadcast_div(&counts)?;

        // L2 normalisation
        let norm = mean.sqr()?.sum_keepdim(D::Minus1)?.sqrt()?;
        let normalized = mean.broadcast_div(&norm.clamp(1e-12, f64::MAX)?)?;

        let vec = normalized.squeeze(0)?.to_vec1::<f32>()?;
        Ok(vec)
    }

    /// Embed a batch of texts.
    pub fn embed_batch(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>> {
        texts.iter().map(|t| self.embed_one(t)).collect()
    }
}

/// Orchestrates embedding + kNN search + majority vote.
pub struct CryptoClassifier {
    pub model: EmbeddingModel,
    pub store: CorpusStore,
}

impl CryptoClassifier {
    /// Classify a company's concatenated DB text.
    pub async fn classify(&self, company_text: &str) -> Result<Verdict> {
        let vec = self.model.embed_one(company_text)?;
        let neighbours = self.store.query(vec, TOP_K).await?;

        let crypto_count = neighbours.iter().filter(|n| n.label == 1).count();
        let total = neighbours.len().max(1);
        let is_crypto = crypto_count * 2 > total; // strict majority

        // Distance-weighted confidence: closer neighbours count more.
        // Convert L2 distance -> similarity: sim = 1 / (1 + dist)
        let mut weighted_crypto = 0.0f32;
        let mut weighted_total = 0.0f32;
        for n in &neighbours {
            let sim = 1.0 / (1.0 + n.distance);
            weighted_total += sim;
            if n.label == 1 {
                weighted_crypto += sim;
            }
        }
        let confidence = if weighted_total > 0.0 {
            if is_crypto {
                weighted_crypto / weighted_total
            } else {
                1.0 - (weighted_crypto / weighted_total)
            }
        } else {
            0.5
        };

        let top_matches: Vec<String> = neighbours
            .iter()
            .take(3)
            .map(|n| {
                let tag = if n.label == 1 { "CRYPTO" } else { "CLEAN" };
                format!("[{tag} d={:.3}] {}", n.distance, truncate(&n.text, 60))
            })
            .collect();

        Ok(Verdict {
            is_crypto,
            confidence,
            top_matches,
        })
    }
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max])
    }
}
