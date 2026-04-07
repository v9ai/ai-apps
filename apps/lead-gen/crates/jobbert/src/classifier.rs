//! Skill extraction via BertForTokenClassification.
//!
//! Model: jjzha/jobbert_knowledge_extraction (hard skills)
//! Labels: {0: "B", 1: "I", 2: "O"} (BIO tagging for skill spans)
//!
//! Note: This model primarily uses B tags for skills, rarely I.
//! The BIO decoder merges adjacent B tokens into single spans.

use candle_core::{DType, Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::{BertModel, Config as BertConfig};
use hf_hub::{api::sync::Api, Repo, RepoType};
use tokenizers::Tokenizer;

use crate::bio::{decode_bio, ExtractedSkill};
use crate::{Error, Result};

const REPO_ID: &str = "jjzha/jobbert_knowledge_extraction";
const NUM_LABELS: usize = 3; // B=0, I=1, O=2

pub struct SkillClassifier {
    bert: BertModel,
    classifier_weight: Tensor, // [num_labels, hidden_size]
    classifier_bias: Tensor,   // [num_labels]
    tokenizer: Tokenizer,
    device: Device,
}

impl SkillClassifier {
    /// Load from HuggingFace Hub.
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

        let config: BertConfig = serde_json::from_str(&std::fs::read_to_string(&config_path)?)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[weights_path], DType::F32, device)?
        };

        // BertModel::load has built-in prefix fallback: tries "embeddings" first,
        // then "{model_type}.embeddings" (i.e. "bert.embeddings").
        let bert = BertModel::load(vb.clone(), &config)?;

        // Classification head: classifier.weight [3, 768] + classifier.bias [3]
        let classifier_weight = vb.get((NUM_LABELS, config.hidden_size), "classifier.weight")?;
        let classifier_bias = vb.get(NUM_LABELS, "classifier.bias")?;

        tracing::info!("Skill classifier ready (labels={NUM_LABELS})");

        Ok(Self { bert, classifier_weight, classifier_bias, tokenizer, device: device.clone() })
    }

    /// Extract skill spans from a single text.
    pub fn extract(&self, text: &str) -> Result<Vec<ExtractedSkill>> {
        let results = self.extract_batch(&[text])?;
        Ok(results.into_iter().next().unwrap_or_default())
    }

    /// Extract skill spans from a batch of texts.
    pub fn extract_batch(&self, texts: &[&str]) -> Result<Vec<Vec<ExtractedSkill>>> {
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

        // BERT forward: (input_ids, token_type_ids, attention_mask)
        let hidden_states = self.bert.forward(
            &input_ids,
            &token_type_ids,
            Some(&attention_mask),
        )?; // [batch, seq_len, hidden_size]

        // Classification head: hidden_states @ classifier_weight.T + classifier_bias
        let logits = hidden_states.broadcast_matmul(&self.classifier_weight.t()?)?;
        let logits = logits.broadcast_add(&self.classifier_bias)?; // [batch, seq_len, num_labels]

        // Softmax for confidence scores
        let probs = candle_nn::ops::softmax_last_dim(&logits)?;

        // Argmax for predicted labels
        let pred_labels = logits.argmax(2)?; // [batch, seq_len]

        let mut results = Vec::with_capacity(n);

        for i in 0..n {
            let seq_labels: Vec<u32> = pred_labels.get(i)?.to_vec1()?;
            let seq_probs: Vec<f32> = {
                let batch_probs = probs.get(i)?; // [seq_len, num_labels]
                let mut max_probs = Vec::with_capacity(max_len);
                for j in 0..max_len {
                    let token_probs: Vec<f32> = batch_probs.get(j)?.to_vec1()?;
                    let label = seq_labels[j] as usize;
                    max_probs.push(token_probs[label]);
                }
                max_probs
            };

            let offsets: Vec<(usize, usize)> = encodings[i]
                .get_offsets()
                .iter()
                .copied()
                .chain(std::iter::repeat((0, 0)))
                .take(max_len)
                .collect();

            let labels: Vec<usize> = seq_labels.iter().map(|&l| l as usize).collect();
            let skills = decode_bio(&labels, &offsets, &seq_probs, texts[i]);
            results.push(skills);
        }

        Ok(results)
    }
}
