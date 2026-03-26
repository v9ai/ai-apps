//! Semantic Scholar API client for paper search, details, and recommendations.
//!
//! Supports both the public API and authenticated access via API key,
//! with optional rate-limiter sharing across concurrent workers.

pub mod client;
pub mod error;
pub mod types;

pub use client::SemanticScholarClient;
pub use error::Error;
pub use types::*;
