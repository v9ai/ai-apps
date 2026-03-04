pub mod client;
pub mod error;
pub mod types;

pub use client::Client;
pub use error::{Error, Result};
pub use types::{
    ChatMessage, ChatRequest, ChatResponse, EmbeddingData, EmbeddingRequest, EmbeddingResponse,
    EmbeddingUsage,
};
