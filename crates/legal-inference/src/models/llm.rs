use anyhow::{Context, Result};
use candle_core::quantized::gguf_file;
use candle_core::Device;
use candle_transformers::generation::LogitsProcessor;
use candle_transformers::models::quantized_phi3::ModelWeights;
use hf_hub::api::sync::Api;
use tokenizers::Tokenizer;

pub struct LocalLlm {
    model: ModelWeights,
    tokenizer: Tokenizer,
    device: Device,
}

impl LocalLlm {
    pub fn load(model_id: &str, filename: &str, device: &Device) -> Result<Self> {
        let api = Api::new()?;
        let repo = api.model(model_id.to_string());

        tracing::info!("Downloading/loading {model_id}/{filename}...");
        let model_path = repo.get(filename).context("GGUF model file")?;

        // Load tokenizer from the base model repo (non-GGUF)
        let base_repo = api.model("microsoft/Phi-3.5-mini-instruct".to_string());
        let tokenizer_path = base_repo.get("tokenizer.json").context("tokenizer.json")?;

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| anyhow::anyhow!("tokenizer: {e}"))?;

        let mut file = std::fs::File::open(&model_path)?;
        let gguf = gguf_file::Content::read(&mut file)?;
        let model = ModelWeights::from_gguf(false, gguf, &mut file, device)?;

        tracing::info!("LLM loaded: {model_id}/{filename}");
        Ok(Self {
            model,
            tokenizer,
            device: device.clone(),
        })
    }

    pub fn generate(
        &mut self,
        prompt: &str,
        max_tokens: usize,
        temperature: f64,
        top_p: Option<f64>,
    ) -> Result<(String, usize, usize)> {
        let encoding = self
            .tokenizer
            .encode(prompt, true)
            .map_err(|e| anyhow::anyhow!("tokenize: {e}"))?;

        let prompt_tokens = encoding.get_ids().to_vec();
        let prompt_len = prompt_tokens.len();

        let mut logits_processor = LogitsProcessor::from_sampling(
            42,
            candle_transformers::generation::Sampling::TopP {
                p: top_p.unwrap_or(0.9),
                temperature,
            },
        );

        let mut all_tokens = prompt_tokens.clone();
        let eos_token = self
            .tokenizer
            .token_to_id("<|endoftext|>")
            .or_else(|| self.tokenizer.token_to_id("</s>"))
            .or_else(|| self.tokenizer.token_to_id("<|end|>"))
            .unwrap_or(0);

        // Process prompt tokens
        let input = candle_core::Tensor::new(prompt_tokens.as_slice(), &self.device)?.unsqueeze(0)?;
        let logits = self.model.forward(&input, 0)?;
        let logits = logits.squeeze(0)?.squeeze(0)?;
        let next_token = logits_processor.sample(&logits)?;
        all_tokens.push(next_token);

        // Autoregressive generation
        let mut generated = 1usize;
        for i in 1..max_tokens {
            if next_token == eos_token {
                break;
            }
            let last = *all_tokens.last().unwrap();
            let input =
                candle_core::Tensor::new(&[last], &self.device)?.unsqueeze(0)?;
            let logits = self.model.forward(&input, prompt_len + i)?;
            let logits = logits.squeeze(0)?.squeeze(0)?;
            let next_token = logits_processor.sample(&logits)?;
            all_tokens.push(next_token);
            generated += 1;
            if next_token == eos_token {
                break;
            }
        }

        let output_tokens = &all_tokens[prompt_len..];
        let text = self
            .tokenizer
            .decode(output_tokens, true)
            .map_err(|e| anyhow::anyhow!("decode: {e}"))?;

        Ok((text, prompt_len, generated))
    }

    pub fn format_chat_prompt(&self, messages: &[ChatMessage]) -> String {
        // Phi-3.5-mini instruct format
        let mut prompt = String::new();
        for msg in messages {
            match msg.role.as_str() {
                "system" => {
                    prompt.push_str(&format!("<|system|>\n{}<|end|>\n", msg.content));
                }
                "user" => {
                    prompt.push_str(&format!("<|user|>\n{}<|end|>\n", msg.content));
                }
                "assistant" => {
                    prompt.push_str(&format!("<|assistant|>\n{}<|end|>\n", msg.content));
                }
                _ => {}
            }
        }
        prompt.push_str("<|assistant|>\n");
        prompt
    }
}

#[derive(serde::Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}
