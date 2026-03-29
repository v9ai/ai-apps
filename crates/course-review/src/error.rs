use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("model load: {0}")]
    ModelLoad(#[from] anyhow::Error),

    #[error("tokenizer: {0}")]
    Tokenizer(String),

    #[error("inference: {0}")]
    Inference(#[from] candle_core::Error),

    #[error("json parse: {0}")]
    Json(#[from] serde_json::Error),

    #[error("lance: {0}")]
    Lance(String),

    #[error("arrow: {0}")]
    Arrow(String),

    #[error("expert output malformed for {expert}: {reason}")]
    MalformedOutput { expert: String, reason: String },
}

impl From<lancedb::error::Error> for Error {
    fn from(e: lancedb::error::Error) -> Self {
        Error::Lance(e.to_string())
    }
}

impl From<arrow_schema::ArrowError> for Error {
    fn from(e: arrow_schema::ArrowError) -> Self {
        Error::Arrow(e.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
