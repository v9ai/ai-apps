use candle_core::{DType, Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::qwen2::{Config as QwenConfig, ModelForCausalLM};
use hf_hub::{api::sync::Api, Repo, RepoType};
use tokenizers::Tokenizer;

use crate::config::Config;
use crate::error::{Error, Result};
use crate::lora::LoraAdapter;

pub struct EmailGenerator {
    model: ModelForCausalLM,
    tokenizer: Tokenizer,
    device: Device,
    max_tokens: usize,
    temperature: f32,
}

impl EmailGenerator {
    pub fn load(config: &Config, device: &Device) -> Result<Self> {
        let (config_path, tokenizer_path, weight_paths) = if let Some(ref model_path) = config.model_path {
            // Load from local directory
            let config_path = model_path.join("config.json");
            let tokenizer_path = model_path.join("tokenizer.json");

            // Collect all safetensors weight files
            let mut weights = Vec::new();
            if model_path.join("model.safetensors").exists() {
                weights.push(model_path.join("model.safetensors"));
            } else {
                // Multi-shard: model-00001-of-00002.safetensors, etc.
                for entry in std::fs::read_dir(model_path)? {
                    let entry = entry?;
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with("model-") && name.ends_with(".safetensors") {
                        weights.push(entry.path());
                    }
                }
                weights.sort();
            }

            if weights.is_empty() {
                return Err(Error::ModelNotFound(
                    format!("no safetensors files found in {}", model_path.display()),
                ));
            }

            (config_path, tokenizer_path, weights)
        } else {
            // Download from HuggingFace
            let api = Api::new().map_err(|e| Error::ModelNotFound(e.to_string()))?;
            let repo = api.repo(Repo::new(config.model_id.clone(), RepoType::Model));

            let config_path = repo.get("config.json")
                .map_err(|e| Error::ModelNotFound(e.to_string()))?;
            let tokenizer_path = repo.get("tokenizer.json")
                .map_err(|e| Error::ModelNotFound(e.to_string()))?;

            // Try single file first, then multi-shard
            let weights = if let Ok(p) = repo.get("model.safetensors") {
                vec![p]
            } else {
                // Try common shard patterns
                let mut paths = Vec::new();
                for i in 1..=10 {
                    // Try common shard count (2 shards)
                    if let Ok(p) = repo.get(&format!("model-{i:05}-of-00002.safetensors")) {
                        paths.push(p);
                    } else {
                        break;
                    }
                }
                if paths.is_empty() {
                    return Err(Error::ModelNotFound(
                        "could not find model safetensors in HF repo".to_string(),
                    ));
                }
                paths
            };

            (config_path, tokenizer_path, weights)
        };

        tracing::info!("loading model config from {}", config_path.display());
        let qwen_config: QwenConfig = serde_json::from_str(
            &std::fs::read_to_string(&config_path)?,
        )?;

        tracing::info!("loading tokenizer from {}", tokenizer_path.display());
        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        tracing::info!("loading {} weight file(s)", weight_paths.len());
        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&weight_paths, DType::F32, device)?
        };

        let model = ModelForCausalLM::new(&qwen_config, vb)?;
        tracing::info!("model loaded successfully on {:?}", device);

        // Load and merge LoRA adapter if provided
        let model = if let Some(ref adapter_path) = config.adapter_path {
            tracing::info!("loading LoRA adapter from {}", adapter_path.display());
            let _adapter = LoraAdapter::load(adapter_path, device)?;
            // NOTE: LoRA merge into ModelForCausalLM requires access to internal weight
            // tensors. candle-transformers' Qwen2 model doesn't expose mutable weight access,
            // so for now we log the adapter info. A full implementation would either:
            // 1. Fork the model to accept pre-merged VarBuilder, or
            // 2. Apply LoRA at runtime in the forward pass.
            tracing::warn!(
                "LoRA adapter loaded ({} weight pairs) — runtime application pending model API support",
                _adapter.weights.len()
            );
            model
        } else {
            model
        };

        Ok(Self {
            model,
            tokenizer,
            device: device.clone(),
            max_tokens: config.max_tokens,
            temperature: config.temperature,
        })
    }

    pub fn generate(&mut self, prompt: &str) -> Result<String> {
        let encoding = self.tokenizer.encode(prompt, true)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        let input_ids: Vec<u32> = encoding.get_ids().to_vec();
        let prompt_len = input_ids.len();
        tracing::info!("prompt tokens: {prompt_len}");

        let mut all_tokens = input_ids.clone();
        let mut input = Tensor::new(input_ids.as_slice(), &self.device)?.unsqueeze(0)?;

        // Initial forward pass with full prompt
        let logits = self.model.forward(&input, 0)?;
        let next_token = self.sample_token(&logits)?;
        all_tokens.push(next_token);

        // Check for EOS tokens
        let eos_token_id = self.get_eos_token_id();

        // Autoregressive generation
        for i in 1..self.max_tokens {
            if next_token == eos_token_id {
                tracing::info!("EOS at token {i}");
                break;
            }

            input = Tensor::new(&[*all_tokens.last().unwrap()], &self.device)?.unsqueeze(0)?;
            let logits = self.model.forward(&input, prompt_len + i - 1)?;
            let next_token = self.sample_token(&logits)?;
            all_tokens.push(next_token);

            if next_token == eos_token_id {
                tracing::info!("EOS at token {}", i + 1);
                break;
            }
        }

        // Decode only the generated tokens (not the prompt)
        let generated_tokens = &all_tokens[prompt_len..];
        let output = self.tokenizer.decode(generated_tokens, true)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        tracing::info!("generated {} tokens", generated_tokens.len());
        Ok(output)
    }

    fn sample_token(&self, logits: &Tensor) -> Result<u32> {
        let logits = logits.squeeze(0)?.squeeze(0)?; // [vocab_size]

        if self.temperature <= 0.0 {
            // Greedy
            let token = logits.argmax(0)?.to_scalar::<u32>()?;
            return Ok(token);
        }

        // Temperature-scaled sampling
        let logits = (logits / (self.temperature as f64))?;
        let probs = candle_nn::ops::softmax_last_dim(&logits.unsqueeze(0)?)?.squeeze(0)?;
        let probs_vec: Vec<f32> = probs.to_vec1()?;

        // Weighted random sampling
        let mut rng_val: f32 = simple_rand();
        for (i, &p) in probs_vec.iter().enumerate() {
            rng_val -= p;
            if rng_val <= 0.0 {
                return Ok(i as u32);
            }
        }

        // Fallback to last token
        Ok((probs_vec.len() - 1) as u32)
    }

    fn get_eos_token_id(&self) -> u32 {
        // Qwen uses <|im_end|> as EOS in chat mode, and <|endoftext|> as base EOS
        // Try to find <|im_end|> first
        if let Some(id) = self.tokenizer.token_to_id("<|im_end|>") {
            return id;
        }
        if let Some(id) = self.tokenizer.token_to_id("<|endoftext|>") {
            return id;
        }
        // Fallback
        151643 // Qwen2 default EOS token ID
    }
}

/// Simple deterministic pseudo-random for sampling.
/// Uses thread-local state seeded from system time.
fn simple_rand() -> f32 {
    use std::cell::Cell;
    thread_local! {
        static STATE: Cell<u64> = Cell::new(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos() as u64
        );
    }
    STATE.with(|s| {
        // xorshift64
        let mut x = s.get();
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        s.set(x);
        (x as f32) / (u64::MAX as f32)
    })
}
