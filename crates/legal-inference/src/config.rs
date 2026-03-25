use candle_core::Device;

pub struct Config {
    pub port: u16,
    pub embed_model: String,
    pub llm_model: String,
    pub llm_file: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: std::env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(9877),
            embed_model: std::env::var("EMBED_MODEL")
                .unwrap_or_else(|_| "BAAI/bge-large-en-v1.5".to_string()),
            llm_model: std::env::var("LLM_MODEL")
                .unwrap_or_else(|_| "bartowski/Phi-3.5-mini-instruct-GGUF".to_string()),
            llm_file: std::env::var("LLM_FILE")
                .unwrap_or_else(|_| "Phi-3.5-mini-instruct-Q4_K_M.gguf".to_string()),
        }
    }
}

pub fn select_device() -> anyhow::Result<Device> {
    #[cfg(feature = "metal")]
    {
        match Device::new_metal(0) {
            Ok(d) => {
                tracing::info!("Using Metal GPU");
                return Ok(d);
            }
            Err(e) => {
                tracing::warn!("Metal unavailable ({e}), falling back to CPU");
            }
        }
    }
    #[cfg(feature = "cuda")]
    {
        match Device::new_cuda(0) {
            Ok(d) => {
                tracing::info!("Using CUDA GPU");
                return Ok(d);
            }
            Err(e) => {
                tracing::warn!("CUDA unavailable ({e}), falling back to CPU");
            }
        }
    }
    tracing::info!("Using CPU");
    Ok(Device::Cpu)
}
