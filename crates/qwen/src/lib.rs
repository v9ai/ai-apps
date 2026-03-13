pub mod client;
pub mod error;
pub mod types;

pub use client::Client;
pub use error::{Error, Result};
pub use types::{
    ChatMessage, ChatRequest, ChatResponse, ChatUsage, EmbeddingData, EmbeddingRequest,
    EmbeddingResponse, EmbeddingUsage,
};
