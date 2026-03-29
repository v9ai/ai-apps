use candle_core::quantized::gguf_file;
use candle_core::Device;
use candle_transformers::generation::{LogitsProcessor, Sampling};
use candle_transformers::models::quantized_qwen2::ModelWeights;
use hf_hub::api::sync::Api;
use tokenizers::Tokenizer;

use crate::error::{Error, Result};

const DEFAULT_REPO: &str = "Qwen/Qwen2.5-3B-Instruct-GGUF";
const DEFAULT_FILE: &str = "qwen2.5-3b-instruct-q4_k_m.gguf";
/// Tokenizer is distributed in the base (non-GGUF) repo.
const TOKENIZER_REPO: &str = "Qwen/Qwen2.5-3B-Instruct";

/// Select the best available compute device.
///
/// On macOS with the `metal` feature enabled the Apple GPU is used;
/// otherwise falls back to CPU.
pub fn best_device() -> Result<Device> {
    #[cfg(feature = "metal")]
    {
        let dev = Device::new_metal(0).map_err(Error::Inference)?;
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
    /// The GGUF filename — stored verbatim in `CourseReview.model_version`.
    pub model_name: String,
}

impl LocalLlm {
    /// Load the default Qwen2.5-3B-Instruct-Q4_K_M model from HuggingFace Hub.
    pub fn load_default(device: &Device) -> Result<Self> {
        Self::load(DEFAULT_REPO, DEFAULT_FILE, device)
    }

    /// Load from a custom HuggingFace repo / GGUF filename.
    pub fn load(repo_id: &str, filename: &str, device: &Device) -> Result<Self> {
        let api = Api::new().map_err(|e| anyhow::anyhow!("hf-hub Api::new: {e}"))?;

        tracing::info!("Downloading/loading {repo_id}/{filename}...");
        let model_repo = api.model(repo_id.to_string());
        let model_path = model_repo
            .get(filename)
            .map_err(|e| anyhow::anyhow!("download {filename}: {e}"))?;

        // Tokenizer lives in the base (non-GGUF) instruction-tuned repo.
        let tok_repo = api.model(TOKENIZER_REPO.to_string());
        let tokenizer_path = tok_repo
            .get("tokenizer.json")
            .map_err(|e| anyhow::anyhow!("download tokenizer.json: {e}"))?;

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| Error::Tokenizer(e.to_string()))?;

        let mut file = std::fs::File::open(&model_path)
            .map_err(|e| anyhow::anyhow!("open model file: {e}"))?;
        let gguf =
            gguf_file::Content::read(&mut file).map_err(Error::Inference)?;
        let model = ModelWeights::from_gguf(gguf, &mut file, device)
            .map_err(Error::Inference)?;

        tracing::info!("LLM loaded: {repo_id}/{filename}");
        Ok(Self {
            model,
            tokenizer,
            device: device.clone(),
            model_name: filename.to_string(),
        })
    }

    /// Generate text for `prompt`.
    ///
    /// Returns only the newly generated tokens (not the prompt text).
    /// Temperature is fixed at `0.0` (greedy / deterministic) — suitable for
    /// structured JSON scoring.
    pub fn generate(&mut self, prompt: &str, max_tokens: usize) -> Result<String> {
        // ── Tokenise prompt ──────────────────────────────────────────────────
        let encoding = self
            .tokenizer
            .encode(prompt, true)
            .map_err(|e| Error::Tokenizer(format!("encode: {e}")))?;

        let prompt_tokens: Vec<u32> = encoding.get_ids().to_vec();
        let prompt_len = prompt_tokens.len();

        // ── EOS token ────────────────────────────────────────────────────────
        // Qwen2.5 uses <|im_end|>; fall back for safety.
        let eos_token = self
            .tokenizer
            .token_to_id("<|im_end|>")
            .or_else(|| self.tokenizer.token_to_id("<|endoftext|>"))
            .or_else(|| self.tokenizer.token_to_id("</s>"))
            .unwrap_or(0);

        // ── Logits processor — greedy (temperature = 0.0) ────────────────────
        let mut logits_processor =
            LogitsProcessor::from_sampling(42, Sampling::ArgMax);

        let mut all_tokens = prompt_tokens.clone();

        // ── Process full prompt in one forward pass ──────────────────────────
        let input =
            candle_core::Tensor::new(prompt_tokens.as_slice(), &self.device)?
                .unsqueeze(0)?;
        let logits = self.model.forward(&input, 0)?;
        let logits = logits.squeeze(0)?.squeeze(0)?;
        let mut next_token = logits_processor.sample(&logits)?;
        all_tokens.push(next_token);

        // ── Autoregressive generation loop ───────────────────────────────────
        let mut generated = 1usize;
        for step in 1..max_tokens {
            if next_token == eos_token {
                break;
            }
            let input =
                candle_core::Tensor::new(&[next_token], &self.device)?
                    .unsqueeze(0)?;
            let logits = self.model.forward(&input, prompt_len + step)?;
            let logits = logits.squeeze(0)?.squeeze(0)?;
            next_token = logits_processor.sample(&logits)?;
            all_tokens.push(next_token);
            generated += 1;
            if next_token == eos_token {
                break;
            }
        }

        tracing::debug!("generated {generated} tokens");

        // ── Decode only the newly generated tokens ───────────────────────────
        let output_tokens = &all_tokens[prompt_len..];
        let text = self
            .tokenizer
            .decode(output_tokens, true)
            .map_err(|e| Error::Tokenizer(format!("decode: {e}")))?;

        Ok(text)
    }
}
