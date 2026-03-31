#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("candle error: {0}")]
    Candle(#[from] candle_core::Error),

    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("tokenizer error: {0}")]
    Tokenizer(String),

    #[error("model not found: {0}")]
    ModelNotFound(String),

    #[error("no email output in model response")]
    NoOutput,
}

pub type Result<T> = std::result::Result<T, Error>;
