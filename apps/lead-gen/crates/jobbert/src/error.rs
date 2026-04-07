pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("candle: {0}")]
    Candle(#[from] candle_core::Error),

    #[error("tokenizer: {0}")]
    Tokenizer(String),

    #[error("model not found: {0}")]
    ModelNotFound(String),

    #[error("bio decode: {0}")]
    BioDecode(String),

    #[error("io: {0}")]
    Io(#[from] std::io::Error),
}
