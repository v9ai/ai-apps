pub mod client;
pub mod error;
pub mod schema;
#[cfg(feature = "screenshot")]
pub mod screenshot;
pub mod types;

pub use client::VlClient;
pub use error::{Error, Result};
pub use schema::{DiscoveryExtraction, EnrichmentExtraction, PersonBrief};
pub use types::{
    ContentBlock, ImageUrl, ResponseFormat, VlChatRequest, VlChatResponse, VlContent, VlMessage,
};
