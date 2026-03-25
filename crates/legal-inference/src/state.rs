use std::sync::Arc;
use tokio::sync::Mutex;

use crate::config::{self, Config};
use crate::models::{embedding::Embedder, llm::LocalLlm};

pub struct AppState {
    pub embedder: Arc<Embedder>,
    pub llm: Arc<Mutex<LocalLlm>>,
    pub device_name: String,
    pub config: Config,
}

impl AppState {
    pub fn load(config: Config) -> anyhow::Result<Self> {
        let device = config::select_device()?;
        let device_name = format!("{:?}", device);

        tracing::info!("Loading embedding model: {}", config.embed_model);
        let embedder = Embedder::load(&config.embed_model, &device)?;

        tracing::info!("Loading LLM: {}/{}", config.llm_model, config.llm_file);
        let llm = LocalLlm::load(&config.llm_model, &config.llm_file, &device)?;

        Ok(Self {
            embedder: Arc::new(embedder),
            llm: Arc::new(Mutex::new(llm)),
            device_name,
            config,
        })
    }
}
