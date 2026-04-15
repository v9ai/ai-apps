//! Local LLM inference via Candle (Qwen2.5-7B-Instruct GGUF on Metal).

use candle_core::quantized::gguf_file;
use candle_core::Device;
use candle_transformers::generation::{LogitsProcessor, Sampling};
use candle_transformers::models::quantized_qwen2::ModelWeights;
use hf_hub::api::sync::Api;
use tokenizers::Tokenizer;

use crate::error::{PipelineError, Result};

const DEFAULT_REPO: &str = "Qwen/Qwen2.5-3B-Instruct-GGUF";
const DEFAULT_FILE: &str = "qwen2.5-3b-instruct-q4_k_m.gguf";
const TOKENIZER_REPO: &str = "Qwen/Qwen2.5-3B-Instruct";

/// Select best available compute device (Metal GPU on macOS).
pub fn best_device() -> Result<Device> {
    #[cfg(feature = "metal")]
    {
        let dev = Device::new_metal(0).map_err(PipelineError::Inference)?;
        tracing::info!("using Metal GPU");
        return Ok(dev);
    }
    #[cfg(not(feature = "metal"))]
    {
        tracing::info!("using CPU");
        Ok(Device::Cpu)
    }
}

pub struct LocalLlm {
    model: ModelWeights,
    tokenizer: Tokenizer,
    device: Device,
    pub model_name: String,
}

impl LocalLlm {
    pub fn load_default(device: &Device) -> Result<Self> {
        Self::load(DEFAULT_REPO, DEFAULT_FILE, device)
    }

    pub fn load(repo_id: &str, filename: &str, device: &Device) -> Result<Self> {
        let api = Api::new().map_err(|e| PipelineError::Other(format!("hf-hub: {e}")))?;

        tracing::info!("Downloading {repo_id}/{filename}...");
        let model_repo = api.model(repo_id.to_string());
        let model_path = model_repo
            .get(filename)
            .map_err(|e| PipelineError::Other(format!("download {filename}: {e}")))?;

        let tok_repo = api.model(TOKENIZER_REPO.to_string());
        let tokenizer_path = tok_repo
            .get("tokenizer.json")
            .map_err(|e| PipelineError::Other(format!("download tokenizer: {e}")))?;

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| PipelineError::Tokenizer(e.to_string()))?;

        let mut file = std::fs::File::open(&model_path)?;
        let gguf = gguf_file::Content::read(&mut file).map_err(PipelineError::Inference)?;
        let model =
            ModelWeights::from_gguf(gguf, &mut file, device).map_err(PipelineError::Inference)?;

        tracing::info!("LLM loaded: {repo_id}/{filename}");
        Ok(Self {
            model,
            tokenizer,
            device: device.clone(),
            model_name: filename.to_string(),
        })
    }

    /// Format a chat-style prompt using Qwen2.5 ChatML template.
    fn format_chatml(&self, system: &str, user: &str) -> String {
        format!(
            "<|im_start|>system\n{system}<|im_end|>\n<|im_start|>user\n{user}<|im_end|>\n<|im_start|>assistant\n"
        )
    }

    /// Generate a response given system + user prompts.
    pub fn chat(&mut self, system: &str, user: &str, max_tokens: usize) -> Result<String> {
        let prompt = self.format_chatml(system, user);
        self.generate(&prompt, max_tokens)
    }

    /// Raw generation from a pre-formatted prompt.
    pub fn generate(&mut self, prompt: &str, max_tokens: usize) -> Result<String> {
        let encoding = self
            .tokenizer
            .encode(prompt, true)
            .map_err(|e| PipelineError::Tokenizer(format!("encode: {e}")))?;

        let prompt_tokens: Vec<u32> = encoding.get_ids().to_vec();
        let prompt_len = prompt_tokens.len();

        let eos_token = self
            .tokenizer
            .token_to_id("<|im_end|>")
            .or_else(|| self.tokenizer.token_to_id("<|endoftext|>"))
            .unwrap_or(0);

        let mut logits_processor = LogitsProcessor::from_sampling(42, Sampling::ArgMax);
        let mut all_tokens = prompt_tokens.clone();

        // Full prompt forward pass
        let input =
            candle_core::Tensor::new(prompt_tokens.as_slice(), &self.device)?.unsqueeze(0)?;
        let logits = self.model.forward(&input, 0)?;
        let logits = logits.squeeze(0)?.squeeze(0)?;
        let mut next_token = logits_processor.sample(&logits)?;
        all_tokens.push(next_token);

        // Autoregressive loop
        for step in 1..max_tokens {
            if next_token == eos_token {
                break;
            }
            let input =
                candle_core::Tensor::new(&[next_token], &self.device)?.unsqueeze(0)?;
            let logits = self.model.forward(&input, prompt_len + step)?;
            let logits = logits.squeeze(0)?.squeeze(0)?;
            next_token = logits_processor.sample(&logits)?;
            all_tokens.push(next_token);
            if next_token == eos_token {
                break;
            }
        }

        let output_tokens = &all_tokens[prompt_len..];
        let text = self
            .tokenizer
            .decode(output_tokens, true)
            .map_err(|e| PipelineError::Tokenizer(format!("decode: {e}")))?;

        Ok(text)
    }
}
