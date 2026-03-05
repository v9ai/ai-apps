pub mod error;
pub mod types;
pub mod client;

#[cfg(feature = "reqwest-client")]
pub mod reqwest_client;

#[cfg(feature = "wasm")]
pub mod wasm;

#[cfg(feature = "agent")]
pub mod agent;

#[cfg(feature = "cache")]
pub mod cache;

// Re-export key types
pub use error::{DeepSeekError, Result};
pub use types::*;
pub use client::{HttpClient, DeepSeekClient, DEFAULT_BASE_URL, build_request};

#[cfg(feature = "reqwest-client")]
pub use reqwest_client::ReqwestClient;

#[cfg(feature = "wasm")]
pub use wasm::WasmClient;

#[cfg(feature = "agent")]
pub use agent::{Tool, ToolDefinition, AgentBuilder, DeepSeekAgent};

#[cfg(feature = "cache")]
pub use cache::{Cache, InFlightDedup};
